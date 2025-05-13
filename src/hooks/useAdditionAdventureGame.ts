
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdditionProblem, AdditionAdventureGameState, AdditionAdventureSessionStats, AdditionAdventurePhase } from '@/types';
import { ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, ADDITION_GAME_DURATION_SECONDS, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { StopCircle } from 'lucide-react'; // For drag/click feedback

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
  sumPileCount: 0,
  feedbackMessage: null,
  dragFeedback: null, // Will store 'stop' or similar to show icon
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
    num1,
    num2,
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
      clearAllTimeouts();
    };
  }, [loadSessions]);

  const clearAllTimeouts = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
    if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
  };
  
  const showPraise = useCallback(() => {
    const praise = ADDITION_PRAISE_MESSAGES[Math.floor(Math.random() * ADDITION_PRAISE_MESSAGES.length)];
    setGameState(prev => ({
      ...prev,
      showPraiseMessage: true,
      praiseText: praise.text, 
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
      if (prev.phase === 'sessionOver') return prev;

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

      if (sessionEndingNaturally && prev.isPlaying) {
        toast({
          title: "Great Effort!",
          description: `You solved ${prev.correctAttempts} problems. Score: ${prev.score}`,
        });
      }
      
      return {
        ...initialGameState,
        isPlaying: false, 
        phase: 'sessionOver',
        feedbackMessage: `Score: ${prev.score}`,
      };
    });
  }, [pastSessions, saveSessions, toast]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev.isPlaying) {
            clearInterval(timerRef.current!);
            return prev;
        }
        if (prev.timeLeft <= 1) {
          clearInterval(timerRef.current!);
          endSession(true); 
          return { ...prev, timeLeft: 0, isPlaying: false, phase: 'sessionOver' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, [endSession]);

  const setupNewProblem = useCallback(() => {
    clearAllTimeouts();
    const newProblem = generateProblem();
    setGameState(prev => ({
      ...prev,
      currentProblem: newProblem,
      pile1Count: newProblem.num1, // Pre-fill pile 1
      pile2Count: newProblem.num2, // Pre-fill pile 2
      sumPileCount: 0,
      phase: 'summingTime', // Start directly in summing phase
      feedbackMessage: null,
      dragFeedback: null,
      isCorrect: null,
    }));
     if (prev.isPlaying && prev.timeLeft > 0 && !timerRef.current) {
      startTimer();
    }
  }, [startTimer]);

  const startGame = useCallback(() => {
    clearAllTimeouts();
    setGameState(prev => ({
      ...initialGameState,
      isPlaying: true,
      phase: 'summingTime', // Initial phase after start
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS,
    }));
    setupNewProblem();
    startTimer();
  }, [setupNewProblem, startTimer]);
  
  // Addend piles are pre-filled, so this function is mostly a no-op or for feedback if mistakenly interacted with.
  const handleDropOnPile = useCallback((pileId: 1 | 2) => {
    setGameState(prev => {
        if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev; // Should not be called if addends prefilled

        // Give feedback that these piles are not interactive for adding
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' }));
        dragFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, dragFeedback: null }));
        }, 1500);
        return prev;
    });
  }, []);

  const processSumItem = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem || prev.sumPileCount < prev.currentProblem.correctAnswer) {
        // If not yet correct, or not in the right phase, or sum pile not full enough, return current state
        // If sumPileCount increased but not yet target, this means the update is already reflected
        // in the calling function's optimistic update or previous setState.
        return prev;
      }
      
      // This part executes if sumPileCount IS prev.currentProblem.correctAnswer
      const newIsCorrect = true;
      const newPhase: AdditionAdventurePhase = 'finalFeedback';
      showPraise();
      
      const newScore = prev.score + 10;
      const newCorrectAttempts = prev.correctAttempts + 1;
      const newCurrentStreak = prev.currentStreak + 1;
      const newLongestStreak = Math.max(prev.longestStreak, newCurrentStreak);

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        // Use a functional update for setGameState if relying on latest timeLeft
        setGameState(currentGs => {
            if (currentGs.timeLeft > 0 && currentGs.isPlaying) {
                setupNewProblem(); // This will reset sumPileCount etc.
                return currentGs; // setupNewProblem handles its own state update
            } else if (currentGs.isPlaying) {
                endSession(true);
                return currentGs; // endSession handles its own state update
            }
            return currentGs;
        });
      }, 1800);

      return {
          ...prev,
          isCorrect: newIsCorrect,
          phase: newPhase,
          score: newScore,
          correctAttempts: newCorrectAttempts,
          attempts: prev.attempts + 1,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          feedbackMessage: null,
          dragFeedback: null, // Clear any 'stop' feedback
      };
    });
  }, [showPraise, setupNewProblem, endSession]);


  const handleDropOnSumPile = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' }));
        dragFeedbackTimeoutRef.current = setTimeout(() => setGameState(gs => ({ ...gs, dragFeedback: null })), 1500);
        return prev; // Pile is full or overfilled
      }

      return {
        ...prev,
        sumPileCount: prev.sumPileCount + 1,
        dragFeedback: null, // Clear any previous stop
      };
    });
    // processSumItem will be called in useEffect listening to sumPileCount if it reaches target
    // OR, call it directly if you prefer explicit flow after state update.
    // For simplicity, let's call it after the state update that increments sumPileCount.
    // Need to ensure this call happens after sumPileCount is confirmed updated.
    // Using a separate useEffect for sumPileCount changes to trigger processSumItem is safer.
  }, []);
  
  // New function for click interaction
  const incrementSumPileOnClick = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' }));
        dragFeedbackTimeoutRef.current = setTimeout(() => setGameState(gs => ({ ...gs, dragFeedback: null })), 1500);
        return prev; // Pile is full
      }
      
      return {
        ...prev,
        sumPileCount: prev.sumPileCount + 1,
        dragFeedback: null,
      };
    });
  }, []);

  // Effect to process sum item when sumPileCount changes
  useEffect(() => {
    if (gameState.phase === 'summingTime' && gameState.currentProblem && gameState.sumPileCount === gameState.currentProblem.correctAnswer) {
      processSumItem();
    }
  }, [gameState.sumPileCount, gameState.phase, gameState.currentProblem, processSumItem]);
  
  const userEndSession = () => {
    endSession(false); 
  };

  return { gameState, startGame, handleDropOnPile, handleDropOnSumPile, incrementSumPileOnClick, userEndSession, pastSessions };
}

