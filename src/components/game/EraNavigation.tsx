"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { ERAS, EraID } from '@/config/gameConfig';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Zap, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EraNavigation() {
  const { state, dispatch } = useGame();

  const handleEraSelect = (eraId: EraID) => {
    dispatch({ type: 'SET_ERA', payload: eraId });
  };

  const handleUnlockEra = (eraId: EraID) => {
    const eraConfig = ERAS[eraId];
    if (state.chronoEnergy >= eraConfig.unlockCost) {
      dispatch({ type: 'UNLOCK_ERA', payload: eraId });
    } else {
      // TODO: Show a message that not enough chrono-energy
      console.warn("Not enough Chrono-Energy to unlock", eraId);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-headline">Time Periods</SidebarGroupLabel>
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
                  {isActive && <Badge variant="outline" className="ml-auto text-xs">Active</Badge>}
                </SidebarMenuButton>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-md opacity-70 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
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
                    <Lock className="h-3 w-3 mr-1" /> {era.unlockCost} <Zap className="h-3 w-3 ml-1" />
                  </Button>
                  <span className="text-xs group-data-[collapsible=icon]:block hidden"><Lock className="h-4 w-4"/></span>
                </div>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
