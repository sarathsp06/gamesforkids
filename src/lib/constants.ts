
import { Award, LucideIcon, PartyPopper, Sparkles, Star, ThumbsUp, Map, Puzzle } from 'lucide-react';

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
  "UP", "VAN", "WAX", "YAK", "ZIP",
  "ANT", "BAT", "COW", "DEER", "EEL",
  "FROG", "GUM", "HUG", "IVY", "JUMP",
  "KISS", "LEAF", "MICE", "NUT", "OAK",
  "PEAR", "QUACK", "RUG", "SAND", "TIGER",
  "UNITE", "VINE", "WORM", "XMAS", "YARN",
  "ELEPHANT", "ZEBRA", "GIRAFFE", "KANGAROO", "PENGUIN",
  "DOLPHIN", "TIGER", "LIZARD", "MONKEY", "RABBIT",
  "SNAKE", "TURTLE", "WHALE", "ZEBRA", "BEAR",
  "CROCODILE", "FLAMINGO", "HIPPOPOTAMUS", "JAGUAR", "KITTEN",
  "BIRD", "CATERPILLAR", "DRAGONFLY", "EAGLE", "FISH",
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
export const LOCAL_STORAGE_JIGSAW_SESSIONS_KEY = "jigsawSessions";


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
  { name: "kite", namePlural: "kites", visual: "🪁" },
  { name: "fish", namePlural: "fish", visual: "🐟" } ,
  { name: "cake", namePlural: "cakes", visual: "🍰" },
  { name: "robot", namePlural: "robots", visual: "🤖" },
  { name: "panda", namePlural: "pandas", visual: "🐼" },
  { name: "flower", namePlural: "flowers", visual: "🌸" },
  { name: "butterfly", namePlural: "butterflies", visual: "🦋" },
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


// Constants for Jigsaw Puzzle Game
import type { JigsawMap } from '@/types';

// Using i.postimg.cc for more reliable image hosting for placeholders
export const JIGSAW_MAPS: JigsawMap[] = [
  {
    id: 'world',
    name: 'World Map',
    // Placeholder 600x400, from a royalty-free source like pexels/unsplash if needed or generic map vector
    imageUrl: 'https://i.postimg.cc/hSDZRq0K/20415.jpg', // Example: https://images.pexels.com/photos/20415/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1
    pieces: { x: 3, y: 2 }, // Simplified for initial testing
    imageAspectRatio: 600/400,
  },
  {
    id: 'europe',
    name: 'Europe Map',
    // Placeholder 550x350
    imageUrl: 'https://i.postimg.cc/VmQLm70J/7633554.jpg', // Example: https://images.pexels.com/photos/7633554/pexels-photo-7633554.jpeg?auto=compress&cs=tinysrgb&w=550&h=350&dpr=1
    pieces: { x: 4, y: 3 },
    imageAspectRatio: 550/350,
  },
  {
    id: 'india',
    name: 'India Map',
    // Placeholder 450x500
    imageUrl: 'https://i.postimg.cc/W260wFRn/2593371.jpg', // Example: https://images.pexels.com/photos/2593371/pexels-photo-2593371.jpeg?auto=compress&cs=tinysrgb&w=450&h=500&dpr=1
    pieces: { x: 3, y: 4 },
    imageAspectRatio: 450/500,
  },
];

export const JIGSAW_PIECE_DRAG_TYPE = "application/x-jigsaw-piece";
export const JIGSAW_BOARD_SLOT_DROP_TYPE = "application/x-jigsaw-board-slot";
