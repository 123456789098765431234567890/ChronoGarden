
'use server';

/**
 * @fileOverview Provides AI-driven crop optimization suggestions based on crop health and automation configurations.
 *
 * - analyzeCropsAndSuggestImprovements - Analyzes crop data and suggests improvements.
 * - AnalyzeCropsAndSuggestImprovementsInput - The input type for analyzeCropsAndSuggestImprovements.
 * - AnalyzeCropsAndSuggestImprovementsOutput - The output type for analyzeCropsAndSuggestImprovements.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCropsAndSuggestImprovementsInputSchema = z.object({
  cropHealthData: z
    .string()
    .describe('Detailed information about the health and status of the crops in the garden, including soil quality, types of crops planted in the current era, and key resource levels (Water, Sunlight, Coins, Energy, ChronoEnergy, and era-specific resources).'),
  automationConfiguration: z
    .string()
    .describe('Information on the current automation setup, including active automations in the current era and the total number of automations built.'),
  era: z
    .string()
    .describe(
      'The current era the player is in (e.g., Present, Prehistoric, Future), which affects available crops, technologies, and challenges.'
    ),
});

export type AnalyzeCropsAndSuggestImprovementsInput = z.infer<
  typeof AnalyzeCropsAndSuggestImprovementsInputSchema
>;

const AnalyzeCropsAndSuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-generated, actionable, bullet-pointed suggestions for improving crop health, optimizing automation, managing resources, or preparing for the next era, tailored to the player\'s current situation in the specified era.'
    ),
});

export type AnalyzeCropsAndSuggestImprovementsOutput = z.infer<
  typeof AnalyzeCropsAndSuggestImprovementsOutputSchema
>;

export async function analyzeCropsAndSuggestImprovements(
  input: AnalyzeCropsAndSuggestImprovementsInput
): Promise<AnalyzeCropsAndSuggestImprovementsOutput> {
  return analyzeCropsAndSuggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCropsAndSuggestImprovementsPrompt',
  input: {schema: AnalyzeCropsAndSuggestImprovementsInputSchema},
  output: {schema: AnalyzeCropsAndSuggestImprovementsOutputSchema},
  prompt: `You are an expert AI Crop Engineer advising a player in the game ChronoGarden.
The player is currently in the '{{{era}}}' era.

Here's the current state of their garden:
Crop Health & Status:
{{{cropHealthData}}}

Automation Systems:
{{{automationConfiguration}}}

Consider the player's current era, their crop status, active automations, and available resources.
Provide 2-3 concise, actionable suggestions to help them optimize their garden in the '{{{era}}}' era.
Focus on improving yield, resource management, efficiently using automations, or preparing for the next era if appropriate.
Be specific and explain *why* your suggestions are beneficial.
Format your suggestions as a bulleted list (e.g., using '*' or '-').`,
});

const analyzeCropsAndSuggestImprovementsFlow = ai.defineFlow(
  {
    name: 'analyzeCropsAndSuggestImprovementsFlow',
    inputSchema: AnalyzeCropsAndSuggestImprovementsInputSchema,
    outputSchema: AnalyzeCropsAndSuggestImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

