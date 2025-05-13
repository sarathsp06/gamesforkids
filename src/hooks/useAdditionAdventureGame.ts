
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdditionProblem, AdditionAdventureGameState, AdditionAdventureSessionStats } from '@/types';
import { ADDITION_ITEMS, ADDITION_NUMBER_RANGE, ADDITION_PRAISE_MESSAGES, ADDITION_GAME_DURATION_SECONDS, LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

const initialGameState: AdditionAdventureGameState = {
  currentProblem: null,
  score: 0,
  attempts: 0,
  correctAttempts: 0,
  currentStreak: 0,
  longestStreak: 0,
  feedbackMessage: null,
  isCorrect: null,
  isPlaying: false,
  isSessionOver: false,
  showStartScreen: true,
  gameStartTime: null,
  timeLeft: ADDITION_GAME_DURATION_SECONDS,
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
  const { toast } = useToast();

  const loadSessions = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY);
      if (stored) {
        setPastSessions(JSON.parse(stored));
      }
    }
  };

  const saveSessions = (sessions: AdditionAdventureSessionStats[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  };


  useEffect(() => {
    loadSessions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
    };
  }, []);

  const endSession = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      if (timerRef.current) clearInterval(timerRef.current);

      const accuracy = prev.attempts > 0 ? (prev.correctAttempts / prev.attempts) * 100 : 0;
      const newSession: AdditionAdventureSessionStats = {
        id: new Date().toISOString() + Math.random().toString(16).slice(2),
        date: new Date().toISOString(),
        problemsSolved: prev.correctAttempts,
        accuracy: parseFloat(accuracy.toFixed(2)),
        durationSeconds: ADDITION_GAME_DURATION_SECONDS - prev.timeLeft,
        longestStreak: prev.longestStreak,
        score: prev.score,
      };
      
      const updatedSessions = [newSession, ...pastSessions].slice(0, 10);
      setPastSessions(updatedSessions);
      saveSessions(updatedSessions);

      toast({
        title: "Great Effort!",
        description: `You solved ${prev.correctAttempts} problems with ${accuracy.toFixed(0)}% accuracy. Score: ${prev.score}`,
      });

      return {
        ...initialGameState,
        isSessionOver: true,
        showStartScreen: true, // Go back to start screen
        timeLeft: ADDITION_GAME_DURATION_SECONDS, // Reset timer for next game
      };
    });
  }, [pastSessions, toast]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, timeLeft: ADDITION_GAME_DURATION_SECONDS }));
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endSession();
          return { ...prev, timeLeft: 0, isPlaying: false, isSessionOver: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, [endSession]);


  const startGame = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);
    setGameState({
      ...initialGameState,
      isPlaying: true,
      isSessionOver: false,
      showStartScreen: false,
      currentProblem: generateProblem(),
      gameStartTime: Date.now(),
      timeLeft: ADDITION_GAME_DURATION_SECONDS,
    });
    startTimer();
  }, [startTimer]);

  const showPraise = () => {
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
  };
  
  const handleAnswer = useCallback((answer: number) => {
    if (!gameState.currentProblem || !gameState.isPlaying) return;

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (praiseTimeoutRef.current) clearTimeout(praiseTimeoutRef.current);


    const isCorrect = answer === gameState.currentProblem.correctAnswer;

    setGameState(prev => {
      if (!prev.currentProblem) return prev;
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      return {
        ...prev,
        attempts: prev.attempts + 1,
        correctAttempts: isCorrect ? prev.correctAttempts + 1 : prev.correctAttempts,
        score: isCorrect ? prev.score + 10 : prev.score,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        isCorrect: isCorrect,
        feedbackMessage: isCorrect ? "Correct!" : `Oops! The answer was ${prev.currentProblem.correctAnswer}.`,
      };
    });

    if (isCorrect) {
      showPraise();
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentProblem: generateProblem(),
        feedbackMessage: null,
        isCorrect: null,
      }));
    }, isCorrect ? 1700 : 2500); // Longer pause for incorrect to read message

  }, [gameState.currentProblem, gameState.isPlaying]);

  return { gameState, startGame, handleAnswer, endSession, pastSessions };
}
