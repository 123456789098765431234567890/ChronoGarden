
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UPGRADES_CONFIG, UpgradeConfig, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig';
import { TrendingUp, Zap, Coins as CoinsIcon, Power, CheckCircle } from 'lucide-react'; // Added CoinsIcon
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function UpgradesPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const handlePurchaseUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES_CONFIG[upgradeId];
    const currentLevel = state.upgradeLevels[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) {
        toast({ title: "Max Level", description: `${upgrade.name} is already at max level.`, variant: "default" });
        return;
    }

    const cost = upgrade.cost(currentLevel);
    let canAfford = true;
    Object.entries(cost).forEach(([resId, amount]) => {
      if ((state.resources[resId] || 0) < amount) {
        canAfford = false;
      }
    });

    if (canAfford) {
      dispatch({ type: 'PURCHASE_UPGRADE', payload: upgradeId });
      toast({ title: "Upgrade Purchased!", description: `${upgrade.name} is now level ${currentLevel + 1}.` });
    } else {
      toast({ title: "Cannot Afford Upgrade", description: `Not enough resources for ${upgrade.name}.`, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-primary" />
          Garden Upgrades
        </CardTitle>
        <CardDescription>
          Invest your resources to improve your garden's efficiency and output.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(UPGRADES_CONFIG).map((upgrade: UpgradeConfig) => {
          const currentLevel = state.upgradeLevels[upgrade.id] || 0;
          const isMaxLevel = currentLevel >= upgrade.maxLevel;
          const costForNextLevel = isMaxLevel ? {} : upgrade.cost(currentLevel);
          
          let canAffordNextLevel = true;
          if (!isMaxLevel) {
            Object.entries(costForNextLevel).forEach(([resId, amount]) => {
              if ((state.resources[resId] || 0) < amount) {
                canAffordNextLevel = false;
              }
            });
          }

          return (
            <Card key={upgrade.id} className="p-4 border bg-muted/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div>
                    <h3 className="font-headline text-lg">{upgrade.name}</h3>
                    <p className="text-xs text-muted-foreground">{upgrade.description}</p>
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
                    {Object.entries(costForNextLevel).map(([resourceId, amount]) => {
                      const ResIcon = ALL_GAME_RESOURCES_MAP[resourceId]?.icon || Power;
                      return (
                        <span key={resourceId} className="flex items-center">
                          <ResIcon className="w-3 h-3 mr-1" /> {Math.ceil(amount)} {ALL_GAME_RESOURCES_MAP[resourceId]?.name || resourceId}
                        </span>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => handlePurchaseUpgrade(upgrade.id)}
                    disabled={isMaxLevel || !canAffordNextLevel}
                    className="w-full sm:w-auto"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" /> Upgrade to Level {currentLevel + 1}
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
        Upgrades are permanent and will help you progress faster through the eras.
      </CardFooter>
    </Card>
  );
}

    