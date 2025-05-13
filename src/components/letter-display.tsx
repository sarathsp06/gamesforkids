"use client";

import type { FeedbackType } from '@/types';
import { cn } from '@/lib/utils';

interface LetterDisplayProps {
  letter: string | null;
  feedback: FeedbackType;
}

export function LetterDisplay({ letter, feedback }: LetterDisplayProps) {
  if (!letter) {
    return (
      <div className="flex items-center justify-center w-40 h-40 md:w-48 md:h-48 rounded-lg bg-muted shadow-inner">
        <span className="text-4xl font-bold text-muted-foreground">...</span>
      </div>
    );
  }

  const feedbackClass = 
    feedback === 'correct' ? 'feedback-correct bg-[hsl(var(--feedback-correct))] text-[hsl(var(--feedback-correct-foreground))]' :
    feedback === 'incorrect' || feedback === 'timeout' ? 'feedback-incorrect bg-[hsl(var(--feedback-incorrect))] text-[hsl(var(--feedback-incorrect-foreground))]' :
    'bg-accent text-accent-foreground';

  return (
    <div
      key={letter + (feedback || '')} // Force re-render for animation on feedback change
      className={cn(
        "flex items-center justify-center w-40 h-40 md:w-48 md:h-48 rounded-lg shadow-xl transition-all duration-150 ease-in-out",
        "border-4 border-opacity-50",
        feedbackClass,
        !feedback && 'animate-letter-appear' // Only animate appearance if no feedback
      )}
      style={{
        borderColor: feedback === 'correct' ? 'hsl(var(--feedback-correct))' :
                     feedback === 'incorrect' || feedback === 'timeout' ? 'hsl(var(--feedback-incorrect))' :
                     'hsl(var(--accent) / 0.7)',
      }}
      aria-live="polite"
    >
      <span className="text-7xl md:text-8xl font-bold select-none">
        {letter}
      </span>
    </div>
  );
}
