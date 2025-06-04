"use client";

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUTOMATION_RULES_CONFIG, AutomationRule } from '@/config/gameConfig';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings2, PlusCircle, Trash2, Bot } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


export default function AutomationStation() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const [selectedRuleId, setSelectedRuleId] = useState<string>(AUTOMATION_RULES_CONFIG[0]?.id || "");

  const handleAddAutomation = () => {
    const ruleConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId);
    if (!ruleConfig) return;

    // Check cost (simplified)
    let canAfford = true;
    Object.entries(ruleConfig.cost).forEach(([resourceId, amount]) => {
      if ((state.resources[resourceId] || 0) < amount) {
        canAfford = false;
      }
    });

    if (!canAfford) {
      toast({ title: "Cannot afford automation", description: `You need more resources to build ${ruleConfig.name}.`, variant: "destructive" });
      return;
    }
    
    // Deduct cost
    Object.entries(ruleConfig.cost).forEach(([resourceId, amount]) => {
      dispatch({ type: 'UPDATE_RESOURCE', payload: { resourceId, amount: -amount } });
    });

    const newRule: AutomationRule = {
      ...ruleConfig,
      id: `${ruleConfig.id}_${Date.now()}` // Make ID unique for multiples
    };
    dispatch({ type: 'ADD_AUTOMATION_RULE', payload: newRule });
    toast({ title: "Automation Added!", description: `${newRule.name} is now active.` });
  };

  const handleRemoveAutomation = (ruleId: string) => {
    dispatch({ type: 'REMOVE_AUTOMATION_RULE', payload: ruleId });
    toast({ title: "Automation Removed", description: "The automation rule has been deactivated." });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Settings2 className="w-6 h-6 mr-2 text-primary" />
          Automation Station
        </CardTitle>
        <CardDescription>
          Design and implement automated systems for planting, harvesting, and resource management.
          Active automations may affect soil quality.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-headline text-lg mb-2">Build New Automation</h3>
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div>
                <Label htmlFor="automation-type" className="font-semibold">Automation Type</Label>
                <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                  <SelectTrigger id="automation-type">
                    <SelectValue placeholder="Select automation rule" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_RULES_CONFIG.map(rule => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRuleId && AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId)?.description} <br/>
                    Cost: {Object.entries(AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId)!.cost).map(([res,amt]) => `${amt} ${res}`).join(', ')}
                  </p>
                )}
              </div>
              <Button onClick={handleAddAutomation} disabled={!selectedRuleId} className="w-full">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Automation
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-headline text-lg mb-2">Active Automations</h3>
            {state.automationRules.length > 0 ? (
              <ul className="space-y-2 max-h-96 overflow-y-auto p-1">
                {state.automationRules.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold flex items-center"><Bot className="w-4 h-4 mr-2 text-accent"/>{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{rule.effect}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAutomation(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert>
                <Bot className="h-4 w-4" />
                <AlertTitle>No Automations Active</AlertTitle>
                <AlertDescription>
                  Build automations to help manage your garden more efficiently.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
       <CardFooter className="text-sm text-muted-foreground">
        Note: Implementing complex automations might reduce soil quality over time. Balance efficiency with ecological care.
      </CardFooter>
    </Card>
  );
}
