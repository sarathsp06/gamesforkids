"use client";

import type { FeedbackType } from '@/types';
import { cn } from '@/lib/utils';

interface WordDisplayProps {
  word: string | null;
  typedPortion: string; // The part of the word typed correctly so far
  currentIndex: number; // Index of the letter to be typed next
  feedback: FeedbackType;
  feedbackLetter: string | null; // The specific letter that received feedback
}

export function WordDisplay({ word, typedPortion, currentIndex, feedback, feedbackLetter }: WordDisplayProps) {
  if (!word) {
    return (
      <div className="flex items-center justify-center min-h-[10rem] md:min-h-[12rem] w-auto px-4 py-8 rounded-lg bg-muted shadow-inner">
        <span className="text-4xl font-bold text-muted-foreground">...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center w-auto min-h-[10rem] md:min-h-[12rem] max-w-full px-4 py-8 rounded-lg shadow-xl transition-all duration-150 ease-in-out",
        "border-4 border-opacity-50",
        feedback === 'correct' && currentIndex === typedPortion.length && word[currentIndex-1] === feedbackLetter ? 'feedback-correct bg-[hsl(var(--feedback-correct))]' :
        feedback === 'incorrect' && word[currentIndex] === feedbackLetter ? 'feedback-incorrect bg-[hsl(var(--feedback-incorrect))]' :
        'bg-card text-card-foreground', // Default background if no active feedback on current interaction
      )}
      style={{
        borderColor: feedback === 'correct' && currentIndex === typedPortion.length && word[currentIndex-1] === feedbackLetter ? 'hsl(var(--feedback-correct))' :
                     feedback === 'incorrect' && word[currentIndex] === feedbackLetter ? 'hsl(var(--feedback-incorrect))' :
                     'hsl(var(--accent) / 0.7)',
      }}
      aria-live="polite"
    >
      <div className="flex flex-wrap justify-center items-end">
        {word.split('').map((char, index) => {
          const isTyped = index < typedPortion.length;
          const isCurrentTarget = index === currentIndex;
          
          let charFeedbackClass = '';
          if (feedback && feedbackLetter === char) {
            if (isCurrentTarget && feedback === 'incorrect') {
              charFeedbackClass = 'text-[hsl(var(--feedback-incorrect-foreground))] animate-letter-appear'; // Pulsate or highlight incorrect
            } else if (index === currentIndex -1 && feedback === 'correct') {
               // Correctly typed letter that just got feedback
              charFeedbackClass = 'text-[hsl(var(--feedback-correct-foreground))]';
            }
          }

          return (
            <span
              key={index}
              className={cn(
                "font-bold select-none transition-all duration-100",
                isCurrentTarget ? "text-7xl md:text-8xl text-primary scale-110 mx-1" : "text-4xl md:text-5xl text-muted-foreground opacity-70 mx-0.5",
                isTyped && !isCurrentTarget ? "text-foreground opacity-100" : "",
                charFeedbackClass,
                 // Apply appear animation to current target if no feedback or if it's a new word
                isCurrentTarget && (!feedback || (feedback && feedbackLetter !== char)) && 'animate-letter-appear'
              )}
              style={{
                // "5 times bigger" - using text size classes, scale for emphasis
                transform: isCurrentTarget ? 'scale(1.25)' : 'scale(1)',
                lineHeight: isCurrentTarget ? '1' : '1.2', // Adjust line height for scaled items
                color: isTyped && !isCurrentTarget ? 'hsl(var(--foreground))' :
                       isCurrentTarget && feedback === 'incorrect' && feedbackLetter === char ? 'hsl(var(--destructive))' : // More prominent for incorrect
                       isCurrentTarget ? 'hsl(var(--primary))' : undefined,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
