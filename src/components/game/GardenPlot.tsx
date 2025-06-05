
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { ERAS, ALL_CROPS_MAP, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP, Crop, GARDEN_PLOT_SIZE, EraID, PERMANENT_UPGRADES_CONFIG, SYNERGY_CONFIG, WEATHER_CONFIG, IDLE_THRESHOLD_SECONDS, calculateEffectiveGrowthTime, NANO_VINE_DECAY_WINDOW_SECONDS } from '@/config/gameConfig';
import type { PlantedCrop } from '@/contexts/GameContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sprout, Clock, PlusCircle, Trash2, CheckCircle, Ban } from 'lucide-react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function GardenPlot() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const currentEraConfig = ERAS[state.currentEra];
  const [clientCurrentTime, setClientCurrentTime] = useState<number | null>(null);
  
  const availableCropsInCurrentEra = Object.values(ALL_CROPS_MAP).filter(crop => crop.era === state.currentEra);
  const [selectedCropToPlant, setSelectedCropToPlant] = useState<string>(availableCropsInCurrentEra[0]?.id || "");

  useEffect(() => {
    setClientCurrentTime(Date.now()); 
    const timer = setInterval(() => setClientCurrentTime(Date.now()), 1000);
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
      const cropToPlant = ALL_CROPS_MAP[selectedCropToPlant];
      if (cropToPlant.specialGrowthCondition && !cropToPlant.specialGrowthCondition(state)) {
        toast({ title: "Cannot Plant", description: `${cropToPlant.name} has special growth conditions that are not met. Check Synergies or info.`, variant: "destructive" });
        return;
      }
       if (cropToPlant.isIdleDependent && clientCurrentTime && (clientCurrentTime - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
        toast({ title: "Cannot Plant", description: `${cropToPlant.name} prefers quiet. Try planting when you've been idle for a bit.`, variant: "default" });
        return;
      }
      dispatch({ type: 'USER_INTERACTION' });
      dispatch({ type: 'PLANT_CROP', payload: { cropId: selectedCropToPlant, era: state.currentEra, slotIndex } });
    }
  };

  const handleHarvestCrop = (slotIndex: number) => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } });
  };
  
  useEffect(() => {
    const lastRareSeed = state.rareSeeds.length > 0 ? state.rareSeeds[state.rareSeeds.length - 1] : null;
    if (lastRareSeed && (typeof window !== 'undefined' && !sessionStorage.getItem(`toast_rare_seed_${lastRareSeed}`))) {
        const crop = ALL_CROPS_MAP[lastRareSeed];
        if (crop) {
            toast({
                title: "🌟 Rare Seed Found! 🌟",
                description: `You found a rare ${crop.name} seed! It now has special properties.`,
            });
            if (typeof window !== 'undefined') sessionStorage.setItem(`toast_rare_seed_${lastRareSeed}`, 'true');
        }
    }
  }, [state.rareSeeds, toast]);


  const handleClearSlot = (slotIndex: number) => {
    if (clientCurrentTime === null) return; 
    dispatch({ type: 'USER_INTERACTION' });
    const plantedCrop = state.plotSlots[slotIndex] as PlantedCrop | null;
    if (plantedCrop) {
        const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
        const effectiveGrowthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, plantedCrop.cropId, plantedCrop.era, state);
        const isMature = (clientCurrentTime - plantedCrop.plantedAt) / 1000 >= effectiveGrowthTime;
        if (!isMature) {
            // Clearing a non-mature plant might still trigger HARVEST_CROP to ensure any logic (like penalties) is handled.
            // Or, you could add a specific 'CLEAR_SLOT' action if penalties are desired.
             dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } }); 
        } else if (cropConfig.id === 'nanovine') {
            // NanoVine doesn't get "uprooted" if mature, it gets harvested or decays.
            // If it's mature and being cleared, it means harvest.
            dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } });
        }
    }
    // If slot is empty or becomes empty after harvest logic, this ensures it's clear.
    // This path is less likely if HARVEST_CROP correctly nulls the slot.
    if (!state.plotSlots[slotIndex]) {
        const newPlotSlots = [...state.plotSlots];
        newPlotSlots[slotIndex] = null;
        // dispatch({ type: 'UPDATE_PLOT_SLOTS', payload: newPlotSlots }); // Example if you had direct plot update
    }
  };
  
  const getGrowthProgress = (plantedCrop: PlantedCrop, effectiveCurrentTime: number | null): number => {
    if (effectiveCurrentTime === null || !plantedCrop) return 0;

    const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
    if (!cropConfig) return 0;
    
    if (cropConfig.specialGrowthCondition && !cropConfig.specialGrowthCondition(state)) {
      return 0; 
    }
    if (cropConfig.isIdleDependent && (effectiveCurrentTime - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
      return Math.min(100, ((effectiveCurrentTime - plantedCrop.plantedAt) / 1000 / calculateEffectiveGrowthTime(cropConfig.growthTime, plantedCrop.cropId, plantedCrop.era, state)) * 100 * 0.1); // Grow very slowly if active
    }

    const growthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, plantedCrop.cropId, plantedCrop.era, state);
    const elapsedTime = (effectiveCurrentTime - plantedCrop.plantedAt) / 1000;
    return Math.min(100, (elapsedTime / growthTime) * 100);
  };

  const getRemainingGrowthTime = (plantedCrop: PlantedCrop, effectiveCurrentTime: number | null): string => {
    if (effectiveCurrentTime === null || !plantedCrop) return "Calculating...";

    const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
    if (!cropConfig) return "Error";

    if (cropConfig.specialGrowthCondition && !cropConfig.specialGrowthCondition(state)) {
        return "Stalled (Condition)";
    }
    if (cropConfig.isIdleDependent && (effectiveCurrentTime - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
      return "Stalled (Active)";
    }

    const growthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, plantedCrop.cropId, plantedCrop.era, state);
    const elapsedTime = (effectiveCurrentTime - plantedCrop.plantedAt) / 1000;
    const remaining = Math.max(0, growthTime - elapsedTime);
    
    if (remaining === 0) return "Ready!";
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };
  
  const getModifiedCropCost = (crop: Crop) => {
    let costMultiplier = 1;
    let waterCostMultiplier = 1;

    if (state.currentWeatherId && WEATHER_CONFIG[state.currentWeatherId]) {
        waterCostMultiplier *= WEATHER_CONFIG[state.currentWeatherId].effects.waterCostFactor ?? 1;
    }

    const cheaperCropsUpgradeId = `cheaperCrops_${crop.era}`;
    const cheaperCropsLevel = state.upgradeLevels[cheaperCropsUpgradeId] || 0;
    if (UPGRADES_CONFIG[cheaperCropsUpgradeId] && cheaperCropsLevel > 0) {
      costMultiplier = UPGRADES_CONFIG[cheaperCropsUpgradeId].effect(cheaperCropsLevel);
    }

    const waterCostUpgradeId = `waterCost_${crop.era}`;
     if (UPGRADES_CONFIG[waterCostUpgradeId] && state.upgradeLevels[waterCostUpgradeId] > 0){
          waterCostMultiplier *= UPGRADES_CONFIG[waterCostUpgradeId].effect(state.upgradeLevels[waterCostUpgradeId]);
      }
    
    if (crop.era === "Present" && SYNERGY_CONFIG.primordialEchoes) {
      const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPrehistoric / SYNERGY_CONFIG.primordialEchoes.threshold);
      const maxSynergyLevel = SYNERGY_CONFIG.primordialEchoes.maxLevels || Infinity;
      const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
      waterCostMultiplier *= (1 - (effectiveSynergyLevel * SYNERGY_CONFIG.primordialEchoes.effectPerLevel));
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

  const gardenPlotBgStyles = {
    "Present": "bg-green-800/10",
    "Prehistoric": "bg-yellow-900/20", // Darker for prehistoric
    "Medieval": "bg-gray-700/20",
    "Modern": "bg-blue-800/10",
    "Future": "bg-indigo-900/30", // Metallic/glowy feel for future
  }
  const gardenPlotBg = gardenPlotBgStyles[state.currentEra] || "bg-muted/20";


  return (
    <TooltipProvider>
    <Card className={`shadow-lg ${gardenPlotBg}`}>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <currentEraConfig.icon className="w-6 h-6 mr-2 text-primary" />
          {currentEraConfig.name} Garden Plot ({GARDEN_PLOT_SIZE === 9 ? "3x3" : `${Math.sqrt(GARDEN_PLOT_SIZE)}x${Math.sqrt(GARDEN_PLOT_SIZE)}`})
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
                let plantDisabled = false;
                let plantTooltip = "";
                if (crop.specialGrowthCondition && !crop.specialGrowthCondition(state)) {
                    plantDisabled = true;
                    plantTooltip = `${crop.name} has unmet growth conditions. Check Synergies.`;
                }
                 if (crop.isIdleDependent && clientCurrentTime && (clientCurrentTime - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
                    plantDisabled = true;
                    plantTooltip = `${crop.name} needs quiet to plant. Try being idle for ${IDLE_THRESHOLD_SECONDS}s.`;
                }

                return (
                  <SelectItem key={crop.id} value={crop.id} disabled={plantDisabled} title={plantTooltip || `${crop.name} (Cost: ${costString})`}>
                    <div className="flex items-center">
                      <CropIcon className="w-4 h-4 mr-2" />
                      {crop.name} (Cost: {costString}) {plantDisabled ? " (Blocked)" : ""}
                    </div>
                  </SelectItem>
                );
              }) : <SelectItem value="none" disabled>No crops available in this era.</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {state.plotSlots.map((slotData, index) => {
            const slot = slotData as PlantedCrop | null; // Type assertion
            if (slot && slot.era === state.currentEra) { 
              const cropConfig = ALL_CROPS_MAP[slot.cropId];
              if (!cropConfig) return ( 
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted">
                    Error
                </Card>
              );

              const CropIcon = cropConfig.icon;
              const growthProgress = getGrowthProgress(slot, clientCurrentTime);
              const isMature = growthProgress >= 100;
              const remainingTime = getRemainingGrowthTime(slot, clientCurrentTime);
              const isStalled = remainingTime.startsWith("Stalled");

              let nanoVineDecayTimeLeft = "";
              if (cropConfig.id === 'nanovine' && isMature && clientCurrentTime) {
                const effectiveGrowthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, slot.cropId, slot.era, state);
                const maturityTime = slot.plantedAt + effectiveGrowthTime * 1000;
                const decayEndTime = maturityTime + NANO_VINE_DECAY_WINDOW_SECONDS * 1000;
                const decayRemaining = Math.max(0, (decayEndTime - clientCurrentTime) / 1000);
                if (decayRemaining === 0 && clientCurrentTime > decayEndTime) {
                    nanoVineDecayTimeLeft = "Decayed!";
                } else if (decayRemaining > 0) {
                    nanoVineDecayTimeLeft = `Decays in ${Math.floor(decayRemaining)}s`;
                }
              }


              return (
                <Card key={slot.id || index} className="shadow-md relative overflow-hidden flex flex-col justify-between aspect-square bg-card">
                   <Image 
                    src={`https://placehold.co/150x100.png?text=${cropConfig.name.replace(/\s/g,"+")}`} 
                    alt={cropConfig.name} 
                    width={150} 
                    height={100} 
                    className="w-full h-1/2 object-cover" 
                    data-ai-hint={`${cropConfig.name} ${cropConfig.era} plant`}
                  />
                  <CardHeader className="pt-1 pb-1 px-2 flex-grow">
                     <div className="flex items-center">
                        <CropIcon className="w-4 h-4 mr-1 text-accent shrink-0" />
                        <CardTitle className="font-headline text-sm truncate" title={cropConfig.name}>{cropConfig.name}</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="text-xs px-2 pb-1 flex-grow">
                    <Progress value={growthProgress} className="w-full h-2 mb-1" />
                    <p className={`text-center text-muted-foreground ${isStalled ? 'text-orange-500' : ''} ${nanoVineDecayTimeLeft === "Decayed!" ? 'text-red-500 font-bold' : ''}`}>
                        {clientCurrentTime === null ? "Loading..." : nanoVineDecayTimeLeft || remainingTime}
                    </p>
                  </CardContent>
                  <CardFooter className="p-1 sm:p-2">
                    {isMature && nanoVineDecayTimeLeft !== "Decayed!" ? (
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" onClick={() => handleHarvestCrop(index)} className="w-full text-xs h-8" disabled={clientCurrentTime === null}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Harvest
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Harvest {cropConfig.name}</p></TooltipContent>
                       </Tooltip>
                    ) : nanoVineDecayTimeLeft === "Decayed!" ? (
                        <Button size="sm" variant="destructive" disabled className="w-full text-xs h-8">
                            <Ban className="w-3 h-3 mr-1" /> Decayed
                        </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button size="sm" variant="outline" disabled className="w-full text-xs h-8">
                            <Clock className="w-3 h-3 mr-1" /> Grow
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{cropConfig.name} is growing. {isStalled ? "Growth is stalled." : `Ready in ${remainingTime}.`}</p></TooltipContent>
                       </Tooltip>
                    )}
                  </CardFooter>
                  {(!isMature || cropConfig.id === 'nanovine') && nanoVineDecayTimeLeft !== "Decayed!" && ( // Allow uprooting NanoVine even if mature but not decayed
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="absolute top-0 right-0 h-6 w-6" 
                                onClick={() => handleClearSlot(index)}
                                disabled={clientCurrentTime === null}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Uproot {cropConfig.name}</p></TooltipContent>
                    </Tooltip>
                  )}
                </Card>
              );
            } else {
                 const selectedCropConfig = ALL_CROPS_MAP[selectedCropToPlant];
                 let plantDisabled = !selectedCropToPlant || availableCropsInCurrentEra.length === 0 || !availableCropsInCurrentEra.find(c => c.id === selectedCropToPlant);
                 let plantTooltipMessage = "";
                 if (selectedCropConfig && selectedCropConfig.specialGrowthCondition && !selectedCropConfig.specialGrowthCondition(state)) {
                     plantDisabled = true;
                     plantTooltipMessage = `${selectedCropConfig.name} has unmet growth conditions.`;
                 }
                 if (selectedCropConfig && selectedCropConfig.isIdleDependent && clientCurrentTime && (clientCurrentTime - state.lastUserInteractionTime)/1000 < IDLE_THRESHOLD_SECONDS) {
                    plantDisabled = true;
                    plantTooltipMessage = `${selectedCropConfig.name} needs quiet. Try being idle.`;
                 }

                 if (clientCurrentTime === null) plantDisabled = true;


              return (
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors border-dashed">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full h-full flex flex-col items-center justify-center"
                        onClick={() => handlePlantCrop(index)}
                        disabled={plantDisabled}
                      >
                        <PlusCircle className="w-6 h-6 text-primary mb-1" />
                        <span className="text-xs text-center">Plant Selected</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{plantDisabled ? plantTooltipMessage : (clientCurrentTime === null ? "Loading time..." : `Plant ${selectedCropConfig?.name || 'selected crop'}`)}</p></TooltipContent>
                  </Tooltip>
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
    </TooltipProvider>
  );
}

