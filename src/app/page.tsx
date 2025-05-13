
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
                  <div className="my-4 rounded-lg w-full h-40 shadow-md overflow-hidden bg-secondary/30 flex items-center justify-center p-4" data-ai-hint="abstract pattern">
                    <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <pattern id="letterLeapPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                          <circle cx="5" cy="5" r="3" fill="hsl(var(--primary))" opacity="0.7"/>
                          <rect x="10" y="10" width="6" height="6" fill="hsl(var(--accent))" opacity="0.6" transform="rotate(45 13 13)"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#letterLeapPattern)" />
                    </svg>
                  </div>
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
                    Learn addition with fun items!
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-between">
                  <div className="my-4 rounded-lg w-full h-40 shadow-md overflow-hidden bg-primary/30 flex items-center justify-center p-4" data-ai-hint="abstract shapes">
                     <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <pattern id="additionPattern" patternUnits="userSpaceOnUse" width="25" height="25">
                          <path d="M0 0 L10 10 L0 20 Z" fill="hsl(var(--secondary))" opacity="0.7"/>
                          <ellipse cx="18" cy="15" rx="5" ry="3" fill="hsl(var(--accent))" opacity="0.6"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#additionPattern)" />
                    </svg>
                  </div>
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

