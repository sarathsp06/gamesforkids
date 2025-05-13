
import type { LucideIcon } from 'lucide-react';
import type { AdditionItem } from '@/lib/constants'; // PraiseMessage removed as it's used internally in constants

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
  num1: number; // Target for pile 1
  num2: number; // Target for pile 2
  item: AdditionItem;
  correctAnswer: number; // num1 + num2
}

export type AdditionAdventurePhase =
  | 'startScreen'
  | 'instructions' // Displaying "Drag X items to Pile 1 and Y to Pile 2"
  | 'buildingPiles'
  | 'pilesBuilt_promptSum' // Piles are correct, now prompt for the sum
  | 'finalFeedback' // Feedback for the sum answer
  | 'sessionOver';

export interface AdditionAdventureGameState {
  currentProblem: AdditionProblem | null;
  score: number;
  attempts: number; // Number of sum attempts
  correctAttempts: number; // Number of correct sum answers
  currentStreak: number; // Correct sum answers in a row
  longestStreak: number;

  pile1Count: number;
  pile2Count: number;
  
  feedbackMessage: string | null; // General feedback or instructions
  dragFeedback: string | null; // Specific to drag actions, e.g., "Pile full"
  isCorrect: boolean | null; // For sum answer correctness

  isPlaying: boolean; // Overall game session is active
  // isSessionOver will be determined by phase: 'sessionOver'
  // showStartScreen will be determined by phase: 'startScreen'
  
  gameStartTime: number | null;
  timeLeft: number; // in seconds for the entire session

  phase: AdditionAdventurePhase;

  showPraiseMessage: boolean;
  praiseText: string | null;
  praiseIcon: LucideIcon | null;
}

export interface AdditionAdventureSessionStats {
  id: string;
  date: string; // ISO string
  problemsSolved: number; // Number of sums correctly answered
  accuracy: number; // Percentage of correct sums
  durationSeconds: number;
  longestStreak: number;
  score: number;
}

