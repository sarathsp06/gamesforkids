"use client";

import type { SessionStats as SessionStatsType } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface SessionStatsProps {
  sessions: SessionStatsType[];
}

export function SessionStats({ sessions }: SessionStatsProps) {
  if (sessions.length === 0) {
    return (
      <Card className="mt-12 w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Past Sessions</CardTitle>
          <CardDescription>No past sessions recorded yet. Play a game to see your stats here!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-12 w-full max-w-3xl shadow-lg"> {/* Increased max-w */}
      <CardHeader>
        <CardTitle>Past Sessions</CardTitle>
        <CardDescription>Review your performance from previous games.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">WPM</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead className="text-right">Streak</TableHead>
                <TableHead className="text-right">Words</TableHead> {/* Added Words column */}
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDistanceToNow(new Date(session.date), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">{session.wpm}</TableCell>
                  <TableCell className="text-right">{session.accuracy}%</TableCell>
                  <TableCell className="text-right">{session.longestStreak}</TableCell>
                  <TableCell className="text-right">{session.wordsTyped}</TableCell> {/* Added Words data */}
                  <TableCell className="text-right">{session.durationMinutes.toFixed(1)} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
