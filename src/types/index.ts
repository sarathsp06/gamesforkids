import type { LucideIcon } from 'lucide-react';
import type { AdditionItem, PraiseMessage } from '@/lib/constants';

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

// Types for Addition Adventure Game
export interface AdditionProblem {
  id: string;
  num1: number;
  num2: number;
  item: AdditionItem;
  correctAnswer: number;
}

export interface AdditionAdventureGameState {
  currentProblem: AdditionProblem | null;
  score: number;
  attempts: number;
  correctAttempts: number;
  currentStreak: number;
  longestStreak: number;
  feedbackMessage: string | null;
  isCorrect: boolean | null;
  isPlaying: boolean;
  isSessionOver: boolean;
  showStartScreen: true;
  gameStartTime: number | null;
  timeLeft: number; // in seconds
  showPraiseMessage: boolean;
  praiseText: string | null;
  praiseIcon: LucideIcon | null;
}

export interface AdditionAdventureSessionStats {
  id: string;
  date: string; // ISO string
  problemsSolved: number;
  accuracy: number; // Percentage
  durationSeconds: number;
  longestStreak: number;
  score: number;
}
