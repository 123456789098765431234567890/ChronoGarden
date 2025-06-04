
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PERMANENT_UPGRADES_CONFIG, PermanentUpgradeConfig } from '@/config/gameConfig';
import { Zap, Sparkles, Award, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ChronoNexusPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  if (state.prestigeCount < 1) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Award className="w-6 h-6 mr-2 text-primary" />
            Chrono Nexus
          </CardTitle>
          <CardDescription>
            The Chrono Nexus allows for powerful, permanent upgrades that persist across Prestiges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Award className="h-4 w-4" />
            <AlertTitle>Nexus Locked</AlertTitle>
            <AlertDescription>
              You must Prestige at least once to unlock the Chrono Nexus and its permanent upgrades.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handlePurchasePermanentUpgrade = (upgradeId: string) => {
    dispatch({ type: 'USER_INTERACTION' });
    const upgrade = PERMANENT_UPGRADES_CONFIG[upgradeId];
    const currentLevel = state.permanentUpgradeLevels[upgradeId] || 0;

    if (currentLevel >= upgrade.maxLevel) {
      toast({ title: "Max Level", description: `${upgrade.name} is already at max level.`, variant: "default" });
      return;
    }

    const cost = upgrade.cost(currentLevel);
    if (state.rareSeeds.length >= cost.rareSeeds && state.chronoEnergy >= cost.chronoEnergy) {
      dispatch({ type: 'PURCHASE_PERMANENT_UPGRADE', payload: upgradeId });
      toast({ title: "Permanent Upgrade Acquired!", description: `${upgrade.name} is now level ${currentLevel + 1}.` });
    } else {
      let missing = [];
      if (state.rareSeeds.length < cost.rareSeeds) missing.push(`${cost.rareSeeds - state.rareSeeds.length} Rare Seeds`);
      if (state.chronoEnergy < cost.chronoEnergy) missing.push(`${cost.chronoEnergy - state.chronoEnergy} Chrono-Energy`);
      toast({ title: "Cannot Afford Upgrade", description: `You need: ${missing.join(' and ')}.`, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Award className="w-6 h-6 mr-2 text-primary" />
          Chrono Nexus - Permanent Upgrades
        </CardTitle>
        <CardDescription>
          Spend Rare Seeds and Chrono-Energy for powerful upgrades that persist across all Prestiges. You have {state.rareSeeds.length} Rare Seeds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(PERMANENT_UPGRADES_CONFIG).map((upgrade: PermanentUpgradeConfig) => {
          const currentLevel = state.permanentUpgradeLevels[upgrade.id] || 0;
          const isMaxLevel = currentLevel >= upgrade.maxLevel;
          const costForNextLevel = isMaxLevel ? { rareSeeds: 0, chronoEnergy: 0 } : upgrade.cost(currentLevel);
          
          let canAffordNextLevel = !isMaxLevel && state.rareSeeds.length >= costForNextLevel.rareSeeds && state.chronoEnergy >= costForNextLevel.chronoEnergy;

          return (
            <Card key={upgrade.id} className="p-4 border bg-muted/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div>
                  <h3 className="font-headline text-lg">{upgrade.name}</h3>
                  <p className="text-xs text-muted-foreground">{upgrade.description}</p>
                  <p className="text-xs text-primary mt-1">Current Effect: {upgrade.effectDescription(currentLevel)}</p>
                </div>
                <div className="text-sm mt-2 sm:mt-0">
                  Level: <span className="font-bold">{currentLevel}</span> / {upgrade.maxLevel}
                </div>
              </div>
              <Progress value={(currentLevel / upgrade.maxLevel) * 100} className="h-2 mb-3" />

              {!isMaxLevel ? (
                <>
                  <p className="text-xs mb-1">Cost for Level {currentLevel + 1}:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-3">
                    <span className="flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-accent" /> {costForNextLevel.rareSeeds} Rare Seeds
                    </span>
                    <span className="flex items-center">
                      <Zap className="w-3 h-3 mr-1 text-yellow-500" /> {costForNextLevel.chronoEnergy} Chrono-Energy
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchasePermanentUpgrade(upgrade.id)}
                    disabled={isMaxLevel || !canAffordNextLevel}
                    className="w-full sm:w-auto"
                  >
                    <Award className="w-4 h-4 mr-2" /> Upgrade to Level {currentLevel + 1}
                  </Button>
                </>
              ) : (
                <div className="flex items-center text-green-600 font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" /> Max Level Reached
                </div>
              )}
            </Card>
          );
        })}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        These upgrades are permanent and will significantly aid your progress through multiple timelines.
      </CardFooter>
    </Card>
  );
}
