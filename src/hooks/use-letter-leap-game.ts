
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, FeedbackType, SessionStats } from '@/types';
import { WORDS, INITIAL_LEVEL, /* MIN_LEVEL, MAX_LEVEL, LEVEL_TO_INTERVAL_MS might be unused directly */ } from '@/lib/constants';
import { loadSessionStats, saveSessionStats } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";
// AI Flow import - will be disabled for now
// import { streamFlow } from '@genkit-ai/next/client';
// import type { AdaptiveSpeedInput, AdaptiveSpeedOutput } from '@/ai/flows/adaptiveSpeedFlow';
// import { adaptiveSpeedFlow } from '@/ai/flows/adaptiveSpeedFlow';


const initialGameState: GameState = {
  currentWord: null,
  currentWordIndex: 0,
  typedWordPortion: "",
  isPlaying: false,
  feedback: null,
  feedbackLetter: null,
  currentLevel: INITIAL_LEVEL,
  correctPresses: 0,
  totalPresses: 0,
  wordsTyped: 0,
  gameStartTime: null,
  currentWPM: 0,
  currentAccuracy: 0,
  currentStreak: 0,
  longestStreak: 0,
  isSessionOver: false,
  showStartScreen: true,
};

export function useLetterLeapGame() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [pastSessions, setPastSessions] = useState<SessionStats[]>([]);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wordDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    setPastSessions(loadSessionStats());

    // Cleanup timeouts on unmount
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const speakWord = useCallback((word: string) => {
    if (synthRef.current && word) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // Slower rate for younger children
      utterance.pitch = 1.2; // Slightly higher pitch can be more engaging
      synthRef.current.speak(utterance);
    }
  }, []);

  const calculateStats = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying || !prev.gameStartTime || prev.totalPresses === 0) {
        return { ...prev, currentAccuracy: 0, currentWPM: 0 };
      }
      const accuracy = prev.correctPresses / prev.totalPresses;
      const elapsedMinutes = (Date.now() - prev.gameStartTime) / 60000;
      const wpm = elapsedMinutes > 0 ? (prev.correctPresses / 5) / elapsedMinutes : 0;
      return { ...prev, currentAccuracy: accuracy, currentWPM: Math.round(wpm) };
    });
  }, []);

  const showNewWord = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);


    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      const randomIndex = Math.floor(Math.random() * WORDS.length);
      const nextWord = WORDS[randomIndex].toUpperCase();
      
      speakWord(nextWord);

      return { 
        ...prev, 
        currentWord: nextWord, 
        currentWordIndex: 0,
        typedWordPortion: "",
        feedback: null,
        feedbackLetter: null,
      };
    });
  }, [speakWord]); 


  const handleKeyPress = useCallback((key: string) => {
    setGameState(prev => {
      if (!prev.isPlaying || !prev.currentWord || prev.currentWordIndex >= prev.currentWord.length) return prev;

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      
      const targetLetter = prev.currentWord[prev.currentWordIndex];
      let feedbackType: FeedbackType = null;
      let newCorrectPresses = prev.correctPresses;
      let newCurrentStreak = prev.currentStreak;
      let newLongestStreak = prev.longestStreak;
      let newTypedWordPortion = prev.typedWordPortion;
      let newCurrentWordIndex = prev.currentWordIndex;
      let newWordsTyped = prev.wordsTyped;

      if (key.toUpperCase() === targetLetter.toUpperCase()) {
        feedbackType = 'correct';
        newCorrectPresses++;
        newCurrentStreak++;
        if (newCurrentStreak > newLongestStreak) {
          newLongestStreak = newCurrentStreak;
        }
        newTypedWordPortion += targetLetter;
        newCurrentWordIndex++;
      } else {
        feedbackType = 'incorrect';
        newCurrentStreak = 0;
        // Simple haptic feedback for incorrect key if available and desired (platform dependent)
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(100); // Vibrate for 100ms
        }
      }
      
      const newTotalPresses = prev.totalPresses + 1;
      
      const isWordComplete = newCurrentWordIndex === prev.currentWord.length;
      if (isWordComplete && feedbackType === 'correct') {
        newWordsTyped++;
        // Slightly longer delay for kids to process completion
        wordDisplayTimeoutRef.current = setTimeout(showNewWord, 1200); 
      } else {
         feedbackTimeoutRef.current = setTimeout(() => {
            setGameState(gs => ({ ...gs, feedback: null, feedbackLetter: null }));
         }, 700); // Clear feedback a bit slower
      }
      
      return {
        ...prev,
        feedback: feedbackType,
        feedbackLetter: targetLetter, // The letter that was targeted
        correctPresses: newCorrectPresses,
        totalPresses: newTotalPresses,
        wordsTyped: newWordsTyped,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        typedWordPortion: newTypedWordPortion,
        currentWordIndex: newCurrentWordIndex,
      };
    });
    calculateStats();
  }, [showNewWord, calculateStats]);


  const startGame = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
    if (synthRef.current) synthRef.current.cancel();

    setGameState(prev => ({
      ...initialGameState,
      currentLevel: prev.currentLevel, 
      isPlaying: true,
      gameStartTime: Date.now(),
      showStartScreen: false,
      isSessionOver: false,
    }));
    setTimeout(showNewWord, 150); 
  }, [showNewWord]);

  const endSession = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      if (synthRef.current) synthRef.current.cancel();


      const sessionEndTime = Date.now();
      const durationMs = prev.gameStartTime ? sessionEndTime - prev.gameStartTime : 0;
      const durationMinutes = durationMs / 60000;

      const finalAccuracy = prev.totalPresses > 0 ? prev.correctPresses / prev.totalPresses : 0;
      const finalWPM = durationMinutes > 0 ? Math.round((prev.correctPresses / 5) / durationMinutes) : 0;

      const newSession: SessionStats = {
        id: new Date().toISOString() + Math.random().toString(16).slice(2),
        date: new Date().toISOString(),
        accuracy: parseFloat((finalAccuracy * 100).toFixed(2)),
        wpm: finalWPM,
        lettersTyped: prev.correctPresses,
        wordsTyped: prev.wordsTyped,
        durationMinutes: parseFloat(durationMinutes.toFixed(2)),
        longestStreak: prev.longestStreak,
      };

      const updatedSessions = [newSession, ...pastSessions].slice(0, 10); 
      setPastSessions(updatedSessions);
      saveSessionStats(updatedSessions);
      
      toast({
        title: "Great Job!",
        description: `You typed ${prev.wordsTyped} words! WPM: ${finalWPM}, Accuracy: ${(finalAccuracy * 100).toFixed(1)}%`,
      });

      return {
        ...prev,
        isPlaying: false,
        isSessionOver: true,
        currentWord: null,
        currentWordIndex: 0,
        typedWordPortion: "",
        showStartScreen: true, 
      };
    });
  }, [pastSessions, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState.isPlaying || gameState.isSessionOver || !gameState.currentWord) return;

      // Prevent default browser action for single alphabet or number keys
      if (event.key.length === 1 && event.key.match(/^[a-zA-Z0-9]$/i)) {
        event.preventDefault();

        // Only pass alphabet keys to the game's core input handler
        if (event.key.match(/^[a-zA-Z]$/i)) {
          handleKeyPress(event.key);
        }
        // If it's a number, its default action is prevented.
        // The game doesn't currently use numbers, so no further game logic for them here.
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [gameState.isPlaying, gameState.isSessionOver, gameState.currentWord, handleKeyPress]);
  
  useEffect(() => {
    if (gameState.isPlaying) {
      calculateStats();
    }
  }, [gameState.correctPresses, gameState.totalPresses, gameState.isPlaying, calculateStats]);

  return { gameState, startGame, endSession, pastSessions };
}

