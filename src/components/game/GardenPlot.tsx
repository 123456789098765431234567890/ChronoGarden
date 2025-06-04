
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { ERAS, ALL_CROPS_MAP, Crop, GARDEN_PLOT_SIZE, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sprout, Clock, PlusCircle, Trash2, CheckCircle, MinusCircle } from 'lucide-react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function GardenPlot() {
  const { state, dispatch } = useGame();
  const currentEraConfig = ERAS[state.currentEra];
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedCropToPlant, setSelectedCropToPlant] = useState<string>(currentEraConfig.availableCrops[0]?.id || "");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Update selected crop if era changes and current selection is not available
    if (!currentEraConfig.availableCrops.find(c => c.id === selectedCropToPlant)) {
      setSelectedCropToPlant(currentEraConfig.availableCrops[0]?.id || "");
    }
  }, [state.currentEra, currentEraConfig.availableCrops, selectedCropToPlant]);


  const handlePlantCrop = (slotIndex: number) => {
    if (selectedCropToPlant) {
      dispatch({ type: 'PLANT_CROP', payload: { cropId: selectedCropToPlant, era: state.currentEra, slotIndex } });
    }
  };

  const handleHarvestCrop = (slotIndex: number) => {
    dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } });
  };

  const handleClearSlot = (slotIndex: number) => {
    // A more graceful clear, maybe with confirmation or cost in future
    // For now, just directly modifying plotSlots if it's empty or we want to "uproot"
    // This action doesn't exist yet, needs careful consideration if plants have value before maturity
    // For Phase 1, let's make the Trash2 icon on growing plants do this.
    const plantedCrop = state.plotSlots[slotIndex];
    if (plantedCrop) {
        const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
        let growthTime = cropConfig.growthTime;
        const fasterGrowthLevel = state.upgradeLevels['fasterGrowth'] || 0;
        if (fasterGrowthLevel > 0) {
            growthTime *= UPGRADES_CONFIG['fasterGrowth'].effect(fasterGrowthLevel);
        }
        const isMature = (currentTime - plantedCrop.plantedAt) / 1000 >= growthTime;
        if (!isMature) {
            // Add an UPROOT_CROP action in context if specific non-yield removal is needed
            // For now, just clear it visually and in state by dispatching harvest (which will yield 0 if not programmed for partial)
             dispatch({ type: 'HARVEST_CROP', payload: { slotIndex } }); // This will clear the slot.
        }
    }
  };


  const getGrowthProgress = (plantedAt: number, baseGrowthTime: number) => {
    let growthTime = baseGrowthTime;
    const fasterGrowthLevel = state.upgradeLevels['fasterGrowth'] || 0;
    if (fasterGrowthLevel > 0) {
      growthTime *= UPGRADES_CONFIG['fasterGrowth'].effect(fasterGrowthLevel);
    }
    const elapsedTime = (currentTime - plantedAt) / 1000; // in seconds
    return Math.min(100, (elapsedTime / growthTime) * 100);
  };
  
  const getModifiedCropCost = (crop: Crop) => {
    let costMultiplier = 1;
    const cheaperCropsLevel = state.upgradeLevels['cheaperCrops'] || 0;
    if (cheaperCropsLevel > 0) {
      costMultiplier = UPGRADES_CONFIG['cheaperCrops'].effect(cheaperCropsLevel);
    }
    const modifiedCosts: Record<string, number> = {};
    Object.entries(crop.cost).forEach(([resId, amount]) => {
      modifiedCosts[resId] = Math.max(0, Math.round(amount * costMultiplier));
    });
    return modifiedCosts;
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <currentEraConfig.icon className="w-6 h-6 mr-2 text-primary" />
          {currentEraConfig.name} Garden Plot (3x3)
        </CardTitle>
        <CardDescription>{currentEraConfig.description}</CardDescription>
        {currentEraConfig.specialMechanic && (
           <Alert variant="default" className="mt-2">
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
            <SelectTrigger id="crop-select" className="w-full md:w-1/2 mt-1 mb-3">
              <SelectValue placeholder="Select a crop" />
            </SelectTrigger>
            <SelectContent>
              {currentEraConfig.availableCrops.map((crop) => {
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
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {state.plotSlots.map((slot, index) => {
            if (slot) {
              const cropConfig = ALL_CROPS_MAP[slot.cropId];
              if (!cropConfig) return ( // Should not happen
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted">
                    Error
                </Card>
              );

              const CropIcon = cropConfig.icon;
              const growthProgress = getGrowthProgress(slot.plantedAt, cropConfig.growthTime);
              const isMature = growthProgress >= 100;

              return (
                <Card key={slot.id || index} className="shadow-md relative overflow-hidden flex flex-col justify-between aspect-square">
                   <Image 
                    src={`https://placehold.co/150x100.png?text=${cropConfig.name.replace(/\s/g,"+")}`} 
                    alt={cropConfig.name} 
                    width={150} 
                    height={100} 
                    className="w-full h-1/2 object-cover" 
                    data-ai-hint={`${cropConfig.name} plant`}
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
              // Empty slot
              return (
                <Card key={index} className="aspect-square flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors">
                  <Button 
                    variant="ghost" 
                    className="w-full h-full flex flex-col items-center justify-center"
                    onClick={() => handlePlantCrop(index)}
                    disabled={!selectedCropToPlant || !currentEraConfig.availableCrops.find(c => c.id === selectedCropToPlant)}
                  >
                    <PlusCircle className="w-6 h-6 text-primary mb-1" />
                    <span className="text-xs text-center">Plant Selected</span>
                  </Button>
                </Card>
              );
            }
          })}
        </div>
        {state.plotSlots.every(slot => slot !== null) && (
             <Alert className="mt-4">
                <Sprout className="h-4 w-4" />
                <AlertTitle>Plot Full!</AlertTitle>
                <AlertDescription>
                    Your garden plot is full. Harvest mature crops to make space.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}

    