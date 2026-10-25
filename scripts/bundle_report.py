"""What each page costs to load: JS, CSS and other assets it pulls in, raw and gzipped, from the build.

    BASE_PATH=/gamesforkids npm run build && python3 scripts/bundle_report.py [--json out.json]

Walks Vite's client manifest from each route's entry through its static imports (what must arrive before the
page can run), and lists the dynamic imports separately (loaded later, on demand). Run it before and after a
performance change to see what moved.
"""
import argparse, gzip, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".svelte-kit" / "output" / "client"
MANIFEST = OUT / ".vite" / "manifest.json"

ap = argparse.ArgumentParser()
ap.add_argument("--json", help="also write the numbers to this file")
args = ap.parse_args()

m = json.loads(MANIFEST.read_text())
size_cache: dict[str, tuple[int, int]] = {}


def size(file: str) -> tuple[int, int]:
    if file not in size_cache:
        b = (OUT / file).read_bytes()
        size_cache[file] = (len(b), len(gzip.compress(b, 9)))
    return size_cache[file]


def closure(key: str, seen: set[str]) -> None:
    """Every chunk a key statically imports, itself included."""
    if key in seen:
        return
    seen.add(key)
    for k in m[key].get("imports", []):
        closure(k, seen)


def files_of(keys: set[str]) -> tuple[set[str], set[str], set[str]]:
    js, css, assets = set(), set(), set()
    for k in keys:
        e = m[k]
        js.add(e["file"])
        css.update(e.get("css", []))
        assets.update(a for a in e.get("assets", []) if not a.endswith((".mp3",)))
    return js, css, assets


def total(files: set[str]) -> tuple[int, int]:
    return sum(size(f)[0] for f in files), sum(size(f)[1] for f in files)


# The app shell every page needs: SvelteKit's start and app entries.
shell_keys: set[str] = set()
for k, e in m.items():
    # The page nodes are entries too; only the app/start entries are shared by every page.
    if e.get("isEntry") and "/nodes/" not in k:
        closure(k, shell_keys)
shell_js, shell_css, _ = files_of(shell_keys)

# SvelteKit's route nodes (nodes/N.js) each re-export one page or layout; read which, from the generated files.
NODES = ROOT / ".svelte-kit" / "generated" / "build" / "client-optimized" / "nodes"
node_of: dict[str, str] = {}
for f in NODES.glob("*.js"):
    src = f.read_text()
    if "+page.svelte" in src:
        route = src.split("src/routes/")[1].split("+page.svelte")[0].rstrip("/") or "/"
        node_of[route] = next(k for k in m if k.endswith(f"nodes/{f.name}"))
layout = next(k for k in m if k.endswith("nodes/0.js"))
rows = []
for name, k in sorted(node_of.items()):
    keys: set[str] = set()
    closure(layout, keys)
    closure(k, keys)
    js, css, assets = files_of(keys)
    dyn = {d for kk in keys for d in m[kk].get("dynamicImports", [])}
    jr, jg = total(js | shell_js)
    cr, cg = total(css | shell_css)
    fonts = {a for a in assets if a.endswith((".woff2", ".woff"))}
    other = assets - fonts
    rows.append({"route": name, "js": jr, "js_gz": jg, "css": cr, "css_gz": cg, "chunks": len(js | shell_js),
                 "fonts": len(fonts), "other_assets": len(other), "other_kb": round(total(other)[0] / 1024, 1),
                 "lazy": len(dyn)})

print(f"{'route':<14}{'JS kB':>8}{'JS gz':>8}{'CSS gz':>8}{'chunks':>8}{'fonts':>7}{'assets':>8}{'lazy':>6}")
for r in rows:
    print(f"{r['route']:<14}{r['js']/1024:>8.1f}{r['js_gz']/1024:>8.1f}{r['css_gz']/1024:>8.1f}{r['chunks']:>8}{r['fonts']:>7}"
          f"{r['other_assets']:>8}{r['lazy']:>6}")

# The biggest chunks overall, and which source modules they hold.
print("\nbiggest chunks (gzip kB): file  <- sources")
chunks = sorted(((size(e["file"])[1], k, e["file"]) for k, e in m.items() if e["file"].endswith(".js")), reverse=True)[:10]
for gz, k, f in chunks:
    print(f"{gz/1024:>6.1f}  {f}  <- {k}")
if args.json:
    Path(args.json).write_text(json.dumps(rows, indent=1))
