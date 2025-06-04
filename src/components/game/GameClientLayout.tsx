
"use client";

import React, { useState, useEffect } from 'react';
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AppHeader from '@/components/game/AppHeader';
import EraNavigation from '@/components/game/EraNavigation';
import ResourcePanel from '@/components/game/ResourcePanel';
import GardenPlot from '@/components/game/GardenPlot';
import AutomationStation from '@/components/game/AutomationStation';
import AICropAdvisor from '@/components/game/AICropAdvisor';
import PrestigeAltar from '@/components/game/PrestigeAltar';
import UpgradesPanel from '@/components/game/UpgradesPanel';
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Droplets, Sun, Coins, Power, Zap as ChronoEnergyIcon } from 'lucide-react';
import { ERAS } from '@/config/gameConfig';
import { useToast } from "@/hooks/use-toast";


export default function GameClientLayout() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("garden");

  // Toast for unlocking eras
  useEffect(() => {
    const lastUnlockedEraId = state.unlockedEras.length > 0 ? state.unlockedEras[state.unlockedEras.length - 1] : null;
    if (lastUnlockedEraId && lastUnlockedEraId !== 'Present') { // Don't toast for initial Present era
        const eraConfig = ERAS[lastUnlockedEraId];
        if (eraConfig && !sessionStorage.getItem(`toast_era_unlocked_${lastUnlockedEraId}`)) {
            toast({
                title: `🎉 ${eraConfig.name} Unlocked! 🎉`,
                description: `You can now travel to the ${eraConfig.name} via the Time Portal.`,
            });
            sessionStorage.setItem(`toast_era_unlocked_${lastUnlockedEraId}`, 'true');
        }
    }
  }, [state.unlockedEras, toast]);


  const handleManualWater = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'CLICK_WATER_BUTTON' });
  };

  const addDebugResource = (resourceId: string, amount: number) => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'UPDATE_RESOURCE', payload: { resourceId, amount } });
  };
  
  const addDebugChronoEnergy = (amount: number) => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'ADD_CHRONO_ENERGY', payload: amount } );
  };


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <span className="font-headline text-lg group-data-[collapsible=icon]:hidden">Time Portal</span>
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

      <SidebarInset onClick={() => dispatch({ type: 'USER_INTERACTION' })}> {/* Track interaction on main area clicks */}
        <AppHeader />
        <div className="p-2 sm:p-4 md:p-6 flex-grow">
          <Tabs defaultValue="garden" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
              <TabsTrigger value="garden" className="font-headline">Garden</TabsTrigger>
              <TabsTrigger value="automation" className="font-headline">Automation</TabsTrigger>
              <TabsTrigger value="upgrades" className="font-headline">Upgrades</TabsTrigger>
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
            <TabsContent value="upgrades">
              <UpgradesPanel />
            </TabsContent>
            <TabsContent value="ai_advisor">
              <AICropAdvisor />
            </TabsContent>
          </Tabs>
        
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
                <Button size="sm" variant="outline" onClick={() => addDebugChronoEnergy(100)}><ChronoEnergyIcon className="mr-1 h-4 w-4"/>+100 Chrono</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugResource('DinoBone', 10)}>+10 DinoBone</Button>
                <Button size="sm" variant="outline" onClick={() => addDebugResource('MysticSpores', 10)}>+10 MysticSpores</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (typeof window !== 'undefined') {localStorage.removeItem('chronoGardenSave'); sessionStorage.clear();} window.location.reload();}}>Reset & Reload</Button>
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
        onClick={() => { dispatch({type: 'USER_INTERACTION'}); setIsHelpOpen(true);}}
        aria-label="Help"
      >
        <ShieldQuestion className="h-5 w-5" />
      </Button>
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={() => setIsHelpOpen(false)}>
          <div className="bg-card p-6 rounded-lg shadow-xl w-11/12 max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-headline mb-4">How to Play ChronoGarden (Phase 2)</h2>
            <p className="text-sm mb-2">Welcome! Your goal is to cultivate plants across different eras.</p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
              <li>**Resources (Top Bar):** Manage Water, Sunlight, Coins, Energy, and special era resources. Chrono-Energy (Zap icon) is key for unlocking eras and other powerful actions.</li>
              <li>**Time Portal (Left Sidebar):** Unlock and travel between Eras. Currently: Present Day & Prehistoric.</li>
              <li>**Inventory (Left Sidebar):** Shows your current resources and soil quality.</li>
              <li>**Garden Tab:**
                <ul>
                  <li>Plant crops specific to the current era.</li>
                  <li>Crops grow over time. Harvest them for resources.</li>
                  <li>Prehistoric crops may yield Chrono-Energy.</li>
                </ul>
              </li>
              <li>**Automation Tab:** Build era-specific automations.</li>
              <li>**Upgrades Tab:** Purchase era-specific upgrades.</li>
              <li>**Rare Seeds:** 1% chance on harvest to find a rare seed. Rare seeds give permanent boosts to that crop type (faster growth, +1 yield, auto-plant chance).</li>
              <li>**Prestige (Bottom Left Sidebar):** Reset your garden to keep Chrono-Energy and Rare Seeds, starting fresh with powerful advantages. Unlock more eras to make prestige more effective.</li>
              <li>**Save/Load:** Game saves automatically. Debug: "Reset & Reload" clears save.</li>
            </ul>
            <Button onClick={() => setIsHelpOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}

    