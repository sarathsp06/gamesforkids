
"use client";

// This directive indicates that the component should be rendered on the client-side.

import { useToast } from "@/hooks/use-toast";
import { ADDITION_GAME_DURATION_SECONDS, ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY } from '@/lib/constants';
import type { AdditionAdventureGameState, AdditionAdventurePhase, AdditionAdventureSessionStats, AdditionProblem } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  dragFeedback: null, 
  isCorrect: null,
  isPlaying: false,
  gameStartTime: null,
  timeLeft: ADDITION_GAME_DURATION_SECONDS,
  phase: 'startScreen',
  showPraiseMessage: false,
  praiseText: null,
  praiseIcon: null,
  toastMessageInfo: null, 
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
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For finalFeedback to awaitingConfirmation transition
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

  const clearProblemSpecificTimeouts = useCallback(() => {
    if (feedbackTimeoutRef.current) { clearTimeout(feedbackTimeoutRef.current); feedbackTimeoutRef.current = null; }
    if (praiseTimeoutRef.current) { clearTimeout(praiseTimeoutRef.current); praiseTimeoutRef.current = null; }
    if (dragFeedbackTimeoutRef.current) { clearTimeout(dragFeedbackTimeoutRef.current); dragFeedbackTimeoutRef.current = null; }
  }, []);

  const clearAllGameTimeouts = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearProblemSpecificTimeouts();
  }, [clearProblemSpecificTimeouts]);


  useEffect(() => {
    loadSessions();
    return () => {
      clearAllGameTimeouts();
    };
  }, [loadSessions, clearAllGameTimeouts]);

  
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
    clearAllGameTimeouts();
    setGameState(prev => {
      if (prev.phase === 'sessionOver') {
        return prev;
      }

      const finalScore = prev.score || 0;
      const finalCorrectAttempts = prev.correctAttempts || 0;
      let currentToastInfo: { title: string; description: string } | null = null;
      
      if (prev.isPlaying || prev.phase !== 'startScreen') {
        const accuracy = prev.attempts > 0 ? (prev.correctAttempts / prev.attempts) * 100 : 0;
        const sessionDuration = prev.gameStartTime ? (Date.now() - prev.gameStartTime) / 1000 : ADDITION_GAME_DURATION_SECONDS - prev.timeLeft;
        
        const newSession: AdditionAdventureSessionStats = {
          id: new Date().toISOString() + Math.random().toString(16).slice(2),
          date: new Date().toISOString(),
          problemsSolved: finalCorrectAttempts,
          accuracy: parseFloat(accuracy.toFixed(2)),
          durationSeconds: parseFloat(sessionDuration.toFixed(0)),
          longestStreak: prev.longestStreak,
          score: finalScore,
        };
        
        const updatedSessions = [newSession, ...pastSessions].slice(0, 10);
        setPastSessions(updatedSessions);
        saveSessions(updatedSessions);

        if (sessionEndingNaturally) {
            currentToastInfo = {
              title: "Great Effort!",
              description: `You solved ${finalCorrectAttempts} problems. Score: ${finalScore}`,
            };
        } else if (!sessionEndingNaturally && prev.isPlaying) { 
             currentToastInfo = {
              title: "Game Ended",
              description: `You scored ${finalScore} points.`,
            };
        }
      }
      
      return {
        ...initialGameState, 
        isPlaying: false, 
        phase: 'sessionOver',
        feedbackMessage: `Score: ${finalScore}`,
        toastMessageInfo: currentToastInfo, 
      };
    });
  }, [pastSessions, saveSessions, clearAllGameTimeouts]);

  useEffect(() => {
    if (gameState.toastMessageInfo) {
      toast(gameState.toastMessageInfo);
      setGameState(prev => ({ ...prev, toastMessageInfo: null })); 
    }
  }, [gameState.toastMessageInfo, toast]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current); // Ensure only one timer runs
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(currentGs => {
        if (!currentGs.isPlaying) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return currentGs;
        }
        if (currentGs.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          endSession(true); 
          return { ...currentGs, timeLeft: 0 }; 
        }
        return { ...currentGs, timeLeft: currentGs.timeLeft - 1 };
      });
    }, 1000);
  }, [endSession]);

  const setupNewProblem = useCallback(() => {
    clearProblemSpecificTimeouts(); 
    const newProblem = generateProblem();
    setGameState(prev => ({
      ...prev,
      currentProblem: newProblem,
      pile1Count: newProblem.num1,
      pile2Count: newProblem.num2,
      sumPileCount: 0,
      phase: 'summingTime',
      feedbackMessage: null,
      dragFeedback: null,
      isCorrect: null,
    }));
  }, [clearProblemSpecificTimeouts]);

  const startGame = useCallback(() => {
    clearAllGameTimeouts();
    setGameState(_ => ({ 
      ...initialGameState,
      isPlaying: true,
      phase: 'summingTime', // Will be quickly set by setupNewProblem
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS, // Timer will start correctly
    }));
    setupNewProblem(); // This sets phase to 'summingTime'
    startTimer(); 
  }, [setupNewProblem, startTimer, clearAllGameTimeouts]);
  
  const handleDropOnPile = useCallback((pileId: 1 | 2) => {
    // This function is mostly for feedback if user tries to drop on non-sum piles
    setGameState(prev => {
        if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' }));
        dragFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, dragFeedback: null }));
        }, 1500);
        return prev; 
    });
  }, []);

  // Effect to handle correct sum completion
  useEffect(() => {
    if (gameState.phase === 'summingTime' && gameState.currentProblem && gameState.sumPileCount === gameState.currentProblem.correctAnswer) {
      setGameState(prev => {
        if (!prev.currentProblem) return prev; 
        const newScore = prev.score + 10;
        const newCorrectAttempts = prev.correctAttempts + 1;
        const newCurrentStreak = prev.currentStreak + 1;
        const newLongestStreak = Math.max(prev.longestStreak, newCurrentStreak);

        showPraise(); 

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, phase: 'awaitingConfirmation' }));
        }, 1800); // Duration to show final feedback before waiting for confirmation

        return {
          ...prev,
          isCorrect: true,
          phase: 'finalFeedback', 
          score: newScore,
          correctAttempts: newCorrectAttempts,
          attempts: prev.attempts + 1,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          feedbackMessage: null, 
          dragFeedback: null,
        };
      });
    }
  }, [gameState.sumPileCount, gameState.phase, gameState.currentProblem, showPraise, clearProblemSpecificTimeouts]);

  const confirmAndProceed = useCallback(() => {
    if (gameState.phase === 'awaitingConfirmation' && gameState.isCorrect) {
      clearProblemSpecificTimeouts();
      setupNewProblem(); // This will reset phase to 'summingTime' for the new problem
    }
  }, [gameState.phase, gameState.isCorrect, setupNewProblem, clearProblemSpecificTimeouts]);

  // Keydown listener for Enter key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (gameState.phase === 'awaitingConfirmation' && gameState.isCorrect) {
          event.preventDefault();
          confirmAndProceed();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.phase, gameState.isCorrect, confirmAndProceed]);


  const handleDropOnSumPile = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' })); 
        dragFeedbackTimeoutRef.current = setTimeout(() => setGameState(gs => ({ ...gs, dragFeedback: null })), 1500);
        return prev;
      }

      return {
        ...prev,
        sumPileCount: prev.sumPileCount + 1,
        dragFeedback: null,
      };
    });
  }, []);
  
  const incrementSumPileOnClick = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' })); 
        dragFeedbackTimeoutRef.current = setTimeout(() => setGameState(gs => ({ ...gs, dragFeedback: null })), 1500);
        return prev;
      }
      
      return {
        ...prev,
        sumPileCount: prev.sumPileCount + 1,
        dragFeedback: null,
      };
    });
  }, []);
  
  const userEndSession = () => {
    endSession(false); 
  };

  return { gameState, startGame, handleDropOnPile, handleDropOnSumPile, incrementSumPileOnClick, userEndSession, pastSessions, confirmAndProceed };
}
