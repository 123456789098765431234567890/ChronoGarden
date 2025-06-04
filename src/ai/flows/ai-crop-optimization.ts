
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
  allCropsData: z.string().describe('A JSON string representing all available crops in the game (ALL_CROPS_LIST). This is the game\'s crop database.'),
  allResourcesData: z.string().describe('A JSON string representing all available resources in the game (ALL_GAME_RESOURCES_MAP). This is the game\'s resource database.'),
  allAutomationsData: z.string().describe('A JSON string representing all available automation rules in the game (AUTOMATION_RULES_CONFIG). This is the game\'s automation database.'),
  allUpgradesData: z.string().describe('A JSON string representing all available era-specific upgrades in the game (UPGRADES_CONFIG). This is the game\'s upgrade database.'),
  allErasData: z.string().describe('A JSON string representing all available eras in the game (ERAS). This is the game\'s era database.'),
});

export type AnalyzeCropsAndSuggestImprovementsInput = z.infer<
  typeof AnalyzeCropsAndSuggestImprovementsInputSchema
>;

const AnalyzeCropsAndSuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-generated, actionable, bullet-pointed suggestions for improving crop health, optimizing automation, managing resources, or preparing for the next era, tailored to the player\'s current situation in the specified era. The AI should use its knowledge of all game entities (crops, resources, automations, upgrades, eras) provided in the input.'
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
Player's Crop Health & Status:
{{{cropHealthData}}}

Player's Automation Systems:
{{{automationConfiguration}}}

To help you give the best advice, here is the complete database of game entities:
All Game Eras: {{{allErasData}}}
All Game Crops: {{{allCropsData}}}
All Game Resources: {{{allResourcesData}}}
All Game Automations: {{{allAutomationsData}}}
All Game Era-Specific Upgrades: {{{allUpgradesData}}}

Analyze the player's current situation (era, crop status, automations, resources) in conjunction with the full game data provided.
Provide 2-3 concise, actionable suggestions to help them optimize their garden in the '{{{era}}}' era.
Focus on improving yield, resource management, efficiently using automations, suggesting new automations or upgrades they might want to build, or preparing for the next era if appropriate.
Be specific and explain *why* your suggestions are beneficial, referencing specific game entities if helpful.
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

