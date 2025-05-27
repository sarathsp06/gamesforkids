
"use client";

import type { NextPage } from 'next';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useJigsawPuzzleGame } from '@/hooks/useJigsawPuzzleGame';
import { JIGSAW_MAPS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CheckCircle, Eye, PuzzleIcon, RotateCcw } from 'lucide-react';

const JigsawPuzzlePage: NextPage = () => {
  const { gameState, selectMapAndStart, togglePreview, resetGame, pastSessions } = useJigsawPuzzleGame();
  const { selectedMap, phase, showPreview, isPuzzleComplete, isLibraryInitialized } = gameState;

  return (
    <MainLayout title="Jigsaw Puzzle Adventure">
      <div className="flex flex-col items-center justify-center text-center py-6">
        {phase === 'mapSelection' && (
          <Card className="w-full max-w-lg mb-8 p-6 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <PuzzleIcon className="w-10 h-10" /> Jigsaw Time!
              </CardTitle>
              <CardDescription className="text-lg mt-2 text-muted-foreground">
                Choose a map to start your puzzle adventure.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {JIGSAW_MAPS.map((map) => (
                <Button key={map.id} onClick={() => selectMapAndStart(map, "puzzle-container")} variant="secondary" size="lg" className="shadow-md">
                  {map.name} ({map.pieces.x}x{map.pieces.y})
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Combined section for loading and playing */}
        {(phase === 'loadingLibrary' || phase === 'playing') && selectedMap && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4 px-2">
              <h2 className="text-2xl font-semibold text-primary">{selectedMap.name}</h2>
              <Dialog open={showPreview} onOpenChange={togglePreview}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow">
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{selectedMap.name} - Solution</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 relative w-full" style={{aspectRatio: `${selectedMap.imageAspectRatio || (16/9)}`}}>
                    <Image src={selectedMap.imageUrl} alt={`${selectedMap.name} Solution`} layout="fill" objectFit="contain" data-ai-hint={`${selectedMap.id.toLowerCase()} map`} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Puzzle Container - always rendered if map selected and phase is loading/playing */}
            <div
              id="puzzle-container"
              className="w-full md:w-[600px] lg:w-[800px] min-h-[250px] sm:min-h-[300px] md:min-h-[400px] lg:min-h-[450px] mb-6 shadow-lg rounded-md overflow-hidden border-2 border-primary/30 flex justify-center items-center"
            >
              {phase === 'loadingLibrary' && !isLibraryInitialized && (
                <p className="text-xl text-muted-foreground">Loading puzzle...</p>
              )}
              {/* The jigsaw-puzzle library will render its canvas/elements here. */}
            </div>
            
            <Button onClick={resetGame} variant="outline" className="shadow">
              <RotateCcw className="mr-2 h-4 w-4" /> Change Map
            </Button>
          </div>
        )}

        {(phase === 'completed' || (phase === 'playing' && isPuzzleComplete)) && selectedMap && (
          <Card className="w-full max-w-md p-6 shadow-xl text-center">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-green-500 flex items-center justify-center gap-2">
                <CheckCircle className="w-12 h-12" /> Puzzle Complete!
              </CardTitle>
              <CardDescription className="text-xl mt-2 text-muted-foreground">
                You solved the {selectedMap.name} puzzle!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={resetGame} size="lg" className="mt-6 shadow-lg">
                <PuzzleIcon className="mr-2 h-5 w-5" /> Play Another Puzzle
              </Button>
            </CardContent>
          </Card>
        )}

        {pastSessions.length > 0 && (phase === 'mapSelection' || phase === 'completed') && (
          <Card className="mt-12 w-full max-w-lg shadow-lg">
            <CardHeader>
              <CardTitle>Past Jigsaw Puzzles</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {pastSessions.slice(0, 5).map(session => (
                  <li key={session.id} className="p-3 bg-muted rounded-md">
                    Map: {JIGSAW_MAPS.find(m => m.id === session.mapId)?.name || session.mapId} ({
                      JIGSAW_MAPS.find(m => m.id === session.mapId) 
                        ? `${JIGSAW_MAPS.find(m => m.id === session.mapId)!.pieces.x}x${JIGSAW_MAPS.find(m => m.id === session.mapId)!.pieces.y}`
                        : `${session.gridSize} pieces`
                    })
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

export default JigsawPuzzlePage;
