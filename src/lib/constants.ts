export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const INITIAL_LEVEL = 3; // Start at level 3
export const MAX_LEVEL = 10;
export const MIN_LEVEL = 1;

// Maps difficulty level (1-10) to letter display interval in milliseconds
export const LEVEL_TO_INTERVAL_MS: { [key: number]: number } = {
  1: 3500,
  2: 3000,
  3: 2700, // Initial interval
  4: 2400,
  5: 2100,
  6: 1800,
  7: 1500,
  8: 1300,
  9: 1100,
  10: 900,
};

export const LETTERS_PER_LEVEL_ADJUSTMENT = 10; // Adjust speed every 10 letters
export const MIN_WPM_FOR_LEVEL_UP = 15;
export const MIN_ACCURACY_FOR_LEVEL_UP = 0.85; // 85%
export const MAX_ACCURACY_FOR_LEVEL_DOWN = 0.70; // 70%

export const LOCAL_STORAGE_SESSIONS_KEY = "letterLeapSessions";
