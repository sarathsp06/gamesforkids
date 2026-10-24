# Recorded voice

Every spoken line lives in `src/lib/i18n.ts`, keyed like an i18n catalog with an English and a Dutch text.
Each (language, key) can have a clip at `static/voice/<lang>/<key>.mp3`. `speak()` plays clips when every
line it is given has one made from its current text (`src/lib/voice-manifest.json` stores a hash of that
text), and otherwise falls back to the browser voice. So editing a text never plays a stale clip, it just
falls back until the clip is rendered again.

Clips are made on a Mac with [VoiceStudio](https://github.com/debpalash/VoiceStudio) (MIT, runs locally on
Apple Silicon; no account or API key) through its local API, and checked with its transcriber. Pip's voice is
designed, not recorded: one OmniVoice instruction, one speed and one seed, so every clip in both languages is
the same calm voice.

| Setting | Value | Why |
|---|---|---|
| `--instruct` | `female, young adult, low pitch` | soothing; OmniVoice only takes its own fixed vocabulary |
| `--speed` | `0.85` | calm pace at render time, not a tempo stretch afterwards |
| `--seed` | `4242` | the same voice on every clip; a retry uses the next seed |

Changing any of these changes the voice: re-render everything with `--force`, on purpose.

## Setup (once)

Install VoiceStudio.app and open it; the script talks to `http://127.0.0.1:3900`. Needs `ffmpeg` and
Python 3 (standard library only).

## Render

```bash
npx tsx scripts/voice-lines.ts > /tmp/lines.json
python3 scripts/voice_render.py /tmp/lines.json
```

For the whole catalog, `scripts/voice-render-all.sh` does the same in batches of 40 (`FORCE=1` to re-render
everything); the log is in `$TMPDIR/voice-render/render.log`.

Only missing or changed lines are rendered (about 2 s each); clips for removed lines are deleted. Each clip
is transcribed: if it doesn't say its line or runs far too long, it is rendered again with the next seed, up
to 4 times. Lines that never pass are listed in `/tmp/voice-report.json`; takes below 0.8 (0.85 for a single
word, where a near miss would teach the wrong word) are not used, and the browser voice says those lines.

A single word is said inside a carrier sentence ("Het woord is: jas.") and cut out at the pause before it:
alone, the model reads short Dutch words as English ("jas" came out as "yes"). The report also lists cut
words that the transcriber hears differently on their own, for a listen; that transcriber is unreliable on a
bare word, so those are usually fine.

## Adding a line

Add the key to both `en` and `nl` in `src/lib/i18n.ts` (TypeScript insists), use it with `t(lang, key)`,
then render. Words, letters, sticker animals, story text, colours and chapter names come from their modules
automatically.
