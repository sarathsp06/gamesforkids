
"use client";

import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Calculator, Keyboard } from 'lucide-react'; 

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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl text-accent group-hover:text-primary transition-colors">Letter Leap</CardTitle>
                    <Keyboard className="h-8 w-8 text-primary group-hover:text-accent transition-colors" />
                  </div>
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
          
          <Link href="/games/addition-adventure" passHref legacyBehavior>
            <a className="block">
              <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col group border-2 border-transparent hover:border-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl text-accent group-hover:text-primary transition-colors">Addition Adventure</CardTitle>
                    <Calculator className="h-8 w-8 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <CardDescription className="text-muted-foreground pt-1">
                    Learn addition with fun items like dolls and apples!
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-between">
                  <img
                    src="https://picsum.photos/seed/additiongame/400/200"
                    alt="Addition Adventure Game Preview"
                    data-ai-hint="abacus math"
                    className="my-4 rounded-lg object-cover w-full h-40 shadow-md"
                  />
                  <div className="flex items-center justify-end text-primary group-hover:text-accent transition-colors font-semibold mt-auto">
                    <span>Start Adding</span>
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </a>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
