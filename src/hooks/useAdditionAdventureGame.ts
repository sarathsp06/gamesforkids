
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
      if (prev.phase === 'sessionOver' && !sessionEndingNaturally) return prev; // Avoid re-processing if user clicks end multiple times
      if (prev.phase === 'sessionOver' && sessionEndingNaturally) return prev; // if already ended by timer

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
      
      // Only save and toast if the game was actually playing or just ended
      if (prev.isPlaying || (prev.phase !== 'startScreen' && prev.phase !== 'sessionOver')) {
        const updatedSessions = [newSession, ...pastSessions].slice(0, 10);
        setPastSessions(updatedSessions);
        saveSessions(updatedSessions);

        if (sessionEndingNaturally) {
            toast({
              title: "Great Effort!",
              description: `You solved ${prev.correctAttempts} problems. Score: ${prev.score}`,
            });
        } else if (!sessionEndingNaturally && prev.isPlaying) { // User ended manually
             toast({
              title: "Game Ended",
              description: `You scored ${prev.score} points.`,
            });
        }
      }
      
      return {
        ...initialGameState, // Reset to initial, keep past sessions loaded
        isPlaying: false, 
        phase: 'sessionOver',
        feedbackMessage: `Score: ${prev.score || 0}`, // Ensure score is shown even if 0
      };
    });
  }, [pastSessions, saveSessions, toast, clearAllGameTimeouts]);


  const startTimer = useCallback(() => {
    // Assumes any existing timer has been cleared by clearAllGameTimeouts in startGame
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(currentGs => {
        if (!currentGs.isPlaying) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return currentGs;
        }
        if (currentGs.timeLeft <= 1) {
          // Important: clearInterval before calling endSession, as endSession might try to clear it too.
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          endSession(true); // This will update phase to 'sessionOver' and isPlaying to false
          // The state returned here is for the current tick, endSession will set the final state.
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
    setGameState(_ => ({ // Use _ if prev isn't used, or prev for specific carry-overs
      ...initialGameState,
      isPlaying: true,
      phase: 'summingTime',
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS,
    }));
    setupNewProblem();
    startTimer();
  }, [setupNewProblem, startTimer, clearAllGameTimeouts]);
  
  const handleDropOnPile = useCallback((pileId: 1 | 2) => {
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

  const processSumItem = useCallback(() => {
    setGameState(prev => {
      // This function is called when sumPileCount has reached the target.
      // It handles the logic for a correct sum.
      if (prev.phase !== 'summingTime' || !prev.currentProblem || prev.sumPileCount !== prev.currentProblem.correctAnswer) {
         // Should not happen if called correctly from useEffect, but as a safeguard.
        return prev;
      }
      
      const newIsCorrect = true;
      const newPhase: AdditionAdventurePhase = 'finalFeedback';
      showPraise();
      
      const newScore = prev.score + 10;
      const newCorrectAttempts = prev.correctAttempts + 1;
      const newCurrentStreak = prev.currentStreak + 1;
      const newLongestStreak = Math.max(prev.longestStreak, newCurrentStreak);

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setGameState(currentGs => { // Use currentGs to get latest timeLeft & isPlaying
            if (currentGs.timeLeft > 0 && currentGs.isPlaying) {
                setupNewProblem();
                 // setupNewProblem will set the new state, so we don't need to return a modified currentGs here regarding the problem.
                 // However, setupNewProblem itself is a setGameState, so this might lead to chained setGameState calls.
                 // This is generally fine if managed.
                return currentGs; // Let setupNewProblem handle the state transition for the new problem.
            } else if (currentGs.isPlaying) { // Time ran out or game stopped while waiting for feedback
                endSession(true); // endSession handles its own state update
                return currentGs; 
            }
            // If game is no longer playing (e.g., user manually ended it during feedback timeout)
            return currentGs;
        });
      }, 1800); // Delay before showing next problem or ending session

      return {
          ...prev,
          isCorrect: newIsCorrect,
          phase: newPhase,
          score: newScore,
          correctAttempts: newCorrectAttempts,
          attempts: prev.attempts + 1, // Increment total attempts for this sum
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          feedbackMessage: null, // Clear previous messages
          dragFeedback: null,
      };
    });
  }, [showPraise, setupNewProblem, endSession]);


  const handleDropOnSumPile = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'summingTime' || !prev.currentProblem) return prev;

      if (prev.sumPileCount >= prev.currentProblem.correctAnswer) {
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' })); // Use functional update
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
        setGameState(gs => ({ ...gs, dragFeedback: 'stop' })); // Use functional update
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

