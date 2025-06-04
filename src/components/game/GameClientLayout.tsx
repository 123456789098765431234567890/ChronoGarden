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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel
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
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion } from 'lucide-react';


export default function GameClientLayout() {
  const { state } = useGame();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
          <Tabs defaultValue="garden" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="garden" className="font-headline">Garden</TabsTrigger>
              <TabsTrigger value="automation" className="font-headline">Automation</TabsTrigger>
              <TabsTrigger value="ai_advisor" className="font-headline">AI Advisor</TabsTrigger>
            </TabsList>
            <TabsContent value="garden">
              <GardenPlot />
            </TabsContent>
            <TabsContent value="automation">
              <AutomationStation />
            </TabsContent>
            <TabsContent value="ai_advisor">
              <AICropAdvisor />
            </TabsContent>
          </Tabs>
        </div>
        <footer className="text-center p-4 border-t text-xs text-muted-foreground">
          ChronoGarden: Temporal Harvest - &copy; {new Date().getFullYear()}
        </footer>
      </SidebarInset>
      
      {/* Simple Help Button and Modal/Sheet for instructions */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        onClick={() => setIsHelpOpen(true)}
        aria-label="Help"
      >
        <ShieldQuestion className="h-5 w-5" />
      </Button>
      {/* Basic help modal - can be replaced with Sheet or Dialog from shadcn */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={() => setIsHelpOpen(false)}>
          <div className="bg-card p-6 rounded-lg shadow-xl w-11/12 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-headline mb-4">How to Play ChronoGarden</h2>
            <p className="text-sm mb-2">Welcome! Your goal is to cultivate plants across different eras.</p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-4">
              <li>Use the sidebar to navigate Eras and see your Resources.</li>
              <li>Earn Chrono-Energy to unlock new Eras.</li>
              <li>In the 'Garden' tab, plant and manage crops specific to the current era.</li>
              <li>Use the 'Automation' tab to set up systems that help you manage your garden.</li>
              <li>Consult the 'AI Advisor' for tips on optimizing your garden.</li>
              <li>Consider 'Prestige' to reset with benefits once you've advanced far enough.</li>
            </ul>
            <Button onClick={() => setIsHelpOpen(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
