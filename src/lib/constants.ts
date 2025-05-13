export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); // Kept for now, might be unused

export const WORDS = [
  "APPLE", "BANANA", "CHERRY", "DATE", "ELDERBERRY",
  "FIG", "GRAPE", "HONEYDEW", "KIWI", "LEMON",
  "MANGO", "NECTARINE", "ORANGE", "PAPAYA", "QUINCE",
  "RASPBERRY", "STRAWBERRY", "TANGERINE", "UGLI", "VANILLA",
  "WATERMELON", "XYLIA", "YUZU", "ZUCCINI"
];

export const INITIAL_LEVEL = 1; // Level might now relate to word length or complexity
export const MAX_LEVEL = 5; // Example max level
export const MIN_LEVEL = 1;

// LEVEL_TO_INTERVAL_MS is less relevant if there's no automatic letter timeout.
// Kept for now, but its usage will change or be removed from game logic.
export const LEVEL_TO_INTERVAL_MS: { [key: number]: number } = {
  1: 3500, // Slowest (longest words or more time per word)
  2: 3000,
  3: 2700,
  4: 2400,
  5: 2100, // Fastest (shortest words or less time per word)
};

// These constants are for the AI speed adjustment, which needs to be rethought for word-based gameplay.
// export const LETTERS_PER_LEVEL_ADJUSTMENT = 10; // Adjust speed every 10 letters (or N words)
// export const MIN_WPM_FOR_LEVEL_UP = 15;
// export const MIN_ACCURACY_FOR_LEVEL_UP = 0.85; // 85%
// export const MAX_ACCURACY_FOR_LEVEL_DOWN = 0.70; // 70%

export const LOCAL_STORAGE_SESSIONS_KEY = "letterLeapSessions";
