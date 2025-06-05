
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
import { Recycle, Zap, Sparkles, Leaf, Award as TrophyIcon } from 'lucide-react'; 
import { SidebarMenuButton } from '../ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { ALL_CROPS_MAP, PERMANENT_UPGRADES_CONFIG, getCurrentPrestigeTier } from '@/config/gameConfig'; 

export default function PrestigeAltar() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const canPrestige = state.unlockedEras.length > 1; 

  const handlePrestige = () => {
    dispatch({ type: 'USER_INTERACTION' });
    const keptChronoEnergy = Math.floor(state.chronoEnergy);
    const keptRareSeedsCount = state.rareSeeds.length;
    const keptPermanentUpgradesCount = Object.values(state.permanentUpgradeLevels).filter(level => level > 0).length;

    dispatch({ type: 'PRESTIGE_RESET' });
    
    toast({ 
        title: "Rebirth!", 
        description: `The garden has been reset. You kept ${keptChronoEnergy} Chrono-Energy, ${keptRareSeedsCount} rare seeds, and your ${keptPermanentUpgradesCount} permanent upgrades!`
    });
  };

  const rareSeedDisplay = state.rareSeeds.map(id => ALL_CROPS_MAP[id]?.name || "Unknown Seed").join(', ') || "None yet";
  const permanentUpgradesDisplay = Object.entries(state.permanentUpgradeLevels)
    .filter(([_, level]) => level > 0)
    .map(([id, level]) => `${PERMANENT_UPGRADES_CONFIG[id]?.name} (Lvl ${level})`)
    .join(', ') || "None yet";
  
  const currentPrestigeTier = getCurrentPrestigeTier(state.prestigeCount);
  const PrestigeTierIcon = currentPrestigeTier.icon;

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
          <span className="group-data-[collapsible=icon]:hidden truncate">Prestige ({state.prestigeCount}) - <PrestigeTierIcon className="inline h-3 w-3 mr-1"/>{currentPrestigeTier.id}</span>
        </SidebarMenuButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-headline flex items-center"><Recycle className="w-5 h-5 mr-2 text-primary"/>Time Loop Reboot (Prestige)</AlertDialogTitle>
          <AlertDialogDescription>
            Resetting the garden will start time anew. You will lose most progress including resources, plot contents, and era-specific upgrades.
            <br/><br/>
            You will <strong className="text-primary">keep</strong>:
            <ul className="list-disc list-inside ml-4 my-2 text-sm space-y-1">
              <li>Your current <Zap className="w-3 h-3 inline text-yellow-500"/> Chrono-Energy: <span className="font-semibold">{Math.floor(state.chronoEnergy)}</span></li>
              <li>All discovered <Sparkles className="w-3 h-3 inline text-accent"/> Rare Seeds ({state.rareSeeds.length}): <span className="font-semibold text-xs">{rareSeedDisplay}</span></li>
              <li>All purchased <TrophyIcon className="w-3 h-3 inline text-purple-500"/> Permanent Upgrades: <span className="font-semibold text-xs">{permanentUpgradesDisplay}</span></li>
              <li>Your Player Name, Garden Name, and completed NPC Quests.</li>
            </ul>
            Rare seeds and Permanent Upgrades provide significant boosts across all prestiges.
            This is a significant step, recommended after exploring multiple eras and accumulating Chrono-Energy.
            <br/> <br/>
            You have Prestiged <span className="font-bold">{state.prestigeCount}</span> times. Your current tier is <span className="font-bold"><PrestigeTierIcon className="inline h-4 w-4 mr-1"/>{currentPrestigeTier.title}</span>.
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
