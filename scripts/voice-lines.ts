// npx tsx scripts/voice-lines.ts > lines.json — every spoken line, for scripts/voice_render.py.
import { allLines, textHash } from '../src/lib/i18n';

const out = (['en', 'nl'] as const).flatMap((lang) => allLines(lang).map((l) => ({ lang, ...l, hash: textHash(l.text) })));
const ids = new Set(out.map((l) => `${l.lang}/${l.id}`));
if (ids.size !== out.length) throw new Error('duplicate line ids');
console.log(JSON.stringify(out, null, 1));
