
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from '@/components/game/AppHeader';
import EraNavigation from '@/components/game/EraNavigation';
import ResourcePanel from '@/components/game/ResourcePanel';
import GardenPlot from '@/components/game/GardenPlot';
import AutomationStation from '@/components/game/AutomationStation';
import AICropAdvisor from '@/components/game/AICropAdvisor';
import PrestigeAltar from '@/components/game/PrestigeAltar';
import UpgradesPanel from '@/components/game/UpgradesPanel';
import ChronoNexusPanel from '@/components/game/ChronoNexusPanel'; 
import SynergyPanel from '@/components/game/SynergyPanel'; 
import GoalsPanel from '@/components/game/GoalsPanel'; // New Import
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Droplets, MessageSquare, Award, Link2, Target as TargetIcon } from 'lucide-react'; // Added TargetIcon
import { ERAS, GAME_VERSION } from '@/config/gameConfig';
import { useToast } from "@/hooks/use-toast";


export default function GameClientLayout() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("garden");

  useEffect(() => {
    const lastUnlockedEraId = state.unlockedEras.length > 0 ? state.unlockedEras[state.unlockedEras.length - 1] : null;
    if (lastUnlockedEraId && lastUnlockedEraId !== 'Present') { 
        const eraConfig = ERAS[lastUnlockedEraId];
        const sessionKey = `toast_era_unlocked_${lastUnlockedEraId}`;
        if (eraConfig && (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey))) {
            toast({
                title: `🎉 ${eraConfig.name} Unlocked! 🎉`,
                description: `You can now travel to the ${eraConfig.name} via the Time Portal.`,
            });
            if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
        }
    }
  }, [state.unlockedEras, toast]);

  // Toast for completed goals
  useEffect(() => {
    Object.entries(state.goalStatus).forEach(([goalId, status]) => {
        if (status.completed) {
            const sessionKey = `toast_goal_completed_${goalId}`;
            if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
                toast({
                    title: "🏆 Goal Achieved! 🏆",
                    description: `You completed: ${ERAS[state.currentEra].name} - Check the Goals tab for your reward!`, // Simplified message
                });
                 if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
            }
        }
    });
  }, [state.goalStatus, toast, state.currentEra]);


  const handleManualWater = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'CLICK_WATER_BUTTON' });
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

      <SidebarInset onClick={() => dispatch({ type: 'USER_INTERACTION' })}> 
        <AppHeader />
        <div className="p-2 sm:p-4 md:p-6 flex-grow">
          <Tabs defaultValue="garden" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 mb-4">
              <TabsTrigger value="garden" className="font-headline">Garden</TabsTrigger>
              <TabsTrigger value="automation" className="font-headline">Automation</TabsTrigger>
              <TabsTrigger value="upgrades" className="font-headline">Upgrades</TabsTrigger>
              <TabsTrigger value="chrono_nexus" className="font-headline flex items-center"><Award className="w-4 h-4 mr-1 sm:mr-2" /> Nexus</TabsTrigger>
              <TabsTrigger value="synergies" className="font-headline flex items-center"><Link2 className="w-4 h-4 mr-1 sm:mr-2" />Synergies</TabsTrigger>
              <TabsTrigger value="goals" className="font-headline flex items-center"><TargetIcon className="w-4 h-4 mr-1 sm:mr-2" />Goals</TabsTrigger>
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
            <TabsContent value="chrono_nexus">
              <ChronoNexusPanel />
            </TabsContent>
            <TabsContent value="synergies">
              <SynergyPanel />
            </TabsContent>
             <TabsContent value="goals">
              <GoalsPanel />
            </TabsContent>
            <TabsContent value="ai_advisor">
              <AICropAdvisor />
            </TabsContent>
          </Tabs>
        
        </div>
        <footer className="text-center p-4 border-t text-xs text-muted-foreground flex items-center justify-center space-x-4">
          <span>ChronoGarden: Temporal Harvest - {GAME_VERSION} - &copy; {new Date().getFullYear()}</span>
          <Button variant="outline" size="sm" asChild>
            <a href="https://forms.office.com/r/Ezbv7xmgpK" target="_blank" rel="noopener noreferrer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Feedback
            </a>
          </Button>
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
            <h2 className="text-xl font-headline mb-4">How to Play ChronoGarden ({GAME_VERSION})</h2>
            <p className="text-sm mb-2">Cultivate plants across eras, automate, and unlock powerful upgrades!</p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
              <li>**Eras:** Unlock Present, Prehistoric, and Future eras via the Time Portal (left sidebar) using Chrono-Energy. Each era has unique crops, resources, automations, and upgrades.</li>
              <li>**Weather:** Random weather events (Sunny, Rainy) affect gameplay. Check the top bar for current conditions.</li>
              <li>**Resources:** Manage shared resources like Water, Coins, Energy, and Chrono-Energy. Era-specific resources also exist.</li>
              <li>**Garden Tab:** Plant and harvest crops specific to the current era. Note the time remaining under each plant.</li>
              <li>**Automation Tab:** Build era-specific machines to automate tasks.</li>
              <li>**Upgrades Tab:** Purchase era-specific upgrades to boost efficiency. These reset on Prestige.</li>
              <li>**Chrono Nexus Tab:** (Unlocks after 1 Prestige) Spend Chrono-Energy and Rare Seeds for powerful permanent upgrades that persist across Prestiges.</li>
              <li>**Synergies Tab:** Discover passive bonuses unlocked by achieving milestones across different eras.</li>
              <li>**Goals Tab:** Complete objectives for rewards like Chrono-Energy and Rare Seeds.</li>
              <li>**AI Advisor Tab:** Get tips for your current era.</li>
              <li>**Rare Seeds:** 1% base chance on harvest to find a rare seed for that crop. Rare seeds grant permanent boosts (faster growth, +1 yield, auto-plant chance).</li>
              <li>**Prestige (Bottom Left Sidebar):** Reset your garden (resources, plots, era-upgrades) to keep Chrono-Energy, Rare Seeds, and Permanent Upgrades. This is key to long-term progression.</li>
              <li>**Save/Load:** Game saves automatically to your browser.</li>
            </ul>
            <Button onClick={() => setIsHelpOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}

