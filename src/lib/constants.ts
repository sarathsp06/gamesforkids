import { Sparkles, ThumbsUp, Star, Award, PartyPopper, LucideIcon } from 'lucide-react';

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
export const LOCAL_STORAGE_ADDITION_ADVENTURE_SESSIONS_KEY = "additionAdventureSessions";


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


// Constants for Addition Adventure Game
export interface AdditionItem {
  name: string;
  namePlural: string;
  visual: string; // Emoji or path to image
}

export const ADDITION_ITEMS: AdditionItem[] = [
  { name: "doll", namePlural: "dolls", visual: "🧸" },
  { name: "apple", namePlural: "apples", visual: "🍎" },
  { name: "car", namePlural: "cars", visual: "🚗" },
  { name: "star", namePlural: "stars", visual: "⭐" },
  { name: "balloon", namePlural: "balloons", visual: "🎈" },
  { name: "book", namePlural: "books", visual: "📚" },
  { name: "duck", namePlural: "ducks", visual: "🦆" },
];

export const ADDITION_NUMBER_RANGE = { min: 1, max: 5 };
export const ADDITION_MAX_ANSWER = ADDITION_NUMBER_RANGE.max * 2; // Max sum is 5+5=10
export const ADDITION_GAME_DURATION_SECONDS = 60; // Example: 1 minute per session

export const ADDITION_PRAISE_MESSAGES: PraiseMessage[] = [
  { text: "Amazing!", icon: Sparkles },
  { text: "You got it!", icon: ThumbsUp },
  { text: "Math Whiz!", icon: Star },
  { text: "Correct!", icon: Award },
  { text: "Awesome!", icon: PartyPopper },
];
