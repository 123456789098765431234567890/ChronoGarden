
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { UserCircle, BookOpen, Share2, UploadCloud, Clipboard, CheckSquare } from 'lucide-react';
import { PRESTIGE_TIERS_CONFIG, getCurrentPrestigeTier } from '@/config/gameConfig';
import type { PlantedCrop } from '@/config/gameConfig';


interface GardenExportData {
  playerName: string;
  gardenName: string;
  currentEra: string;
  plotSlots: Array<Partial<PlantedCrop> | null>; // Only save essential plot data
}

export default function ProfilePanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const [localPlayerName, setLocalPlayerName] = useState(state.playerName);
  const [localGardenName, setLocalGardenName] = useState(state.gardenName);
  const [importCode, setImportCode] = useState("");

  useEffect(() => {
    setLocalPlayerName(state.playerName);
    setLocalGardenName(state.gardenName);
  }, [state.playerName, state.gardenName]);

  const handleSaveChanges = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'SET_PLAYER_NAME', payload: localPlayerName });
    dispatch({ type: 'SET_GARDEN_NAME', payload: localGardenName });
    toast({ title: "Profile Updated", description: "Your player and garden names have been saved." });
  };

  const currentPrestigeTier = getCurrentPrestigeTier(state.prestigeCount);
  const PrestigeTierIcon = currentPrestigeTier.icon;

  const handleExportData = () => {
    dispatch({ type: 'USER_INTERACTION' });
    const exportData: GardenExportData = {
      playerName: state.playerName,
      gardenName: state.gardenName,
      currentEra: state.currentEra,
      plotSlots: state.plotSlots.map(slot => slot ? { cropId: slot.cropId, era: slot.era, plantedAt: slot.plantedAt } : null)
    };
    const jsonString = JSON.stringify(exportData);
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        toast({ title: "Data Copied!", description: "Garden data copied to clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy data: ", err);
        toast({ title: "Copy Failed", description: "Could not copy data. Check console.", variant: "destructive" });
      });
  };
  
  const handleImportData = () => {
    dispatch({ type: 'USER_INTERACTION' });
    try {
      const parsedData = JSON.parse(importCode) as GardenExportData;
      if (parsedData.playerName && parsedData.gardenName && parsedData.currentEra && Array.isArray(parsedData.plotSlots)) {
        dispatch({ type: 'SET_PLAYER_NAME', payload: parsedData.playerName });
        dispatch({ type: 'SET_GARDEN_NAME', payload: parsedData.gardenName });
        
        // Note: Directly setting plotSlots and era like this bypasses some game logic (e.g., planting costs).
        // This is a simple import for layout viewing/sharing, not full state restoration.
        // For a more robust import, you'd need a more complex reducer action.
        // For now, we'll update the GameContext state directly for these.
        
        // Simple update - this would ideally be a more robust LOAD_PLOT_DATA action
        const tempState = {...state, 
            plotSlots: parsedData.plotSlots.map(s => s ? { ...s, id: crypto.randomUUID(), maturityCheckedForDecay: false } as PlantedCrop : null),
            currentEra: parsedData.currentEra as any // Type assertion, ensure EraID is valid
        };
        dispatch({type: 'LOAD_STATE_FROM_STORAGE', payload: tempState});


        toast({ title: "Data Imported!", description: "Garden data has been loaded. Some features might need a refresh or time to update." });
        setImportCode("");
      } else {
        throw new Error("Invalid data structure.");
      }
    } catch (error) {
      console.error("Failed to import data: ", error);
      toast({ title: "Import Failed", description: "Invalid or corrupt data code.", variant: "destructive" });
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <UserCircle className="w-6 h-6 mr-2 text-primary" />
          Player Profile & Garden Settings
        </CardTitle>
        <CardDescription>
          Customize your identity in the ChronoGarden. Changes are saved locally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="playerName" className="font-semibold">Player Name</Label>
          <Input
            id="playerName"
            value={localPlayerName}
            onChange={(e) => setLocalPlayerName(e.target.value)}
            placeholder="Enter your player name"
            className="max-w-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gardenName" className="font-semibold">Garden Name</Label>
          <Input
            id="gardenName"
            value={localGardenName}
            onChange={(e) => setLocalGardenName(e.target.value)}
            placeholder="Enter your garden's name"
            className="max-w-sm"
          />
        </div>
        <Button onClick={handleSaveChanges}>
            <CheckSquare className="w-4 h-4 mr-2"/>
            Save Names
        </Button>

        <div className="border-t pt-6 space-y-2">
            <h3 className="font-headline text-lg flex items-center"><PrestigeTierIcon className="w-5 h-5 mr-2 text-accent" />Prestige Tier</h3>
            <p className="text-sm text-muted-foreground">Your current tier: <span className="font-semibold text-foreground">{currentPrestigeTier.title}</span> (Prestiged {state.prestigeCount} times)</p>
            <p className="text-xs">Unlock higher tiers by prestiging more often!</p>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-headline text-lg flex items-center"><BookOpen className="w-5 h-5 mr-2 text-accent" />Garden Data (Local)</h3>
           <p className="text-sm text-muted-foreground">Export your current garden layout or import one. This is for sharing visuals, not full game state transfer.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleExportData} variant="outline">
                <Clipboard className="w-4 h-4 mr-2" /> Export Garden Data
            </Button>
             <Button variant="outline" disabled> {/* Placeholder */}
                <Share2 className="w-4 h-4 mr-2" /> Take Snapshot (Coming Soon)
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="importCode" className="font-semibold">Import Garden Data Code</Label>
            <Input 
                id="importCode"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste garden data code here"
            />
            <Button onClick={handleImportData} disabled={!importCode}>
                <UploadCloud className="w-4 h-4 mr-2"/> Import Data
            </Button>
          </div>
        </div>

      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Profile settings are stored in your browser. Export/Import is for basic layout sharing.
      </CardFooter>
    </Card>
  );
}
