"use client";

import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ChronoLeafIcon from '@/components/icons/ChronoLeafIcon';
import { useGame } from '@/contexts/GameContext';
import { ERAS } from '@/config/gameConfig';
import { Zap } from 'lucide-react';

export default function AppHeader() {
  const { state } = useGame();
  const currentEraConfig = ERAS[state.currentEra];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-4 hidden md:flex items-center">
          <ChronoLeafIcon className="h-8 w-8 mr-2 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-foreground">
            ChronoGarden
          </h1>
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center border border-border rounded-lg px-3 py-1.5 shadow-sm bg-card">
             <currentEraConfig.icon className="h-5 w-5 mr-2 text-accent" />
             <span className="font-medium text-sm text-foreground">{currentEraConfig.name}</span>
          </div>
          <div className="flex items-center border border-border rounded-lg px-3 py-1.5 shadow-sm bg-card">
            <Zap className="h-5 w-5 mr-2 text-yellow-500" />
            <span className="font-medium text-sm text-foreground" title="Chrono-Energy">
              {Math.floor(state.chronoEnergy)}
            </span>
          </div>
          {/* Future: Theme Toggle Button */}
        </div>
      </div>
    </header>
  );
}
