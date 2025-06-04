
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { ERAS, EraID } from '@/config/gameConfig';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Zap, Lock, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";

export default function EraNavigation() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const handleEraSelect = (eraId: EraID) => {
    dispatch({ type: 'SET_ERA', payload: eraId });
  };

  const handleUnlockEra = (eraId: EraID) => {
    const eraConfig = ERAS[eraId];
    if (state.chronoEnergy >= eraConfig.unlockCost) {
      dispatch({ type: 'UNLOCK_ERA', payload: eraId });
      // Check if unlock was successful by peeking into next state (not ideal but works for toast)
      // A better way would be for the reducer to return a flag or for the component to useEffect on unlockedEras
      toast({
        title: `${eraConfig.name} Unlocked!`,
        description: `You can now travel to the ${eraConfig.name}.`,
      });
    } else {
      toast({
        title: "Not Enough Chrono-Energy",
        description: `You need ${eraConfig.unlockCost} Chrono-Energy to unlock ${eraConfig.name}.`,
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-headline">Time Portal</SidebarGroupLabel>
      <SidebarMenu>
        {Object.values(ERAS).map((era) => {
          const isUnlocked = state.unlockedEras.includes(era.id);
          const isActive = state.currentEra === era.id;
          const IconComponent = era.icon;

          return (
            <SidebarMenuItem key={era.id}>
              {isUnlocked ? (
                <SidebarMenuButton
                  onClick={() => handleEraSelect(era.id)}
                  isActive={isActive}
                  className="w-full justify-start"
                  tooltip={era.name}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{era.name}</span>
                  {isActive && <Badge variant="outline" className="ml-auto text-xs bg-primary/20 text-primary-foreground">Active</Badge>}
                </SidebarMenuButton>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-md opacity-80 hover:opacity-100 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group relative">
                   <div className="flex items-center group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                    <IconComponent className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:mb-1" />
                    <span className="text-sm group-data-[collapsible=icon]:hidden">{era.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlockEra(era.id)}
                    disabled={state.chronoEnergy < era.unlockCost}
                    className="text-xs h-7 px-2 group-data-[collapsible=icon]:hidden"
                    title={`Unlock ${era.name} for ${era.unlockCost} Chrono-Energy`}
                  >
                    <Lock className="h-3 w-3 mr-1" /> {era.unlockCost} <Zap className="h-3 w-3 ml-0.5 text-yellow-400" />
                  </Button>
                  <span 
                    className="text-xs group-data-[collapsible=icon]:block hidden group-hover:block absolute right-1 top-1/2 -translate-y-1/2 bg-background p-1 rounded shadow-lg"
                    title={`Unlock ${era.name} for ${era.unlockCost} Chrono-Energy. You have ${Math.floor(state.chronoEnergy)}.`}
                  >
                    <Lock className="h-4 w-4"/>
                  </span>
                </div>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

    