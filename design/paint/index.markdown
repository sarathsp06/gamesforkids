---
co-review: design
---
# Add Paint Pot: the child colours in a picture and learns colour words

## Context

All six games ask the child to find a right answer. None lets them just make something, and none teaches colour
words, which children learn at about ages 2–5, before most of what the other games teach. A colouring page does
both: the child picks a crayon, hears its name ("red" / "rood"), and fills the picture in. This adds a seventh game,
Paint Pot (`/paint/`), in English and Dutch, kept very simple.

It is also the first game to use an outside library at runtime. Until now the app has had no runtime dependencies
except a font, and boards are DOM and SVG. Freehand drawing and flood fill on a bitmap are solved problems, so we
take a small, well-made library instead of writing our own, and we check the rule still holds in spirit: tiny,
no framework, no network, nothing to set up.

## Design

- The brush is [Atrament](https://github.com/jakubfiala/atrament) 5.1 (MIT), the bucket is
  [q-floodfill](https://github.com/pavelkukov/q-floodfill) 1.3 (MIT) (changed after the build check)
  - Atrament draws on a plain `<canvas>` with pointer events, so mouse, finger and stylus all work, and smooths a
    child's shaky line. About 2.4 kB gzipped, with a short type declaration of our own (`src/lib/atrament.d.ts`)
  - Its own fill was checked first: the worker is inlined as a blob, so Vite and the Pages base path are no problem
  - But it fills at the last pointer *move*, and a finger tap has none, so on a tablet the paint lands in the wrong
    place; it also ignores CSS scaling of the canvas
  - So the bucket is our own tap handler around q-floodfill (about 1.8 kB, typed, with a colour tolerance), as
    planned for this case
  - Only the paint route imports them, so the other games' pages don't load them
- One screen: a picture to colour, a row of crayons, two tools
  - The picture is a thick black outline (the app's 4 px ink style, drawn at 8 px for small fingers) on white
    - Pictures come in chapters, one per story (added after the first version)
      - My world (sun, house, fish, cat, flower, car, tree, butterfly), The Three Little Pigs, Little Red
        Riding Hood, The Tortoise and the Hare; four pictures per story
      - Characters from fairy tales and Aesop's fables (public domain), drawn in our own style; not Disney or
        other studio characters, which are copyrighted
      - A chapter card shows two of its pictures and a dot per picture, filled once it is painted; tapping it
        says the story's name. A finished picture gets a star on its card. Every chapter is open from the start
    - Each is a few SVG paths in a new module `src/lib/paint.ts`, drawn with large closed areas so they are easy
      to fill. No image files
  - Two stacked canvases: the bottom one is painted on, and the outline is drawn on both
    - The bottom copy gives fill its edges; the top copy (no pointer events) keeps the lines crisp when a brush
      stroke goes over them, so a scribble never hides the picture
    - Can go wrong: the outline's soft (anti-aliased) edge pixels can let fill leak or leave a pale ring. Thick
      lines plus fill tolerance should cover it; test this first with the real pictures
  - Nine crayons, big round buttons at least 64 px: red, orange, yellow, green, blue, purple, pink, brown, black.
    Red, blue, yellow (sun) and green (leaf) are the app's own palette colours
    - Tapping a crayon says its name in the chosen language. This is the learning part: the child hears the
      word every time they choose
  - Two tools, drawn as pictures, not words: a fat brush and a paint bucket. No eraser; a one-step undo button
    (↶) instead, which is easier for a small child to understand
    - Undo keeps a snapshot of the canvas before each stroke or fill, up to the last ten
  - No colour picker, no brush sizes, no layers, no text
- Finishing a picture works like a round in the other games
  - A ✓ button ends the picture: the chime plays, praise is spoken ("You made a sunny house!" style lines, one per
    picture), and the picture goes into a small gallery
  - The gallery is like Letter Leap's sticker book: a grid of the child's own pictures, opened from the start
    screen. Tap one to see it big. Kept as small PNGs in `localStorage` (about 320 px wide, newest twelve)
  - No stars and no grade for free colouring: there is no wrong way to colour a picture
- One small listening level, for colour words (later: not in the first version)
  - Level 1 is free colouring (above)
  - Level 2, "Listen and colour": the game asks for one part at a time, "Make the sun yellow!"
    - Each picture marks its parts with a point inside each area and a colour it asks for, in `paint.ts`
    - After each fill or stroke, the game reads the pixel at that point to see which crayon was used
    - Scoring reuses the graded stars, never a fail
      - Right colour first time is gold
      - A neighbouring colour (orange for yellow, purple for blue) is silver, with a warm "Almost! That's orange.
        Can you find yellow?"
      - Anything else gets the request again; finishing after more tries is bronze
    - Three or four requests per picture; the rest of the picture is free. Four gold out of five pictures moves
      up, as in the other games
    - Can go wrong: a child who colours the area but misses the exact point isn't counted yet. The check reads a
      small area around the point, not one pixel, and a ✓ tap re-checks before asking again
- Fits the rest of the app
  - Start screen, language flags, home button, praise and the gallery button work as in the other games
  - Every new line (colour names, requests, praise per picture, "almost" lines) goes into the voice catalog in
    `src/lib/i18n.ts`, so the existing renderer records clips for them; the browser voice fills any gap
  - Level and gallery persist through `src/lib/storage.ts` like the other games
  - Under reduced motion, nothing animates except the strokes the child draws
  - New tests in `tests/paint.test.ts` for the pure parts: each picture's check points sit inside an area, and
    colour nearness (yellow and orange are near; yellow and blue are far)
  - A seventh tile on the home page; the README table and the "no runtime dependencies" line are updated

## Alternatives

- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) (MIT): the nicest-looking strokes, but it
  only turns points into a stroke outline. We would still write pointer handling, canvas drawing, fill and undo
  ourselves.
- Atrament for strokes plus [q-floodfill](https://github.com/pavelkukov/q-floodfill) (MIT, about 1.8 kB) for the
  bucket: the fallback if Atrament's worker fill doesn't build or leaks at the outlines. q-floodfill runs on the
  main thread but is fast enough for a picture this size (about 30–40 ms for 800×660), and takes a colour
  tolerance.
- Fabric.js or Konva: full object-based canvas frameworks with shapes, selection and transforms. Far more than a
  colouring page needs, and much bigger.
- Colouring by tapping SVG areas, no library at all: each area is an SVG path, a tap sets its fill. Very simple
  and perfectly clean, but there is no brush, so it isn't painting. Worth keeping in mind if the canvas approach
  proves fiddly on small phones.

## Behaviour

- The child paints off the edge of the picture: strokes stay on the canvas; the outline stays on top.
- The child leaves mid-picture: the picture isn't saved; nothing is asked. Only ✓ saves.
- The page is turned or resized: the canvas keeps a fixed size and scales with CSS, so nothing already painted is
  lost or stretched differently.
- Two fingers at once: only the first pointer paints, so a resting palm doesn't scribble.
- `localStorage` is full: the oldest gallery picture is dropped; if it still doesn't fit, the picture just isn't
  kept, and the game carries on.

## Open Questions

- Would you like colour mixing as a later level (yellow and blue make green), or is that a separate game?
