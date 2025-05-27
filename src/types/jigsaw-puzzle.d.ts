declare module 'jigsaw-puzzle' {
  interface PuzzleOptions {
    canvas: string | HTMLCanvasElement;
    image: string;
    pieces: { x: number; y: number };
    onInit?: () => void;
    onChange?: (data: { moves: number }) => void;
    onComplete?: () => void;
    spread?: number;
    padding?: number;
    showPreview?: boolean;
    previewSize?: number;
    zoom?: boolean;
    preventOffstageDrag?: boolean;
    fixed?: boolean;
    shuffle?: boolean;
  }

  class PuzzleInternal { // Renamed to avoid conflict if 'puzzle' is the class itself
    constructor(options: PuzzleOptions);
    destroy: () => void;
    canvas: HTMLCanvasElement;
    options: PuzzleOptions;
  }

  // This reflects: const { puzzle } = await import('jigsaw-puzzle');
  // This implies the module has a named export 'puzzle' which is the constructor.
  export const puzzle: new (options: PuzzleOptions) => PuzzleInternal;

  // If the module was `export default PuzzleConstructor` then the original
  // `import Puzzle from 'jigsaw-puzzle'` would be used.
  // If the module was `export class Puzzle ...` then `import { Puzzle } from ...`
  // The dynamic import `const { puzzle } = ...` strongly suggests a named export.
}
