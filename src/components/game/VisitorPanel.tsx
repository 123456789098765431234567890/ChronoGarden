
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Gift, CheckSquare, XSquare, MessageCircle, Clock } from 'lucide-react';
import { NPC_VISITORS_CONFIG, NPC_QUESTS_CONFIG, ALL_CROPS_MAP, WEATHER_CONFIG, ERAS, VISITOR_SPAWN_CHECK_INTERVAL_SECONDS } from '@/config/gameConfig';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function VisitorPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentVisitor = state.currentVisitorId ? NPC_VISITORS_CONFIG[state.currentVisitorId] : null;
  const activeQuestDetails = state.activeQuest ? NPC_QUESTS_CONFIG[state.activeQuest.questId] : null;

  const handleAcceptQuest = () => {
    if (currentVisitor && currentVisitor.quests.length > 0) {
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

  const handleAttemptCompleteQuest = () => {
     dispatch({ type: 'USER_INTERACTION' });
     if (state.activeQuest && activeQuestDetails && state.activeQuest.status === 'active' && state.activeQuest.progress >= (activeQuestDetails.targetAmount || 0)) {
        // Reducer handles completion now
     } else {
        toast({ title: "Quest Incomplete", description: "You haven't met the quest requirements yet.", variant: "default"});
     }
  };

  if (!currentVisitor) {
    return (
      <TooltipProvider>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center">
              <Users className="w-6 h-6 mr-2 text-primary" />
              Garden Visitors
            </CardTitle>
            <CardDescription>No visitors in your {ERAS[state.currentEra].name} garden at the moment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertTitle>All Quiet</AlertTitle>
              <AlertDescription>
                Keep an eye out! Visitors might drop by with requests.
              </AlertDescription>
            </Alert>
          </CardContent>
           <CardFooter className="text-sm text-muted-foreground">
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted">Visitors may appear roughly every {VISITOR_SPAWN_CHECK_INTERVAL_SECONDS / 60} minute(s) if conditions are met.</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>A check for new visitors happens periodically. Actual appearance depends on chance and era.</p>
                </TooltipContent>
            </Tooltip>
          </CardFooter>
        </Card>
      </TooltipProvider>
    );
  }

  const VisitorIcon = currentVisitor.icon;
  let questDialogue = "";
  if (state.activeQuest && state.activeQuest.visitorId === currentVisitor.id && activeQuestDetails) {
      if (state.activeQuest.status === 'active') {
          questDialogue = activeQuestDetails.dialogue.questInProgress || "Working on it?";
      } else if (state.activeQuest.status === 'completed') {
          questDialogue = activeQuestDetails.dialogue.questCompleted || "Thanks for your help!";
      } else if (state.activeQuest.status === 'failed') {
          questDialogue = activeQuestDetails.dialogue.questFailed || "Oh well, maybe next time.";
      }
  } else if (currentVisitor.quests.find(q => !state.completedQuests.includes(q.id) && NPC_QUESTS_CONFIG[q.id])) {
      questDialogue = NPC_QUESTS_CONFIG[currentVisitor.quests.find(q => !state.completedQuests.includes(q.id))!.id]?.dialogue.greeting || "Greetings!";
  } else {
      questDialogue = "Just admiring your splendid garden! No tasks for you at the moment.";
  }


  let timeRemainingText = "";
  if (state.activeQuest && state.activeQuest.status === 'active' && activeQuestDetails && activeQuestDetails.durationMinutes && state.activeQuest.startTime) {
    const elapsedSeconds = (currentTime - state.activeQuest.startTime) / 1000;
    const totalSeconds = activeQuestDetails.durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    if (remainingSeconds === 0) {
        timeRemainingText = "Time's up!";
    } else {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = Math.floor(remainingSeconds % 60);
        timeRemainingText = `Time: ${minutes}m ${seconds}s`;
    }
  }

  return (
    <TooltipProvider>
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <VisitorIcon className="w-7 h-7 mr-2 text-accent" />
          A Visitor Arrives: {currentVisitor.name}
        </CardTitle>
        <CardDescription>
          {currentVisitor.name} from the {ERAS[currentVisitor.era].name} era is visiting your garden.
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
                     {timeRemainingText && (
                        <p className={`text-xs flex items-center ${timeRemainingText === "Time's up!" ? "text-red-500 font-bold" : "text-orange-500"}`}>
                            <Clock className="w-3 h-3 mr-1" /> {timeRemainingText}
                        </p>
                    )}
                    <Button onClick={handleAttemptCompleteQuest} className="w-full sm:w-auto" disabled={state.activeQuest.progress < (activeQuestDetails.targetAmount || Infinity) || timeRemainingText === "Time's up!"}>
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
             {state.activeQuest.status === 'failed' && (
                 <Alert variant="destructive">
                    <XSquare className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Quest Failed</AlertTitle>
                    <AlertDescription>
                        Unfortunately, you didn't complete "{activeQuestDetails.title}" in time or as required.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        )}
         {(state.activeQuest?.status === 'completed' || state.activeQuest?.status === 'failed' || (!state.activeQuest && !currentVisitor.quests.find(q => !state.completedQuests.includes(q.id)))) && (
            <Button onClick={handleDismissVisitor} variant="outline" className="w-full sm:w-auto">
                <XSquare className="mr-2 h-4 w-4" /> Say Goodbye to {currentVisitor.name}
            </Button>
        )}


      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted">Visitors may appear roughly every {VISITOR_SPAWN_CHECK_INTERVAL_SECONDS / 60} minute(s) if conditions are met.</span>
            </TooltipTrigger>
            <TooltipContent>
                <p>A check for new visitors happens periodically. Actual appearance depends on chance and era.</p>
            </TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
    </TooltipProvider>
  );
}
