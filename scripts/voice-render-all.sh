#!/bin/zsh
# Render every missing clip in batches of 40, until nothing is left or a batch makes no progress. Lines that
# failed in an earlier batch of this run aren't retried. VoiceStudio.app must be open.
#   [FIRST=story.] [TRIES=8] [FORCE=1] scripts/voice-render-all.sh [workdir]
set -u
cd "${0:A:h}/.."
WORK=${1:-${TMPDIR:-/tmp}/voice-render}
mkdir -p "$WORK"
rm -f "$WORK"/report-*.json(N)
npx --yes tsx scripts/voice-lines.ts > "$WORK/lines.json"
: > "$WORK/render.log"
extra=()
[[ -n ${FIRST:-} ]] && extra=(--first "$FIRST")
[[ -n ${TRIES:-} ]] && extra+=(--tries "$TRIES")
# FORCE: forget every clip once, so each batch renders the next 40 still missing (a --force on every batch
# would redo the same 40 each time).
[[ -n ${FORCE:-} ]] && printf '{\n "en": {},\n "nl": {}\n}\n' > src/lib/voice-manifest.json
prev=-1
for b in {1..60}; do
  python3 scripts/voice_render.py "$WORK/lines.json" --limit 40 "${extra[@]}" \
    --report "$WORK/report-$b.json" --skip "$WORK"/report-*.json(N) 2>&1 \
    | grep --line-buffered -E "^\[|clips to render|done|Traceback|error" >> "$WORK/render.log"
  left=$(grep "clips to render" "$WORK/render.log" | tail -1 | awk '{print $1}')
  echo "batch $b left-before $left" >> "$WORK/render.log"
  [[ "$left" == 0 || "$left" == "$prev" ]] && break
  prev=$left
done
echo ALL-DONE >> "$WORK/render.log"
