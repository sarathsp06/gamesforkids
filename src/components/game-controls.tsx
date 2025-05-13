"use client";

import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcwIcon } from 'lucide-react';

interface GameControlsProps {
  isPlaying: boolean;
  isSessionOver: boolean;
  showStartScreen: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function GameControls({ isPlaying, isSessionOver, showStartScreen, onStart, onStop }: GameControlsProps) {
  return (
    <div className="mt-8 flex gap-4">
      { (showStartScreen || isSessionOver) && !isPlaying && (
        <Button onClick={onStart} size="lg" className="min-w-[180px] shadow-lg">
          <Play className="mr-2 h-5 w-5" /> {isSessionOver ? 'Play Again' : 'Start Typing'}
        </Button>
      )}
      { isPlaying && !isSessionOver && (
        <Button onClick={onStop} variant="destructive" size="lg" className="min-w-[180px] shadow-lg">
          <Square className="mr-2 h-5 w-5" /> End Session
        </Button>
      )}
    </div>
  );
}
