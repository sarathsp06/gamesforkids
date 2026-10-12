# Recorded voice

Every spoken line lives in `src/lib/i18n.ts`, keyed like an i18n catalog with an English and a Dutch text.
Each (language, key) can have a clip at `static/voice/<lang>/<key>.mp3`. `speak()` plays clips when every
line it is given has one made from its current text (`src/lib/voice-manifest.json` stores a hash of that
text), and otherwise falls back to the browser voice. So editing a text never plays a stale clip, it just
falls back until the clip is rendered again.

Clips are made on a Mac with [Chatterbox Multilingual](https://github.com/resemble-ai/chatterbox) (MIT,
runs locally on Apple Silicon; no account or API key) and checked with local Whisper.

## Setup (once)

```bash
uv venv --python 3.11 ~/.venvs/voice
uv pip install --python ~/.venvs/voice/bin/python chatterbox-tts mlx-whisper 'setuptools<81'
```

The first run downloads the models (a few GB) from Hugging Face.

## Render

```bash
npx tsx scripts/voice-lines.ts > /tmp/lines.json
~/.venvs/voice/bin/python scripts/voice_render.py /tmp/lines.json
```

Only missing or changed lines are rendered (about 7 s each); clips for removed lines are deleted. Each clip
is transcribed with Whisper: if it doesn't say its line or runs far too long (the model sometimes babbles
after one-word inputs), it is rendered again with another seed, up to 4 times. Lines that never pass are
listed in `/tmp/voice-report.json`: listen to those. `--tempo` (default 0.85) slows clips without changing
pitch; `--force` re-renders everything.

## Adding a line

Add the key to both `en` and `nl` in `src/lib/i18n.ts` (TypeScript insists), use it with `t(lang, key)`,
then render. Words, letters and sticker animals come from `words.ts` and `spell.ts` automatically.
