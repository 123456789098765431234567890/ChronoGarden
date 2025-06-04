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

export default function AICropAdvisor() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const [customCropHealth, setCustomCropHealth] = useState('');
  const [customAutomationConfig, setCustomAutomationConfig] = useState('');

  const handleSubmitForAISuggestion = async () => {
    dispatch({ type: 'SET_AI_LOADING', payload: true });
    dispatch({ type: 'SET_AI_SUGGESTION', payload: null });

    // Prepare data for the AI
    // For a real game, this data would be more structured and detailed.
    const cropHealthData = customCropHealth || 
      `Soil Quality: ${state.soilQuality}%. Planted crops: ${state.plantedCrops.length}. Recent issues: none noted.`;
    
    const automationConfiguration = customAutomationConfig ||
      `Active automations: ${state.automationRules.map(r => r.name).join(', ') || 'None'}.`;

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
          Get suggestions from your AI Crop Engineer to optimize your garden based on current conditions.
          This feature is typically available in the 'Future' era but can be consulted anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="customCropHealth" className="font-semibold">Describe Crop Health (Optional)</Label>
          <Textarea
            id="customCropHealth"
            placeholder="e.g., Plants are wilting, soil is dry..."
            value={customCropHealth}
            onChange={(e) => setCustomCropHealth(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-1">If empty, general game state will be used.</p>
        </div>
        <div>
          <Label htmlFor="customAutomationConfig" className="font-semibold">Describe Automation Setup (Optional)</Label>
          <Textarea
            id="customAutomationConfig"
            placeholder="e.g., Using auto-water sprinklers, harvest bots active..."
            value={customAutomationConfig}
            onChange={(e) => setCustomAutomationConfig(e.target.value)}
            className="min-h-[80px]"
          />
           <p className="text-xs text-muted-foreground mt-1">If empty, active automations list will be used.</p>
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
        AI suggestions are based on the provided data and the current game era. Experiment to find what works best!
      </CardFooter>
    </Card>
  );
}
