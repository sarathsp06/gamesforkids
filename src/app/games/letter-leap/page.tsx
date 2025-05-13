
"use client";

import type { NextPage } from 'next'; 
import { MainLayout } from '@/components/layout/main-layout';
import { WordDisplay } from '@/components/word-display';
import { GameControls } from '@/components/game-controls';
import { CurrentStats } from '@/components/current-stats';
import { SessionStats } from '@/components/session-stats';
import { useLetterLeapGame } from '@/hooks/use-letter-leap-game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';


const LetterLeapPage: NextPage = () => {
  const { gameState, startGame, endSession, pastSessions } = useLetterLeapGame();
  const PraiseIcon = gameState.praiseIcon;

  return (
    <MainLayout title="Letter Leap">
      <div className="flex flex-col items-center justify-center text-center py-6 relative">
        {gameState.showStartScreen && !gameState.isPlaying && (
          <Card className="w-full max-w-md mb-8 p-6 shadow-xl animate-letter-appear">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Welcome to Letter Leap!</CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Test your typing speed and accuracy. Words will appear one by one. Type them quickly and correctly!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mt-4 text-sm text-muted-foreground">
                The game will speak the word. Listen carefully and type what you hear. Good luck!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Praise Message Display */}
        {gameState.showPraiseMessage && gameState.praiseText && PraiseIcon && (
          <div className="absolute top-[-30px] left-1/2 transform -translate-x-1/2 z-20 animate-praise-pop">
            <Card className="p-3 md:p-4 bg-secondary shadow-xl border-2 border-accent">
              <CardContent className="flex flex-col items-center gap-1 md:gap-2 p-0">
                <PraiseIcon className="h-10 w-10 md:h-12 md:w-12 text-accent" />
                <p className="text-lg md:text-xl font-bold text-secondary-foreground">{gameState.praiseText}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!gameState.showStartScreen && (
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center w-full max-w-4xl my-4 relative">
              {/* Left Hand Indicator */}
              <div className={cn(
                "hand-indicator-visual left flex-shrink-0",
                gameState.activeHand === 'left' && 'active'
              )}>
                {gameState.activeHand === 'left' && <Hand className="h-8 w-8 md:h-10 md:w-10 text-accent-foreground" />}
              </div>

              <WordDisplay 
                word={gameState.currentWord}
                typedPortion={gameState.typedWordPortion}
                currentIndex={gameState.currentWordIndex}
                feedback={gameState.feedback}
                feedbackLetter={gameState.feedbackLetter}
              />

              {/* Right Hand Indicator */}
              <div className={cn(
                "hand-indicator-visual right flex-shrink-0",
                gameState.activeHand === 'right' && 'active'
              )}>
                {gameState.activeHand === 'right' && <Hand className="h-8 w-8 md:h-10 md:w-10 text-accent-foreground" />}
              </div>
            </div>
            <CurrentStats
                wpm={gameState.currentWPM}
                accuracy={gameState.currentAccuracy}
                currentStreak={gameState.currentStreak}
                longestStreak={gameState.longestStreak}
                level={gameState.currentLevel}
                wordsTyped={gameState.wordsTyped}
            />
          </div>
        )}
        
        <GameControls
          isPlaying={gameState.isPlaying}
          isSessionOver={gameState.isSessionOver}
          showStartScreen={gameState.showStartScreen}
          onStart={startGame}
          onStop={endSession}
        />

        <SessionStats sessions={pastSessions} />
      </div>
    </MainLayout>
  );
}

export default LetterLeapPage;

    
