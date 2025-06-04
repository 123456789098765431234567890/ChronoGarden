"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { ERAS, ALL_CROPS_MAP, Crop } from '@/config/gameConfig';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sprout, Clock, PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function GardenPlot() {
  const { state, dispatch } = useGame();
  const currentEraConfig = ERAS[state.currentEra];
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlantCrop = (cropId: string) => {
    // Basic check: Do we have seeds? (Conceptual, improve with actual seed resource)
    if (state.resources["Seeds"] > 0 || currentEraConfig.id === "Prehistoric" ) { // Prehistoric might not use 'Seeds'
      dispatch({ type: 'UPDATE_RESOURCE', payload: { resourceId: "Seeds", amount: -1 } });
      dispatch({ type: 'PLANT_CROP', payload: { cropId, era: state.currentEra } });
    } else {
      alert("Not enough seeds!"); // Replace with toast
    }
  };

  const handleHarvestCrop = (plantedCropId: string) => {
    dispatch({ type: 'HARVEST_CROP', payload: plantedCropId });
    dispatch({ type: 'ADD_CHRONO_ENERGY', payload: 5 }); // Gain some energy on harvest
  };

  const getGrowthProgress = (plantedAt: number, growthTime: number) => {
    const elapsedTime = (currentTime - plantedAt) / 1000; // in seconds
    return Math.min(100, (elapsedTime / growthTime) * 100);
  };

  const plantedCropsInCurrentEra = state.plantedCrops.filter(pc => pc.era === state.currentEra);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <currentEraConfig.icon className="w-6 h-6 mr-2 text-primary" />
          {currentEraConfig.name} Garden
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
          <h3 className="font-headline text-lg mb-2">Available to Plant:</h3>
          {currentEraConfig.availableCrops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentEraConfig.availableCrops.map((crop) => {
                const CropIcon = crop.icon;
                return (
                  <Card key={crop.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                       <div className="flex items-center">
                         <CropIcon className="w-5 h-5 mr-2 text-accent" />
                         <CardTitle className="font-headline text-md">{crop.name}</CardTitle>
                       </div>
                      <CardDescription className="text-xs h-10 overflow-y-auto">{crop.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs flex-grow">
                      <p><Clock className="w-3 h-3 inline mr-1" />Growth: {crop.growthTime}s</p>
                      <p>Yield: {Object.entries(crop.yield).map(([k,v]) => `${v} ${k}`).join(', ')}</p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" onClick={() => handlePlantCrop(crop.id)} className="w-full">
                        <PlusCircle className="w-4 h-4 mr-2" /> Plant
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No crops available in this era yet.</p>
          )}
        </div>

        <div>
          <h3 className="font-headline text-lg mb-2">Your Planted Crops:</h3>
          {plantedCropsInCurrentEra.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {plantedCropsInCurrentEra.map((plantedCrop) => {
                const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
                if (!cropConfig) return null;
                const CropIcon = cropConfig.icon;
                const growthProgress = getGrowthProgress(plantedCrop.plantedAt, cropConfig.growthTime);
                const isMature = growthProgress >= 100;

                return (
                  <Card key={plantedCrop.id} className="shadow-md relative overflow-hidden">
                    <Image src={`https://placehold.co/300x200.png?text=${cropConfig.name.replace(/\s/g, "+")}`} alt={cropConfig.name} width={300} height={200} className="w-full h-32 object-cover" data-ai-hint="garden plant" />
                    <CardHeader className="pt-2 pb-2">
                      <div className="flex items-center">
                        <CropIcon className="w-5 h-5 mr-2 text-accent" />
                        <CardTitle className="font-headline text-md">{cropConfig.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <Progress value={growthProgress} className="w-full h-2 mb-2" />
                      <p>{isMature ? "Ready to Harvest!" : `Growing: ${Math.floor(growthProgress)}%`}</p>
                    </CardContent>
                    <CardFooter>
                      {isMature ? (
                        <Button size="sm" onClick={() => handleHarvestCrop(plantedCrop.id)} className="w-full bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" /> Harvest
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="w-full">
                          <Clock className="w-4 h-4 mr-2" /> Growing...
                        </Button>
                      )}
                       <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7" onClick={() => dispatch({ type: 'HARVEST_CROP', payload: plantedCrop.id })}> {/* Simplified removal for now */}
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Alert>
              <Sprout className="h-4 w-4" />
              <AlertTitle>Empty Plot!</AlertTitle>
              <AlertDescription>
                Your garden in the {currentEraConfig.name} is empty. Try planting some available crops!
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
