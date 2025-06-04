
"use client";

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { analyzeCropsAndSuggestImprovements } from '@/ai/flows/ai-crop-optimization';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { ALL_CROPS_MAP, ERAS, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig'; // Added imports

export default function AICropAdvisor() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const [customCropHealth, setCustomCropHealth] = useState('');
  const [customAutomationConfig, setCustomAutomationConfig] = useState('');

  const handleSubmitForAISuggestion = async () => {
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_AI_SUGGESTION', payload: null });

    const plantedCropsInCurrentEra = state.plotSlots.filter(slot => slot && slot.era === state.currentEra);
    const cropDetailsString = plantedCropsInCurrentEra.map(slot => {
      if (!slot) return '';
      const crop = ALL_CROPS_MAP[slot.cropId];
      return `${crop?.name || 'Unknown Crop'} (planted)`;
    }).filter(Boolean).join(', ') || 'No crops planted in this era.';

    const cropHealthData = customCropHealth ||
      `Soil Quality: ${state.soilQuality}%.
Crops in ${state.currentEra}: ${cropDetailsString}.
Key Resources: Water: ${Math.floor(state.resources.Water || 0)}, Sunlight: ${Math.floor(state.resources.Sunlight || 0)}, Coins: ${Math.floor(state.resources.Coins || 0)}, Energy: ${Math.floor(state.resources.Energy || 0)}, ChronoEnergy: ${Math.floor(state.chronoEnergy || 0)}.
${state.currentEra} Era Specific Resources: ${Object.entries(state.resources)
  .filter(([key, value]) => ERAS[state.currentEra].eraSpecificResources.find(r => r.id === key) && value > 0)
  .map(([key, value]) => `${ALL_GAME_RESOURCES_MAP[key]?.name || key}: ${Math.floor(value)}`)
  .join(', ') || 'None available'
}.
Recent issues: None noted by player.`;

    const activeAutomationsInCurrentEra = state.automationRules
      .filter(rule => rule.era === state.currentEra && state.activeAutomations[rule.id])
      .map(rule => rule.name)
      .join(', ') || 'None active in this era.';

    const automationConfiguration = customAutomationConfig ||
      `Active automations in ${state.currentEra}: ${activeAutomationsInCurrentEra}.
Total automations built across all eras: ${state.automationRules.length}.`;

    const era = state.currentEra;

    try {
      const result = await analyzeCropsAndSuggestImprovements({
        cropHealthData,
        automationConfiguration,
        era,
      });
      dispatch({ type: 'SET_AI_SUGGESTION', payload: result.suggestions });
      toast({ title: "AI Suggestion Received!", description: "Check the advice from your AI Crop Engineer." });
    } catch (error) {
      console.error("AI suggestion error:", error);
      dispatch({ type: 'SET_AI_SUGGESTION', payload: "Error fetching suggestion. Please try again." });
      toast({ title: "Error", description: "Could not get AI suggestion.", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <BrainCircuit className="w-6 h-6 mr-2 text-primary" />
          AI Crop Advisor
        </CardTitle>
        <CardDescription>
          Get intelligent suggestions from your AI Crop Engineer to optimize your garden based on current conditions in the {state.currentEra} era.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="customCropHealth" className="font-semibold">Override Crop Health Description (Optional)</Label>
          <Textarea
            id="customCropHealth"
            placeholder="e.g., My Sunflowers seem to be yielding less than expected, and soil is very dry..."
            value={customCropHealth}
            onChange={(e) => setCustomCropHealth(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-1">If empty, detailed game state will be automatically sent.</p>
        </div>
        <div>
          <Label htmlFor="customAutomationConfig" className="font-semibold">Override Automation Setup Description (Optional)</Label>
          <Textarea
            id="customAutomationConfig"
            placeholder="e.g., I'm relying heavily on my Raptor Harvesters but they keep destroying young plants..."
            value={customAutomationConfig}
            onChange={(e) => setCustomAutomationConfig(e.target.value)}
            className="min-h-[80px]"
          />
           <p className="text-xs text-muted-foreground mt-1">If empty, active automations list will be automatically sent.</p>
        </div>

        <Button onClick={handleSubmitForAISuggestion} disabled={state.isLoadingAiSuggestion} className="w-full sm:w-auto">
          {state.isLoadingAiSuggestion ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="mr-2 h-4 w-4" />
          )}
          Get AI Suggestion for {state.currentEra}
        </Button>

        {state.aiSuggestion && (
          <Alert className="mt-4">
            <BrainCircuit className="h-4 w-4" />
            <AlertTitle className="font-semibold">AI Engineer's Advice:</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{state.aiSuggestion}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        AI suggestions are generated based on the provided data (or current game state) and the active game era. Experiment to find what works best!
      </CardFooter>
    </Card>
  );
}

