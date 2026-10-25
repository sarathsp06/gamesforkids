---
co-review: design
---
# Move a child's progress to another device, with no server

## Context

Everything a child has lives in this device's `localStorage`: players, each one's sticker book, levels per
game, the play log, and Paint Pot's gallery. A family with a laptop and a phone has two separate sets. The
app has no accounts and no server, and the README promises none, so progress has to travel by itself.
Status: plan, not built (October 2026).

## Design

- One "move my progress" link, made on the grown-ups page
  - The progress without the gallery (a few kilobytes) is compressed (`CompressionStream`) and base64url-encoded
    into the site URL's fragment: `…/gamesforkids/#move=…`
  - A fragment never leaves the browser, so nothing about a child is sent to GitHub Pages or anyone else
  - Shown as a QR code (the `qrcode` library, MIT, about 20 kB) for a phone camera, and as a copyable link
    for AirDrop, a message to yourself, or email
  - Can go wrong: too much play log makes the QR dense; keep the newest 100 entries in the link
- Opening the link imports it, after a grown-up says yes
  - The first page sees `#move=`, decodes it, and asks "Add Mila and Sam to this device?" with the players'
    faces; nothing changes until Yes
  - Import merges, never replaces, so a link can be carried either way without loss
    - Players matched by id; a player not on this device is added
    - Sticker books: union per player. Levels: the higher per game. Play log: union by game and start time
  - After importing it offers this device's own link, so two scans link both ways
  - Can go wrong: a stale link from weeks ago; the merge rules make it harmless
- Export and import as a file, for a full backup
  - The same data plus the gallery pictures (PNGs, too big for a QR); downloaded as one JSON file from the
    grown-ups page and imported with a file picker, same merge
- Live linking later, through the presence design's device pairing
  - A QR is a snapshot. Two devices paired with the picture code (see `design/presence`) can exchange and merge
    progress whenever both are online, with the same rules, with no third mechanism

## Alternatives

- A six-letter code typed by hand: a grown-up could, but the QR does the same with less friction.
- A cloud mailbox or relay, even a free one: breaks "no accounts, no tracking", and holds children's data.
- Automatic import on first launch without confirmation: a stray link could change a device; rejected.

## Open Questions

- Should the link carry the play log at all, or only players, stickers and levels?
- Should a player have a device-independent id from creation on, to make matching by id reliable?
