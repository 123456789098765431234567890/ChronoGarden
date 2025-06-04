
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_GAME_RESOURCES_MAP, ERAS } from '@/config/gameConfig';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Package, Leaf as LeafIconLucide } from 'lucide-react'; // Renamed LeafIcon to LeafIconLucide

export default function ResourcePanel() {
  const { state } = useGame();
  const currentEraResources = ERAS[state.currentEra]?.eraSpecificResources.map(r => r.id) || [];

  const coreResourceIds = ['Water', 'Sunlight', 'Coins', 'Energy', 'ChronoEnergy', 'Nutrients'];

  const resourcesToDisplay = Object.entries(state.resources)
    .map(([id, amount]) => {
      const config = ALL_GAME_RESOURCES_MAP[id];
      if (config) return { ...config, amount };
      return { id, name: id, icon: Package, amount, description: "Collected item" };
    })
    .filter(r => r.amount > 0 || coreResourceIds.includes(r.id) || currentEraResources.includes(r.id))
    .sort((a, b) => {
      // Prioritize core resources
      const isACore = coreResourceIds.includes(a.id);
      const isBCore = coreResourceIds.includes(b.id);
      if (isACore && !isBCore) return -1;
      if (!isACore && isBCore) return 1;
      return a.name.localeCompare(b.name);
    });


  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-headline">Inventory</SidebarGroupLabel>
      <SidebarMenu className="text-xs max-h-[200px] overflow-y-auto group-data-[collapsible=icon]:max-h-[300px]">
        {resourcesToDisplay.length === 0 && (
          <SidebarMenuItem className="text-muted-foreground italic px-2">No resources yet.</SidebarMenuItem>
        )}
        {resourcesToDisplay.map((resource) => {
          const IconComponent = resource.icon || Package;
          return (
            <SidebarMenuItem key={resource.id} title={`${resource.name}: ${Math.floor(resource.amount)} (${resource.description || ''})`}>
              <div className="flex items-center justify-between w-full p-1 rounded-md hover:bg-sidebar-accent/50">
                <div className="flex items-center">
                  <IconComponent className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{resource.name}</span>
                </div>
                <span className="font-mono group-data-[collapsible=icon]:text-[10px] group-data-[collapsible=icon]:mt-1">
                  {Math.floor(resource.amount)}
                </span>
              </div>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
      <SidebarMenuItem title="Soil Quality">
        <div className="flex items-center justify-between w-full p-1 rounded-md hover:bg-sidebar-accent/50">
          <div className="flex items-center">
            <LeafIconLucide className="h-4 w-4 mr-2 shrink-0 text-green-600" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Soil Quality</span>
          </div>
          <span className="font-mono group-data-[collapsible=icon]:text-[10px] group-data-[collapsible=icon]:mt-1">
            {state.soilQuality}%
          </span>
        </div>
      </SidebarMenuItem>
    </SidebarGroup>
  );
}

    