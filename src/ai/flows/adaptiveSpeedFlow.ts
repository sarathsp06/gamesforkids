'use server';
/**
 * @fileOverview Adaptive speed adjustment flow for the Letter Leap game.
 *
 * - adaptiveSpeedFlow - A function that handles the adaptive speed adjustment process.
 * - AdaptiveSpeedInput - The input type for the adaptiveSpeedFlow function.
 * - AdaptiveSpeedOutput - The return type for the adaptiveSpeedFlow function.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import {
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_ACCURACY_FOR_LEVEL_UP,
  MIN_WPM_FOR_LEVEL_UP,
  MAX_ACCURACY_FOR_LEVEL_DOWN,
} from '@/lib/constants';

// Define Zod schemas for input and output locally
const AdaptiveSpeedInputSchema = z.object({
  accuracy: z.number().min(0).max(1).describe("User's typing accuracy as a decimal (0 to 1)."),
  wpm: z.number().min(0).describe("User's words per minute."),
  currentLevel: z.number().min(MIN_LEVEL).max(MAX_LEVEL).describe("Current difficulty level of the game."),
  totalLettersAttempted: z.number().min(0).describe("Total letters attempted by the user in the current context for level adjustment."),
});
export type AdaptiveSpeedInput = z.infer<typeof AdaptiveSpeedInputSchema>;

const AdaptiveSpeedOutputSchema = z.object({
  newLevel: z.number().min(MIN_LEVEL).max(MAX_LEVEL).describe("The suggested new difficulty level."),
});
export type AdaptiveSpeedOutput = z.infer<typeof AdaptiveSpeedOutputSchema>;

// Define the prompt object using ai.definePrompt
const adaptiveSpeedPrompt = ai.definePrompt({
  name: 'adaptiveSpeedPrompt',
  input: { schema: AdaptiveSpeedInputSchema },
  output: { schema: AdaptiveSpeedOutputSchema },
  prompt: `
      You are an expert typing tutor AI. Your goal is to adjust the difficulty level for a user learning to type.
      The user's current performance is:
      - Accuracy: {{accuracy}} (decimal, e.g., 0.85 for 85%)
      - Words Per Minute (WPM): {{wpm}}
      - Current Difficulty Level: {{currentLevel}} (where ${MIN_LEVEL} is easiest, ${MAX_LEVEL} is hardest)
      - Total letters attempted for this adjustment cycle: {{totalLettersAttempted}}

      Guidelines for adjusting difficulty:
      - Increase level (by 1) if accuracy is high (e.g., > ${MIN_ACCURACY_FOR_LEVEL_UP}) AND WPM is good for the current level (e.g., > ${MIN_WPM_FOR_LEVEL_UP} WPM).
      - Decrease level (by 1) if accuracy is low (e.g., < ${MAX_ACCURACY_FOR_LEVEL_DOWN}).
      - Consider WPM: If accuracy is acceptable but WPM is very low for the level, consider not increasing or even decreasing.
      - Prioritize accuracy: Don't increase level if accuracy is poor, even with high WPM.
      - Avoid drastic changes: Increment or decrement by at most 1.
      - The level must stay between ${MIN_LEVEL} and ${MAX_LEVEL}. If the current level is already at a boundary, it cannot be moved further in that direction.

      Based on this, determine the new difficulty level.
      Your response must be a JSON object matching the following schema:
      {
        "type": "object",
        "properties": {
          "newLevel": {
            "type": "number",
            "description": "The suggested new difficulty level between ${MIN_LEVEL} and ${MAX_LEVEL}."
          }
        },
        "required": ["newLevel"]
      }
    `,
  config: { temperature: 0.3 }, // Low temperature for more deterministic level suggestion
});

// Internal Genkit flow definition
const adaptiveSpeedInternalGenkitFlow = ai.defineFlow(
  {
    name: 'adaptiveSpeedInternalGenkitFlow', // Renamed for clarity
    inputSchema: AdaptiveSpeedInputSchema,
    outputSchema: AdaptiveSpeedOutputSchema,
  },
  async (input: AdaptiveSpeedInput): Promise<AdaptiveSpeedOutput> => {
    console.log('AI Flow Input:', input);
    let newLevel = input.currentLevel;

    // Helper function for heuristic adjustment
    const heuristicAdjustment = (currentInput: AdaptiveSpeedInput): number => {
      let level = currentInput.currentLevel;
      if (currentInput.accuracy >= MIN_ACCURACY_FOR_LEVEL_UP && currentInput.wpm >= MIN_WPM_FOR_LEVEL_UP && currentInput.currentLevel < MAX_LEVEL) {
        level = currentInput.currentLevel + 1;
      } else if (currentInput.accuracy < MAX_ACCURACY_FOR_LEVEL_DOWN && currentInput.currentLevel > MIN_LEVEL) {
        level = currentInput.currentLevel - 1;
      }
      return level;
    };

    try {
      // Call the defined prompt object
      // The global AI model is used from genkit.ts, temperature is set in adaptiveSpeedPrompt
      const { output } = await adaptiveSpeedPrompt(input);

      if (output && typeof output.newLevel === 'number') {
        let suggestedLevel = output.newLevel;

        // Ensure AI suggestion is within bounds and doesn't overstep by more than 1
        if (suggestedLevel > input.currentLevel + 1) suggestedLevel = input.currentLevel + 1;
        if (suggestedLevel < input.currentLevel - 1) suggestedLevel = input.currentLevel - 1;
        newLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, suggestedLevel));
      } else {
         console.warn("AI returned invalid or empty output, using heuristic.", output);
         newLevel = heuristicAdjustment(input);
      }
    } catch (error) {
      console.error("Error calling AI model for adaptive speed:", error);
      newLevel = heuristicAdjustment(input);
    }
    
    console.log('AI Flow Output:', { newLevel });
    return { newLevel };
  }
);

// Exported wrapper function (Server Action)
export async function adaptiveSpeedFlow(input: AdaptiveSpeedInput): Promise<AdaptiveSpeedOutput> {
  return adaptiveSpeedInternalGenkitFlow(input);
}
