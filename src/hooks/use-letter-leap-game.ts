"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, FeedbackType, SessionStats } from '@/types';
import { WORDS, INITIAL_LEVEL, PRAISE_MESSAGES, LEFT_HAND_KEYS, RIGHT_HAND_KEYS } from '@/lib/constants';
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
  showPraiseMessage: false,
  praiseText: null,
  praiseIcon: null,
  activeHand: null,
};

export function useLetterLeapGame(inputRef: React.RefObject<HTMLInputElement>) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [pastSessions, setPastSessions] = useState<SessionStats[]>([]);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wordDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const praiseMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    setPastSessions(loadSessionStats());

    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      if (praiseMessageTimeoutRef.current) clearTimeout(praiseMessageTimeoutRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const speakWord = useCallback((word: string) => {
    if (synthRef.current && word) {
      synthRef.current.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8; // Slower for clearer pronunciation for kids
      utterance.pitch = 1.2; // Slightly higher pitch
      synthRef.current.speak(utterance);
    }
  }, []);

  const getHandForChar = (char: string): 'left' | 'right' | null => {
    const upperChar = char.toUpperCase();
    if (LEFT_HAND_KEYS.includes(upperChar)) return 'left';
    if (RIGHT_HAND_KEYS.includes(upperChar)) return 'right';
    return null;
  };

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
    // Don't clear praise message here, let its own timeout handle it

    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      const randomIndex = Math.floor(Math.random() * WORDS.length);
      const nextWord = WORDS[randomIndex].toUpperCase();
      
      speakWord(nextWord);
      const firstCharHand = getHandForChar(nextWord[0]);

      return { 
        ...prev, 
        currentWord: nextWord, 
        currentWordIndex: 0,
        typedWordPortion: "",
        feedback: null,
        feedbackLetter: null,
        activeHand: firstCharHand, // Set hand for the first letter
      };
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [speakWord, inputRef]); 


  const handleKeyPress = useCallback((key: string) => {
    setGameState(prev => {
      if (!prev.isPlaying || !prev.currentWord || prev.currentWordIndex >= prev.currentWord.length) return prev;

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      if (praiseMessageTimeoutRef.current) clearTimeout(praiseMessageTimeoutRef.current); // Clear previous praise timeout
      
      const targetLetter = prev.currentWord[prev.currentWordIndex];
      let feedbackType: FeedbackType = null;
      let newCorrectPresses = prev.correctPresses;
      let newCurrentStreak = prev.currentStreak;
      let newLongestStreak = prev.longestStreak;
      let newTypedWordPortion = prev.typedWordPortion;
      let newCurrentWordIndex = prev.currentWordIndex;
      let newWordsTyped = prev.wordsTyped;
      let newShowPraiseMessage = false;
      let newPraiseText: string | null = null;
      let newPraiseIcon: GameState['praiseIcon'] = null;
      let nextCharHand: 'left' | 'right' | null = prev.activeHand;

      if (key.toUpperCase() === targetLetter.toUpperCase()) {
        feedbackType = 'correct';
        newCorrectPresses++;
        newCurrentStreak++;
        if (newCurrentStreak > newLongestStreak) {
          newLongestStreak = newCurrentStreak;
        }
        newTypedWordPortion += targetLetter;
        newCurrentWordIndex++;

        if (newCurrentWordIndex < prev.currentWord.length) {
          nextCharHand = getHandForChar(prev.currentWord[newCurrentWordIndex]);
        } else {
          nextCharHand = null; // Word completed
        }

      } else {
        feedbackType = 'incorrect';
        newCurrentStreak = 0;
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(100);
        }
        // Hand for incorrect letter remains the same as it's still the target
        nextCharHand = getHandForChar(targetLetter);
      }
      
      const newTotalPresses = prev.totalPresses + 1;
      
      const isWordComplete = newCurrentWordIndex === prev.currentWord.length;
      if (isWordComplete && feedbackType === 'correct') {
        newWordsTyped++;
        const randomPraise = PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
        newShowPraiseMessage = true;
        newPraiseText = randomPraise.text;
        newPraiseIcon = randomPraise.icon;
        
        praiseMessageTimeoutRef.current = setTimeout(() => {
          setGameState(gs => ({ ...gs, showPraiseMessage: false, praiseText: null, praiseIcon: null }));
        }, 2000); // Display praise for 2 seconds

        wordDisplayTimeoutRef.current = setTimeout(showNewWord, 2200); // Show next word after praise + small delay
      } else if (feedbackType) { // Only set feedback timeout if there was a key press (correct or incorrect but not word complete)
         feedbackTimeoutRef.current = setTimeout(() => {
            setGameState(gs => ({ ...gs, feedback: null, feedbackLetter: null }));
         }, 700);
      }
      
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
        showPraiseMessage: newShowPraiseMessage,
        praiseText: newPraiseText,
        praiseIcon: newPraiseIcon,
        activeHand: nextCharHand,
      };
    });
    calculateStats();
  }, [showNewWord, calculateStats]);


  const startGame = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
    if (praiseMessageTimeoutRef.current) clearTimeout(praiseMessageTimeoutRef.current);
    if (synthRef.current) synthRef.current.cancel();

    setGameState(prev => ({
      ...initialGameState,
      currentLevel: prev.currentLevel, 
      isPlaying: true,
      gameStartTime: Date.now(),
      showStartScreen: false,
      isSessionOver: false,
    }));
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setTimeout(showNewWord, 150); 
  }, [showNewWord, inputRef]);

  const endSession = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (wordDisplayTimeoutRef.current) clearTimeout(wordDisplayTimeoutRef.current);
      if (praiseMessageTimeoutRef.current) clearTimeout(praiseMessageTimeoutRef.current);
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
        activeHand: null,
        showPraiseMessage: false,
        praiseText: null,
        praiseIcon: null,
      };
    });
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, [pastSessions, toast, inputRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState.isPlaying || gameState.isSessionOver || !gameState.currentWord) return;

      // If the hidden input is the target, let the onInput handler deal with it primarily.
      // This helps avoid double processing if keydown also results in an input event.
      if (event.target === inputRef.current) {
        // We might still want to prevent default for some keys if not handled by onInput,
        // but for character keys, onInput should be the primary.
        // For now, let's allow onInput to handle it.
      }

      // Check if the physical key pressed is one of A-Z (KeyA-KeyZ) or 0-9 (Digit0-Digit9)
      const isAlphaNumericPhysicalKey = /^(Key[A-Z]|Digit[0-9])$/.test(event.code);

      if (isAlphaNumericPhysicalKey) {
        // Prevent default browser action for these physical keys (e.g., Ctrl+B, browser search on typing)
        event.preventDefault();
        event.stopImmediatePropagation();

        // Process for game logic only if no Ctrl, Meta, or Alt keys are pressed (Shift is allowed)
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          // Use event.key for the actual character, as it respects Shift (e.g., 'a' vs 'A')
          // and check if it's a single alphabet character for the game.
          if (event.key.length === 1 && /^[a-zA-Z]$/i.test(event.key)) {
            handleKeyPress(event.key);
          }
          // Numbers (0-9) are not passed to handleKeyPress for LetterLeap,
          // but their default browser actions are prevented if they match Digit0-Digit9.
        }
        // If Ctrl/Meta/Alt were pressed with an A-Z/0-9 key, default action is prevented,
        // but the key is not passed to game logic.
      }
      // Other keys (e.g., Space, Enter, F-keys, symbols not on 0-9) are not affected by this block.
    };

    const handleHiddenInput = (event: Event) => {
      if (!gameState.isPlaying || gameState.isSessionOver || !gameState.currentWord) return;

      const target = event.target as HTMLInputElement;
      const inputValue = target.value;

      if (inputValue && inputValue.length > 0) {
        // Process the last character entered, common for mobile auto-suggest/swipe
        const charToProcess = inputValue.slice(-1);
        if (/^[a-zA-Z]$/i.test(charToProcess)) { // Ensure it's an alphabet character
          handleKeyPress(charToProcess);
        }
        target.value = ""; // Clear the input field
      }
      // event.preventDefault(); // Usually not needed for input event on text field, but can be added if issues arise.
    };

    const currentInputRef = inputRef.current;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown, true);
      currentInputRef?.addEventListener('input', handleHiddenInput);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        currentInputRef?.removeEventListener('input', handleHiddenInput);
      };
    }
  }, [gameState.isPlaying, gameState.isSessionOver, gameState.currentWord, handleKeyPress, inputRef]);
  
  useEffect(() => {
    if (gameState.isPlaying) {
      calculateStats();
    }
  }, [gameState.correctPresses, gameState.totalPresses, gameState.isPlaying, calculateStats]);

  return { gameState, startGame, endSession, pastSessions };
}

