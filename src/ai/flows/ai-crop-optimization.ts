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
    .describe('Data about the health of the crops in the garden.'),
  automationConfiguration: z
    .string()
    .describe('The current automation configuration of the garden.'),
  era: z
    .string()
    .describe(
      'The era that the garden is in, which affects the types of crops and automation available.'
    ),
});

export type AnalyzeCropsAndSuggestImprovementsInput = z.infer<
  typeof AnalyzeCropsAndSuggestImprovementsInputSchema
>;

const AnalyzeCropsAndSuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-generated suggestions for improving crop health and automation configurations.'
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
  prompt: `You are an AI crop engineer providing advice to a player of ChronoGarden.

You will be provided with data about the player's crop health and automation configurations, as well as the current era they are in.

Based on this information, you will suggest ways to improve the player's garden.

Crop Health Data: {{{cropHealthData}}}
Automation Configuration: {{{automationConfiguration}}}
Era: {{{era}}}

Suggestions:`,
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
