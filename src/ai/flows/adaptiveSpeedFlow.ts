'use server';
/**
 * @fileOverview Adaptive speed adjustment flow for the Letter Leap game.
 *
 * - adaptiveSpeedFlow - A Genkit flow that adjusts the game's difficulty level based on user performance.
 */

import type { AdaptiveSpeedInput, AdaptiveSpeedOutput } from '@/types';
import { z } from 'zod';
import { ai } from '../genkit'; // Import the configured Genkit instance
import {
  MIN_LEVEL,
  MAX_LEVEL,
  MIN_ACCURACY_FOR_LEVEL_UP,
  MIN_WPM_FOR_LEVEL_UP,
  MAX_ACCURACY_FOR_LEVEL_DOWN,
  LETTERS_PER_LEVEL_ADJUSTMENT,
} from '@/lib/constants';

const AdaptiveSpeedInputSchema = z.object({
  accuracy: z.number().min(0).max(1).describe("User's typing accuracy as a decimal (0 to 1)."),
  wpm: z.number().min(0).describe("User's words per minute."),
  currentLevel: z.number().min(MIN_LEVEL).max(MAX_LEVEL).describe("Current difficulty level of the game."),
  totalLettersAttempted: z.number().min(0).describe("Total letters attempted by the user in the current context for level adjustment."),
});

const AdaptiveSpeedOutputSchema = z.object({
  newLevel: z.number().min(MIN_LEVEL).max(MAX_LEVEL).describe("The suggested new difficulty level."),
});

// This is the Genkit flow definition.
// It's exported directly to be used by `getFlow` on the client.
export const adaptiveSpeedFlow = ai.defineFlow(
  {
    name: 'adaptiveSpeedFlow',
    inputSchema: AdaptiveSpeedInputSchema,
    outputSchema: AdaptiveSpeedOutputSchema,
  },
  async (input: AdaptiveSpeedInput): Promise<AdaptiveSpeedOutput> => {
    console.log('AI Flow Input:', input);
    let newLevel = input.currentLevel;

    // Ensure enough attempts before making drastic decisions or relying heavily on AI if it's sensitive to sparse data.
    // The prompt already includes totalLettersAttempted, so the AI can consider this.
    // For very early game, a heuristic might be safer if AI struggles with low data.
    // The current AI prompt seems robust enough to handle this.

    const prompt = `
      You are an expert typing tutor AI. Your goal is to adjust the difficulty level for a user learning to type.
      The user's current performance is:
      - Accuracy: ${(input.accuracy * 100).toFixed(1)}%
      - Words Per Minute (WPM): ${input.wpm.toFixed(1)}
      - Current Difficulty Level: ${input.currentLevel} (where ${MIN_LEVEL} is easiest, ${MAX_LEVEL} is hardest)
      - Total letters attempted for this adjustment cycle: ${input.totalLettersAttempted}

      Guidelines for adjusting difficulty:
      - Increase level (by 1) if accuracy is high (e.g., > ${MIN_ACCURACY_FOR_LEVEL_UP*100}%) AND WPM is good for the current level (e.g., > ${MIN_WPM_FOR_LEVEL_UP} WPM).
      - Decrease level (by 1) if accuracy is low (e.g., < ${MAX_ACCURACY_FOR_LEVEL_DOWN*100}%).
      - Consider WPM: If accuracy is acceptable but WPM is very low for the level, consider not increasing or even decreasing.
      - Prioritize accuracy: Don't increase level if accuracy is poor, even with high WPM.
      - Avoid drastic changes: Increment or decrement by at most 1.
      - The level must stay between ${MIN_LEVEL} and ${MAX_LEVEL}. If the current level is already at a boundary, it cannot be moved further in that direction.

      Based on this, suggest a new difficulty level.
      Return ONLY the new level number. Example: 4
    `;

    try {
      const llmResponse = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-2.0-flash', // Ensure this model is configured in genkit.ts or use default
        config: { temperature: 0.3 }, // Low temperature for more deterministic level suggestion
      });

      const suggestedLevelText = llmResponse.text?.().trim();
      if (suggestedLevelText) {
        let suggestedLevel = parseInt(suggestedLevelText, 10);

        if (isNaN(suggestedLevel)) {
          console.warn("AI returned non-numeric level, using heuristic based on thresholds:", suggestedLevelText);
          // Fallback to heuristic if AI response is not as expected
          if (input.accuracy >= MIN_ACCURACY_FOR_LEVEL_UP && input.wpm >= MIN_WPM_FOR_LEVEL_UP && input.currentLevel < MAX_LEVEL) {
            newLevel = input.currentLevel + 1;
          } else if (input.accuracy < MAX_ACCURACY_FOR_LEVEL_DOWN && input.currentLevel > MIN_LEVEL) {
            newLevel = input.currentLevel - 1;
          }
          // else, no change
        } else {
          // Ensure AI suggestion is within bounds and doesn't overstep by more than 1
          if (suggestedLevel > input.currentLevel + 1) suggestedLevel = input.currentLevel + 1;
          if (suggestedLevel < input.currentLevel - 1) suggestedLevel = input.currentLevel - 1;
          newLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, suggestedLevel));
        }
      } else {
         console.warn("AI returned empty response, using heuristic.");
         // Heuristic fallback if AI response is empty
         if (input.accuracy >= MIN_ACCURACY_FOR_LEVEL_UP && input.wpm >= MIN_WPM_FOR_LEVEL_UP && input.currentLevel < MAX_LEVEL) {
            newLevel = input.currentLevel + 1;
          } else if (input.accuracy < MAX_ACCURACY_FOR_LEVEL_DOWN && input.currentLevel > MIN_LEVEL) {
            newLevel = input.currentLevel - 1;
          }
      }

    } catch (error) {
      console.error("Error calling AI model for adaptive speed:", error);
      // Fallback to simple heuristic if AI call fails
      if (input.accuracy >= MIN_ACCURACY_FOR_LEVEL_UP && input.wpm >= MIN_WPM_FOR_LEVEL_UP && input.currentLevel < MAX_LEVEL) {
        newLevel = input.currentLevel + 1;
      } else if (input.accuracy < MAX_ACCURACY_FOR_LEVEL_DOWN && input.currentLevel > MIN_LEVEL) {
        newLevel = input.currentLevel - 1;
      }
    }
    
    console.log('AI Flow Output:', { newLevel });
    return { newLevel };
  }
);

// Optional: Export an async wrapper function if you prefer that pattern for direct server-side calls,
// but for `getFlow` on the client, exporting `adaptiveSpeedFlow` directly is what's needed.
// export async function adjustSpeed(input: AdaptiveSpeedInput): Promise<AdaptiveSpeedOutput> {
//   return adaptiveSpeedFlow(input);
// }

// Export types if they were defined locally and not imported from @/types
// export type { AdaptiveSpeedInput, AdaptiveSpeedOutput };
