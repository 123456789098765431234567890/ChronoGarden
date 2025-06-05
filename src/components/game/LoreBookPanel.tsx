
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LORE_CONFIG, LoreEntry } from '@/config/gameConfig';
import { BookOpen, Lock, Unlock, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoreBookPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const handleUnlockNextLore = () => {
    dispatch({ type: 'USER_INTERACTION' });
    const allLoreIds = Object.keys(LORE_CONFIG);
    const firstLockedLoreId = allLoreIds.find(id => !state.unlockedLoreIds.includes(id));

    if (firstLockedLoreId) {
      dispatch({ type: 'UNLOCK_LORE', payload: firstLockedLoreId });
      toast({
        title: "Lore Unlocked (Dev Button)",
        description: `Entry "${LORE_CONFIG[firstLockedLoreId].title}" is now available.`,
      });
    } else {
      toast({
        title: "All Lore Unlocked",
        description: "You've uncovered all available secrets... for now!",
        variant: "default",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-primary" />
          The Chrono-Lexicon
        </CardTitle>
        <CardDescription>
          Uncover the mysteries of the ChronoGarden and the echoes of time. New entries unlock as you achieve milestones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {Object.values(LORE_CONFIG).map((entry: LoreEntry) => {
            const isUnlocked = state.unlockedLoreIds.includes(entry.id);
            return (
              <AccordionItem value={entry.id} key={entry.id} className="border bg-muted/20 rounded-md px-4">
                <AccordionTrigger className="font-semibold hover:no-underline">
                  <div className="flex items-center w-full">
                    {isUnlocked ? <Unlock className="w-4 h-4 mr-2 text-green-500" /> : <Lock className="w-4 h-4 mr-2 text-orange-500" />}
                    <span className={!isUnlocked ? "opacity-70" : ""}>{entry.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/80 pt-2 pb-4 whitespace-pre-line">
                  {isUnlocked ? entry.content : <em className="flex items-center"><Lightbulb className="w-4 h-4 mr-2 text-yellow-500"/>{entry.unlockHint}</em>}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 text-sm text-muted-foreground">
        <p>Fragments of history and understanding will reveal themselves as you delve deeper into the ChronoGarden.</p>
        <Button onClick={handleUnlockNextLore} variant="outline" size="sm" className="mt-4">
            Unlock Next Lore (Dev/Test)
        </Button>
      </CardFooter>
    </Card>
  );
}
