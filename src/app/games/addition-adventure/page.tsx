
"use client";

import type { NextPage } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdditionAdventureGame, DRAGGABLE_ITEM_TYPE_ADDITION } from '@/hooks/useAdditionAdventureGame';
import { ADDITION_MAX_ANSWER, ADDITION_GAME_DURATION_SECONDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Award, Lightbulb, Play, Clock, Repeat, Square, AlertCircle, CheckCircle, HelpCircle, Plus, Smile, XCircle, ThumbsUp, StopCircle } from 'lucide-react';

const AdditionAdventurePage: NextPage = () => {
  const { gameState, startGame, handleDropOnPile, handleDropOnSumPile, userEndSession, pastSessions } = useAdditionAdventureGame();
  const {
    currentProblem,
    score,
    feedbackMessage, // Will be minimized
    dragFeedback,    // Will be an icon type
    isCorrect,
    isPlaying,
    timeLeft,
    showPraiseMessage,
    praiseIcon,
    phase,
    pile1Count,
    pile2Count,
    sumPileCount
  } = gameState;

  const PraiseIcon = praiseIcon;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (currentProblem) {
      e.dataTransfer.setData(DRAGGABLE_ITEM_TYPE_ADDITION, currentProblem.item.name);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };

  const makeDropHandlerForAddendPile = (pileId: 1 | 2) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData(DRAGGABLE_ITEM_TYPE_ADDITION);
    if (itemType && currentProblem && itemType === currentProblem.item.name && phase === 'buildingPiles') {
      handleDropOnPile(pileId);
    }
  };

  const handleDropOnSumPileEvent = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData(DRAGGABLE_ITEM_TYPE_ADDITION);
    if (itemType && currentProblem && itemType === currentProblem.item.name && phase === 'pilesBuilt_summingTime') {
      handleDropOnSumPile();
    }
  };
  
  const renderPileZone = (pileId: 1 | 2 | 'sum') => {
    if (!currentProblem) return null;
    
    let count, targetCount, pileLabel, onDropHandler, isActivePhase;

    if (pileId === 1) {
      count = pile1Count;
      targetCount = currentProblem.num1;
      pileLabel = currentProblem.num1.toString();
      onDropHandler = makeDropHandlerForAddendPile(1);
      isActivePhase = phase === 'buildingPiles';
    } else if (pileId === 2) {
      count = pile2Count;
      targetCount = currentProblem.num2;
      pileLabel = currentProblem.num2.toString();
      onDropHandler = makeDropHandlerForAddendPile(2);
      isActivePhase = phase === 'buildingPiles';
    } else { // sum pile
      count = sumPileCount;
      targetCount = currentProblem.correctAnswer;
      pileLabel = "?"; // Initially
      onDropHandler = handleDropOnSumPileEvent;
      isActivePhase = phase === 'pilesBuilt_summingTime';
    }
    
    const isPileComplete = count === targetCount;
    const isSumPileCorrect = pileId === 'sum' && isPileComplete && phase === 'finalFeedback' && isCorrect;

    return (
      <Card
        onDragOver={handleDragOver}
        onDrop={onDropHandler}
        className={cn(
          "w-full md:w-1/3 min-h-[10rem] md:min-h-[12rem] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 md:p-4 transition-all",
          isActivePhase ? 'border-primary/50 hover:border-primary' : 'border-muted',
          isPileComplete && pileId !== 'sum' && phase === 'buildingPiles' ? 'border-green-500 bg-green-500/10' : '',
          isSumPileCorrect ? 'border-green-500 bg-green-500/10' : '',
          pileId === 'sum' && phase === 'finalFeedback' && !isCorrect ? 'border-red-500 bg-red-500/10' : '',
        )}
      >
        <CardHeader className="p-1 mb-1">
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground">
                 { pileId === 'sum' && phase === 'pilesBuilt_summingTime' ? `${count} / ${targetCount}` : pileLabel }
                 { pileId !== 'sum' && phase === 'buildingPiles' ? ` (${count}/${targetCount})` : ''}
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-0">
          <div className="flex flex-wrap justify-center text-3xl md:text-4xl min-h-[40px] mb-1">
            {Array.from({ length: count }).map((_, i) => (
              <span key={`${pileId}-${i}`} className="mx-0.5 animate-letter-appear">{currentProblem.item.visual}</span>
            ))}
          </div>
           {/* Visual indication for target for addend piles, or sum pile state */}
           {pileId !== 'sum' && phase === 'buildingPiles' && count < targetCount && (
             <div className="flex text-muted-foreground">
                {Array.from({ length: targetCount - count }).map((_, i) => (
                    <span key={`needed-${i}`} className="mx-0.5 opacity-30 text-2xl">{currentProblem.item.visual}</span>
                ))}
             </div>
           )}
           {pileId === 'sum' && phase === 'pilesBuilt_summingTime' && count < targetCount && (
             <p className="text-sm text-muted-foreground">(Needs {targetCount - count} more)</p>
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
              <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <Smile className="w-10 h-10"/>Addition Adventure!
              </CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Drag items to count and add!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mt-4 text-muted-foreground">Round Time: {ADDITION_GAME_DURATION_SECONDS} seconds.</p>
              <Button onClick={startGame} size="lg" className="mt-6 min-w-[200px] shadow-lg">
                <Play className="mr-2 h-5 w-5" /> Start
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === 'sessionOver' && (
          <Card className="w-full max-w-lg mb-8 p-6 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">Round Over!</CardTitle>
               <CardDescription className="text-lg mt-2 text-muted-foreground">
                {feedbackMessage || `You scored ${score} points!`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startGame} size="lg" className="mt-6 min-w-[200px] shadow-lg">
                <Repeat className="mr-2 h-5 w-5" /> Play Again
              </Button>
            </CardContent>
          </Card>
        )}

        {showPraiseMessage && PraiseIcon && (
            <div className="absolute top-[-20px] left-1/2 transform -translate-x-1/2 z-20 animate-praise-pop">
              <Card className="p-3 md:p-4 bg-secondary shadow-xl border-2 border-accent">
                <CardContent className="flex flex-col items-center gap-1 md:gap-2 p-0">
                  <PraiseIcon className="h-10 w-10 md:h-12 md:w-12 text-accent" />
                  {/* praiseText is intentionally omitted for non-readers */}
                </CardContent>
              </Card>
            </div>
        )}

        {isPlaying && currentProblem && (phase === 'buildingPiles' || phase === 'pilesBuilt_summingTime' || phase === 'finalFeedback') && (
          <div className="w-full max-w-4xl"> {/* Max width increased for 3 piles */}
            {/* Instructions & Draggable Item Area */}
            <Card className="mb-6 p-4 shadow-md">
              <CardHeader className="p-2 text-center">
                 <CardTitle className="text-xl md:text-2xl text-primary h-12 flex items-center justify-center"> {/* Fixed height */}
                  { phase === 'buildingPiles' && <HelpCircle className="w-8 h-8 mr-2"/> }
                  { phase === 'pilesBuilt_summingTime' && <Plus className="w-8 h-8 mr-2"/> }
                  { phase === 'finalFeedback' && (isCorrect ? <CheckCircle className="w-8 h-8 text-green-500"/> : <XCircle className="w-8 h-8 text-red-500"/>) }
                  {/* Textual instructions minimized */}
                </CardTitle>
              </CardHeader>
              {(phase === 'buildingPiles' || phase === 'pilesBuilt_summingTime') && (
                <CardContent className="flex flex-col items-center p-2">
                    <div
                      draggable
                      onDragStart={handleDragStart}
                      className="cursor-grab p-2 m-2 border-2 border-accent rounded-md bg-secondary shadow-lg hover:shadow-xl transition-shadow"
                      aria-label={`Draggable ${currentProblem.item.name}`}
                    >
                      <span className="text-5xl md:text-6xl">{currentProblem.item.visual}</span>
                    </div>
                    {dragFeedback && (
                      <div className="mt-2 text-sm text-destructive flex items-center">
                         {dragFeedback === 'stop' && <StopCircle className="w-6 h-6 text-red-500"/>}
                      </div>
                    )}
                </CardContent>
              )}
            </Card>

            {/* Piles Area */}
            <div className="flex flex-col md:flex-row items-stretch justify-around gap-3 md:gap-4 mb-6">
              {renderPileZone(1)}
              {phase === 'buildingPiles' && <div className="flex items-center justify-center text-3xl md:text-5xl font-bold text-primary mx-1 self-center">+</div>}
              {renderPileZone(2)}
              {phase === 'pilesBuilt_summingTime' && (
                <>
                  <div className="flex items-center justify-center text-3xl md:text-5xl font-bold text-primary mx-1 self-center">=</div>
                  {renderPileZone('sum')}
                </>
              )}
            </div>
            
            {/* Display full equation after piles are built, before summing */}
            {phase === 'pilesBuilt_summingTime' && currentProblem && (
              <Card className="mb-6 shadow-lg">
                <CardContent className="flex items-center justify-center flex-wrap py-4 min-h-[80px] gap-2 md:gap-4">
                  <div className="flex items-center">
                    <div className="flex text-3xl md:text-4xl">
                      {Array.from({ length: currentProblem.num1 }).map((_, i) => <span key={`eq-p1-${i}`}>{currentProblem.item.visual}</span>)}
                    </div>
                    <p className="text-2xl font-bold ml-1 md:ml-2">{currentProblem.num1}</p>
                  </div>
                  <span className="text-3xl md:text-4xl font-bold text-primary mx-1 md:mx-2">+</span>
                  <div className="flex items-center">
                     <div className="flex text-3xl md:text-4xl">
                      {Array.from({ length: currentProblem.num2 }).map((_, i) => <span key={`eq-p2-${i}`}>{currentProblem.item.visual}</span>)}
                    </div>
                    <p className="text-2xl font-bold ml-1 md:ml-2">{currentProblem.num2}</p>
                  </div>
                   <span className="text-3xl md:text-4xl font-bold text-primary mx-1 md:mx-2">=</span>
                   <HelpCircle className="w-8 h-8 text-muted-foreground"/>
                </CardContent>
              </Card>
            )}

            {/* Final Feedback visual */}
            {phase === 'finalFeedback' && currentProblem && (
              <Card className={cn(
                "p-4 mt-4 shadow-md text-xl font-semibold",
                isCorrect ? "bg-feedback-correct text-feedback-correct-foreground border-2 border-green-500" 
                          : "bg-feedback-incorrect text-feedback-incorrect-foreground border-2 border-red-500"
              )}>
                <CardContent className="p-2 flex items-center justify-center gap-4">
                  {isCorrect ? <ThumbsUp className="w-10 h-10"/> : <AlertCircle className="w-10 h-10"/>}
                   <div className="flex items-center justify-center flex-wrap gap-x-2">
                      <div className="flex text-2xl md:text-3xl">
                        {Array.from({ length: currentProblem.num1 }).map((_, i) => <span key={`fb-p1-${i}`}>{currentProblem.item.visual}</span>)}
                      </div>
                       <span className="text-2xl md:text-3xl font-bold text-primary">+</span>
                       <div className="flex text-2xl md:text-3xl">
                        {Array.from({ length: currentProblem.num2 }).map((_, i) => <span key={`fb-p2-${i}`}>{currentProblem.item.visual}</span>)}
                      </div>
                      <span className="text-2xl md:text-3xl font-bold text-primary">=</span>
                       <div className="flex text-2xl md:text-3xl">
                        {Array.from({ length: currentProblem.correctAnswer }).map((_, i) => <span key={`fb-sum-${i}`}>{currentProblem.item.visual}</span>)}
                      </div>
                   </div>
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
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pastSessions.slice(0, 5).map(session => (
                  <li key={session.id} className="p-3 bg-muted rounded-md text-sm">
                    Score: {session.score}, Solved: {session.problemsSolved}, Accuracy: {session.accuracy.toFixed(0)}%
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
