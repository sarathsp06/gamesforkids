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

// For AI Flow
export interface AdaptiveSpeedInput {
  accuracy: number; // 0-1
  wpm: number;
  currentLevel: number; // Current difficulty level
  totalLettersAttempted: number;
}

export interface AdaptiveSpeedOutput {
  newLevel: number; // Suggested new difficulty level
}

// AdaptiveSpeedFlowType removed as it's no longer used.
// The streamFlow utility from @genkit-ai/next/client infers types or uses generics
// with the actual flow object.
