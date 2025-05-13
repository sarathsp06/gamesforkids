import type { SessionStats } from '@/types';
import { LOCAL_STORAGE_SESSIONS_KEY } from './constants';

export function saveSessionStats(stats: SessionStats[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to save session stats to localStorage:", error);
    }
  }
}

export function loadSessionStats(): SessionStats[] {
  if (typeof window !== 'undefined') {
    try {
      const storedStats = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
      return storedStats ? JSON.parse(storedStats) : [];
    } catch (error) {
      console.error("Failed to load session stats from localStorage:", error);
      return [];
    }
  }
  return [];
}
