
"use client";

import type { NextPage } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdditionAdventureGame, DRAGGABLE_ITEM_TYPE_ADDITION } from '@/hooks/useAdditionAdventureGame';
import { ADDITION_MAX_ANSWER, ADDITION_GAME_DURATION_SECONDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Award, Lightbulb, Play, Clock, Repeat, Square, AlertCircle } from 'lucide-react';

const AdditionAdventurePage: NextPage = () => {
  const { gameState, startGame, handleDropOnPile, handleAnswer, userEndSession, pastSessions } = useAdditionAdventureGame();
  const {
    currentProblem,
    score,
    feedbackMessage,
    dragFeedback,
    isCorrect,
    isPlaying,
    timeLeft,
    showPraiseMessage,
    praiseText,
    praiseIcon,
    phase,
    pile1Count,
    pile2Count
  } = gameState;

  const PraiseIcon = praiseIcon;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (currentProblem) {
      e.dataTransfer.setData(DRAGGABLE_ITEM_TYPE_ADDITION, currentProblem.item.name);
      // You can customize the drag image if needed:
      // const dragImg = e.currentTarget.cloneNode(true) as HTMLElement;
      // dragImg.style.position = "absolute"; dragImg.style.top = "-1000px";
      // document.body.appendChild(dragImg);
      // e.dataTransfer.setDragImage(dragImg, 20, 20);
      // setTimeout(() => document.body.removeChild(dragImg), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const makeDropHandler = (pileId: 1 | 2) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData(DRAGGABLE_ITEM_TYPE_ADDITION);
    if (itemType && currentProblem && itemType === currentProblem.item.name) {
      handleDropOnPile(pileId);
    }
  };

  const renderPileZone = (pileId: 1 | 2) => {
    if (!currentProblem) return null;
    const count = pileId === 1 ? pile1Count : pile2Count;
    const targetCount = pileId === 1 ? currentProblem.num1 : currentProblem.num2;
    
    return (
      <Card
        onDragOver={handleDragOver}
        onDrop={makeDropHandler(pileId)}
        className={cn(
          "w-full md:w-2/5 min-h-[10rem] md:min-h-[12rem] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 md:p-4 transition-all",
          gameState.phase === 'buildingPiles' ? 'border-primary/50 hover:border-primary' : 'border-muted'
        )}
      >
        <CardContent className="flex flex-col items-center justify-center p-0">
          <div className="flex flex-wrap justify-center text-3xl md:text-4xl mb-2 min-h-[40px]">
            {Array.from({ length: count }).map((_, i) => (
              <span key={i} className="mx-0.5 animate-letter-appear">{currentProblem.item.visual}</span>
            ))}
          </div>
          <p className="text-lg font-semibold text-foreground">{count}</p>
          {gameState.phase === 'buildingPiles' && (
             <p className="text-sm text-muted-foreground">(Needs {targetCount})</p>
          )}
        </CardContent>
      </Card>
    );
  };


  return (
    <MainLayout title="Addition Adventure">
      <div className="flex flex-col items-center justify-center text-center py-6 relative">
        
        {phase === 'startScreen' && (
           <Card className="w-full max-w-lg mb-8 p-6 shadow-xl animate-letter-appear">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Addition Adventure!</CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Drag items to the piles to make the numbers, then find the sum!
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

        {phase === 'sessionOver' && (
          <Card className="w-full max-w-lg mb-8 p-6 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Round Over!</CardTitle>
               <CardDescription className="text-lg mt-2 text-muted-foreground">
                {gameState.feedbackMessage || `You scored ${gameState.score} points and solved ${gameState.correctAttempts} problems!`}
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
                   {/* Text can be removed if too complex for non-readers, icon is primary */}
                   <p className="text-sm md:text-base font-bold text-secondary-foreground">{praiseText}</p>
                </CardContent>
              </Card>
            </div>
        )}

        {isPlaying && currentProblem && (phase === 'buildingPiles' || phase === 'pilesBuilt_promptSum' || phase === 'finalFeedback') && (
          <div className="w-full max-w-3xl">
            {/* Instructions & Draggable Item Area */}
            <Card className="mb-6 p-4 shadow-md">
              <CardHeader className="p-2 text-center">
                <CardTitle className="text-xl md:text-2xl text-primary">
                  { phase === 'buildingPiles' && `Build the Piles!` }
                  { phase === 'pilesBuilt_promptSum' && `What is ${currentProblem.num1} + ${currentProblem.num2}?` }
                  { phase === 'finalFeedback' && (isCorrect ? "Correct!" : "Try the next one!") }
                </CardTitle>
                {feedbackMessage && <CardDescription className="text-base mt-1">{feedbackMessage}</CardDescription>}
              </CardHeader>
              {phase === 'buildingPiles' && (
                <CardContent className="flex flex-col items-center p-2">
                    <p className="text-sm text-muted-foreground mb-3">Drag this {currentProblem.item.name}:</p>
                    <div
                      draggable
                      onDragStart={handleDragStart}
                      className="cursor-grab p-2 m-2 border-2 border-accent rounded-md bg-secondary shadow-lg hover:shadow-xl transition-shadow"
                      aria-label={`Draggable ${currentProblem.item.name}`}
                    >
                      <span className="text-5xl md:text-6xl">{currentProblem.item.visual}</span>
                    </div>
                    {dragFeedback && (
                      <p className="mt-2 text-sm text-destructive flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1"/> {dragFeedback}
                      </p>
                    )}
                </CardContent>
              )}
            </Card>

            {/* Pile Drop Zones */}
            {phase === 'buildingPiles' && (
              <div className="flex flex-col md:flex-row items-stretch justify-around gap-4 mb-6">
                {renderPileZone(1)}
                <div className="flex items-center justify-center text-3xl md:text-5xl font-bold text-primary mx-1 md:mx-2 self-center">+</div>
                {renderPileZone(2)}
              </div>
            )}
            
            {/* Display built piles when prompting for sum or showing final feedback */}
             {(phase === 'pilesBuilt_promptSum' || phase === 'finalFeedback') && currentProblem && (
              <Card className="mb-6 shadow-lg">
                <CardContent className="flex items-center justify-center flex-wrap py-6 min-h-[100px] gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex text-4xl md:text-5xl">
                      {Array.from({ length: currentProblem.num1 }).map((_, i) => <span key={`p1-${i}`}>{currentProblem.item.visual}</span>)}
                    </div>
                    <p className="text-2xl font-bold">{currentProblem.num1}</p>
                  </div>
                  <span className="text-4xl md:text-6xl font-bold text-primary mx-2 md:mx-4">+</span>
                  <div className="flex flex-col items-center">
                     <div className="flex text-4xl md:text-5xl">
                      {Array.from({ length: currentProblem.num2 }).map((_, i) => <span key={`p2-${i}`}>{currentProblem.item.visual}</span>)}
                    </div>
                    <p className="text-2xl font-bold">{currentProblem.num2}</p>
                  </div>
                   <span className="text-4xl md:text-6xl font-bold text-primary mx-2 md:mx-4">= ?</span>
                </CardContent>
              </Card>
            )}


            {/* Answer Buttons for Sum */}
            {phase === 'pilesBuilt_promptSum' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 mb-6">
                {Array.from({ length: ADDITION_MAX_ANSWER }, (_, i) => i + 1).map((num) => (
                  <Button
                    key={num}
                    onClick={() => handleAnswer(num)}
                    className="text-2xl md:text-3xl h-16 md:h-20 shadow-md"
                    variant="outline"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Feedback for Sum Answer */}
            {phase === 'finalFeedback' && feedbackMessage && gameState.isCorrect !== null && (
              <Card className={cn(
                "p-4 mt-4 shadow-md text-xl font-semibold",
                gameState.isCorrect ? "bg-feedback-correct text-feedback-correct-foreground border-2 border-green-500" 
                                    : "bg-feedback-incorrect text-feedback-incorrect-foreground border-2 border-red-500"
              )}>
                <CardContent className="p-0">
                  <p>{feedbackMessage}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats Bar and End Game Button */}
            <Card className="mt-8 p-4 shadow-md bg-card/70">
               <CardContent className="flex flex-col sm:flex-row justify-around items-center p-0 gap-2 sm:gap-0">
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
            <Button onClick={userEndSession} variant="destructive" className="mt-8 shadow-lg">
                <Square className="mr-2 h-5 w-5" /> End Game
            </Button>
          </div>
        )}

        {pastSessions.length > 0 && (phase === 'startScreen' || phase === 'sessionOver') && (
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
