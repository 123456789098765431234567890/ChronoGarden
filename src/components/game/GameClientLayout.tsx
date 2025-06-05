
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
import GoalsPanel from '@/components/game/GoalsPanel';
import ProfilePanel from '@/components/game/ProfilePanel'; 
import LeaderboardPanel from '@/components/game/LeaderboardPanel'; 
import VisitorPanel from '@/components/game/VisitorPanel'; 
import LoreBookPanel from '@/components/game/LoreBookPanel'; // New Lore Panel
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Droplets, MessageSquare, Award, Link2, Target as TargetIcon, Users, BarChart3, UserCircle2Icon, Scroll as ScrollIcon } from 'lucide-react'; 
import { ERAS, GAME_VERSION, GOALS_CONFIG, LORE_CONFIG, NPC_QUESTS_CONFIG, NPC_VISITORS_CONFIG } from '@/config/gameConfig';
import type { GoalID } from '@/config/gameConfig';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 


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

  useEffect(() => {
    Object.entries(state.goalStatus).forEach(([goalId, status]) => {
        const goalConfig = GOALS_CONFIG[goalId as GoalID]; 
        if (status.completed) {
            const sessionKey = `toast_goal_completed_${goalId}`;
            if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
                toast({
                    title: "🏆 Goal Achieved! 🏆",
                    description: `You completed: ${goalConfig?.name || 'A temporal objective'}! Check the Goals tab for your reward!`,
                });
                 if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
            }
        }
    });
  }, [state.goalStatus, toast, state.currentEra]);

  useEffect(() => {
    if(state.activeQuest?.status === 'completed') {
      const questConfig = NPC_QUESTS_CONFIG[state.activeQuest.questId];
      const sessionKey = `toast_quest_completed_${state.activeQuest.questId}`;
      if (questConfig && (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey))) {
          toast({
              title: "🤝 Quest Complete! 🤝",
              description: `You completed "${questConfig.title}" for ${NPC_VISITORS_CONFIG[state.activeQuest.visitorId]?.name}! Reward granted.`,
          });
          if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [state.activeQuest, toast]);

  useEffect(() => {
    state.unlockedLoreIds.forEach(loreId => {
        const loreEntry = LORE_CONFIG[loreId];
        if (loreEntry) {
            const sessionKey = `toast_lore_unlocked_${loreId}`;
            if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey) && !loreEntry.isUnlockedByDefault) {
                toast({
                    title: "📜 New Lore Unlocked! 📜",
                    description: `You've uncovered a new entry: "${loreEntry.title}". Check the Lore Book!`,
                });
                if (typeof window !== 'undefined') sessionStorage.setItem(sessionKey, 'true');
            }
        }
    });
  }, [state.unlockedLoreIds, toast]);


  const handleManualWater = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'CLICK_WATER_BUTTON' });
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <span className="font-headline text-lg group-data-[collapsible=icon]:hidden">Time Portal</span>
          <SidebarTrigger className="md:hidden" onClick={() => dispatch({ type: 'USER_INTERACTION' })} />
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
          <Tabs defaultValue="garden" className="w-full" value={activeTab} onValueChange={(newTab) => { setActiveTab(newTab); dispatch({type: 'USER_INTERACTION'})}}>
            <TabsList className="grid w-full grid-cols-5 sm:grid-cols-6 md:grid-cols-11 mb-4 text-xs sm:text-sm">
              <TabsTrigger value="garden" className="font-headline">Garden</TabsTrigger>
              <TabsTrigger value="visitors" className="font-headline flex items-center"><Users className="w-3 h-3 mr-1 sm:mr-1" />Visitors</TabsTrigger>
              <TabsTrigger value="automation" className="font-headline">Automation</TabsTrigger>
              <TabsTrigger value="upgrades" className="font-headline">Upgrades</TabsTrigger>
              <TabsTrigger value="chrono_nexus" className="font-headline flex items-center"><Award className="w-3 h-3 mr-1 sm:mr-1" /> Nexus</TabsTrigger>
              <TabsTrigger value="synergies" className="font-headline flex items-center"><Link2 className="w-3 h-3 mr-1 sm:mr-1" />Synergies</TabsTrigger>
              <TabsTrigger value="goals" className="font-headline flex items-center"><TargetIcon className="w-3 h-3 mr-1 sm:mr-1" />Goals</TabsTrigger>
              <TabsTrigger value="lore" className="font-headline flex items-center"><ScrollIcon className="w-3 h-3 mr-1 sm:mr-1" />Lore</TabsTrigger>
              <TabsTrigger value="profile" className="font-headline flex items-center"><UserCircle2Icon className="w-3 h-3 mr-1 sm:mr-1" />Profile</TabsTrigger>
              <TabsTrigger value="leaderboard" className="font-headline flex items-center"><BarChart3 className="w-3 h-3 mr-1 sm:mr-1" />Board</TabsTrigger>
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
             <TabsContent value="visitors">
              <VisitorPanel />
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
            <TabsContent value="lore">
              <LoreBookPanel />
            </TabsContent>
            <TabsContent value="profile">
              <ProfilePanel />
            </TabsContent>
            <TabsContent value="leaderboard">
              <LeaderboardPanel />
            </TabsContent>
            <TabsContent value="ai_advisor">
              <AICropAdvisor />
            </TabsContent>
          </Tabs>
        
        </div>
        <footer className="text-center p-4 border-t text-xs text-muted-foreground flex items-center justify-center space-x-4">
          <span>{state.gardenName} by {state.playerName} - ChronoGarden {GAME_VERSION} &copy; {new Date().getFullYear()}</span>
          <Button variant="outline" size="sm" asChild onClick={() => dispatch({ type: 'USER_INTERACTION' })}>
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
              <li>**Eras & Navigation:** Unlock and switch between eras using the Time Portal (left sidebar).</li>
              <li>**Resources:** Manage shared resources (Water, Coins) and era-specific ones. Displayed in sidebar.</li>
              <li>**Garden Tab:** Plant/harvest crops. Progress bars show growth. Special crops like Glowshroom (needs idle) and NanoVine (decays fast) exist.</li>
              <li>**Visitors Tab:** Occasionally, visitors from the current era may appear with quests for rewards. Some quests are timed!</li>
              <li>**Automation Tab:** Build era-specific machines to automate tasks.</li>
              <li>**Upgrades Tab:** Purchase era-specific upgrades. These reset on Prestige.</li>
              <li>**Chrono Nexus Tab:** (Unlocks after 1 Prestige) Spend Chrono-Energy & Rare Seeds for permanent upgrades.</li>
              <li>**Synergies Tab:** Discover passive bonuses by achieving milestones across eras.</li>
              <li>**Goals Tab:** Complete objectives for rewards like Chrono-Energy and Rare Seeds.</li>
              <li>**Lore Tab:** Uncover fragments of the ChronoGarden's story as you progress.</li>
              <li>**Profile Tab:** Customize your Player and Garden Name. Export/Import basic garden data.</li>
              <li>**Leaderboard Tab:** View your rank against other gardeners based on various game stats (requires setting Player Name).</li>
              <li>**AI Advisor Tab:** Get tips for your current era.</li>
              <li>**Weather:** Random weather events (Clear, Sunny, Rainy, Temporal Storm, Solar Eclipse) affect gameplay. Check the top bar.</li>
              <li>**Rare Seeds:** Small chance on harvest. Grant permanent boosts (faster growth, +1 yield, auto-plant chance).</li>
              <li>**Prestige (Bottom Left Sidebar):** Reset progress (except Chrono-Energy, Rare Seeds, Permanent Upgrades, Profile names, completed quests, unlocked lore) to gain long-term advantages. Unlocks Chrono Nexus and advances Prestige Tier.</li>
              <li>**Save/Load:** Game saves automatically to your browser.</li>
            </ul>
            <Button onClick={() => { setIsHelpOpen(false); dispatch({type: 'USER_INTERACTION'})}} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
