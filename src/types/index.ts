export interface PerformanceData {
  correctPresses: number;
  totalPresses: number;
  gameStartTime: number | null; // Timestamp
  currentWPM: number;
  currentAccuracy: number;
  currentStreak: number;
  longestStreak: number;
}

export interface SessionStats {
  id: string;
  date: string; // ISO string
  accuracy: number; // Percentage
  wpm: number;
  lettersTyped: number;
  durationMinutes: number;
  longestStreak: number;
}

export type FeedbackType = 'correct' | 'incorrect' | 'timeout' | null;

export interface GameState extends PerformanceData {
  currentLetter: string | null;
  isPlaying: boolean;
  feedback: FeedbackType;
  letterIntervalMs: number; // Time per letter, adjusted by AI
  currentLevel: number; // Difficulty level (1-10)
  isSessionOver: boolean;
  showStartScreen: boolean;
}

// AdaptiveSpeedInput and AdaptiveSpeedOutput removed from here.
// They are now defined and exported by src/ai/flows/adaptiveSpeedFlow.ts
