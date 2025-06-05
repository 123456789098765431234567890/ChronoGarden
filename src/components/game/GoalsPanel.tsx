
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GOALS_CONFIG, GoalConfigItem, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig';
import { Target, CheckCircle, Trophy, Zap, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";

export default function GoalsPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const handleClaimReward = (goalId: keyof typeof GOALS_CONFIG) => {
    // Rewards are auto-claimed by the reducer, this button could be for UI feedback or future manual claims
    const goal = GOALS_CONFIG[goalId];
    toast({
      title: "Reward Claimed!",
      description: `You earned the reward for completing: ${goal.name}`,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-primary" />
          Temporal Objectives
        </CardTitle>
        <CardDescription>
          Complete these goals to earn rewards and advance your mastery over time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(GOALS_CONFIG).map((goal: GoalConfigItem) => {
          const goalStatus = state.goalStatus[goal.id];
          const progress = goalStatus?.progress || 0;
          const isCompleted = goalStatus?.completed || false;
          
          let currentProgressDisplay = progress;
          // For prestige count, directly use state.prestigeCount for display if it's the tracker
          if (goal.statToTrack === 'prestigeCount') {
            currentProgressDisplay = state.prestigeCount;
          }
           // For rare seeds found, use the length of the rareSeeds array
          if (goal.statToTrack === 'rareSeedsFoundCount') {
            currentProgressDisplay = state.rareSeeds.length;
          }


          const progressPercent = Math.min(100, (currentProgressDisplay / goal.target) * 100);
          const RewardIcon = goal.reward.type === 'chronoEnergy' ? Zap : goal.reward.type === 'rareSeed' ? Sparkles : Package;


          return (
            <Card key={goal.id} className={`p-4 border ${isCompleted ? 'bg-green-500/10 border-green-500' : 'bg-muted/20'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <div className="flex items-center">
                   <goal.icon className={`w-5 h-5 mr-3 ${isCompleted ? 'text-green-500' : 'text-primary'}`} />
                  <div>
                    <h3 className={`font-headline text-lg ${isCompleted ? 'line-through' : ''}`}>{goal.name}</h3>
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
                {isCompleted && (
                   <div className="text-sm mt-2 sm:mt-0 text-green-600 font-semibold flex items-center">
                     <CheckCircle className="w-5 h-5 mr-1" /> Completed
                   </div>
                )}
              </div>
              {!isCompleted && (
                <>
                  <Progress value={progressPercent} className="h-2 mb-1 mt-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {currentProgressDisplay} / {goal.target}
                  </p>
                </>
              )}
               <div className="text-xs text-primary mt-2 flex items-center">
                <RewardIcon className="w-4 h-4 mr-1 text-accent" />
                Reward: {goal.reward.amount} {goal.reward.type === 'chronoEnergy' ? 'Chrono-Energy' : goal.reward.type === 'rareSeed' ? 'Rare Seed (Random)' : ALL_GAME_RESOURCES_MAP[goal.reward.resourceId || '']?.name || 'Item'}
              </div>
            </Card>
          );
        })}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        New goals may unlock as you progress. Rewards are automatically granted upon completion.
      </CardFooter>
    </Card>
  );
}

