"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
// Import types from the flow file
import type { AdaptiveSpeedInput, AdaptiveSpeedOutput } from '@/ai/flows/adaptiveSpeedFlow';
import type { GameState, FeedbackType, SessionStats } from '@/types';
import { ALPHABET, INITIAL_LEVEL, LEVEL_TO_INTERVAL_MS, LETTERS_PER_LEVEL_ADJUSTMENT, MIN_LEVEL, MAX_LEVEL } from '@/lib/constants';
import { loadSessionStats, saveSessionStats } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";
import { streamFlow } from '@genkit-ai/next/client';
// Import the actual flow (exported wrapper function)
import { adaptiveSpeedFlow } from '@/ai/flows/adaptiveSpeedFlow';


const initialGameState: GameState = {
  currentLetter: null,
  isPlaying: false,
  feedback: null,
  letterIntervalMs: LEVEL_TO_INTERVAL_MS[INITIAL_LEVEL],
  currentLevel: INITIAL_LEVEL,
  correctPresses: 0,
  totalPresses: 0,
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
  const letterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPastSessions(loadSessionStats());
  }, []);

  const calculateStats = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying || !prev.gameStartTime || prev.totalPresses === 0) {
        return { ...prev, currentAccuracy: 0, currentWPM: 0 };
      }
      const accuracy = prev.correctPresses / prev.totalPresses;
      const elapsedMinutes = (Date.now() - prev.gameStartTime) / 60000;
      const wpm = elapsedMinutes > 0 ? (prev.correctPresses / 5) / elapsedMinutes : 0; // Assuming 5 chars per word
      return { ...prev, currentAccuracy: accuracy, currentWPM: Math.round(wpm) };
    });
  }, []);

  const adjustSpeedViaAI = useCallback(async () => {
    const { currentAccuracy, currentWPM, currentLevel, totalPresses } = gameState;
    
    // Only call AI if enough data points are available
    if (totalPresses < LETTERS_PER_LEVEL_ADJUSTMENT / 2) return;

    const input: AdaptiveSpeedInput = {
      accuracy: currentAccuracy,
      wpm: currentWPM,
      currentLevel: currentLevel,
      totalLettersAttempted: totalPresses, // This uses totalPresses from gameState, which might be one render behind.
                                           // For more precision, this value could be passed down from handleKeyPress if needed.
                                           // However, for periodic adjustments, this is often acceptable.
    };

    try {
      // streamFlow expects the Server Action (the exported wrapper function)
      const { response } = streamFlow<AdaptiveSpeedInput, AdaptiveSpeedOutput>({
        flow: adaptiveSpeedFlow, 
        input: input,
      });
      const output = await response; 

      if (output) {
        const newLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, output.newLevel));
        if (newLevel !== currentLevel) { // currentLevel from gameState
          setGameState(prev => ({
            ...prev,
            currentLevel: newLevel,
            letterIntervalMs: LEVEL_TO_INTERVAL_MS[newLevel],
          }));
          toast({ title: "Difficulty Adjusted!", description: `New level: ${newLevel}` });
        }
      } else {
        console.warn("Adaptive speed flow returned no output.");
      }
    } catch (error) {
      console.error("Error calling adaptiveSpeedFlow:", error);
    }
  }, [gameState, toast]); // gameState includes all dependent fields like currentAccuracy, currentWPM, currentLevel, totalPresses


  const showNewLetter = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);

    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      const randomIndex = Math.floor(Math.random() * ALPHABET.length);
      const nextLetter = ALPHABET[randomIndex];
      
      letterTimeoutRef.current = setTimeout(() => {
        handleKeyPress('', true); 
      }, prev.letterIntervalMs);

      return { ...prev, currentLetter: nextLetter, feedback: null };
    });
  }, []); 


  const handleKeyPress = useCallback((key: string, isTimeout: boolean = false) => {
    setGameState(prev => {
      if (!prev.isPlaying || !prev.currentLetter) return prev;

      if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      
      let feedbackType: FeedbackType = null;
      let correct = false;
      let newCorrectPresses = prev.correctPresses;
      let newCurrentStreak = prev.currentStreak;
      let newLongestStreak = prev.longestStreak;

      if (isTimeout) {
        feedbackType = 'timeout';
        newCurrentStreak = 0;
      } else if (key.toUpperCase() === prev.currentLetter) {
        feedbackType = 'correct';
        correct = true;
        newCorrectPresses++;
        newCurrentStreak++;
        if (newCurrentStreak > newLongestStreak) {
          newLongestStreak = newCurrentStreak;
        }
      } else {
        feedbackType = 'incorrect';
        newCurrentStreak = 0;
      }
      
      const newTotalPresses = prev.totalPresses + 1;
      
      // Prepare state for potential AI adjustment
      const updatedStateForAI = {
        ...prev,
        correctPresses: newCorrectPresses,
        totalPresses: newTotalPresses,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        // currentWPM and currentAccuracy will be calculated based on these new values
        // by calculateStats, which is called after this state update.
        // adjustSpeedViaAI uses gameState, so it will pick up fresh stats after the next render.
      };


      feedbackTimeoutRef.current = setTimeout(showNewLetter, 300); 

      // Adjust speed periodically using the latest values
      if (newTotalPresses % LETTERS_PER_LEVEL_ADJUSTMENT === 0 && newTotalPresses > 0) {
         // adjustSpeedViaAI will use the gameState from its own scope (which is one render behind this immediate update).
         // To ensure it has the *very latest* numbers from this key press for accuracy/wpm,
         // those would need to be calculated here and passed, or adjustSpeedViaAI would need to take them as params.
         // For now, relying on the next render's gameState for adjustSpeedViaAI is simpler.
         // The `gameState` dependency in `adjustSpeedViaAI` ensures it re-runs with updated values.
        adjustSpeedViaAI();
      }
      
      return {
        ...prev, // Start with previous state
        feedback: feedbackType,
        correctPresses: newCorrectPresses,
        totalPresses: newTotalPresses,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        currentLetter: correct || isTimeout ? prev.currentLetter : prev.currentLetter, 
      };
    });
    calculateStats(); // Calculate stats immediately after state update.
  }, [showNewLetter, calculateStats, adjustSpeedViaAI]);


  const startGame = useCallback(() => {
    if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setGameState(prev => ({
      ...initialGameState,
      currentLevel: prev.currentLevel, 
      letterIntervalMs: LEVEL_TO_INTERVAL_MS[prev.currentLevel],
      isPlaying: true,
      gameStartTime: Date.now(),
      showStartScreen: false,
      isSessionOver: false,
    }));
    showNewLetter();
  }, [showNewLetter]);

  const endSession = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

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
        durationMinutes: parseFloat(durationMinutes.toFixed(2)),
        longestStreak: prev.longestStreak,
      };

      const updatedSessions = [newSession, ...pastSessions].slice(0, 10); 
      setPastSessions(updatedSessions);
      saveSessionStats(updatedSessions);
      
      toast({
        title: "Session Ended!",
        description: `WPM: ${finalWPM}, Accuracy: ${(finalAccuracy * 100).toFixed(1)}%`,
      });

      return {
        ...prev,
        isPlaying: false,
        isSessionOver: true,
        currentLetter: null,
        showStartScreen: true, 
      };
    });
  }, [pastSessions, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState.isPlaying || gameState.isSessionOver || !gameState.currentLetter) return;
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/i)) {
        event.preventDefault();
        handleKeyPress(event.key);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      };
    }
  }, [gameState.isPlaying, gameState.isSessionOver, gameState.currentLetter, handleKeyPress]);
  
  useEffect(() => {
    if (gameState.isPlaying) {
      calculateStats();
    }
  }, [gameState.correctPresses, gameState.totalPresses, gameState.isPlaying, calculateStats]);

  return { gameState, startGame, endSession, pastSessions };
}
