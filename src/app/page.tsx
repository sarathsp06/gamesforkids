
"use client";

import Link from 'next/link';
// Removed Metadata import as it's no longer used here
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Gamepad2 } from 'lucide-react'; // Added Gamepad2 for placeholder

// Removed export const metadata: Metadata as it's not allowed in client components.
// Metadata for this page will be handled by the layout or parent server components.

export default function GameSelectionPage() {
  return (
    <MainLayout title="Game Hub">
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-4xl font-bold mb-10 text-center text-primary">Choose a Game</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
          <Link href="/games/letter-leap" passHref legacyBehavior>
            <a className="block">
              <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col group border-2 border-transparent hover:border-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl text-accent group-hover:text-primary transition-colors">Letter Leap</CardTitle>
                  <CardDescription className="text-muted-foreground pt-1">
                    Master the art of typing words, one leap at a time!
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-between">
                  <img
                    src="https://picsum.photos/seed/letterleapgame/400/200"
                    alt="Letter Leap Game Preview"
                    data-ai-hint="typing keyboard"
                    className="my-4 rounded-lg object-cover w-full h-40 shadow-md"
                  />
                  <div className="flex items-center justify-end text-primary group-hover:text-accent transition-colors font-semibold mt-auto">
                    <span>Play Now</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </a>
          </Link>
          
          <Card className="bg-card/60 cursor-not-allowed opacity-70 h-full flex flex-col border-dashed border-muted-foreground/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-muted-foreground">More Games Coming Soon!</CardTitle>
                <CardDescription className="text-muted-foreground pt-1">
                  Stay tuned for exciting new typing challenges.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow justify-between">
                <div 
                  data-ai-hint="controller joystick"
                  className="my-4 rounded-lg bg-muted/30 w-full h-40 flex items-center justify-center shadow-inner"
                >
                   <Gamepad2 className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <div className="flex items-center justify-end text-muted-foreground font-semibold mt-auto">
                  <span>Coming Soon...</span>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

