
"use client";

import React, { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from '@/components/game/AppHeader';
import EraNavigation from '@/components/game/EraNavigation';
import ResourcePanel from '@/components/game/ResourcePanel';
import GardenPlot from '@/components/game/GardenPlot';
import AutomationStation from '@/components/game/AutomationStation';
import AICropAdvisor from '@/components/game/AICropAdvisor';
import PrestigeAltar from '@/components/game/PrestigeAltar';
import UpgradesPanel from '@/components/game/UpgradesPanel'; // New import
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Droplets, Sun, Coins, Power, PlusCircle } from 'lucide-react'; // Added icons for debug


export default function GameClientLayout() {
  const { dispatch } = useGame(); // Get dispatch for debug and water button
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("garden");


  const handleManualWater = () => {
    dispatch({ type: 'CLICK_WATER_BUTTON' });
  };

  const addDebugResource = (resourceId: string, amount: number) => {
    dispatch({ type: 'UPDATE_RESOURCE', payload: { resourceId, amount } });
  };
  
  const addDebugChronoEnergy = (amount: number) => {
    dispatch({ type: 'ADD_CHRONO_ENERGY', payload: amount } );
  };


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <span className="font-headline text-lg group-data-[collapsible=icon]:hidden">Eras</span>
          <SidebarTrigger className="md:hidden" />
        </SidebarHeader>
        <ScrollArea className="h-[calc(100vh-200px)] group-data-[collapsible=icon]:h-[calc(100vh-100px)]">
          <SidebarContent>
            <EraNavigation />
            <ResourcePanel />
          </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-2 mt-auto border-t">
           <PrestigeAltar />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <AppHeader />
        <div className="p-2 sm:p-4 md:p-6 flex-grow">
          <Tabs defaultValue="garden" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
              <TabsTrigger value="garden" className="font-headline">Garden</TabsTrigger>
              <TabsTrigger value="automation" className="font-headline">Automation</TabsTrigger>
              <TabsTrigger value="upgrades" className="font-headline">Upgrades</TabsTrigger> {/* New Tab */}
              <TabsTrigger value="ai_advisor" className="font-headline">AI Advisor</TabsTrigger>
            </TabsList>
            <TabsContent value="garden">
              <div className="mb-4 flex space-x-2">
                 <Button onClick={handleManualWater} variant="outline">
                    <Droplets className="mr-2 h-4 w-4 text-blue-500" /> Manual Water (+10)
                </Button>
              </div>
              <GardenPlot />
            </TabsContent>
            <TabsContent value="automation">
              <AutomationStation />
            </TabsContent>
            <TabsContent value="upgrades"> {/* New Tab Content */}
              <UpgradesPanel />
            </TabsContent>
            <TabsContent value="ai_advisor">
              <AICropAdvisor />
            </TabsContent>
          </Tabs>
        
          {/* Debug Controls - visible only in development perhaps */}
          {process.env.NODE_ENV === 'development' && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Debug Controls</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => addDebugResource('Water', 100)}><Droplets className="mr-1 h-4 w-4"/>+100 Water</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugResource('Sunlight', 100)}><Sun className="mr-1 h-4 w-4"/>+100 Sunlight</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugResource('Coins', 1000)}><Coins className="mr-1 h-4 w-4"/>+1K Coins</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugResource('Energy', 100)}><Power className="mr-1 h-4 w-4"/>+100 Energy</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugChronoEnergy(100)}>+100 Chrono</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (typeof window !== 'undefined') localStorage.removeItem('chronoGardenSave'); window.location.reload();}}>Reset & Reload</Button>
              </CardContent>
            </Card>
          )}

        </div>
        <footer className="text-center p-4 border-t text-xs text-muted-foreground">
          ChronoGarden: Temporal Harvest - &copy; {new Date().getFullYear()}
        </footer>
      </SidebarInset>
      
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        onClick={() => setIsHelpOpen(true)}
        aria-label="Help"
      >
        <ShieldQuestion className="h-5 w-5" />
      </Button>
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={() => setIsHelpOpen(false)}>
          <div className="bg-card p-6 rounded-lg shadow-xl w-11/12 max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-headline mb-4">How to Play ChronoGarden (Phase 1)</h2>
            <p className="text-sm mb-2">Welcome! Your goal is to cultivate plants in the Present Day era.</p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
              <li>**Resources (Top Bar):** Manage Water, Sunlight, Coins, and Energy. Chrono-Energy is for unlocking future Eras.</li>
              <li>**Eras (Left Sidebar):** Only 'Present Day' is active. Future eras will be unlockable.</li>
              <li>**Inventory (Left Sidebar):** Shows your current resources and soil quality.</li>
              <li>**Garden Tab:**
                <ul>
                  <li>Select a crop (Carrot, Tomato, Sunflower) from the dropdown.</li>
                  <li>Click an empty 3x3 plot slot to plant. Costs Water and Sunlight.</li>
                  <li>Crops grow over time. Progress is shown.</li>
                  <li>Click a mature crop to harvest it for Coins (or Sunlight for Sunflowers).</li>
                  <li>Click the blue "Manual Water" button to get more Water.</li>
                </ul>
              </li>
              <li>**Automation Tab:** Build Sprinklers (generates Water) and AutoHarvesters (harvests mature crops). Costs Coins and Energy. Toggle them on/off.</li>
              <li>**Upgrades Tab:** Purchase upgrades for faster growth, better Sunflower yield, or cheaper crop costs using Coins and Energy.</li>
              <li>**AI Advisor Tab:** (Future feature) Get tips.</li>
              <li>**Prestige (Bottom Left Sidebar):** (Future feature) Reset with benefits.</li>
              <li>**Save/Load:** Game saves automatically to your browser. Reloading will resume your game. (Debug: Reset & Reload button clears save).</li>
            </ul>
            <Button onClick={() => setIsHelpOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}

    