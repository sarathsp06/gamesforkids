"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, FeedbackType, SessionStats } from '@/types';
import { WORDS, INITIAL_LEVEL, MIN_LEVEL, MAX_LEVEL /* LEVEL_TO_INTERVAL_MS might be unused directly */ } from '@/lib/constants';
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
  // letterIntervalMs: LEVEL_TO_INTERVAL_MS[INITIAL_LEVEL], // Role changes
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
  const { toast } = useToast();
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    setPastSessions(loadSessionStats());
  }, []);

  const speakWord = useCallback((word: string) => {
    if (synthRef.current && word) {
      // Cancel any previous speech
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      // Optional: Configure voice, rate, pitch
      // const voices = synthRef.current.getVoices();
      // utterance.voice = voices[0]; // Example: set a specific voice
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for clarity
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
      // WPM based on characters typed (standard is 5 chars per word)
      const wpm = elapsedMinutes > 0 ? (prev.correctPresses / 5) / elapsedMinutes : 0;
      return { ...prev, currentAccuracy: accuracy, currentWPM: Math.round(wpm) };
    });
  }, []);

  // AI speed adjustment is commented out as its logic is for single letters
  // const adjustSpeedViaAI = useCallback(async () => { ... }, [gameState, toast]);

  const showNewWord = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      const randomIndex = Math.floor(Math.random() * WORDS.length);
      const nextWord = WORDS[randomIndex].toUpperCase(); // Ensure words are uppercase
      
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
      }
      
      const newTotalPresses = prev.totalPresses + 1;
      
      const isWordComplete = newCurrentWordIndex === prev.currentWord.length;
      if (isWordComplete && feedbackType === 'correct') {
        newWordsTyped++;
        feedbackTimeoutRef.current = setTimeout(showNewWord, 500); // Show next word after a short delay
      } else {
         feedbackTimeoutRef.current = setTimeout(() => {
            setGameState(gs => ({ ...gs, feedback: null, feedbackLetter: null }));
         }, 500); // Clear feedback after a delay
      }
      
      // AI adjustment logic would go here if re-enabled and adapted
      // if (newTotalPresses % SOME_THRESHOLD === 0) adjustSpeedViaAI();
      
      return {
        ...prev,
        feedback: feedbackType,
        feedbackLetter: targetLetter,
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
    if (synthRef.current) synthRef.current.cancel(); // Stop any ongoing speech

    setGameState(prev => ({
      ...initialGameState,
      currentLevel: prev.currentLevel, 
      isPlaying: true,
      gameStartTime: Date.now(),
      showStartScreen: false,
      isSessionOver: false,
    }));
    // Delay slightly to ensure TTS engine is ready if it was just initialized
    setTimeout(showNewWord, 100); 
  }, [showNewWord]);

  const endSession = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
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
        title: "Session Ended!",
        description: `WPM: ${finalWPM}, Accuracy: ${(finalAccuracy * 100).toFixed(1)}%, Words: ${prev.wordsTyped}`,
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
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/i)) {
        event.preventDefault();
        handleKeyPress(event.key);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        if (synthRef.current) synthRef.current.cancel();
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
