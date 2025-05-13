"use client";

import { MainLayout } from '@/components/layout/main-layout';
import { LetterDisplay } from '@/components/letter-display';
import { GameControls } from '@/components/game-controls';
import { CurrentStats } from '@/components/current-stats';
import { SessionStats } from '@/components/session-stats';
import { useLetterLeapGame } from '@/hooks/use-letter-leap-game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LetterLeapPage() {
  const { gameState, startGame, endSession, pastSessions } = useLetterLeapGame();

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center text-center py-6">
        {gameState.showStartScreen && !gameState.isPlaying && (
          <Card className="w-full max-w-md mb-8 p-6 shadow-xl animate-letter-appear">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Welcome to Letter Leap!</CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Test your typing speed and accuracy. Letters will appear one by one. Type them quickly and correctly!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mt-4 text-sm text-muted-foreground">
                The game will adapt to your skill level. Good luck!
              </p>
            </CardContent>
          </Card>
        )}

        {!gameState.showStartScreen && (
            <>
                <LetterDisplay letter={gameState.currentLetter} feedback={gameState.feedback} />
                <CurrentStats
                    wpm={gameState.currentWPM}
                    accuracy={gameState.currentAccuracy}
                    currentStreak={gameState.currentStreak}
                    longestStreak={gameState.longestStreak}
                    level={gameState.currentLevel}
                />
            </>
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
