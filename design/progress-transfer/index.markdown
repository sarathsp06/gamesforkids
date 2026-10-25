---
co-review: design
---
# Move a child's progress to another device

## Context

Everything a child has lives in one device's `localStorage`: players, each one's sticker book, levels per
game, the play log, and Paint Pot's gallery. A family with a laptop and a phone has two separate sets. The app
has no accounts and no server, and the README promises none. Status: requirements only, not built
(October 2026). The transport is left open on purpose: a peer-to-peer mechanism from another of the owner's
projects may carry it.

## Design

- A grown-up can hand this device's progress to another device, and the other device takes it in
  - Started from the grown-ups area, never by a child
  - A QR code shown on one screen and scanned by the other is the preferred hand-off; a link that can be
    sent to yourself is the fallback
  - Nothing about a child passes through a server or an account; the data travels only between the two devices
- Taking progress in is a merge, confirmed by a grown-up, never a replacement
  - Players, stickers, levels and play history combine; nothing already on the device is lost
  - The grown-up sees who is being added before saying yes
- The gallery pictures may travel too, by a route that can carry them
- Two devices that have exchanged progress once should be able to keep in step later, using the same
  peer-to-peer pairing the presence design describes

## Open Questions

- Which transport: a self-contained link or QR, the peer-to-peer channel from the owner's other project, or
  both?
- Does the play history need to travel, or only players, stickers and levels?
