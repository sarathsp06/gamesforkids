"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, TrendingUp, Target, Type } from 'lucide-react'; // Added Type icon

interface CurrentStatsProps {
  wpm: number;
  accuracy: number; // 0-1
  currentStreak: number;
  longestStreak: number;
  level: number;
  wordsTyped: number; // Added wordsTyped
}

export function CurrentStats({ wpm, accuracy, currentStreak, longestStreak, level, wordsTyped }: CurrentStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 w-full max-w-3xl"> {/* Adjusted max-w for 5 items */}
      <StatCard icon={<Gauge />} title="WPM" value={wpm.toFixed(0)} />
      <StatCard icon={<Target />} title="Accuracy" value={`${(accuracy * 100).toFixed(1)}%`} />
      <StatCard icon={<TrendingUp />} title="Streak" value={`${currentStreak} (Max: ${longestStreak})`} />
      <StatCard icon={<Type />} title="Words" value={wordsTyped.toString()} /> {/* Added Words Stat Card */}
      <StatCard icon={<Gauge className="opacity-70"/>} title="Level" value={level.toString()} />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <Card className="shadow-md text-center">
      <CardHeader className="pb-2">
        <div className="mx-auto bg-primary/20 text-primary p-3 rounded-full w-fit mb-2">
          {icon}
        </div>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
