
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdditionProblem, AdditionAdventureGameState, AdditionAdventureSessionStats } from '@/types';
import { ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, ADDITION_GAME_DURATION_SECONDS, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY, ADDITION_MAX_ANSWER } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle } from 'lucide-react';

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
      praiseText: praise.text, // Text kept for potential alt-attributes or debug
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

      if (sessionEndingNaturally && prev.isPlaying) { // Only toast if game was active
        toast({
          title: "Great Effort!",
          description: `You solved ${prev.correctAttempts} problems. Score: ${prev.score}`,
        });
      }
      
      return {
        ...initialGameState,
        isPlaying: false, // ensure isPlaying is false
        phase: 'sessionOver',
        feedbackMessage: `Score: ${prev.score}`, // Simplified feedback
      };
    });
  }, [pastSessions, saveSessions, toast]);


  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev.isPlaying) { // If game stopped for other reasons
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
    clearAllTimeouts(); // Clear any pending timeouts from previous problem
    const newProblem = generateProblem();
    setGameState(prev => ({
      ...prev,
      currentProblem: newProblem,
      pile1Count: 0,
      pile2Count: 0,
      sumPileCount: 0,
      phase: 'buildingPiles',
      feedbackMessage: null, // Will rely on visual cues primarily
      dragFeedback: null,
      isCorrect: null,
    }));
     if (prev.isPlaying && prev.timeLeft > 0 && !timerRef.current) {
      startTimer(); // Restart timer if it was cleared but game is ongoing
    }
  }, [startTimer]); // Added startTimer dependency

  const startGame = useCallback(() => {
    clearAllTimeouts();
    setGameState(prev => ({
      ...initialGameState,
      isPlaying: true,
      phase: 'buildingPiles',
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
      let newDragFeedbackIcon: 'stop' | null = null; // Using icons for feedback

      if (pileId === 1) {
        if (prev.pile1Count < prev.currentProblem.num1) {
          newPile1Count++;
        } else {
          newDragFeedbackIcon = 'stop';
        }
      } else { 
        if (prev.pile2Count < prev.currentProblem.num2) {
          newPile2Count++;
        } else {
          newDragFeedbackIcon = 'stop';
        }
      }
      
      if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
      if (newDragFeedbackIcon) {
        setGameState(gs => ({ ...gs, dragFeedback: newDragFeedbackIcon })); // Set icon directly
        dragFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, dragFeedback: null }));
        }, 1500);
      }

      const pilesComplete = newPile1Count === prev.currentProblem.num1 && newPile2Count === prev.currentProblem.num2;
      let newPhase = prev.phase;

      if (pilesComplete) {
        newPhase = 'pilesBuilt_summingTime';
        showPraise(); 
      }

      return {
        ...prev,
        pile1Count: newPile1Count,
        pile2Count: newPile2Count,
        dragFeedback: newDragFeedbackIcon,
        phase: newPhase,
      };
    });
  }, [showPraise]);

  const handleDropOnSumPile = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'pilesBuilt_summingTime' || !prev.currentProblem) return prev;

      let newSumPileCount = prev.sumPileCount + 1;
      let newPhase = prev.phase;
      let newIsCorrect: boolean | null = prev.isCorrect;
      let newDragFeedbackIcon: 'stop' | null = null;

      if (newSumPileCount > prev.currentProblem.correctAnswer) {
        newSumPileCount = prev.sumPileCount; // Don't overfill
        newDragFeedbackIcon = 'stop'; // "Too many"
        if (dragFeedbackTimeoutRef.current) clearTimeout(dragFeedbackTimeoutRef.current);
        setGameState(gs => ({ ...gs, dragFeedback: newDragFeedbackIcon }));
        dragFeedbackTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, dragFeedback: null }));
        }, 1500);
      }
      
      if (newSumPileCount === prev.currentProblem.correctAnswer) {
        newIsCorrect = true;
        newPhase = 'finalFeedback';
        showPraise();
        
        // Update score & stats
        const newScore = prev.score + 10;
        const newCorrectAttempts = prev.correctAttempts + 1;
        const newCurrentStreak = prev.currentStreak + 1;
        const newLongestStreak = Math.max(prev.longestStreak, newCurrentStreak);

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
          if (gameState.timeLeft > 0 && gameState.isPlaying) { // Check timeLeft and isPlaying from a potentially updated state
             setupNewProblem();
          } else if (gameState.isPlaying) { // Time ran out during this problem
             endSession(true);
          }
        }, 1800); // Delay before next problem

        return {
            ...prev,
            sumPileCount: newSumPileCount,
            isCorrect: newIsCorrect,
            phase: newPhase,
            score: newScore,
            correctAttempts: newCorrectAttempts,
            attempts: prev.attempts + 1,
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            feedbackMessage: null, // Rely on visual and praise
            dragFeedback: newDragFeedbackIcon,
        };
      }

      return {
        ...prev,
        sumPileCount: newSumPileCount,
        isCorrect: newIsCorrect, // Could be null if not yet correct
        phase: newPhase,
        dragFeedback: newDragFeedbackIcon,
      };
    });
  }, [showPraise, setupNewProblem, endSession, gameState.timeLeft, gameState.isPlaying]); // Added gameState dependencies
  
  const userEndSession = () => {
    endSession(false); 
  };

  return { gameState, startGame, handleDropOnPile, handleDropOnSumPile, userEndSession, pastSessions };
}
