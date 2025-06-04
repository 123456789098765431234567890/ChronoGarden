
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { ERAS, ALL_CROPS_MAP, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP, Crop } from '@/config/gameConfig';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sprout, Clock, PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"; // Added for rare seed toast

export default function GardenPlot() {
  const { state, dispatch } = useGame();
  const { toast } = useToast(); // Added for rare seed toast
  const currentEraConfig = ERAS[state.currentEra];
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const availableCropsInCurrentEra = Object.values(ALL_CROPS_MAP).filter(crop => crop.era === state.currentEra);
  const [selectedCropToPlant, setSelectedCropToPlant] = useState<string>(availableCropsInCurrentEra[0]?.id || "");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const newAvailableCrops = Object.values(ALL_CROPS_MAP).filter(crop => crop.era === state.currentEra);
    if (!newAvailableCrops.find(c => c.id === selectedCropToPlant)) {
      setSelectedCropToPlant(newAvailableCrops[0]?.id || "");
    }
  }, [state.currentEra, selectedCropToPlant]);


  const handlePlantCrop = (slotIndex: number) => {
    if (selectedCropToPlant) {
      // Dispatch USER_INTERACTION to update lastUserInteractionTime
      dispatch({ type: 'USER_INTERACTION' });
      dispatch({ type: 'PLANT_CROP', payload: { cropId: selectedCropToPlant, era: state.currentEra, slotIndex } });
    }
  };

  const handleHarvestCrop = (slotIndex: number) => {
    const oldRareSeedCount = state.rareSeeds.length;
    // Dispatch USER_INTERACTION
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } });

    // Check if a rare seed was found by comparing length after dispatch
    // This is a bit of a hack; ideally, the reducer action would return info or dispatch a separate event.
    // For now, we access the latest state (which might not be updated yet in this render cycle).
    // A more robust way is to check after a brief timeout or listen to a custom event.
    // Or, have the reducer itself set a flag that a toast should be shown.
    // For simplicity in this phase, we'll rely on the component re-rendering.
    // The check below might be unreliable due to state update timing.
    // A better place for this toast is within the GameContext after the HARVEST_CROP action modifies rareSeeds.
    // However, to keep changes localized here as per prompt structure:
    // This toast won't fire correctly here. It should be in GameContext or GameClientLayout listening to state.rareSeeds.
  };
  
  // Effect to show toast when a new rare seed is acquired
  useEffect(() => {
    const lastRareSeed = state.rareSeeds.length > 0 ? state.rareSeeds[state.rareSeeds.length - 1] : null;
    if (lastRareSeed && !sessionStorage.getItem(`toast_rare_seed_${lastRareSeed}`)) {
        const crop = ALL_CROPS_MAP[lastRareSeed];
        if (crop) {
            toast({
                title: "🌟 Rare Seed Found! 🌟",
                description: `You found a rare ${crop.name} seed! It now has special properties.`,
            });
            sessionStorage.setItem(`toast_rare_seed_${lastRareSeed}`, 'true'); // Prevent re-toasting for same seed in session
        }
    }
  }, [state.rareSeeds, toast]);


  const handleClearSlot = (slotIndex: number) => {
    dispatch({ type: 'USER_INTERACTION' });
    const plantedCrop = state.plotSlots[slotIndex];
    if (plantedCrop) {
        const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
        let growthTime = cropConfig.growthTime;
        if (state.rareSeeds.includes(cropConfig.id)) growthTime *= 0.9;

        const fasterGrowthUpgradeId = `cropGrowth_${plantedCrop.era}`;
        const fasterGrowthLevel = state.upgradeLevels[fasterGrowthUpgradeId] || 0;
        if (fasterGrowthLevel > 0 && UPGRADES_CONFIG[fasterGrowthUpgradeId]) {
            growthTime *= UPGRADES_CONFIG[fasterGrowthUpgradeId].effect(fasterGrowthLevel);
        }
        const isMature = (currentTime - plantedCrop.plantedAt) / 1000 >= growthTime;
        if (!isMature) {
             dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } }); 
        }
    }
  };

  const getGrowthProgress = (plantedAt: number, baseGrowthTime: number, cropId: string, cropEra: EraID) => {
    let growthTime = baseGrowthTime;
    if (state.rareSeeds.includes(cropId)) growthTime *= 0.9; // Rare seed 10% faster growth

    const fasterGrowthUpgradeId = `cropGrowth_${cropEra}`; // e.g. cropGrowth_Present
    const fasterGrowthLevel = state.upgradeLevels[fasterGrowthUpgradeId] || 0;
    if (UPGRADES_CONFIG[fasterGrowthUpgradeId] && fasterGrowthLevel > 0) {
      growthTime *= UPGRADES_CONFIG[fasterGrowthUpgradeId].effect(fasterGrowthLevel);
    }
    const elapsedTime = (currentTime - plantedAt) / 1000;
    return Math.min(100, (elapsedTime / growthTime) * 100);
  };
  
  const getModifiedCropCost = (crop: Crop) => {
    let costMultiplier = 1;
    let waterCostMultiplier = 1;

    const cheaperCropsUpgradeId = `cheaperCrops_${crop.era}`;
    const cheaperCropsLevel = state.upgradeLevels[cheaperCropsUpgradeId] || 0;
    if (UPGRADES_CONFIG[cheaperCropsUpgradeId] && cheaperCropsLevel > 0) {
      costMultiplier = UPGRADES_CONFIG[cheaperCropsUpgradeId].effect(cheaperCropsLevel);
    }

    const dripIrrigationUpgradeId = `waterCost_${crop.era}`;
     if (UPGRADES_CONFIG[dripIrrigationUpgradeId] && state.upgradeLevels[dripIrrigationUpgradeId] > 0){
          waterCostMultiplier = UPGRADES_CONFIG[dripIrrigationUpgradeId].effect(state.upgradeLevels[dripIrrigationUpgradeId]);
      }

    const modifiedCosts: Record<string, number> = {};
    Object.entries(crop.cost).forEach(([resId, amount]) => {
      let currentMultiplier = costMultiplier;
      if (resId === "Water") {
        currentMultiplier *= waterCostMultiplier;
      }
      modifiedCosts[resId] = Math.max(0, Math.round(amount * currentMultiplier));
    });
    return modifiedCosts;
  };

  const gardenPlotBg = state.currentEra === "Prehistoric" ? "bg-yellow-900/20" : "bg-green-800/10";

  return (
    <Card className={`shadow-lg ${gardenPlotBg}`}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <currentEraConfig.icon className="w-6 h-6 mr-2 text-primary" />
          {currentEraConfig.name} Garden Plot (3x3)
        </CardTitle>
        <CardDescription>{currentEraConfig.description}</CardDescription>
        {currentEraConfig.specialMechanic && (
           <Alert variant="default" className="mt-2 bg-background/70">
             <Sprout className="h-4 w-4" />
             <AlertTitle className="font-semibold">Era Mechanic</AlertTitle>
             <AlertDescription>{currentEraConfig.specialMechanic}</AlertDescription>
           </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="crop-select" className="font-semibold">Select Crop to Plant:</Label>
          <Select value={selectedCropToPlant} onValueChange={setSelectedCropToPlant}>
            <SelectTrigger id="crop-select" className="w-full md:w-1/2 mt-1 mb-3 bg-card">
              <SelectValue placeholder="Select a crop" />
            </SelectTrigger>
            <SelectContent>
              {availableCropsInCurrentEra.length > 0 ? availableCropsInCurrentEra.map((crop) => {
                const CropIcon = crop.icon;
                const modifiedCost = getModifiedCropCost(crop);
                const costString = Object.entries(modifiedCost).map(([k,v]) => `${v} ${ALL_GAME_RESOURCES_MAP[k]?.name || k}`).join(', ');
                return (
                  <SelectItem key={crop.id} value={crop.id}>
                    <div className="flex items-center">
                      <CropIcon className="w-4 h-4 mr-2" />
                      {crop.name} (Cost: {costString})
                    </div>
                  </SelectItem>
                );
              }) : <SelectItem value="none" disabled>No crops available in this era.</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {state.plotSlots.map((slot, index) => {
            if (slot && slot.era === state.currentEra) { // Only display crops planted in the current era
              const cropConfig = ALL_CROPS_MAP[slot.cropId];
              if (!cropConfig) return ( 
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted">
                    Error
                </Card>
              );

              const CropIcon = cropConfig.icon;
              const growthProgress = getGrowthProgress(slot.plantedAt, cropConfig.growthTime, slot.cropId, slot.era);
              const isMature = growthProgress >= 100;

              return (
                <Card key={slot.id || index} className="shadow-md relative overflow-hidden flex flex-col justify-between aspect-square bg-card">
                   <Image 
                    src={`https://placehold.co/150x100.png?text=${cropConfig.name.replace(/\s/g,"+")}`} 
                    alt={cropConfig.name} 
                    width={150} 
                    height={100} 
                    className="w-full h-1/2 object-cover" 
                    data-ai-hint={`${cropConfig.name} plant ${cropConfig.era}`}
                  />
                  <CardHeader className="pt-1 pb-1 px-2 flex-grow">
                     <div className="flex items-center">
                        <CropIcon className="w-4 h-4 mr-1 text-accent shrink-0" />
                        <CardTitle className="font-headline text-sm truncate" title={cropConfig.name}>{cropConfig.name}</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="text-xs px-2 pb-1 flex-grow">
                    <Progress value={growthProgress} className="w-full h-1.5 mb-1" />
                    <p className="text-center text-muted-foreground">{isMature ? "Ready!" : `${Math.floor(growthProgress)}%`}</p>
                  </CardContent>
                  <CardFooter className="p-1 sm:p-2">
                    {isMature ? (
                      <Button size="sm" onClick={() => handleHarvestCrop(index)} className="w-full text-xs h-8">
                        <CheckCircle className="w-3 h-3 mr-1" /> Harvest
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="w-full text-xs h-8">
                        <Clock className="w-3 h-3 mr-1" /> Grow
                      </Button>
                    )}
                  </CardFooter>
                  {!isMature && (
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-0 right-0 h-6 w-6" 
                        onClick={() => handleClearSlot(index)}
                        title="Uproot"
                    >
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </Card>
              );
            } else {
              // Empty slot or crop from a different era (don't display other era's crops for now to avoid clutter)
              return (
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors border-dashed">
                  <Button 
                    variant="ghost" 
                    className="w-full h-full flex flex-col items-center justify-center"
                    onClick={() => handlePlantCrop(index)}
                    disabled={!selectedCropToPlant || availableCropsInCurrentEra.length === 0 || !availableCropsInCurrentEra.find(c => c.id === selectedCropToPlant)}
                  >
                    <PlusCircle className="w-6 h-6 text-primary mb-1" />
                    <span className="text-xs text-center">Plant Selected</span>
                  </Button>
                </Card>
              );
            }
          })}
        </div>
        {state.plotSlots.filter(s => s && s.era === state.currentEra).length === GARDEN_PLOT_SIZE && (
             <Alert className="mt-4 bg-background/70">
                <Sprout className="h-4 w-4" />
                <AlertTitle>Plot Full for {state.currentEra} Era!</AlertTitle>
                <AlertDescription>
                    Your garden plot in this era is full. Harvest mature crops to make space.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}

    