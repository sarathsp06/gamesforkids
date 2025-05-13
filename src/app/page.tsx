
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
                  <div className="my-4 rounded-lg w-full h-40 shadow-md overflow-hidden bg-secondary/30 flex items-center justify-center p-4" data-ai-hint="keyboard abstract">
                    <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
                      <path d="M10 15 Q 25 5, 40 15 T 70 15" stroke="hsl(var(--primary))" strokeWidth="5" fill="none" opacity="0.8" strokeLinecap="round"/>
                      <path d="M20 35 Q 35 25, 50 35 T 80 35" stroke="hsl(var(--accent))" strokeWidth="5" fill="none" opacity="0.7" strokeLinecap="round"/>
                      <rect x="25" y="10" width="10" height="20" rx="3" fill="hsl(var(--secondary))" opacity="0.6" transform="rotate(-10 30 20)"/>
                      <rect x="65" y="20" width="10" height="15" rx="3" fill="hsl(var(--primary))" opacity="0.5" transform="rotate(10 70 27.5)"/>
                      <circle cx="85" cy="12" r="4" fill="hsl(var(--accent))" opacity="0.9"/>
                       <circle cx="15" cy="40" r="3" fill="hsl(var(--secondary))" opacity="0.9"/>
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
                  <div className="my-4 rounded-lg w-full h-40 shadow-md overflow-hidden bg-primary/30 flex items-center justify-center p-4" data-ai-hint="plus numbers">
                     <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
                      {/* Plus Sign */}
                      <rect x="42" y="10" width="16" height="30" rx="3" fill="hsl(var(--accent))" opacity="0.9" />
                      <rect x="32" y="17" width="36" height="16" rx="3" fill="hsl(var(--accent))" opacity="0.9" />
                      
                      {/* Number-like shapes/items */}
                      <circle cx="25" cy="15" r="8" fill="hsl(var(--primary))" opacity="0.8"/>
                      <rect x="70" y="30" width="15" height="15" rx="4" fill="hsl(var(--secondary))" opacity="0.7"/>
                      <circle cx="20" cy="38" r="6" fill="hsl(var(--primary))" opacity="0.6"/>
                      <rect x="75" y="8" width="12" height="12" rx="3" fill="hsl(var(--secondary))" opacity="0.6"/>
                       <polygon points="50,2 55,12 45,12" fill="hsl(var(--primary))" opacity="0.7" />
                       <ellipse cx="50" cy="45" rx="10" ry="4" fill="hsl(var(--secondary))" opacity="0.7" />
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
