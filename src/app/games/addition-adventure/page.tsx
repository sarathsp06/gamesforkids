
"use client";

import type { NextPage } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdditionAdventureGame } from '@/hooks/useAdditionAdventureGame';
import { ADDITION_MAX_ANSWER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Award, Lightbulb, Play, Clock, Repeat } from 'lucide-react';

const AdditionAdventurePage: NextPage = () => {
  const { gameState, startGame, handleAnswer, endSession, pastSessions } = useAdditionAdventureGame();
  const { currentProblem, score, feedbackMessage, isCorrect, isPlaying, isSessionOver, timeLeft, showPraiseMessage, praiseText, praiseIcon, showStartScreen } = gameState;

  const PraiseIcon = praiseIcon;

  const renderVisuals = (num: number, visual: string, itemName: string) => {
    return (
      <div className="flex flex-col items-center mx-2">
        <div className="flex flex-wrap justify-center my-2">
          {Array.from({ length: num }).map((_, i) => (
            <span key={i} className="text-4xl md:text-5xl px-1">{visual}</span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{num} {num === 1 ? itemName : `${itemName}s`}</p>
      </div>
    );
  };

  return (
    <MainLayout title="Addition Adventure">
      <div className="flex flex-col items-center justify-center text-center py-6 relative">
        
        {showStartScreen && !isPlaying && (
           <Card className="w-full max-w-lg mb-8 p-6 shadow-xl animate-letter-appear">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Addition Adventure!</CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Add the items together and choose the correct answer. Let&apos;s learn math!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mt-4 text-muted-foreground">You have {ADDITION_GAME_DURATION_SECONDS} seconds per round.</p>
              <Button onClick={startGame} size="lg" className="mt-6 min-w-[200px] shadow-lg">
                <Play className="mr-2 h-5 w-5" /> Start Adding
              </Button>
            </CardContent>
          </Card>
        )}

        {isSessionOver && (
          <Card className="w-full max-w-lg mb-8 p-6 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Round Over!</CardTitle>
               <CardDescription className="text-lg mt-2 text-muted-foreground">
                You scored {gameState.score} points and solved {gameState.correctAttempts} problems!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startGame} size="lg" className="mt-6 min-w-[200px] shadow-lg">
                <Repeat className="mr-2 h-5 w-5" /> Play Again
              </Button>
            </CardContent>
          </Card>
        )}

        {showPraiseMessage && praiseText && PraiseIcon && (
            <div className="absolute top-[-20px] left-1/2 transform -translate-x-1/2 z-20 animate-praise-pop">
              <Card className="p-3 md:p-4 bg-secondary shadow-xl border-2 border-accent">
                <CardContent className="flex flex-col items-center gap-1 md:gap-2 p-0">
                  <PraiseIcon className="h-10 w-10 md:h-12 md:w-12 text-accent" />
                  {/* Text can be removed if too complex for non-readers */}
                  {/* <p className="text-lg md:text-xl font-bold text-secondary-foreground">{praiseText}</p> */}
                </CardContent>
              </Card>
            </div>
          )}


        {isPlaying && currentProblem && (
          <div className="w-full max-w-2xl">
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">What is...</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center flex-wrap py-6 min-h-[200px]">
                {renderVisuals(currentProblem.num1, currentProblem.item.visual, currentProblem.item.name)}
                <span className="text-4xl md:text-6xl font-bold mx-2 md:mx-4 text-primary">+</span>
                {renderVisuals(currentProblem.num2, currentProblem.item.visual, currentProblem.item.name)}
                <span className="text-4xl md:text-6xl font-bold mx-2 md:mx-4 text-primary">= ?</span>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 mb-6">
              {Array.from({ length: ADDITION_MAX_ANSWER }, (_, i) => i + 1).map((num) => (
                <Button
                  key={num}
                  onClick={() => handleAnswer(num)}
                  className="text-2xl md:text-3xl h-16 md:h-20 shadow-md"
                  variant="outline"
                  disabled={!!feedbackMessage} // Disable while feedback is shown
                >
                  {num}
                </Button>
              ))}
            </div>

            {feedbackMessage && (
              <Card className={cn(
                "p-4 mt-4 shadow-md",
                isCorrect ? "bg-feedback-correct text-feedback-correct-foreground border-2 border-green-500" 
                          : "bg-feedback-incorrect text-feedback-incorrect-foreground border-2 border-red-500"
              )}>
                <CardContent className="p-0">
                  <p className="text-xl font-semibold">{feedbackMessage}</p>
                </CardContent>
              </Card>
            )}

            <Card className="mt-8 p-4 shadow-md bg-card/70">
               <CardContent className="flex justify-around items-center p-0">
                <div className="flex items-center text-lg">
                  <Award className="mr-2 h-6 w-6 text-accent" /> Score: {score}
                </div>
                <div className="flex items-center text-lg">
                  <Clock className="mr-2 h-6 w-6 text-primary" /> Time: {timeLeft}s
                </div>
                <div className="flex items-center text-lg">
                  <Lightbulb className="mr-2 h-6 w-6 text-secondary-foreground" /> Streak: {gameState.currentStreak}
                </div>
              </CardContent>
            </Card>
            <Button onClick={endSession} variant="destructive" className="mt-8 shadow-lg">End Game</Button>
          </div>
        )}

        {pastSessions.length > 0 && (showStartScreen || isSessionOver) && (
          <Card className="mt-12 w-full max-w-2xl shadow-lg">
            <CardHeader>
              <CardTitle>Past Rounds</CardTitle>
              <CardDescription>Your recent scores in Addition Adventure.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pastSessions.slice(0, 5).map(session => (
                  <li key={session.id} className="p-3 bg-muted rounded-md text-sm">
                    Score: {session.score}, Solved: {session.problemsSolved}, Accuracy: {session.accuracy}%
                    <span className="text-xs text-muted-foreground ml-2">({new Date(session.date).toLocaleDateString()})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  );
};

export default AdditionAdventurePage;
