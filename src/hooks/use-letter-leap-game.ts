"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, FeedbackType, SessionStats, AdaptiveSpeedInput, AdaptiveSpeedOutput } from '@/types';
import { ALPHABET, INITIAL_LEVEL, LEVEL_TO_INTERVAL_MS, LETTERS_PER_LEVEL_ADJUSTMENT, MIN_LEVEL, MAX_LEVEL } from '@/lib/constants';
import { loadSessionStats, saveSessionStats } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";
import { streamFlow } from '@genkit-ai/next/client';
// Import the actual flow. Ensure this path is correct and the flow is properly defined/exported.
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
      totalLettersAttempted: totalPresses,
    };

    try {
      const { response } = streamFlow<AdaptiveSpeedInput, AdaptiveSpeedOutput>({
        flow: adaptiveSpeedFlow,
        input: input,
      });
      const output = await response; // For non-streaming flows, await the response promise

      if (output) {
        const newLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, output.newLevel));
        if (newLevel !== currentLevel) {
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
      // Optionally, implement a fallback non-AI based adjustment
    }
  }, [gameState, toast]);


  const showNewLetter = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);

    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      const randomIndex = Math.floor(Math.random() * ALPHABET.length);
      const nextLetter = ALPHABET[randomIndex];
      
      letterTimeoutRef.current = setTimeout(() => {
        handleKeyPress('', true); // Timeout is like a missed key press
      }, prev.letterIntervalMs);

      return { ...prev, currentLetter: nextLetter, feedback: null };
    });
  }, []); // gameState.isPlaying and gameState.letterIntervalMs were here, but showNewLetter is called by startGame which sets these.
            // The primary dependency for showNewLetter's own logic is its ability to clear timeouts and set new ones,
            // and to pick a letter. Its core logic doesn't directly depend on isPlaying or intervalMs from outer scope
            // once it's running, as those are used by callers or to schedule the timeout.
            // However, handleKeyPress (called by timeout) might depend on them. Given handleKeyPress is memoized,
            // this dependency chain should be okay. Let's keep it minimal for now or review if issues arise.


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

      // Set feedback and then show next letter after a short delay
      feedbackTimeoutRef.current = setTimeout(showNewLetter, 300); // Show feedback for 300ms

      // Adjust speed periodically
      if (newTotalPresses % LETTERS_PER_LEVEL_ADJUSTMENT === 0 && newTotalPresses > 0) {
        // State for adjustSpeedViaAI will be from `prev` here, which is slightly stale.
        // adjustSpeedViaAI itself uses gameState, which is one render behind.
        // This is usually fine for periodic adjustments. If more precise state is needed,
        // adjustSpeedViaAI would need to be passed the relevant parts of `prev`.
        // For now, this is standard hook behavior.
        adjustSpeedViaAI();
      }
      
      return {
        ...prev,
        feedback: feedbackType,
        correctPresses: newCorrectPresses,
        totalPresses: newTotalPresses,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        currentLetter: correct || isTimeout ? prev.currentLetter : prev.currentLetter, // Keep letter on incorrect until next cycle
      };
    });
    calculateStats();
  }, [showNewLetter, calculateStats, adjustSpeedViaAI]);


  const startGame = useCallback(() => {
    if (letterTimeoutRef.current) clearTimeout(letterTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setGameState(prev => ({
      ...initialGameState,
      currentLevel: prev.currentLevel, // Retain current level from previous game or initial
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

      const updatedSessions = [newSession, ...pastSessions].slice(0, 10); // Keep last 10 sessions
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
        showStartScreen: true, // To show the start screen elements again
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
  
  // Recalculate stats when correctPresses or totalPresses change
  useEffect(() => {
    if (gameState.isPlaying) {
      calculateStats();
    }
  }, [gameState.correctPresses, gameState.totalPresses, gameState.isPlaying, calculateStats]);

  // Effect for showNewLetter re-scheduling:
  // If isPlaying becomes true and was false, or if letterIntervalMs changes while playing.
  // This is partly handled by startGame, but direct changes to level/interval might need this.
  // current showNewLetter deps are minimal; this is more about *when* to call it initially or on changes.
  // The current logic in startGame -> showNewLetter handles the initial call.
  // Subsequent calls are chained via feedback timeouts.
  // AI adjustments change letterIntervalMs, then the *next* letter timeout set by showNewLetter will use the new interval.


  return { gameState, startGame, endSession, pastSessions };
}
