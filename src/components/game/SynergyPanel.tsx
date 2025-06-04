
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { SYNERGY_CONFIG, SynergyConfig } from '@/config/gameConfig';
import { Zap, Link2, CheckCircle, TrendingUp } from 'lucide-react'; // Added Link2
import { Progress } from '@/components/ui/progress';

export default function SynergyPanel() {
  const { state } = useGame();

  const calculateSynergyEffect = (synergy: SynergyConfig): string | number => {
    const statValue = state.synergyStats[synergy.statToTrack] || 0;
    const levelsAchieved = Math.floor(statValue / synergy.threshold);
    const effectiveLevels = synergy.maxLevels ? Math.min(levelsAchieved, synergy.maxLevels) : levelsAchieved;
    const effectValue = effectiveLevels * synergy.effectPerLevel;
    
    if (synergy.valueSuffix === '%') {
        return (effectValue * 100).toFixed(1); // Display as percentage
    }
    return effectValue.toFixed(2);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Link2 className="w-6 h-6 mr-2 text-primary" />
          Cross-Era Synergies
        </CardTitle>
        <CardDescription>
          Unlock powerful bonuses by achieving milestones across different eras. Your efforts in one timeline can ripple through others!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(SYNERGY_CONFIG).map((synergy: SynergyConfig) => {
          const currentEffectDisplay = calculateSynergyEffect(synergy);
          const statValue = state.synergyStats[synergy.statToTrack] || 0;
          const levelsAchieved = Math.floor(statValue / synergy.threshold);
          const progressToNextLevel = synergy.maxLevels && levelsAchieved >= synergy.maxLevels 
            ? 100 
            : (statValue % synergy.threshold) / synergy.threshold * 100;
          const isMaxed = synergy.maxLevels && levelsAchieved >= synergy.maxLevels;

          return (
            <Card key={synergy.id} className="p-4 border bg-muted/20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div>
                  <h3 className="font-headline text-lg">{synergy.name}</h3>
                  <p className="text-xs text-muted-foreground">{synergy.description(currentEffectDisplay + (synergy.valueSuffix || ""))}</p>
                </div>
                <div className="text-sm mt-2 sm:mt-0">
                  {isMaxed ? (
                    <span className="font-bold text-green-500 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Maxed!</span>
                  ) : (
                    <span className="font-bold">Level {levelsAchieved}</span>
                  )}
                </div>
              </div>
              {!isMaxed && (
                <>
                    <Progress value={progressToNextLevel} className="h-2 mb-1" />
                    <p className="text-xs text-muted-foreground text-right">
                        {statValue % synergy.threshold} / {synergy.threshold} {synergy.statToTrack.replace('cropsHarvested', ' ')} crops to next level
                    </p>
                </>
              )}
               <p className="text-xs text-primary mt-1">Current Bonus: {currentEffectDisplay}{synergy.valueSuffix || ""}</p>
            </Card>
          );
        })}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Synergies are unlocked passively as you play. Their effects are always active once criteria are met.
      </CardFooter>
    </Card>
  );
}
