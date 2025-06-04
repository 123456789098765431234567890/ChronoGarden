
"use client";

import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ChronoLeafIcon from '@/components/icons/ChronoLeafIcon';
import { useGame } from '@/contexts/GameContext';
import { ERAS, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig';
import { Zap, Droplets, Sun, Coins, Power } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle'; // Added ThemeToggle import

export default function AppHeader() {
  const { state } = useGame();
  const currentEraConfig = ERAS[state.currentEra];

  const resourcesToShow = [
    { id: "Water", icon: Droplets },
    { id: "Sunlight", icon: Sun },
    { id: "Coins", icon: Coins },
    { id: "Energy", icon: Power },
    { id: "ChronoEnergy", icon: Zap, color: "text-yellow-500" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-2 hidden md:flex items-center">
          <ChronoLeafIcon className="h-8 w-8 mr-2 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-foreground">
            ChronoGarden
          </h1>
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-1 md:justify-end md:space-x-2">
          <div className="flex items-center border border-border rounded-lg px-2 py-1.5 shadow-sm bg-card text-xs sm:text-sm">
             <currentEraConfig.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-accent shrink-0" />
             <span className="font-medium text-foreground truncate">{currentEraConfig.name}</span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 border border-border rounded-lg p-1 sm:p-1.5 shadow-sm bg-card">
            {resourcesToShow.map(res => {
              const ResIcon = res.icon;
              const resourceConfig = ALL_GAME_RESOURCES_MAP[res.id];
              return (
                <div key={res.id} className="flex items-center px-1 sm:px-2 py-0.5 rounded bg-muted/30" title={resourceConfig?.name || res.id}>
                  <ResIcon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0 ${res.color || 'text-muted-foreground'}`} />
                  <span className="font-mono text-xs sm:text-sm text-foreground">
                    {Math.floor(state.resources[res.id] || 0)}
                  </span>
                </div>
              );
            })}
          </div>
          
          <ThemeToggle /> 
        </div>
      </div>
    </header>
  );
}
