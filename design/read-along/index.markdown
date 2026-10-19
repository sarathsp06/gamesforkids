---
co-review: design
---
# Add Read Along: the child reads fables aloud, the game listens and helps

## Context

The app has five games where the child listens and taps. None asks the child to read text aloud, which is the
step after Spell Pick: recognising whole words in a sentence. Google's Read Along does this: a story is shown,
the child reads it aloud, each word lights up as it is heard, and a helper says a word when the child is stuck.
Most of what that needs already exists here: recorded voice clips with a browser-voice fallback, the voice
catalog, graded gold / silver / bronze scoring, and the level and round structure of the other games. The new
part is listening to the child. This adds a sixth game, Read Along (`/read/`), in English and Dutch.

## Design

- Stories are short Aesop fables, retold by us in simple English and Dutch (new module `src/lib/stories.ts`)
  - Aesop is public domain; the retellings are our own words, so there is no copyright question
  - Ten fables, each told separately in each language: natural sentences, not a word-for-word translation
    - The Lion and the Mouse, The Tortoise and the Hare, The Fox and the Grapes, The Crow and the Pitcher, The Ant
      and the Grasshopper
    - The Boy Who Cried Wolf, The North Wind and the Sun, The Dog and his Bone, The Town Mouse and the Country
      Mouse, The Goose with the Golden Eggs
  - Each has a title and 5–8 sentences, ending with the moral in one line
  - Every sentence has a picture above it: a small scene of two or three large emoji (🦁 😴 🐭 for "The lion sleeps.
    A mouse runs by."), so a pre-reader can guess at words from the picture, as in a picture book
    - Emoji look different per device and can't show an action exactly; good enough for a first version
  - Four levels by sentence length: 1 three to five words ("The lion is big."), 2 up to seven,
    3 up to ten, 4 longer sentences with "but", "because"; the same fable may appear at two levels, retold
  - No digits or abbreviations in the text: speech recognition writes those differently from how they read
- One sentence at a time: the child reads it aloud and each word turns green as it is heard
  - The browser's speech recognition (Web Speech API) listens in the story's language, with live interim results
  - It runs on the device when the browser can (Chrome's `processLocally`); otherwise the browser's own service
    does it (Apple on iPad, Google in Chrome)
  - Recognition starts in the Play tap and keeps running across sentences, restarted when the browser stops it
    - Where a restart outside a tap is refused (iOS), a 🎤 button appears to tap and carry on
  - Can go wrong: children's speech is recognised badly. Handled by the next step, not by trusting the transcript
- What was heard is matched against the known sentence, in order and leniently
  - Each heard word is compared with the next expected word using Spell Pick's phonetic similarity
    - So "kat" heard for "cat" still counts
  - A heard word that matches the word after next marks the one in between as read too
    - The recogniser often drops short words like "a" or "de"
  - Matching only moves forward: interim results that are later revised never un-green a word
  - Can go wrong: a child reading ahead or guessing a whole sentence from the picture also turns words green.
    Accepted: the order check stops random words, and the goal is reading practice, not a test
- When the child is stuck, the game helps the way Read Along does
  - No progress on a word for 4 seconds: the word glows
  - After 8 seconds it is said aloud (its clip, else the browser voice) and the game listens for the repeat
  - 5 seconds after saying it, the word is marked and the game moves on, so a word the recogniser never catches
    can't trap the child
  - Tapping any word says it at any time; a "hear the sentence" button plays the whole sentence first
- Scoring reuses the graded stars
  - Per word: read alone is gold, read after it glowed is silver, said by the game (glow time-out or a tap) is
    bronze
  - Per sentence: all words gold is gold, no bronze word is silver, else bronze; a story is a round, with one dot
    per sentence
  - All but one sentence gold moves up a level, as in the other games
- The game always listens: there is no microphone switch (changed after review: one mode, as the reviewer asked)
  - The browser asks for the microphone once; nothing is recorded or sent by the app itself
- Where the browser can't listen, the story is read to the child
  - When recognition is missing (Firefox) or refused, the game reads each sentence aloud
    - Words light up one by one as they are spoken; the child taps ▶ for the next sentence
  - Word timing comes from the browser voice's word-boundary events where they fire, otherwise from an estimate
    by word length; no stars in this mode, since nothing is measured
- Story text joins the voice catalog, so it gets recorded clips like every other line
  - Every title, sentence and story word becomes a catalog line (`story.<id>.<n>`, `sword.<word>`); the existing
    renderer makes and checks the clips, and anything without a clip uses the browser voice
  - Can go wrong: single Dutch words are where the voice model is weakest; those fall back as today

## Alternatives

- Whisper running in the browser (on-device, private): about 200 MB to download, not live, and word timings are
  unreliable in the browser build. Too heavy to light words up as they are read.
- Vosk in the browser (on-device, can be limited to the story's words, which suits children's speech): the browser
  library has not been updated in two years. Worth revisiting if the Web Speech API proves too poor for children.
- A recorded voice reading the full story aloud with timings (karaoke only, no listening): simpler, but the child
  doesn't read. Kept as the no-microphone mode, not the main game.

## Behaviour

- The recogniser stops mid-sentence (silence, network loss): it restarts on its own; the words matched so far stay
  green, and the stuck-word help keeps the sentence moving if it can't restart.
- The child leaves mid-story: listening and speech stop at once; nothing of the voice is kept.
- Recognition results arrive for an earlier sentence after moving on: matching only looks at words heard since the
  current sentence started.
- The game reads a whole sentence aloud (🔊, or the title): matching pauses meanwhile, or the microphone would hear
  the app's own voice and turn the words green. A single help word doesn't pause it: the word is already marked as
  said, and the child often repeats it straight away.

## Open Questions

- Pictures: start with emoji scenes, or have real illustrations from the start? Drawn ones could be simple SVG
  pictures made per fable (more work, one consistent look), or images generated once on this Mac with an open
  image model and stored like the voice clips.
- Read Along has a helper character (Diya). Do you want one here (for example a friendly owl that speaks the help),
  or keep the plain glowing word?
- Ten fables per language, four levels: is that the right amount for a first version, or start with fewer?
