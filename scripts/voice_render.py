"""Render recorded voice clips for every spoken line with VoiceStudio, running on this machine.

    npx tsx scripts/voice-lines.ts > /tmp/lines.json
    python3 scripts/voice_render.py /tmp/lines.json [--only en] [--force] [--limit 40]

VoiceStudio (https://github.com/debpalash/VoiceStudio, MIT) must be open: the script talks to its local
API on port 3900. Pip's voice is designed, not recorded: one OmniVoice instruct, one speed and one seed,
so every clip in both languages is the same calm voice (see scripts/voice.md).

Only lines whose clip is missing or whose text changed are rendered. Each take is checked by VoiceStudio's
transcriber: it must say its text and not run long. A take that fails is rendered again with the next seed
(up to --tries). A single word is said inside a carrier sentence ("Het woord is: jas.") and cut out at the
pause before it: alone, the model reads short Dutch words as English. Lines that never pass are listed in --report and the browser voice says them; a take below
0.8 (0.85 for a single word, where a near miss would teach the wrong word) is never kept. Clips are
silence-trimmed, loudness-normalised and written to static/voice/<lang>/<id>.mp3.
src/lib/voice-manifest.json records, per clip, the hash of the text it was made from (written after every
clip, so a stopped run resumes). Clips for ids that no longer exist are deleted. Needs ffmpeg.
"""
import argparse, difflib, json, re, subprocess, sys, tempfile, time, urllib.error, urllib.request, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static" / "voice"
MANIFEST = ROOT / "src" / "lib" / "voice-manifest.json"

ap = argparse.ArgumentParser()
ap.add_argument("lines")
ap.add_argument("--url", default="http://127.0.0.1:3900", help="VoiceStudio's local API")
ap.add_argument("--instruct", default="female, young adult, low pitch", help="OmniVoice voice design (its fixed vocabulary only)")
ap.add_argument("--speed", type=float, default=0.85, help="pace at render time, 1 = the model's own")
ap.add_argument("--seed", type=int, default=4242, help="first seed; a retry uses the next one")
ap.add_argument("--only", choices=["en", "nl"])
ap.add_argument("--force", action="store_true", help="re-render every clip")
ap.add_argument("--tries", type=int, default=4)
ap.add_argument("--skip", nargs="*", default=[], help="report files from earlier runs: lines that failed there aren't retried")
ap.add_argument("--first", default="", help="render ids starting with this first (e.g. story.)")
ap.add_argument("--limit", type=int, default=0, help="render at most N clips, then exit")
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


def multipart(fields: dict[str, str], file: tuple[str, Path] | None = None) -> tuple[bytes, str]:
    """A multipart/form-data body, by hand: the script has no dependencies beyond ffmpeg."""
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in fields.items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    if file:
        name, path = file
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{path.name}\"\r\n"
                 "Content-Type: audio/wav\r\n\r\n").encode() + path.read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def post(path: str, fields: dict[str, str], file: tuple[str, Path] | None = None, timeout=300) -> bytes:
    body, ctype = multipart(fields, file)
    req = urllib.request.Request(f"{args.url}{path}", data=body, headers={"Content-Type": ctype}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{path} {e.code}: {e.read().decode(errors='replace')[:300]}") from None


try:
    health = json.loads(urllib.request.urlopen(f"{args.url}/health", timeout=5).read())
except Exception as e:
    sys.exit(f"VoiceStudio isn't answering at {args.url} ({e}). Open VoiceStudio.app and try again.")
print(f"VoiceStudio {health.get('version')} on {health.get('device')}; voice: {args.instruct!r}, speed {args.speed}, seed {args.seed}", flush=True)

# The transcriber writes numbers as digits; the lines spell them out.
NUM_WORDS = {
    "en": "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(),
    "nl": "nul één twee drie vier vijf zes zeven acht negen tien elf twaalf dertien veertien vijftien zestien zeventien achttien negentien twintig".split(),
}


def norm(t: str, lang: str) -> list[str]:
    words = re.sub(r"[^\w ]+", " ", t.lower()).split()
    return [NUM_WORDS[lang][int(w)] if w.isdigit() and int(w) <= 20 else w for w in words]


# Trim silence at both ends and normalise loudness (EBU R128, -16 LUFS), so clips and sounds sit at one level.
FILTER = ",".join([
    "silenceremove=start_periods=1:start_threshold=-45dB",
    "areverse", "silenceremove=start_periods=1:start_threshold=-45dB", "areverse",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
])


def encode(wav_path: Path, out: Path):
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav_path), "-af", FILTER, "-ac", "1", "-ar", "24000", "-b:a", "48k", str(out)],
        check=True,
    )


def duration(path: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True).stdout or 0)


def generate(text: str, lang: str, seed: int) -> bytes:
    return post("/generate", {"text": text, "language": lang, "instruct": args.instruct, "speed": str(args.speed), "seed": str(seed)})


def hear(path: Path, lang: str) -> str:
    """What the fast transcriber hears (0.1 s; it detects the language itself, which a sentence makes clear)."""
    r = post("/transcribe", {"language": lang}, ("audio", path))
    return json.loads(r)["text"]


def hear_slow(path: Path, lang: str) -> str:
    """Whisper, told the clip's language (a few seconds): the second opinion before a take is kept."""
    r = post("/v1/audio/transcriptions", {"language": lang, "response_format": "json"}, ("file", path))
    return json.loads(r)["text"]


def hear_words(path: Path, lang: str) -> list[dict]:
    """The words heard, each with start and end seconds: Whisper, in the clip's language (a few seconds)."""
    r = post("/v1/audio/transcriptions", {"language": lang, "response_format": "verbose_json", "timestamp_granularities[]": "word"}, ("file", path))
    return json.loads(r).get("words", [])


def confirm(path: Path, text: str, lang: str, score: float, heard: str) -> tuple[float, str]:
    """A take both transcribers agree on: the lower of the two scores, so a doubt on either side counts."""
    if score < 0.85:
        return score, heard
    second = hear_slow(path, lang)
    s2 = similarity(second, text, lang)
    return (s2, f"{heard} / whisper: {second}") if s2 < score else (score, heard)


def similarity(heard: str, text: str, lang: str) -> float:
    want, got = norm(text, lang), norm(heard, lang)
    if len(got) > len(want) + 1:
        return 0.0  # extra babble after the line
    return difflib.SequenceMatcher(None, " ".join(want), " ".join(got)).ratio()


def render(line, out: Path, seed: int) -> tuple[float, str]:
    """A take of the line, encoded to out; returns how well it says its text and what was heard."""
    text = say(line)
    if not text.rstrip().endswith((".", "!", "?")):
        text += "."
    with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
        Path(raw.name).write_bytes(generate(text, line["lang"], seed))
        encode(Path(raw.name), out)
    dur = duration(out)
    # Calm speech is ~12 characters a second; allow a generous margin plus a floor for short words.
    if dur > 1.2 + len(line["text"]) / 7 / args.speed or dur < 0.25:
        return 0.0, f"duration {dur:.1f}s"
    heard = hear(out, line["lang"])
    return confirm(out, say(line), line["lang"], similarity(heard, say(line), line["lang"]), heard)


# What the model should read for a line, where the catalog text misleads it: Dutch letter names are
# not English ones. The clip keeps the catalog text's id and hash; only the rendered words change.
SAY = {
    "nl": {"De letter I.": "De letter ie.", "De letter Y.": "De letter ypsilon.", "I.": "ie.", "Y.": "ypsilon.", "J.": "jee.", "G.": "gee.", "H.": "haa.", "Q.": "kuu.", "X.": "iks.", "Z.": "zet."},
    "en": {},
}
def say(line) -> str:
    return SAY[line["lang"]].get(line["text"], line["text"])


# A bare word is read in the wrong language or rushed ("jas" comes out as "yes"), so a single word is
# rendered inside a short sentence and cut out at the pause before it.
CARRIER = {"en": "The word is: {w}.", "nl": "Het woord is: {w}."}
# When the colon leaves no pause (soft first sounds), later tries end the carrier with a full stop instead.
CARRIER_PAUSED = {"en": "The word is. {w}.", "nl": "Het woord is. {w}."}
QUIET = "-45dB"  # soft enough to keep a word's first and last consonant
PAUSE = 0.06  # seconds of quiet that count as a pause


def loud_runs(path: Path) -> list[tuple[float, float]]:
    """Stretches of sound in a file, from ffmpeg's silence detection."""
    log = subprocess.run(["ffmpeg", "-i", str(path), "-af", f"silencedetect=n={QUIET}:d={PAUSE}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", log)]
    total = duration(path)
    edges = sorted([(s, "start") for s in starts] + [(e, "end") for e in ends])
    runs, at = [], 0.0
    for t, kind in edges:
        if kind == "start":
            if t - at > 0.02:
                runs.append((at, t))
        else:
            at = t
    if total - at > 0.02:
        runs.append((at, total))
    return runs


def render_word(line, out: Path, seed: int, paused=False) -> tuple[float, str]:
    """A single word: say it in a carrier sentence, check the whole sentence, keep only the word."""
    w = line["text"].strip().rstrip(".!?")
    sentence = (CARRIER_PAUSED if paused else CARRIER)[line["lang"]].format(w=w)
    with tempfile.TemporaryDirectory() as tmp:
        raw, full = Path(tmp) / "raw.wav", Path(tmp) / "full.mp3"
        raw.write_bytes(generate(sentence, line["lang"], seed))
        encode(raw, full)
        heard = hear(full, line["lang"])
        score, heard = confirm(full, sentence, line["lang"], similarity(heard, sentence, line["lang"]), heard)
        if score < 0.85:
            return score, heard
        runs = [r for r in loud_runs(full) if r[1] - r[0] >= 0.12]
        if len(runs) >= 2:
            start, end = runs[-1]
        else:
            # A soft first sound (h, s, f) leaves no pause: take the transcriber's word timing instead.
            words = hear_words(full, line["lang"])
            if len(words) < 2:
                return 0.0, f"no pause before the word: {heard}"
            start, end = words[-1]["start"], duration(full)
        # A word is at least a fifth of a second (an eighth for a two- or three-letter one); shorter means
        # the cut caught a release, not the word.
        if not (0.12 if len(w) <= 3 else 0.2) <= end - start <= 1.5:
            return 0.0, f"word run {end - start:.2f}s: {heard}"
        # A little room on both sides: a soft first consonant and the release of the last one.
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(full), "-ss", f"{max(start - 0.04, 0):.3f}", "-t", f"{end - start + 0.1:.3f}",
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "24000", "-b:a", "48k", str(out)], check=True)
        # The lone word is heard in context above; alone, the transcriber itself gets it wrong, so the
        # cut piece is only reported for a listen when it is heard as something else.
        alone = hear(out, line["lang"])
        if len(norm(alone, line["lang"])) > 1:
            return 0.0, f"cut kept part of the carrier: {alone}"  # a soft first sound (h, s) left no pause
        if similarity(alone, w, line["lang"]) < 0.85:
            heard = f"{heard} (alone: {alone})"
        return score, heard


todo = [
    l for l in lines
    if (not args.only or l["lang"] == args.only)
    and (args.force or manifest[l["lang"]].get(l["id"]) != l["hash"] or not (STATIC / l["lang"] / f"{l['id']}.mp3").exists())
]
failed = {(r["lang"], r["id"]) for f in args.skip if Path(f).exists() for r in json.loads(Path(f).read_text())}
todo = [l for l in todo if (l["lang"], l["id"]) not in failed]
print(f"{len(todo)} of {len(lines)} clips to render", flush=True)
if args.first:
    todo.sort(key=lambda l: not l["id"].startswith(args.first))
if args.limit:
    todo = todo[: args.limit]

report = []
start = time.time()
for i, l in enumerate(todo, 1):
    out = STATIC / l["lang"] / f"{l['id']}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    best = (-1.0, "", None)
    single = len(l["text"].split()) == 1
    with tempfile.TemporaryDirectory() as tmp:
        for attempt in range(args.tries):
            take = Path(tmp) / f"{attempt}.mp3"
            try:
                if single:
                    score, heard = render_word(l, take, seed=args.seed + attempt, paused=attempt >= 2)
                else:
                    score, heard = render(l, take, seed=args.seed + attempt)
            except Exception as e:  # a seed can fail outright; try the next one
                best = max(best, (-0.5, f"error: {e}", None), key=lambda b: b[0])
                continue
            if score > best[0]:
                best = (score, heard, take if take.exists() else None)
            if score >= 0.85:
                break
        # A wrong take is worse than the browser voice. A single word must be heard exactly: in a spelling
        # game a near miss teaches the wrong word.
        keep = 0.85 if single else 0.8
        if best[2] and best[0] >= keep:
            best[2].replace(out)
        else:
            best = (best[0], best[1], None)
            out.unlink(missing_ok=True)
            manifest[l["lang"]].pop(l["id"], None)
    if best[0] < 0.85 or "(alone:" in best[1]:
        report.append({"lang": l["lang"], "id": l["id"], "text": l["text"], "heard": best[1], "score": round(best[0], 2)})
        Path(args.report).write_text(json.dumps(report, indent=1, ensure_ascii=False))
    if not best[2]:
        print(f"[{i}/{len(todo)}] {l['lang']} {l['id']}: {l['text']}  SKIPPED: {best[1]}", flush=True)
        continue  # no clip: the browser voice says this line
    manifest[l["lang"]][l["id"]] = l["hash"]
    save_manifest()
    eta = (time.time() - start) / i * (len(todo) - i)
    flag = "" if best[0] >= 0.85 and "(alone:" not in best[1] else f"  CHECK: heard {best[1]!r}"
    print(f"[{i}/{len(todo)}] {l['lang']} {l['id']}: {l['text']}{flag}  (eta {eta / 60:.0f} min)", flush=True)

print(f"done; {len(report)} clips to listen to, see {args.report}")
