
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LORE_CONFIG, LoreEntry } from '@/config/gameConfig';
import { BookOpen, Lock, Unlock, Lightbulb } from 'lucide-react';

export default function LoreBookPanel() {
  const { state } = useGame();

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
      </CardFooter>
    </Card>
  );
}

