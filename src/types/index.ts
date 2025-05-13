import type { LucideIcon } from 'lucide-react';

export interface PerformanceData {
  correctPresses: number; // Correct letters typed
  totalPresses: number; // Total letters attempted
  gameStartTime: number | null; // Timestamp
  currentWPM: number;
  currentAccuracy: number;
  currentStreak: number; // Correct letters in a row
  longestStreak: number;
  wordsTyped: number; // Number of words successfully typed
}

export interface SessionStats {
  id: string;
  date: string; // ISO string
  accuracy: number; // Percentage
  wpm: number;
  lettersTyped: number; // Total correct letters
  wordsTyped: number;
  durationMinutes: number;
  longestStreak: number;
}

export type FeedbackType = 'correct' | 'incorrect' | 'timeout' | null;

export interface GameState extends PerformanceData {
  currentWord: string | null;
  currentWordIndex: number; // Index of the current letter to type in currentWord
  typedWordPortion: string; // The portion of the current word typed correctly so far
  isPlaying: boolean;
  feedback: FeedbackType;
  feedbackLetter: string | null; // The letter that received feedback
  currentLevel: number; // Difficulty level (1-10), might affect word choice
  isSessionOver: boolean;
  showStartScreen: boolean;
  showPraiseMessage: boolean;
  praiseText: string | null;
  praiseIcon: LucideIcon | null;
  activeHand: 'left' | 'right' | null;
}

// AdaptiveSpeedInput and AdaptiveSpeedOutput removed from here.
// They are now defined and exported by src/ai/flows/adaptiveSpeedFlow.ts
