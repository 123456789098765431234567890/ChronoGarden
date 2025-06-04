
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUTOMATION_RULES_CONFIG, AutomationRule, ALL_GAME_RESOURCES_MAP, ERAS } from '@/config/gameConfig';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings2, PlusCircle, Trash2, Bot, PowerOff, Power } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';


export default function AutomationStation() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();
  const currentEraConfig = ERAS[state.currentEra];
  
  const availableRulesToBuildInCurrentEra = AUTOMATION_RULES_CONFIG.filter(r => r.era === state.currentEra);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");

  useEffect(() => {
    const rulesForEra = AUTOMATION_RULES_CONFIG.filter(r => r.era === state.currentEra);
    if (rulesForEra.length > 0 && (!selectedRuleId || !rulesForEra.find(r => r.id === selectedRuleId))) {
      setSelectedRuleId(rulesForEra[0].id);
    } else if (rulesForEra.length === 0) {
      setSelectedRuleId("");
    }
  }, [state.currentEra, selectedRuleId]);


  const handleAddAutomation = () => {
    dispatch({ type: 'USER_INTERACTION' });
    const ruleConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId);
    if (!ruleConfig) return;

    if (state.automationRules.find(r => r.id === ruleConfig.id)) {
      toast({ title: "Automation Exists", description: `${ruleConfig.name} is already built.`, variant: "default" });
      return;
    }
    
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
    
    Object.entries(ruleConfig.cost).forEach(([resourceId, amount]) => {
      dispatch({ type: 'UPDATE_RESOURCE', payload: { resourceId, amount: -amount } });
    });

    dispatch({ type: 'ADD_AUTOMATION_RULE', payload: ruleConfig });
    toast({ title: "Automation Built!", description: `${ruleConfig.name} is now active in ${state.currentEra} era.` });
  };

  const handleRemoveAutomation = (ruleId: string) => {
    dispatch({ type: 'USER_INTERACTION' });
    const rule = state.automationRules.find(r => r.id === ruleId);
    if (rule) {
        dispatch({ type: 'REMOVE_AUTOMATION_RULE', payload: ruleId });
        toast({ title: "Automation Removed", description: `${rule.name} has been dismantled.` });
    }
  };

  const handleToggleAutomation = (ruleId: string, isActive: boolean) => {
    dispatch({ type: 'USER_INTERACTION' });
    dispatch({ type: 'TOGGLE_AUTOMATION', payload: { ruleId, isActive } });
    const ruleName = state.automationRules.find(r => r.id === ruleId)?.name || "Automation";
    toast({ title: `${ruleName} ${isActive ? 'Activated' : 'Deactivated'}`});
  };
  
  const selectedRuleDetails = AUTOMATION_RULES_CONFIG.find(r => r.id === selectedRuleId);
  const builtAutomationsInCurrentEra = state.automationRules.filter(rule => rule.era === state.currentEra);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Settings2 className="w-6 h-6 mr-2 text-primary" />
          Automation Station ({currentEraConfig.name})
        </CardTitle>
        <CardDescription>
          Design and implement automated systems for the {currentEraConfig.name} era.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-headline text-lg mb-2">Build New Automation</h3>
            {availableRulesToBuildInCurrentEra.length > 0 ? (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div>
                  <Label htmlFor="automation-type" className="font-semibold">Automation Type</Label>
                  <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                    <SelectTrigger id="automation-type">
                      <SelectValue placeholder="Select automation rule" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRulesToBuildInCurrentEra.map(rule => (
                        <SelectItem key={rule.id} value={rule.id} disabled={!!state.automationRules.find(r => r.id === rule.id)}>
                          {rule.name} {state.automationRules.find(r => r.id === rule.id) ? "(Built)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRuleDetails && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>{selectedRuleDetails.description}</p>
                      <p>Cost: {Object.entries(selectedRuleDetails.cost)
                          .map(([res,amt]) => `${amt} ${ALL_GAME_RESOURCES_MAP[res]?.name || res}`)
                          .join(', ')}
                      </p>
                       <p className="italic">{selectedRuleDetails.effect}</p>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleAddAutomation} 
                  disabled={!selectedRuleId || !!state.automationRules.find(r => r.id === selectedRuleId)} 
                  className="w-full"
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> Build Automation
                </Button>
              </div>
            ) : (
                 <Alert>
                    <Bot className="h-4 w-4" />
                    <AlertTitle>No New Automations</AlertTitle>
                    <AlertDescription>
                    There are no new automations to build in the {state.currentEra} era with your current technology.
                    </AlertDescription>
                </Alert>
            )}
          </div>

          <div>
            <h3 className="font-headline text-lg mb-2">Manage Automations ({currentEraConfig.name})</h3>
            {builtAutomationsInCurrentEra.length > 0 ? (
              <ul className="space-y-2 max-h-96 overflow-y-auto p-1">
                {builtAutomationsInCurrentEra.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-grow">
                      <p className="font-semibold flex items-center">
                        {state.activeAutomations[rule.id] ? <Power className="w-4 h-4 mr-2 text-green-500"/> : <PowerOff className="w-4 h-4 mr-2 text-red-500"/>}
                        {rule.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{rule.effect}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                       <Switch
                        checked={state.activeAutomations[rule.id] || false}
                        onCheckedChange={(isChecked) => handleToggleAutomation(rule.id, isChecked)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveAutomation(rule.id)} title={`Dismantle ${rule.name}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert>
                <Bot className="h-4 w-4" />
                <AlertTitle>No Automations Built</AlertTitle>
                <AlertDescription>
                  Build automations for the {state.currentEra} era to help manage your garden.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
       <CardFooter className="text-sm text-muted-foreground">
        Note: Active automations might affect soil quality or have other subtle effects. Ensure you have enough resources for their upkeep if applicable.
      </CardFooter>
    </Card>
  );
}
