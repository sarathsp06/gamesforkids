import { Sparkles, ThumbsUp, Star, Award, PartyPopper } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); // Kept for now, might be unused

export const WORDS = [ // Simplified words for 4-8 year olds
  "CAT", "DOG", "SUN", "RUN", "BIG",
  "RED", "BLUE", "YES", "NO", "TOP",
  "HAT", "MAT", "SIT", "POT", "PAN",
  "BALL", "TREE", "STAR", "MOON", "CAKE",
  "PLAY", "JUMP", "SING", "READ", "HELP",
  "APPLE", "BOX", "CUP", "DUCK", "EGG",
  "FISH", "GOAT", "HEN", "INK", "JAR",
  "KITE", "LION", "MAN", "NET", "OWL",
  "PIG", "QUIZ", "RAT", "SOCK", "TEN",
  "UP", "VAN", "WAX", "YAK", "ZIP"
];


export const INITIAL_LEVEL = 1; // Level might now relate to word length or complexity
export const MAX_LEVEL = 5; // Example max level
export const MIN_LEVEL = 1;

export const LEVEL_TO_INTERVAL_MS: { [key: number]: number } = {
  1: 3500, 
  2: 3000,
  3: 2700,
  4: 2400,
  5: 2100, 
};

export const LOCAL_STORAGE_SESSIONS_KEY = "letterLeapSessions";

export interface PraiseMessage {
  text: string;
  icon: LucideIcon;
}

export const PRAISE_MESSAGES: PraiseMessage[] = [
  { text: "Wow!", icon: Sparkles },
  { text: "Yes!", icon: ThumbsUp },
  { text: "Super!", icon: Star },
  { text: "Woohoo!", icon: Award },
  { text: "Yay!", icon: PartyPopper },
  { text: "Nice!", icon: ThumbsUp },
  { text: "Sweet!", icon: Sparkles },
];

// Standard QWERTY layout for hand assignment
export const LEFT_HAND_KEYS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
export const RIGHT_HAND_KEYS = ['Y', 'U', 'I', 'O', 'P', 'H', 'J', 'K', 'L', 'N', 'M'];

