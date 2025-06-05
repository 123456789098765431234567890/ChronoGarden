
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Gift, CheckSquare, XSquare, MessageCircle } from 'lucide-react';
import { NPC_VISITORS_CONFIG, NPC_QUESTS_CONFIG, ALL_CROPS_MAP, WEATHER_CONFIG } from '@/config/gameConfig';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";

export default function VisitorPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const currentVisitor = state.currentVisitorId ? NPC_VISITORS_CONFIG[state.currentVisitorId] : null;
  const activeQuestDetails = state.activeQuest ? NPC_QUESTS_CONFIG[state.activeQuest.questId] : null;

  const handleAcceptQuest = () => {
    if (currentVisitor && currentVisitor.quests.length > 0) {
        // For simplicity, assume visitor offers their first available (not completed) quest.
        const questToOffer = currentVisitor.quests.find(q => !state.completedQuests.includes(q.id));
        if (questToOffer) {
            dispatch({ type: 'USER_INTERACTION' });
            dispatch({ type: 'ACCEPT_QUEST', payload: { visitorId: currentVisitor.id, questId: questToOffer.id } });
            toast({ title: "Quest Accepted!", description: `You accepted "${questToOffer.title}" from ${currentVisitor.name}.` });
        } else {
             toast({ title: "No Quests", description: `${currentVisitor.name} has no more quests for you right now.` });
        }
    }
  };
  
  const handleDismissVisitor = () => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'DISMISS_VISITOR' });
    toast({ title: "Visitor Departed", description: `${currentVisitor?.name || 'The visitor'} has left your garden.` });
  };

  // This button is mostly for UI feedback; actual completion logic is in reducer via PROGRESS_QUEST
  const handleAttemptCompleteQuest = () => {
     dispatch({ type: 'USER_INTERACTION' });
     if (state.activeQuest && activeQuestDetails && state.activeQuest.progress >= (activeQuestDetails.targetAmount || 0)) {
        // Reducer will handle actual reward and marking quest complete
        // Toast for completion is handled in GameClientLayout based on state.activeQuest.status
     } else {
        toast({ title: "Quest Incomplete", description: "You haven't met the quest requirements yet.", variant: "default"});
     }
  };

  if (!currentVisitor) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Users className="w-6 h-6 mr-2 text-primary" />
            Garden Visitors
          </CardTitle>
          <CardDescription>No visitors in your {ERAS[state.currentEra].name} garden at the moment. Check back later!</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MessageCircle className="h-4 w-4" />
            <AlertTitle>All Quiet</AlertTitle>
            <AlertDescription>
              Sometimes visitors from other times (or your own!) might drop by with requests or stories. Keep an eye out!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const VisitorIcon = currentVisitor.icon;
  let questDialogue = currentVisitor.quests.length > 0 ? NPC_QUESTS_CONFIG[currentVisitor.quests[0].id]?.dialogue.greeting : "Just admiring your garden!";
  
  if (state.activeQuest && state.activeQuest.visitorId === currentVisitor.id) {
      const currentQuestConfig = NPC_QUESTS_CONFIG[state.activeQuest.questId];
      if (state.activeQuest.status === 'active') {
          questDialogue = currentQuestConfig?.dialogue.questInProgress || "Working on it?";
      } else if (state.activeQuest.status === 'completed') {
          questDialogue = currentQuestConfig?.dialogue.questCompleted || "Thanks for your help!";
      }
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <VisitorIcon className="w-7 h-7 mr-2 text-accent" />
          A Visitor Arrives: {currentVisitor.name}
        </CardTitle>
        <CardDescription>
          {currentVisitor.name} from the {currentVisitor.era} era is visiting your garden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-muted/30">
          <MessageCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">{currentVisitor.name} says:</AlertTitle>
          <AlertDescription className="italic">"{questDialogue}"</AlertDescription>
        </Alert>

        {!state.activeQuest && currentVisitor.quests.find(q => !state.completedQuests.includes(q.id)) && (
          <Button onClick={handleAcceptQuest} className="w-full sm:w-auto">
            <CheckSquare className="mr-2 h-4 w-4" /> Accept Quest: {NPC_QUESTS_CONFIG[currentVisitor.quests.find(q => !state.completedQuests.includes(q.id))!.id]?.title}
          </Button>
        )}

        {state.activeQuest && state.activeQuest.visitorId === currentVisitor.id && activeQuestDetails && (
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="font-semibold text-lg">Active Quest: {activeQuestDetails.title}</h4>
            <p className="text-sm text-muted-foreground">{activeQuestDetails.description}</p>
            
            {state.activeQuest.status === 'active' && (
                <>
                    <Progress value={activeQuestDetails.targetAmount ? (state.activeQuest.progress / activeQuestDetails.targetAmount) * 100 : 0} className="h-3" />
                    <p className="text-xs">Progress: {state.activeQuest.progress} / {activeQuestDetails.targetAmount || 'N/A'}</p>
                    {activeQuestDetails.type === 'growWhileWeather' && activeQuestDetails.requiredWeatherId && (
                        <p className="text-xs italic">Remember: Must be harvested during a <span className="font-semibold">{WEATHER_CONFIG[activeQuestDetails.requiredWeatherId]?.name}</span>!</p>
                    )}
                     {activeQuestDetails.durationMinutes && state.activeQuest.startTime && (
                        <p className="text-xs text-orange-500">
                            Time Remaining: {Math.max(0, Math.ceil(activeQuestDetails.durationMinutes - (Date.now() - state.activeQuest.startTime) / (1000 * 60)))} minutes
                        </p>
                    )}
                    <Button onClick={handleAttemptCompleteQuest} className="w-full sm:w-auto" disabled={state.activeQuest.progress < (activeQuestDetails.targetAmount || Infinity)}>
                        <Gift className="mr-2 h-4 w-4" /> Attempt to Complete Quest
                    </Button>
                </>
            )}

            {state.activeQuest.status === 'completed' && (
                 <Alert variant="default" className="bg-green-500/10">
                    <CheckSquare className="h-4 w-4 text-green-700" />
                    <AlertTitle className="text-green-700 font-semibold">Quest Completed!</AlertTitle>
                    <AlertDescription className="text-green-600">
                        You successfully completed "{activeQuestDetails.title}". Your reward has been granted.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
         {(state.activeQuest?.status === 'completed' || !currentVisitor.quests.find(q => !state.completedQuests.includes(q.id))) && (
            <Button onClick={handleDismissVisitor} variant="outline" className="w-full sm:w-auto">
                <XSquare className="mr-2 h-4 w-4" /> Say Goodbye to {currentVisitor.name}
            </Button>
        )}


      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Visitors may offer unique quests with valuable rewards. Check back often!
      </CardFooter>
    </Card>
  );
}
