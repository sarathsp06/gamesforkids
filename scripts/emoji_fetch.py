"""Fetch the Fluent Emoji (Microsoft, MIT) flat SVG for every emoji the games show, into src/lib/assets/emoji/.

    python3 scripts/emoji_fetch.py

Stickers and story scenes are written as emoji in the code; drawn as the device's own emoji they look different
on every tablet. Each glyph used gets one small SVG in static/emoji/, named by its code points (1f431.svg),
which src/lib/Emoji.svelte loads as a plain file when it is shown (never inlined into the JavaScript), and
src/lib/emoji-keys.ts lists which glyphs have one. Only missing files are fetched; a glyph the set lacks
is reported and keeps rendering as text. Needs the internet once; nothing runs at build time.
"""
import json, re, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "emoji"
KEYS = ROOT / "src" / "lib" / "emoji-keys.ts"
DATA = "https://cdn.jsdelivr.net/npm/fluentui-emoji-js@1.2.1/emojiData.json"
ASSET = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets{folder}/Flat/{file}"
SOURCES = [ROOT / "src" / "lib" / "stories.ts", ROOT / "src" / "lib" / "words.ts"]

EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿][️]?(?:‍[\U0001F300-\U0001FAFF☀-➿][️]?)*")


def key(glyph: str) -> str:
    """Code points joined by '-', without the variation selector: the file name and the lookup key."""
    return "-".join(f"{ord(c):x}" for c in glyph if c != "️")


used = sorted({g for p in SOURCES for g in EMOJI.findall(p.read_text())})
data = json.loads(urllib.request.urlopen(DATA, timeout=60).read())
by_key = {}
for e in data:
    by_key[key(e["glyph"])] = e
    by_key.setdefault(e["unicode"].replace(" ", "-"), e)

OUT.mkdir(parents=True, exist_ok=True)
missing, fetched = [], 0
for g in used:
    k = key(g)
    e = by_key.get(k)
    flat = e["images"].get("Flat") if e else None
    if not e or not flat:
        missing.append(g)
        continue
    out = OUT / f"{k}.svg"
    if out.exists():
        continue
    url = ASSET.format(folder=urllib.parse.quote(e["folder"]), file=flat[0])
    svg = urllib.request.urlopen(url, timeout=60).read()
    out.write_bytes(svg)
    fetched += 1
have = sorted(p.stem for p in OUT.glob("*.svg"))
KEYS.write_text("// Written by scripts/emoji_fetch.py: the glyphs that have a drawn SVG in static/emoji/.\n"
                f"export const EMOJI_KEYS = new Set({json.dumps(have)});\n")
print(f"{len(used)} emoji used, {fetched} fetched, {len(list(OUT.glob('*.svg')))} files in {OUT.relative_to(ROOT)}")
if missing:
    print("not in the set (shown as text):", " ".join(missing))
    sys.exit(0)
