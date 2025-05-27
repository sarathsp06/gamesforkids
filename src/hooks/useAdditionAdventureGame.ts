
"use client";

// This directive indicates that the component should be rendered on the client-side.

import { useToast } from "@/hooks/use-toast";
import { ADDITION_GAME_DURATION_SECONDS, ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY } from '@/lib/constants';
import type { AdditionAdventureGameState, AdditionAdventurePhase, AdditionAdventureSessionStats, AdditionProblem } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const initialGameState: AdditionAdventureGameState = {
  currentProblem: null,
  score: 0,
  attempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  longestStreak: 0,
  draggedFromPile1Count: 0,
  draggedFromPile2Count: 0,
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
      if (prev.phase === 'sessionOver' && !prev.isPlaying) { // ensure not to process if already over
        return prev;
      }

      const finalScore = prev.score || 0;
      const finalCorrectAttempts = prev.correctAttempts || 0;
      let currentToastInfo: { title: string; description: string } | null = null;
      
      // Only process session stats if the game was actually played or in progress
      if (prev.isPlaying || (prev.phase !== 'startScreen' && prev.phase !== 'sessionOver')) {
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
        feedbackMessage: sessionEndingNaturally || prev.isPlaying ? `Score: ${finalScore}` : null, // only show score if game was played
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
    if (timerRef.current) clearInterval(timerRef.current);
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
          return { ...currentGs, timeLeft: 0, isPlaying: false }; 
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
      sumPileCount: 0,
      draggedFromPile1Count: 0, 
      draggedFromPile2Count: 0,
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
      phase: 'summingTime', 
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS, 
    }));
    setupNewProblem(); 
    startTimer(); 
  }, [setupNewProblem, startTimer, clearAllGameTimeouts]);
  

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
        }, 1800);

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
  }, [gameState.sumPileCount, gameState.phase, gameState.currentProblem, showPraise]);

  const confirmAndProceed = useCallback(() => {
    if (gameState.phase === 'awaitingConfirmation' && gameState.isCorrect) {
      clearProblemSpecificTimeouts();
      setupNewProblem(); 
    }
  }, [gameState.phase, gameState.isCorrect, setupNewProblem, clearProblemSpecificTimeouts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        if (gameState.phase === 'awaitingConfirmation' && gameState.isCorrect) {
          event.preventDefault();
          confirmAndProceed();
        } else if (gameState.phase === 'startScreen' || gameState.phase === 'sessionOver') {
          event.preventDefault();
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.phase, gameState.isCorrect, confirmAndProceed, startGame]);


  const handleDropOnSumPile = useCallback((source: 'pile1' | 'pile2' | 'click') => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' })); 
        dragFeedbackTimeoutRef.current = setTimeout(() => setGameState(gs => ({ ...gs, dragFeedback: null })), 1500);
        return prev;
      }

      let newDraggedFromPile1Count = prev.draggedFromPile1Count;
      let newDraggedFromPile2Count = prev.draggedFromPile2Count;

      if (source === 'pile1') {
        if (prev.draggedFromPile1Count < prev.currentProblem.num1) {
          newDraggedFromPile1Count++;
        } else {
          // Tried to drag from an already exhausted conceptual pile1
          return prev; 
        }
      } else if (source === 'pile2') {
        if (prev.draggedFromPile2Count < prev.currentProblem.num2) {
          newDraggedFromPile2Count++;
        } else {
           // Tried to drag from an already exhausted conceptual pile2
          return prev;
        }
      }
      // If source is 'click', dragged counts don't change.

      return {
        ...prev,
        sumPileCount: prev.sumPileCount + 1,
        draggedFromPile1Count: newDraggedFromPile1Count,
        draggedFromPile2Count: newDraggedFromPile2Count,
        dragFeedback: null,
      };
    });
  }, []);
  
  const incrementSumPileOnClick = useCallback(() => {
    handleDropOnSumPile('click');
  }, [handleDropOnSumPile]);
  
  const userEndSession = () => {
    endSession(false); 
  };

  // Removed handleDropOnPile as it's no longer used with the new drag model

  return { gameState, startGame, handleDropOnSumPile, incrementSumPileOnClick, userEndSession, pastSessions, confirmAndProceed };
}
