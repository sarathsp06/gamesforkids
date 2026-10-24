// Atrament ships no types: only the parts Paint Pot uses.
declare module 'atrament' {
	export type Mode = 'draw' | 'erase' | 'fill' | 'disabled';
	export const MODE_DRAW: 'draw';
	export const MODE_DISABLED: 'disabled';

	export default class Atrament {
		constructor(canvas: HTMLCanvasElement | string, options?: { width?: number; height?: number; color?: string });
		color: string;
		/** Line width in CSS pixels; drawn scaled to the canvas bitmap. */
		weight: number;
		smoothing: number;
		adaptiveStroke: boolean;
		/** Width factor at no pressure and at full pressure (1 = the set weight). */
		pressureLow: number;
		pressureHigh: number;
		mode: Mode;
		addEventListener(event: 'pointerdown' | 'pointerup', handler: (e: PointerEvent) => void): void;
		addEventListener(event: 'strokestart' | 'strokeend', handler: (e: { x: number; y: number }) => void): void;
		destroy(): void;
	}
}
