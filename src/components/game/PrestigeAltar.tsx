"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Recycle, Zap, Sparkles } from 'lucide-react';
import { SidebarMenuButton } from '../ui/sidebar';
import { useToast } from '@/hooks/use-toast';

export default function PrestigeAltar() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  // Determine if prestige is beneficial. Example: must have unlocked at least 'Modern' era.
  const canPrestige = state.unlockedEras.includes('Modern'); 

  const handlePrestige = () => {
    // Example: Add one random "rare seed" from currently known high-value crops
    const highValueCrops = Object.values(state.unlockedEras)
      .flatMap(eraId => ERAS[eraId]?.availableCrops || [])
      .filter(crop => (crop.unlockCost || 0) > 50 || crop.id.includes("fruit") || crop.id.includes("photon")) // Arbitrary criteria
      .map(crop => crop.id);
    
    if (highValueCrops.length > 0) {
      const randomRareSeed = highValueCrops[Math.floor(Math.random() * highValueCrops.length)];
      if (!state.rareSeeds.includes(randomRareSeed)) {
         // dispatch({ type: 'ADD_RARE_SEED', payload: randomRareSeed }); // Action to be added in context
         // For now, we just log it, actual rare seed mechanics would be more complex
         console.log("Awarded rare seed (conceptual):", randomRareSeed);
      }
    }

    dispatch({ type: 'PRESTIGE_RESET' });
    toast({ title: "Rebirth!", description: "The garden has been reset. You kept your rare seeds (if any) and gained new insights!"});
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton 
          className="w-full justify-start" 
          disabled={!canPrestige} 
          tooltip={canPrestige ? "Reboot the garden with benefits" : "Unlock more eras to enable Prestige"}
        >
          <Recycle className="w-4 h-4 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Prestige</span>
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline flex items-center"><Recycle className="w-5 h-5 mr-2 text-primary"/>Time Loop Reboot (Prestige)</AlertDialogTitle>
          <AlertDialogDescription>
            Resetting the garden will start time anew. You will lose most progress, current resources, and active crops.
            However, you may retain knowledge of <Sparkles className="w-4 h-4 inline text-accent"/> rare seeds, allowing them to grow in any era.
            This is a significant step, usually beneficial after unlocking advanced eras.
            <br/><br/>
            Current Chrono-Energy: {Math.floor(state.chronoEnergy)} <Zap className="w-3 h-3 inline text-yellow-500"/>.
            Unlocked Eras: {state.unlockedEras.length}.
            {state.rareSeeds.length > 0 && `Known Rare Seeds: ${state.rareSeeds.join(', ')}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePrestige} disabled={!canPrestige} className="bg-primary hover:bg-primary/90">
            Initiate Rebirth
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Dummy ERAS config for standalone component if needed (prefer importing from gameConfig)
const ERAS = {
  "Present": {id: "Present", name: "Present", availableCrops: []},
  "Prehistoric": {id: "Prehistoric", name: "Prehistoric", availableCrops: []},
  "Medieval": {id: "Medieval", name: "Medieval", availableCrops: []},
  "Modern": {id: "Modern", name: "Modern", availableCrops: []},
  "Future": {id: "Future", name: "Future", availableCrops: []},
}
