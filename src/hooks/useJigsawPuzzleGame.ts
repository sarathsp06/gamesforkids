
"use client";

import { useState, useCallback, useEffect } from 'react';
import type { JigsawGameState, JigsawMap, JigsawPhase, JigsawSessionStats } from '@/types';
import { JIGSAW_MAPS, LOCAL_STORAGE_JIGSAW_SESSIONS_KEY } from '@/lib/constants';
import { useToast } from './use-toast';

const initialGameState: JigsawGameState = {
  selectedMap: null,
  isPuzzleComplete: false,
  showPreview: false,
  phase: 'mapSelection',
  isLibraryInitialized: false,
  isPuzzleSolvedByLibrary: false,
};

export function useJigsawPuzzleGame() {
  const [gameState, setGameState] = useState<JigsawGameState>(initialGameState);
  const [pastSessions, setPastSessions] = useState<JigsawSessionStats[]>([]);
  const [puzzleInstance, setPuzzleInstance] = useState<any | null>(null);
  const { toast } = useToast();

  const loadSessions = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_JIGSAW_SESSIONS_KEY);
      if (stored) {
        setPastSessions(JSON.parse(stored));
      }
    }
  }, []);

  const saveSessions = useCallback((sessions: JigsawSessionStats[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_JIGSAW_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const selectMapAndStart = useCallback(async (map: JigsawMap, elementId: string) => {
    console.log('[JigsawDebug] selectMapAndStart called with map:', map.id, 'elementId:', elementId);
    if (puzzleInstance) {
      try {
        console.log('[JigsawDebug] Destroying previous puzzle instance...');
        await puzzleInstance.destroy();
        setPuzzleInstance(null);
        console.log('[JigsawDebug] Previous instance destroyed.');
      } catch (error) {
        console.error("[JigsawDebug] Error destroying previous puzzle instance:", error);
      }
    }
    setGameState(prev => ({
      ...prev,
      selectedMap: map,
      phase: 'loadingLibrary',
      isLibraryInitialized: false,
      isPuzzleSolvedByLibrary: false,
      isPuzzleComplete: false
    }));
    console.log('[JigsawDebug] GameState set to loadingLibrary.');

    // Ensure the DOM has a chance to update with the #puzzle-container for 'loadingLibrary' phase
    await new Promise(resolve => setTimeout(resolve, 0));


    try {
      console.log('[JigsawDebug] Attempting dynamic import of jigsaw-puzzle...');
      const { puzzle } = await import('jigsaw-puzzle');
      console.log('[JigsawDebug] Dynamic import successful. Puzzle function retrieved.');
      
      const targetElement = document.getElementById(elementId);
      if (!targetElement) {
        console.error(`[JigsawDebug] CRITICAL: Element with ID ${elementId} not found in the DOM at time of puzzle init.`);
        toast({ variant: "destructive", title: "Initialization Error", description: "Puzzle container element not found. Please try refreshing." });
        setGameState(prev => ({ ...prev, phase: 'mapSelection', selectedMap: null, isLibraryInitialized: false }));
        return;
      }
      console.log(`[JigsawDebug] Target element #${elementId} found:`, targetElement);
      console.log(`[JigsawDebug] Attempting to initialize puzzle with image: ${map.imageUrl}, pieces: ${map.pieces.x}x${map.pieces.y}`);


      const instance = new puzzle({
        canvas: `#${elementId}`,
        image: map.imageUrl,
        pieces: map.pieces, // {x: number, y: number}
        onInit: () => {
          console.log('[JigsawDebug] Puzzle onInit callback triggered for map:', map.id);
          setGameState(prev => {
            if (prev.selectedMap?.id !== map.id) {
              console.warn('[JigsawDebug] onInit called for a different map than current. Ignoring.');
              return prev;
            }
            console.log('[JigsawDebug] Inside onInit: Setting phase to playing and isLibraryInitialized to true.');
            return { ...prev, isLibraryInitialized: true, phase: 'playing' };
          });
          toast({ title: "Puzzle Ready!", description: `The ${map.name} puzzle is ready to be solved.` });
        },
        onChange: (data: any) => {
          // console.log('[JigsawDebug] Puzzle onChange:', data); // Can be noisy
        },
        onComplete: () => {
          console.log('[JigsawDebug] Puzzle onComplete callback triggered for map:', map.id);
          setGameState(prev => {
            if (prev.selectedMap?.id !== map.id || prev.phase === 'completed') {
               console.warn('[JigsawDebug] onComplete called for a different/already completed map. Ignoring.');
              return prev;
            }
            console.log('[JigsawDebug] Inside onComplete: Setting phase to completed.');
            const newSession: JigsawSessionStats = {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              mapId: map.id,
              timeTakenSeconds: 0, // Placeholder, library doesn't provide this
              moves: 0, // Placeholder, library doesn't provide this
              gridSize: map.pieces.x * map.pieces.y,
            };
            const updatedSessions = [newSession, ...pastSessions].slice(0, 10);
            setPastSessions(updatedSessions);
            saveSessions(updatedSessions);
            return { ...prev, isPuzzleSolvedByLibrary: true, isPuzzleComplete: true, phase: 'completed' };
          });
          toast({ title: "Congratulations!", description: `You completed the ${map.name} puzzle!` });
        },
      });
      console.log('[JigsawDebug] puzzle() promise resolved. Library instance:', instance);
      setPuzzleInstance(instance);
    } catch (error) {
      console.error("[JigsawDebug] Error initializing jigsaw puzzle:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load the puzzle. Please try again." });
      setGameState(prev => ({ ...prev, phase: 'mapSelection', selectedMap: null, isLibraryInitialized: false }));
    }
  }, [puzzleInstance, toast, pastSessions, saveSessions]);

  const togglePreview = useCallback(() => {
    setGameState(prev => ({ ...prev, showPreview: !prev.showPreview }));
  }, []);

  const resetGame = useCallback(async () => {
    console.log('[JigsawDebug] resetGame called.');
    if (puzzleInstance) {
      try {
        console.log('[JigsawDebug] Destroying puzzle instance during reset...');
        await puzzleInstance.destroy();
        console.log('[JigsawDebug] Puzzle instance destroyed during reset.');
      } catch (error) {
        console.error("[JigsawDebug] Error destroying puzzle instance during reset:", error);
      }
      setPuzzleInstance(null);
    }
    setGameState({...initialGameState, phase: 'mapSelection'}); // Ensure phase is mapSelection
    // loadSessions(); // Not strictly needed here if already loaded on mount and pastSessions is managed correctly
  }, [puzzleInstance]);

  return { gameState, JIGSAW_MAPS, selectMapAndStart, togglePreview, resetGame, pastSessions };
}
