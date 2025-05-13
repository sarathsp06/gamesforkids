
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdditionProblem, AdditionAdventureGameState, AdditionAdventureSessionStats, AdditionAdventurePhase } from '@/types';
import { ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, ADDITION_GAME_DURATION_SECONDS, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

export const DRAGGABLE_ITEM_TYPE_ADDITION = "addition_game_item";

const initialGameState: AdditionAdventureGameState = {
  currentProblem: null,
  score: 0,
  attempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  longestStreak: 0,
  pile1Count: 0,
  pile2Count: 0,
  feedbackMessage: null,
  dragFeedback: null,
  isCorrect: null,
  isPlaying: false,
  gameStartTime: null,
  timeLeft: ADDITION_GAME_DURATION_SECONDS,
  phase: 'startScreen',
  showPraiseMessage: false,
  praiseText: null,
  praiseIcon: null,
};

function generateProblem(): AdditionProblem {
  const num1 = Math.floor(Math.random() * ADDITION_NUMBER_RANGE.max) + ADDITION_NUMBER_RANGE.min;
  const num2 = Math.floor(Math.random() * ADDITION_NUMBER_RANGE.max) + ADDITION_NUMBER_RANGE.min;
  const item = ADDITION_ITEMS[Math.floor(Math.random() * ADDITION_ITEMS.length)];
  return {
    id: Math.random().toString(36).substring(7),
    num1, // Target for pile 1
    num2, // Target for pile 2
    item,
    correctAnswer: num1 + num2,
  };
}

export function useAdditionAdventureGame() {
  const [gameState, setGameState] = useState<AdditionAdventureGameState>(initialGameState);
  const [pastSessions, setPastSessions] = useState<AdditionAdventureSessionStats[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const praiseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const loadSessions = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY);
      if (stored) {
        setPastSessions(JSON.parse(stored));
      }
    }
  }, []);

  const saveSessions = useCallback((sessions: AdditionAdventureSessionStats[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, []);

  useEffect(() => {
    loadSessions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
      if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
    };
  }, [loadSessions]);

  const clearAllTimeouts = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
    if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
  };
  
  const showPraise = useCallback((type: 'pileComplete' | 'sumCorrect') => {
    const praise = ADDITION_PRAISE_MESSAGES[Math.floor(Math.random() * ADDITION_PRAISE_MESSAGES.length)];
    setGameState(prev => ({
      ...prev,
      showPraiseMessage: true,
      praiseText: type === 'pileComplete' ? "Great Piles!" : praise.text,
      praiseIcon: praise.icon
    }));
    if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
    praiseTimeoutRef.current = setTimeout(() => {
      setGameState(prev => ({ ...prev, showPraiseMessage: false, praiseText: null, praiseIcon: null }));
    }, 1500);
  }, []);

  const endSession = useCallback((sessionEndingNaturally = true) => {
    clearAllTimeouts();
    setGameState(prev => {
      if (prev.phase === 'sessionOver') return prev; // Avoid multiple calls

      const accuracy = prev.attempts > 0 ? (prev.correctAttempts / prev.attempts) * 100 : 0;
      const sessionDuration = prev.gameStartTime ? (Date.now() - prev.gameStartTime) / 1000 : ADDITION_GAME_DURATION_SECONDS - prev.timeLeft;
      
      const newSession: AdditionAdventureSessionStats = {
        id: new Date().toISOString() + Math.random().toString(16).slice(2),
        date: new Date().toISOString(),
        problemsSolved: prev.correctAttempts,
        accuracy: parseFloat(accuracy.toFixed(2)),
        durationSeconds: parseFloat(sessionDuration.toFixed(0)),
        longestStreak: prev.longestStreak,
        score: prev.score,
      };
      
      const updatedSessions = [newSession, ...pastSessions].slice(0, 10);
      setPastSessions(updatedSessions);
      saveSessions(updatedSessions);

      if (sessionEndingNaturally) { // Only toast if time ran out or user ended game
        toast({
          title: "Great Effort!",
          description: `You solved ${prev.correctAttempts} problems. Score: ${prev.score}`,
        });
      }

      return {
        ...initialGameState, // Reset to initial state but keep past sessions
        phase: 'sessionOver',
        timeLeft: ADDITION_GAME_DURATION_SECONDS,
        feedbackMessage: `Time's up! You scored ${prev.score}. Solved ${prev.correctAttempts} problems.`,
      };
    });
  }, [pastSessions, saveSessions, toast]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          endSession(true); // Session ends due to time running out
          return { ...prev, timeLeft: 0, isPlaying: false, phase: 'sessionOver' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, [endSession]);

  const setupNewProblem = useCallback(() => {
    const newProblem = generateProblem();
    setGameState(prev => ({
      ...prev,
      currentProblem: newProblem,
      pile1Count: 0,
      pile2Count: 0,
      phase: 'buildingPiles',
      feedbackMessage: `Drag ${newProblem.num1} ${newProblem.item.namePlural} to the first pile, and ${newProblem.num2} to the second pile.`,
      dragFeedback: null,
      isCorrect: null,
    }));
  }, []);

  const startGame = useCallback(() => {
    clearAllTimeouts();
    setGameState(prev => ({
      ...initialGameState,
      isPlaying: true,
      phase: 'buildingPiles', // Start directly with building piles
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS,
    }));
    setupNewProblem();
    startTimer();
  }, [setupNewProblem, startTimer]);

  const handleDropOnPile = useCallback((pileId: 1 | 2) => {
    setGameState(prev => {
      if (prev.phase !== 'buildingPiles' || !prev.currentProblem) return prev;

      let newPile1Count = prev.pile1Count;
      let newPile2Count = prev.pile2Count;
      let newDragFeedback: string | null = null;

      if (pileId === 1) {
        if (prev.pile1Count < prev.currentProblem.num1) {
          newPile1Count++;
        } else {
          newDragFeedback = `The first pile has enough ${prev.currentProblem.item.namePlural}!`;
        }
      } else { // pileId === 2
        if (prev.pile2Count < prev.currentProblem.num2) {
          newPile2Count++;
        } else {
          newDragFeedback = `The second pile has enough ${prev.currentProblem.item.namePlural}!`;
        }
      }
      
      if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
      if (newDragFeedback) {
        dragFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, dragFeedback: null }));
        }, 2000);
      }

      const pilesComplete = newPile1Count === prev.currentProblem.num1 && newPile2Count === prev.currentProblem.num2;
      let newPhase = prev.phase;
      let newFeedbackMessage = prev.feedbackMessage;

      if (pilesComplete) {
        newPhase = 'pilesBuilt_promptSum';
        newFeedbackMessage = `Great! Now, what is ${prev.currentProblem.num1} + ${prev.currentProblem.num2}?`;
        showPraise('pileComplete');
      } else {
         // Update instruction if not yet complete
         newFeedbackMessage = `Drag ${prev.currentProblem.num1} ${prev.currentProblem.item.namePlural} to the first pile (${newPile1Count}/${prev.currentProblem.num1}), and ${prev.currentProblem.num2} to the second pile (${newPile2Count}/${prev.currentProblem.num2}).`;
      }

      return {
        ...prev,
        pile1Count: newPile1Count,
        pile2Count: newPile2Count,
        dragFeedback: newDragFeedback,
        phase: newPhase,
        feedbackMessage: newFeedbackMessage,
      };
    });
  }, [showPraise]);
  
  const handleAnswer = useCallback((answer: number) => {
    setGameState(prev => {
      if (prev.phase !== 'pilesBuilt_promptSum' || !prev.currentProblem) return prev;

      const correctAnswer = prev.currentProblem.correctAnswer;
      const isSumCorrect = answer === correctAnswer;
      
      const newStreak = isSumCorrect ? prev.currentStreak + 1 : 0;
      let newFeedbackMessage = "";

      if (isSumCorrect) {
        newFeedbackMessage = "Correct!";
        showPraise('sumCorrect');
      } else {
        newFeedbackMessage = `Oops! ${prev.currentProblem!.num1} + ${prev.currentProblem!.num2} = ${correctAnswer}.`;
         if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(100);
        }
      }

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        if (prev.timeLeft > 0) {
          setupNewProblem();
        } else {
          endSession(true);
        }
      }, isSumCorrect ? 1700 : 2500);

      return {
        ...prev,
        attempts: prev.attempts + 1,
        correctAttempts: isSumCorrect ? prev.correctAttempts + 1 : prev.correctAttempts,
        score: isSumCorrect ? prev.score + 10 : prev.score, // Keep simple scoring
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        isCorrect: isSumCorrect,
        feedbackMessage: newFeedbackMessage,
        phase: 'finalFeedback',
      };
    });
  }, [setupNewProblem, endSession, showPraise]);

  // Function to manually end the game by the user
  const userEndSession = () => {
    endSession(false); // false indicates user initiated, not time run out
    setGameState(prev => ({
      ...prev,
      feedbackMessage: `Game ended. You scored ${prev.score}. Solved ${prev.correctAttempts} problems.`,
    }));
  };


  return { gameState, startGame, handleDropOnPile, handleAnswer, userEndSession, pastSessions };
}

