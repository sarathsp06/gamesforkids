"""Render recorded voice clips for every spoken line, with Chatterbox Multilingual (MIT) on this machine.

    npx tsx scripts/voice-lines.ts > /tmp/lines.json
    <venv>/bin/python scripts/voice_render.py /tmp/lines.json [--tempo 0.85] [--only en] [--force]

Only lines whose clip is missing or whose text changed are rendered. Each clip is trimmed, loudness
normalised and written to static/voice/<lang>/<id>.mp3. Every clip is checked by transcribing it with
Whisper (mlx-whisper, local): the model sometimes babbles after very short inputs, so a clip that
doesn't say its text, or runs far too long, is rendered again (up to --tries times). Lines that never
pass keep their best take and are listed in --report for a human to listen to; a take scoring under 0.6 isn't used at all (browser voice). The manifest and src/lib/voice-manifest.json records the
hash of the text it was made from (written after every clip, so a stopped run resumes). Clips for ids
that no longer exist are deleted. See scripts/voice.md for setup.
"""
import argparse, difflib, json, re, subprocess, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static" / "voice"
MANIFEST = ROOT / "src" / "lib" / "voice-manifest.json"

ap = argparse.ArgumentParser()
ap.add_argument("lines")
ap.add_argument("--tempo", type=float, default=0.85, help="slow clips down (pitch kept); 1 = model pace")
ap.add_argument("--only", choices=["en", "nl"])
ap.add_argument("--force", action="store_true", help="re-render every clip")
ap.add_argument("--exaggeration", type=float, default=0.6, help="Chatterbox expressiveness, 0.25–2")
ap.add_argument("--cfg", type=float, default=0.4, help="Chatterbox cfg_weight: lower is slower and calmer")
ap.add_argument("--tries", type=int, default=4)
ap.add_argument("--skip", nargs="*", default=[], help="report files from earlier runs: lines that failed there aren't retried")
ap.add_argument("--limit", type=int, default=0, help="render at most N clips, then exit (GPU memory creeps up in long runs)")
ap.add_argument("--report", default=str(Path(tempfile.gettempdir()) / "voice-report.json"))
args = ap.parse_args()

lines = json.load(open(args.lines))
manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
for lang in ("en", "nl"):
    manifest.setdefault(lang, {})


def save_manifest():
    tmp = MANIFEST.with_suffix(".tmp")
    tmp.write_text(json.dumps({k: dict(sorted(v.items())) for k, v in manifest.items()}, indent=1, ensure_ascii=False) + "\n")
    tmp.replace(MANIFEST)


# Drop clips whose line is gone.
live = {(l["lang"], l["id"]) for l in lines}
for lang in ("en", "nl"):
    for id_ in list(manifest[lang]):
        if (lang, id_) not in live:
            del manifest[lang][id_]
            (STATIC / lang / f"{id_}.mp3").unlink(missing_ok=True)
save_manifest()

todo = [
    l for l in lines
    if (not args.only or l["lang"] == args.only)
    and (args.force or manifest[l["lang"]].get(l["id"]) != l["hash"] or not (STATIC / l["lang"] / f"{l['id']}.mp3").exists())
]
failed = {(r["lang"], r["id"]) for f in args.skip if Path(f).exists() for r in json.loads(Path(f).read_text())}
todo = [l for l in todo if (l["lang"], l["id"]) not in failed]
print(f"{len(todo)} of {len(lines)} clips to render", flush=True)
if args.limit:
    todo = todo[: args.limit]
if not todo:
    sys.exit(0)

import torch, torchaudio  # noqa: E402  (slow imports only when there is work)
from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402

dev = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
_load = torch.load
torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": torch.device(dev)})  # weights were saved on cuda
model = ChatterboxMultilingualTTS.from_pretrained(device=dev)

# Trim silence at both ends, slow down without changing pitch, normalise loudness (EBU R128, -16 LUFS).
FILTER = ",".join([
    "silenceremove=start_periods=1:start_threshold=-45dB",
    "areverse", "silenceremove=start_periods=1:start_threshold=-45dB", "areverse",
    *( [f"atempo={args.tempo}"] if args.tempo != 1 else [] ),
    "loudnorm=I=-16:TP=-1.5:LRA=11",
])

import mlx_whisper  # noqa: E402

WHISPER = "mlx-community/whisper-small-mlx"
# Whisper writes numbers as digits; the lines spell them out.
NUM_WORDS = {
    "en": "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(),
    "nl": "nul één twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien twintig".split(),
}


def norm(t: str, lang: str) -> list[str]:
    words = re.sub(r"[^\w ]+", " ", t.lower()).split()
    return [NUM_WORDS[lang][int(w)] if w.isdigit() and int(w) <= 20 else w for w in words]


def check(path: Path, line) -> tuple[float, str]:
    """0–1: how well the clip says its line, by its length and by what Whisper hears."""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout or 0)
    # Calm speech is ~12 characters a second; allow a generous margin plus a floor for short words.
    if dur > 1.2 + len(line["text"]) / 7 / args.tempo or dur < 0.25:
        return 0.0, f"duration {dur:.1f}s"
    heard = mlx_whisper.transcribe(str(path), path_or_hf_repo=WHISPER, language=line["lang"])["text"]
    want, got = norm(line["text"], line["lang"]), norm(heard, line["lang"])
    if len(got) > len(want) + 1:
        return 0.0, heard  # extra babble after the line
    return difflib.SequenceMatcher(None, " ".join(want), " ".join(got)).ratio(), heard


def encode(wav_path: str, out: Path, extra: list[str] = []):
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", *extra, "-i", wav_path, "-af", FILTER, "-ac", "1", "-ar", "24000", "-b:a", "48k", str(out)],
        check=True,
    )


def render(line, out: Path, seed: int):
    torch.manual_seed(seed)
    text = line["text"]
    # A lone word reads better as a short sentence; the model rushes bare fragments.
    if not text.rstrip().endswith((".", "!", "?")):
        text += "."
    wav = model.generate(text, language_id=line["lang"], exaggeration=args.exaggeration, cfg_weight=args.cfg)
    with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
        torchaudio.save(raw.name, wav, model.sr)
        encode(raw.name, out)


def render_doubled(line, out: Path, seed: int):
    """For one short word the model can't say alone (it crashes or babbles): say it twice, keep the first."""
    torch.manual_seed(seed)
    w = line["text"].rstrip(".!?")
    wav = model.generate(f"{w}, {w}.", language_id=line["lang"], exaggeration=args.exaggeration, cfg_weight=args.cfg)
    with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
        torchaudio.save(raw.name, wav, model.sr)
        words = [x for seg in mlx_whisper.transcribe(raw.name, path_or_hf_repo=WHISPER, language=line["lang"], word_timestamps=True)["segments"] for x in seg.get("words", [])]
        if len(words) < 2:
            raise RuntimeError(f"doubled take has {len(words)} words")
        # Cut halfway into the pause between the two words.
        end = (words[0]["end"] + words[1]["start"]) / 2
        encode(raw.name, out, ["-t", f"{end:.3f}"])


report = []
start = time.time()
for i, l in enumerate(todo, 1):
    out = STATIC / l["lang"] / f"{l['id']}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    best = (-1.0, "", None)
    # Short lines are where the model stumbles (repeats, babbles), so they get more tries.
    tries = args.tries * 2 if len(l["text"].split()) <= 2 else args.tries
    with tempfile.TemporaryDirectory() as tmp:
        single = len(l["text"].split()) == 1
        # One word: first a few plain takes, then the say-it-twice-and-cut takes.
        plan = [(render, a) for a in range(tries if not single else args.tries)] + ([(render_doubled, a) for a in range(args.tries)] if single else [])
        for attempt, (fn, seed) in enumerate(plan):
            take = Path(tmp) / f"{attempt}.mp3"
            try:
                fn(l, take, seed=seed)
            except Exception as e:  # the model occasionally fails outright on a seed; try the next one
                best = max(best, (-0.5, f"error: {e}", None), key=lambda b: b[0])
                continue
            score, heard = check(take, l)
            if score > best[0]:
                best = (score, heard, take)
            if score >= 0.85:
                break
        # A clearly wrong take is worse than the browser voice; a borderline one is kept and reported.
        if best[2] and best[0] >= 0.6:
            best[2].replace(out)
        else:
            best = (best[0], best[1], None)
            out.unlink(missing_ok=True)
            manifest[l["lang"]].pop(l["id"], None)
    if best[0] < 0.85:
        report.append({"lang": l["lang"], "id": l["id"], "text": l["text"], "heard": best[1], "score": round(best[0], 2)})
        Path(args.report).write_text(json.dumps(report, indent=1, ensure_ascii=False))
    if not best[2]:
        print(f"[{i}/{len(todo)}] {l['lang']} {l['id']}: {l['text']}  SKIPPED: {best[1]}", flush=True)
        continue  # no clip: the browser voice says this line
    manifest[l["lang"]][l["id"]] = l["hash"]
    save_manifest()
    eta = (time.time() - start) / i * (len(todo) - i)
    flag = "" if best[0] >= 0.85 else f"  CHECK: heard {best[1]!r}"
    print(f"[{i}/{len(todo)}] {l['lang']} {l['id']}: {l['text']}{flag}  (eta {eta / 60:.0f} min)", flush=True)

print(f"done; {len(report)} clips to listen to, see {args.report}")
