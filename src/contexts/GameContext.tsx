
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop } from '@/config/gameConfig';
import { ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP } from '@/config/gameConfig';

export interface PlantedCrop {
  cropId: string;
  era: EraID; // Era in which it was planted
  plantedAt: number;
  id: string;
}

interface GameState {
  currentEra: EraID;
  unlockedEras: EraID[];
  chronoEnergy: number;
  resources: Record<string, number>;
  plotSlots: Array<PlantedCrop | null>;
  automationRules: AutomationRule[];
  activeAutomations: Record<string, boolean>;
  rareSeeds: string[]; // crop IDs
  soilQuality: number;
  isLoadingAiSuggestion: boolean;
  aiSuggestion: string | null;
  upgradeLevels: Record<string, number>;
  lastTick: number;
  lastUserInteractionTime: number; // For Glowshroom, or other idle mechanics
  lastAutoPlantTime: number; // For rare seed auto-plant
}

const getInitialState = (): GameState => {
  let savedStateJson = null;
  if (typeof window !== 'undefined') {
    savedStateJson = localStorage.getItem('chronoGardenSave');
  }
  
  const defaultState: GameState = {
    currentEra: 'Present',
    unlockedEras: ['Present'],
    chronoEnergy: 0,
    resources: { ...INITIAL_RESOURCES.reduce((acc, r) => ({...acc, [r.id]: r.initialAmount ?? 0}), {}) },
    plotSlots: Array(GARDEN_PLOT_SIZE).fill(null),
    automationRules: [],
    activeAutomations: {},
    rareSeeds: [],
    soilQuality: 75,
    isLoadingAiSuggestion: false,
    aiSuggestion: null,
    upgradeLevels: Object.keys(UPGRADES_CONFIG).reduce((acc, id) => { acc[id] = 0; return acc; }, {} as Record<string, number>),
    lastTick: Date.now(),
    lastUserInteractionTime: Date.now(),
    lastAutoPlantTime: Date.now(),
  };

  if (savedStateJson) {
    try {
      const savedState = JSON.parse(savedStateJson) as Partial<GameState>;
      
      const mergedState = { ...defaultState, ...savedState };

      // Ensure plotSlots is correctly initialized
      if (!mergedState.plotSlots || mergedState.plotSlots.length !== GARDEN_PLOT_SIZE) {
        mergedState.plotSlots = Array(GARDEN_PLOT_SIZE).fill(null);
      }
      // Ensure activeAutomations and upgradeLevels are initialized for all configs
      mergedState.activeAutomations = mergedState.activeAutomations || {};
      const builtRules = Array.isArray(mergedState.automationRules) ? mergedState.automationRules : [];
      AUTOMATION_RULES_CONFIG.forEach(ruleConfig => {
        if (mergedState.activeAutomations[ruleConfig.id] === undefined && builtRules.find(r => r.id === ruleConfig.id)) {
            mergedState.activeAutomations[ruleConfig.id] = true; // Default to active if built
        }
      });
      
      mergedState.upgradeLevels = mergedState.upgradeLevels || {};
      Object.keys(UPGRADES_CONFIG).forEach(upgradeId => {
        if (mergedState.upgradeLevels[upgradeId] === undefined) {
          mergedState.upgradeLevels[upgradeId] = 0;
        }
      });
      
      mergedState.lastTick = Date.now();
      mergedState.lastUserInteractionTime = Date.now();
      mergedState.lastAutoPlantTime = Date.now();

      return mergedState as GameState;
    } catch (e) {
      console.error("Error loading saved game state:", e);
    }
  }
  return defaultState;
};


type GameAction =
  | { type: 'SET_ERA'; payload: EraID }
  | { type: 'UNLOCK_ERA'; payload: EraID }
  | { type: 'ADD_CHRONO_ENERGY'; payload: number }
  | { type: 'SPEND_CHRONO_ENERGY'; payload: number }
  | { type: 'UPDATE_RESOURCE'; payload: { resourceId: string; amount: number } }
  | { type: 'PLANT_CROP'; payload: { cropId: string; era: EraID; slotIndex: number } }
  | { type: 'HARVEST_CROP'; payload: { slotIndex: number } }
  | { type: 'ADD_AUTOMATION_RULE'; payload: AutomationRule }
  | { type: 'REMOVE_AUTOMATION_RULE'; payload: string }
  | { type: 'TOGGLE_AUTOMATION'; payload: { ruleId: string; isActive: boolean } }
  | { type: 'PRESTIGE_RESET' }
  | { type: 'UPDATE_SOIL_QUALITY'; payload: number }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_SUGGESTION'; payload: string | null }
  | { type: 'PURCHASE_UPGRADE'; payload: string }
  | { type: 'CLICK_WATER_BUTTON' }
  | { type: 'USER_INTERACTION' } // New action to track user activity
  | { type: 'GAME_TICK' };


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newState = { ...state };

  // Update lastUserInteractionTime for relevant actions
  if (action.type !== 'GAME_TICK' && action.type !== 'USER_INTERACTION') {
    newState.lastUserInteractionTime = Date.now();
  }
  if (action.type === 'USER_INTERACTION') {
    newState.lastUserInteractionTime = Date.now();
    return newState; // Just update time, no other state change
  }


  switch (action.type) {
    case 'SET_ERA':
      if (state.unlockedEras.includes(action.payload)) {
        newState.currentEra = action.payload;
      }
      break;
    case 'UNLOCK_ERA':
      const eraToUnlockConfig = ERAS[action.payload];
      if (eraToUnlockConfig && !state.unlockedEras.includes(action.payload) && state.chronoEnergy >= eraToUnlockConfig.unlockCost ) {
        newState.unlockedEras = [...state.unlockedEras, action.payload];
        newState.chronoEnergy = state.chronoEnergy - eraToUnlockConfig.unlockCost;
        // Toast can be dispatched from component after checking state change
      }
      break;
    case 'ADD_CHRONO_ENERGY':
      newState.chronoEnergy = state.chronoEnergy + action.payload;
      break;
    case 'SPEND_CHRONO_ENERGY':
      newState.chronoEnergy = Math.max(0, state.chronoEnergy - action.payload);
      break;
    case 'UPDATE_RESOURCE':
      newState.resources = {
        ...state.resources,
        [action.payload.resourceId]: Math.max(0, (state.resources[action.payload.resourceId] || 0) + action.payload.amount),
      };
      break;
    case 'PLANT_CROP': {
      const { cropId, slotIndex } = action.payload; // era for planting is currentEra
      const cropConfig = ALL_CROPS_MAP[cropId];
      if (!cropConfig || slotIndex < 0 || slotIndex >= GARDEN_PLOT_SIZE || state.plotSlots[slotIndex] || cropConfig.era !== state.currentEra) {
        return state; 
      }

      let costMultiplier = 1;
      let waterCostMultiplier = 1;
      const cheaperCropsUpgradeId = `cheaperCrops_${state.currentEra}`;
      if (UPGRADES_CONFIG[cheaperCropsUpgradeId] && state.upgradeLevels[cheaperCropsUpgradeId] > 0) {
          costMultiplier = UPGRADES_CONFIG[cheaperCropsUpgradeId].effect(state.upgradeLevels[cheaperCropsUpgradeId]);
      }
      const dripIrrigationUpgradeId = `waterCost_${state.currentEra}`; // e.g. waterCost_Present
      if (UPGRADES_CONFIG[dripIrrigationUpgradeId] && state.upgradeLevels[dripIrrigationUpgradeId] > 0){
          waterCostMultiplier = UPGRADES_CONFIG[dripIrrigationUpgradeId].effect(state.upgradeLevels[dripIrrigationUpgradeId]);
      }
      
      const finalCosts = { ...cropConfig.cost };
      Object.keys(finalCosts).forEach(resId => {
        if (resId === "Water") {
          finalCosts[resId] *= waterCostMultiplier;
        }
        finalCosts[resId] *= costMultiplier; 
        finalCosts[resId] = Math.max(0, Math.round(finalCosts[resId]));
      });
      
      let canAfford = true;
      Object.entries(finalCosts).forEach(([resourceId, amount]) => {
        if ((state.resources[resourceId] || 0) < amount) {
          canAfford = false;
        }
      });

      if (canAfford) {
        const newResources = { ...state.resources };
        Object.entries(finalCosts).forEach(([resourceId, amount]) => {
          newResources[resourceId] = (newResources[resourceId] || 0) - amount;
        });

        const newPlotSlots = [...state.plotSlots];
        newPlotSlots[slotIndex] = { cropId, era: state.currentEra, plantedAt: Date.now(), id: crypto.randomUUID() };
        
        newState.resources = newResources;
        newState.plotSlots = newPlotSlots;
        newState.soilQuality = Math.max(0, state.soilQuality - 0.5);
      }
      break;
    }
    case 'HARVEST_CROP': {
      const { slotIndex } = action.payload;
      const plantedCrop = state.plotSlots[slotIndex];
      if (!plantedCrop) return state;

      const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
      if (!cropConfig) return state;
      
      // Ensure crop is mature before harvesting
      let growthTime = cropConfig.growthTime;
      const isRare = state.rareSeeds.includes(cropConfig.id);
      if (isRare) growthTime *= 0.9; // Rare seed 10% faster growth

      const cropGrowthUpgradeId = `cropGrowth_${plantedCrop.era}`; // e.g. cropGrowth_Present
      if (UPGRADES_CONFIG[cropGrowthUpgradeId] && state.upgradeLevels[cropGrowthUpgradeId] > 0) {
          growthTime *= UPGRADES_CONFIG[cropGrowthUpgradeId].effect(state.upgradeLevels[cropGrowthUpgradeId]);
      }
      if ((Date.now() - plantedCrop.plantedAt) / 1000 < growthTime) return state; // Not mature


      let yieldMultiplier = 1;
      if (cropConfig.id === 'sunflower' && UPGRADES_CONFIG.sunflowerBoost && state.upgradeLevels.sunflowerBoost > 0) {
          yieldMultiplier = UPGRADES_CONFIG.sunflowerBoost.effect(state.upgradeLevels.sunflowerBoost);
      }
      const prehistoricYieldBoostId = `yield_Prehistoric`;
      if (cropConfig.era === "Prehistoric" && UPGRADES_CONFIG[prehistoricYieldBoostId] && state.upgradeLevels[prehistoricYieldBoostId] > 0) {
          yieldMultiplier *= UPGRADES_CONFIG[prehistoricYieldBoostId].effect(state.upgradeLevels[prehistoricYieldBoostId]);
      }

      const newResources = { ...state.resources };
      Object.entries(cropConfig.yield).forEach(([resourceId, amount]) => {
        let finalAmount = amount * yieldMultiplier;
        if (isRare && (resourceId === 'Coins' || resourceId === 'Energy' || resourceId === 'Sunlight' || resourceId === 'ChronoEnergy')) {
            finalAmount += 1; // Rare seed +1 yield to primary resources
        }
        newResources[resourceId] = (newResources[resourceId] || 0) + Math.round(finalAmount);
      });
      
      // Add ChronoEnergy based on era (already handled if in crop.yield)
      // if (plantedCrop.era === "Prehistoric") {
      //   newResources["ChronoEnergy"] = (newResources["ChronoEnergy"] || 0) + (cropConfig.yield.ChronoEnergy || 1); // Example ChronoEnergy gain
      // }


      // Rare seed drop: 1% chance
      let rareSeedFoundThisHarvest = false;
      if (Math.random() < 0.01 && !state.rareSeeds.includes(cropConfig.id)) {
        newState.rareSeeds = [...state.rareSeeds, cropConfig.id];
        rareSeedFoundThisHarvest = true; // For toast
      }

      const newPlotSlots = [...state.plotSlots];
      newPlotSlots[slotIndex] = null;

      newState.resources = newResources;
      newState.plotSlots = newPlotSlots;
      
      // Dispatch toast from component based on rareSeedFoundThisHarvest
      break;
    }
    case 'ADD_AUTOMATION_RULE': {
      const ruleConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === action.payload.id);
      if (!ruleConfig || state.automationRules.find(r => r.id === ruleConfig.id)) return state; 

      newState.automationRules = [...state.automationRules, ruleConfig];
      newState.activeAutomations = {...state.activeAutomations, [ruleConfig.id]: true };
      newState.soilQuality = Math.max(0, state.soilQuality - 1); 
      break;
    }
    case 'REMOVE_AUTOMATION_RULE':
      newState.automationRules = state.automationRules.filter(rule => rule.id !== action.payload);
      const newActiveAutomations = {...state.activeAutomations};
      delete newActiveAutomations[action.payload];
      newState.activeAutomations = newActiveAutomations;
      break;
    case 'TOGGLE_AUTOMATION':
      newState.activeAutomations = {
        ...state.activeAutomations,
        [action.payload.ruleId]: action.payload.isActive,
      };
      break;
    case 'PRESTIGE_RESET':
      const initialForPrestige = getInitialState(); 
      newState = {
        ...initialForPrestige,
        chronoEnergy: state.chronoEnergy, // Keep ChronoEnergy
        rareSeeds: [...state.rareSeeds], 
        unlockedEras: ['Present'], 
      };
      break;
    case 'UPDATE_SOIL_QUALITY':
      newState.soilQuality = Math.max(0, Math.min(100, state.soilQuality + action.payload));
      break;
    case 'SET_AI_LOADING':
      newState.isLoadingAiSuggestion = action.payload;
      break;
    case 'SET_AI_SUGGESTION':
      newState.aiSuggestion = action.payload;
      newState.isLoadingAiSuggestion = false;
      break;
    case 'PURCHASE_UPGRADE': {
      const upgradeId = action.payload;
      const upgradeConfig = UPGRADES_CONFIG[upgradeId];
      const currentLevel = state.upgradeLevels[upgradeId] || 0;

      if (!upgradeConfig || currentLevel >= upgradeConfig.maxLevel) return state;

      const cost = upgradeConfig.cost(currentLevel);
      let canAfford = true;
      Object.entries(cost).forEach(([resId, amount]) => {
        if ((state.resources[resId] || 0) < amount) {
          canAfford = false;
        }
      });

      if (canAfford) {
        const newResources = { ...state.resources };
        Object.entries(cost).forEach(([resId, amount]) => {
          newResources[resId] = (newResources[resId] || 0) - amount;
        });
        newState.resources = newResources;
        newState.upgradeLevels = { ...state.upgradeLevels, [upgradeId]: currentLevel + 1 };
      }
      break;
    }
    case 'CLICK_WATER_BUTTON':
      newState.resources = {
        ...state.resources,
        Water: (state.resources.Water || 0) + 10,
      };
      break;
    case 'GAME_TICK': {
      const now = Date.now();
      // Passive Sunlight Generation
      let passiveSunlightBonus = 0;
      const solarPanelUpgradeId = 'solarPanels';
      if (UPGRADES_CONFIG[solarPanelUpgradeId] && state.upgradeLevels[solarPanelUpgradeId] > 0 && state.currentEra === "Present") {
          passiveSunlightBonus = UPGRADES_CONFIG[solarPanelUpgradeId].effect(state.upgradeLevels[solarPanelUpgradeId]);
      }
      if (Math.floor(now / 5000) > Math.floor(state.lastTick / 5000)) { // Every 5 seconds
         newState.resources = { ...newState.resources, Sunlight: (newState.resources.Sunlight || 0) + 1 + passiveSunlightBonus };
      }

      // Automation Effects
      state.automationRules.forEach(rule => {
        if (state.activeAutomations[rule.id] && rule.era === state.currentEra) {
          switch (rule.id) {
            case 'sprinkler': // Basic Sprinkler (Present)
              if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) { // Every 10s
                 newState.resources = { ...newState.resources, Water: (newState.resources.Water || 0) + 1 };
              }
              break;
            case 'autoharvester': // Basic AutoHarvester (Present)
              if (Math.floor(now / 15000) > Math.floor(state.lastTick / 15000)) { // Every 15s
                const presentMatureSlots: number[] = [];
                state.plotSlots.forEach((slot, index) => {
                    if (slot && slot.era === "Present") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        let gTime = cropCfg.growthTime;
                        if (state.rareSeeds.includes(slot.cropId)) gTime *= 0.9;
                        const growthUpgrade = `cropGrowth_Present`;
                        if(UPGRADES_CONFIG[growthUpgrade] && state.upgradeLevels[growthUpgrade] > 0) {
                            gTime *= UPGRADES_CONFIG[growthUpgrade].effect(state.upgradeLevels[growthUpgrade]);
                        }
                        if ((now - slot.plantedAt) / 1000 >= gTime) presentMatureSlots.push(index);
                    }
                });
                if (presentMatureSlots.length > 0) {
                    const randIdx = presentMatureSlots[Math.floor(Math.random() * presentMatureSlots.length)];
                    newState = gameReducer(newState, { type: 'HARVEST_CROP', payload: { slotIndex: randIdx }});
                }
              }
              break;
            case 'raptorharvester': // Prehistoric
              if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) { // Every 10s
                const prehistoricMatureSlots: number[] = [];
                state.plotSlots.forEach((slot, index) => {
                    if (slot && slot.era === "Prehistoric") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        let gTime = cropCfg.growthTime;
                         if (state.rareSeeds.includes(slot.cropId)) gTime *= 0.9;
                        const growthUpgrade = `cropGrowth_Prehistoric`;
                         if(UPGRADES_CONFIG[growthUpgrade] && state.upgradeLevels[growthUpgrade] > 0) {
                            gTime *= UPGRADES_CONFIG[growthUpgrade].effect(state.upgradeLevels[growthUpgrade]);
                        }
                        if ((now - slot.plantedAt) / 1000 >= gTime) prehistoricMatureSlots.push(index);
                    }
                });
                if (prehistoricMatureSlots.length > 0) {
                    const randIdx = prehistoricMatureSlots[Math.floor(Math.random() * prehistoricMatureSlots.length)];
                    newState = gameReducer(newState, { type: 'HARVEST_CROP', payload: { slotIndex: randIdx }});
                }
                // 5% chance to uproot a young plant
                if (Math.random() < 0.05) {
                    const youngPlantsIndexes = state.plotSlots.map((s, i) => s && s.era === "Prehistoric" ? i : -1).filter(i => i !== -1);
                    if (youngPlantsIndexes.length > 0) {
                        const unluckyIndex = youngPlantsIndexes[Math.floor(Math.random() * youngPlantsIndexes.length)];
                        newState.plotSlots = [...newState.plotSlots];
                        newState.plotSlots[unluckyIndex] = null;
                        // Could add a toast for this
                    }
                }
              }
              break;
            case 'tarpitsprinkler': // Prehistoric
              if (Math.floor(now / 20000) > Math.floor(state.lastTick / 20000)) { // Every 20s
                 newState.resources = { 
                     ...newState.resources, 
                     Water: (newState.resources.Water || 0) + 2,
                     MysticSpores: (newState.resources.MysticSpores || 0) + 1,
                    };
              }
              break;
          }
        }
      });
      
      // Rare Seed Auto-Plant (every 30 seconds)
      if (state.rareSeeds.length > 0 && (now - state.lastAutoPlantTime) / 1000 >= 30) {
        const emptyPlotIndexes = state.plotSlots.map((slot, index) => slot === null ? index : -1).filter(index => index !== -1);
        if (emptyPlotIndexes.length > 0) {
          const randomRareSeedId = state.rareSeeds[Math.floor(Math.random() * state.rareSeeds.length)];
          const cropToPlant = ALL_CROPS_MAP[randomRareSeedId];
          // Check if crop is for current era and can be afforded (simplified cost check for auto-plant)
          if (cropToPlant && cropToPlant.era === state.currentEra) {
            // Simplified cost check: assume free or very low cost for auto-plant, or implement full cost check
            // For Phase 2, let's assume it plants if a slot is free, without cost check.
            const randomEmptySlot = emptyPlotIndexes[Math.floor(Math.random() * emptyPlotIndexes.length)];
            newState = gameReducer(newState, {type: 'PLANT_CROP', payload: {cropId: randomRareSeedId, era: state.currentEra, slotIndex: randomEmptySlot }});
            newState.lastAutoPlantTime = now; 
          }
        }
      }


      newState.lastTick = now;
      break;
    }
    default:
      return state;
  }
  return newState;
};

interface GameContextProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, getInitialState());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chronoGardenSave', JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    const tickInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, 1000); 

    const userActivityListener = () => dispatch({ type: 'USER_INTERACTION' });
    window.addEventListener('mousemove', userActivityListener);
    window.addEventListener('click', userActivityListener);
    window.addEventListener('keypress', userActivityListener);

    return () => {
      clearInterval(tickInterval);
      window.removeEventListener('mousemove', userActivityListener);
      window.removeEventListener('click', userActivityListener);
      window.removeEventListener('keypress', userActivityListener);
    };
  }, []);


  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextProps => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

    