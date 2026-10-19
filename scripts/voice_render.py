"""Render recorded voice clips for every spoken line, with Chatterbox Multilingual (MIT) on this machine.

    npx tsx scripts/voice-lines.ts > /tmp/lines.json
    <venv>/bin/python scripts/voice_render.py /tmp/lines.json [--tempo 0.85] [--only en] [--force]

Only lines whose clip is missing or whose text changed are rendered. Each clip is trimmed, loudness
normalised and written to static/voice/<lang>/<id>.mp3. Every clip is checked by transcribing it with
Whisper (mlx-whisper, local): the model sometimes babbles after very short inputs, so a clip that
doesn't say its text, or runs far too long, is rendered again (up to --tries times). Lines that
never pass are listed in --report. A take below 0.8 (0.85 for a single word) isn't used at all: the
browser voice says that line. src/lib/voice-manifest.json records, per clip, the hash of the text it
was made from (written after every clip, so a stopped run resumes). Clips for ids
that no longer exist are deleted. See scripts/voice.md for setup.
"""
import argparse, difflib, json, re, subprocess, sys, tempfile, time

import mlx_whisper
import numpy as np
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
ap.add_argument("--trim-existing", action="store_true", help="only cut noise tails from the clips already made, then exit")
ap.add_argument("--first", default="", help="render ids starting with this first (e.g. story.)")
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

WHISPER = "mlx-community/whisper-small-mlx"
# Whisper writes numbers as digits; the lines spell them out.
NUM_WORDS = {
    "en": "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(),
    "nl": "nul één twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien twintig".split(),
}


def norm(t: str, lang: str) -> list[str]:
    words = re.sub(r"[^\w ]+", " ", t.lower()).split()
    return [NUM_WORDS[lang][int(w)] if w.isdigit() and int(w) <= 20 else w for w in words]


FRAME = 0.02  # seconds per loudness frame
GAP = 0.2  # a pause at least this long ends the line


def speech_span(path: Path, lang: str) -> tuple[float, float] | None:
    """Where the line ends: the first real pause after its last word.

    The model sometimes adds a breath, click or mumble after a pause; silence trimming keeps it (it is
    louder than silence) and Whisper ignores it, so it is cut here. Loudness frames find the pause;
    Whisper's word times say which side of it the words are on.
    """
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True).stdout
    a = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    n = int(FRAME * 16000)
    db = np.array([20 * np.log10(np.sqrt(np.mean(a[i:i + n] ** 2)) + 1e-9) for i in range(0, len(a) - n + 1, n)])
    if not len(db):
        return None
    loud = db > db.max() - 30
    words = [w for s in mlx_whisper.transcribe(str(path), path_or_hf_repo=WHISPER, language=lang, word_timestamps=True)["segments"]
             for w in s.get("words", [])]
    if not words:
        return None
    last = words[-1]["end"]
    gap = int(GAP / FRAME)

    def quiet_run(i: int) -> bool:
        return i + gap < len(loud) and not loud[i:i + gap + 1].any()

    # End: the first frame after the last word that starts a long quiet run.
    end = len(db)
    for i in range(int(last / FRAME), len(db)):
        if quiet_run(i):
            end = i
            break
    # The start is left alone: silence trimming already handled it, and cutting there clips soft first
    # sounds (the p of "pig", the s of "sun").
    return 0.0, end * FRAME


def trim(path: Path, lang: str) -> float:
    """Cut what follows a clip's line, fading out; returns the seconds removed."""
    span = speech_span(path, lang)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout or 0)
    if not span:
        return 0.0
    start, end = 0.0, min(span[1] + 0.08, dur)
    if dur - end < 0.1:
        return 0.0  # nothing worth cutting
    tmp = path.with_suffix(".trim.mp3")
    # -t after -i: an input-side -ss drops the first frame of an mp3, and with it a first p or h.
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), "-t", f"{end:.3f}",
                    "-af", f"afade=t=out:st={max(end - start - 0.06, 0):.3f}:d=0.06",
                    "-ac", "1", "-ar", "24000", "-b:a", "48k", str(tmp)], check=True)
    tmp.replace(path)
    return dur - (end - start)


if args.trim_existing:
    for lang in ("en", "nl"):
        for id_ in sorted(manifest[lang]):
            cut = trim(STATIC / lang / f"{id_}.mp3", lang)
            if cut > 0.15:
                print(f"{lang} {id_}: cut {cut:.2f}s", flush=True)
    sys.exit(0)


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


todo = [
    l for l in lines
    if (not args.only or l["lang"] == args.only)
    and (args.force or manifest[l["lang"]].get(l["id"]) != l["hash"] or not (STATIC / l["lang"] / f"{l['id']}.mp3").exists())
]
failed = {(r["lang"], r["id"]) for f in args.skip if Path(f).exists() for r in json.loads(Path(f).read_text())}
todo = [l for l in todo if (l["lang"], l["id"]) not in failed]
print(f"{len(todo)} of {len(lines)} clips to render", flush=True)
if args.first:
    todo.sort(key=lambda l: not l["id"].startswith(args.first))  # stable: keeps the language order otherwise
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
                trim(take, l["lang"])
            except Exception as e:  # the model occasionally fails outright on a seed; try the next one
                best = max(best, (-0.5, f"error: {e}", None), key=lambda b: b[0])
                continue
            score, heard = check(take, l)
            if score > best[0]:
                best = (score, heard, take)
            if score >= 0.85:
                break
        # A wrong take is worse than the browser voice. A single word must be heard exactly: in a spelling
        # game a near miss teaches the wrong word (and Dutch "kat" once came out close to a rude word).
        keep = 0.85 if len(l["text"].split()) == 1 else 0.8
        if best[2] and best[0] >= keep:
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
