
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
import { Recycle, Zap, Sparkles, Leaf } from 'lucide-react'; // Added Leaf
import { SidebarMenuButton } from '../ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { ALL_CROPS_MAP } from '@/config/gameConfig'; // Import ALL_CROPS_MAP

export default function PrestigeAltar() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  // Allow prestige if at least one era beyond "Present" is unlocked (e.g., Prehistoric)
  const canPrestige = state.unlockedEras.length > 1; 

  const handlePrestige = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'PRESTIGE_RESET' });
    toast({ 
        title: "Rebirth!", 
        description: `The garden has been reset. You kept ${Math.floor(state.chronoEnergy)} Chrono-Energy and your ${state.rareSeeds.length} rare seeds!`
    });
  };

  const rareSeedDisplay = state.rareSeeds.map(id => ALL_CROPS_MAP[id]?.name || "Unknown Seed").join(', ');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <SidebarMenuButton 
          className="w-full justify-start" 
          disabled={!canPrestige} 
          tooltip={canPrestige ? "Reboot the garden with benefits" : "Unlock more eras to enable Prestige"}
          onClick={() => { if(canPrestige) dispatch({ type: 'USER_INTERACTION' })}}
        >
          <Recycle className="w-4 h-4 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Prestige</span>
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline flex items-center"><Recycle className="w-5 h-5 mr-2 text-primary"/>Time Loop Reboot (Prestige)</AlertDialogTitle>
          <AlertDialogDescription>
            Resetting the garden will start time anew. You will lose most progress including resources, plot contents, and upgrades.
            <br/><br/>
            You will <strong className="text-primary">keep</strong>:
            <ul className="list-disc list-inside ml-4 my-2 text-sm">
              <li>Your current <Zap className="w-3 h-3 inline text-yellow-500"/> Chrono-Energy: <span className="font-semibold">{Math.floor(state.chronoEnergy)}</span></li>
              <li>All discovered <Sparkles className="w-3 h-3 inline text-accent"/> Rare Seeds: <span className="font-semibold">{state.rareSeeds.length > 0 ? rareSeedDisplay : "None yet"}</span></li>
            </ul>
            Rare seeds provide permanent boosts to their respective crops across all prestiges.
            This is a significant step, recommended after exploring multiple eras.
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

    