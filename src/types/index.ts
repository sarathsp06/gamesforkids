
import type { LucideIcon } from 'lucide-react';
import type { AdditionItem } from '@/lib/constants';

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
  | 'summingTime' // Addend piles are pre-filled, user drags/taps items to a sum pile
  | 'finalFeedback' // Feedback for the sum answer
  | 'awaitingConfirmation' // Waiting for user to proceed after correct answer
  | 'sessionOver';

export interface AdditionAdventureGameState {
  currentProblem: AdditionProblem | null;
  score: number;
  attempts: number; // Number of sum attempts/completions
  correctAttempts: number; // Number of correct sums
  currentStreak: number; // Correct sum answers in a row
  longestStreak: number;

  draggedFromPile1Count: number;
  draggedFromPile2Count: number;
  sumPileCount: number; // Count of items in the sum pile, user interacts with this
  
  feedbackMessage: string | null; 
  dragFeedback: string | null; 
  isCorrect: boolean | null; 

  isPlaying: boolean; 
  
  gameStartTime: number | null;
  timeLeft: number; 

  phase: AdditionAdventurePhase;

  showPraiseMessage: boolean;
  praiseText: string | null; 
  praiseIcon: LucideIcon | null;
  toastMessageInfo?: { title: string; description: string } | null; 
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

// Types for Jigsaw Puzzle Game
export interface JigsawMap {
  id: string;
  name: string;
  imageUrl: string;
  pieces: { x: number, y: number }; // e.g., {x: 6, y: 4} for a 6x4 grid
  imageAspectRatio?: number; // Optional: e.g., 16/9 or 4/3
  // pieceImageUrls?: string[]; // Optional: if pieces are pre-cut images
}

export interface PuzzlePiece { // This type might be mostly conceptual if library handles piece data
  id: string; 
  originalIndex: number; 
  currentSlotIndex: number | null; 
  isPlacedCorrectly: boolean;
  imageUrl: string; 
  x: number; 
  y: number; 
}

export type JigsawPhase = 'mapSelection' | 'loadingLibrary' | 'playing' | 'completed';

export interface JigsawGameState {
  selectedMap: JigsawMap | null;
  // pieces and boardSlots are managed by the library, so they are removed from direct state management here
  isPuzzleComplete: boolean; 
  showPreview: boolean; 
  phase: JigsawPhase;
  isLibraryInitialized: boolean; 
  isPuzzleSolvedByLibrary: boolean; 
}

export interface JigsawSessionStats {
  id: string;
  date: string;
  mapId: string;
  timeTakenSeconds: number;
  moves: number;
  gridSize: number; // total number of pieces (x*y)
}
