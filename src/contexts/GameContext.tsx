
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop } from '@/config/gameConfig';
import { ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG } from '@/config/gameConfig';

export interface PlantedCrop {
  cropId: string;
  era: EraID;
  plantedAt: number;
  id: string;
}

interface GameState {
  currentEra: EraID;
  unlockedEras: EraID[];
  chronoEnergy: number;
  resources: Record<string, number>;
  plotSlots: Array<PlantedCrop | null>; // Represents the 3x3 grid
  automationRules: AutomationRule[];
  activeAutomations: Record<string, boolean>; // To toggle automations on/off
  rareSeeds: string[]; // crop IDs
  soilQuality: number; // 0-100, affects growth or yield
  isLoadingAiSuggestion: boolean;
  aiSuggestion: string | null;
  upgradeLevels: Record<string, number>; // upgradeId: level
  lastTick: number;
}

const getInitialState = (): GameState => {
  let savedStateJson = null;
  if (typeof window !== 'undefined') {
    savedStateJson = localStorage.getItem('chronoGardenSave');
  }
  
  if (savedStateJson) {
    try {
      const savedState = JSON.parse(savedStateJson);
      // Ensure plotSlots is correctly initialized if missing from save
      if (!savedState.plotSlots || savedState.plotSlots.length !== GARDEN_PLOT_SIZE) {
        savedState.plotSlots = Array(GARDEN_PLOT_SIZE).fill(null);
      }
      // Ensure activeAutomations and upgradeLevels are initialized
      savedState.activeAutomations = savedState.activeAutomations || {};
      savedState.upgradeLevels = savedState.upgradeLevels || {};
      AUTOMATION_RULES_CONFIG.forEach(rule => {
        if(savedState.activeAutomations[rule.id] === undefined && state.automationRules.find(r => r.id === rule.id)) {
            savedState.activeAutomations[rule.id] = true; // Default to active if built
        }
      });
      Object.keys(UPGRADES_CONFIG).forEach(upgradeId => {
        if (savedState.upgradeLevels[upgradeId] === undefined) {
          savedState.upgradeLevels[upgradeId] = 0;
        }
      });
      savedState.lastTick = Date.now(); // Reset lastTick on load
      return savedState;
    } catch (e) {
      console.error("Error loading saved game state:", e);
      // Fall through to default initial state if parsing fails
    }
  }

  const initialPlotSlots = Array(GARDEN_PLOT_SIZE).fill(null);
  const initialUpgradeLevels = Object.keys(UPGRADES_CONFIG).reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Record<string, number>);

  return {
    currentEra: 'Present',
    unlockedEras: ['Present'],
    chronoEnergy: 0,
    resources: { ...INITIAL_RESOURCES.reduce((acc, r) => ({...acc, [r.id]: r.initialAmount ?? 0}), {}) },
    plotSlots: initialPlotSlots,
    automationRules: [],
    activeAutomations: {},
    rareSeeds: [],
    soilQuality: 75,
    isLoadingAiSuggestion: false,
    aiSuggestion: null,
    upgradeLevels: initialUpgradeLevels,
    lastTick: Date.now(),
  };
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
  | { type: 'REMOVE_AUTOMATION_RULE'; payload: string } // ruleId
  | { type: 'TOGGLE_AUTOMATION'; payload: { ruleId: string; isActive: boolean } }
  | { type: 'PRESTIGE_RESET' }
  | { type: 'UPDATE_SOIL_QUALITY'; payload: number }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_SUGGESTION'; payload: string | null }
  | { type: 'PURCHASE_UPGRADE'; payload: string } // upgradeId
  | { type: 'CLICK_WATER_BUTTON' }
  | { type: 'GAME_TICK' };


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newState = { ...state };

  switch (action.type) {
    case 'SET_ERA':
      if (state.unlockedEras.includes(action.payload)) {
        newState.currentEra = action.payload;
      }
      break;
    case 'UNLOCK_ERA':
      if (!state.unlockedEras.includes(action.payload) && state.chronoEnergy >= (ERAS[action.payload]?.unlockCost || 0) ) {
        newState.unlockedEras = [...state.unlockedEras, action.payload];
        newState.chronoEnergy = state.chronoEnergy - (ERAS[action.payload]?.unlockCost || 0);
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
      const { cropId, era, slotIndex } = action.payload;
      const cropConfig = ALL_CROPS_MAP[cropId];
      if (!cropConfig || slotIndex < 0 || slotIndex >= GARDEN_PLOT_SIZE || state.plotSlots[slotIndex]) {
        return state; // Invalid action
      }

      let costMultiplier = 1;
      const cheaperCropsLevel = state.upgradeLevels['cheaperCrops'] || 0;
      if (cheaperCropsLevel > 0) {
        costMultiplier = UPGRADES_CONFIG['cheaperCrops'].effect(cheaperCropsLevel);
      }

      const finalCosts = { ...cropConfig.cost };
      Object.keys(finalCosts).forEach(resId => {
        finalCosts[resId] *= costMultiplier;
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
        newPlotSlots[slotIndex] = { cropId, era, plantedAt: Date.now(), id: crypto.randomUUID() };
        
        newState.resources = newResources;
        newState.plotSlots = newPlotSlots;
        newState.soilQuality = Math.max(0, state.soilQuality - 0.5); // Slightly reduce soil quality
      }
      break;
    }
    case 'HARVEST_CROP': {
      const { slotIndex } = action.payload;
      const plantedCrop = state.plotSlots[slotIndex];
      if (!plantedCrop) return state;

      const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
      if (!cropConfig) return state;

      let yieldMultiplier = 1;
      if (cropConfig.id === 'sunflower') {
        const sunflowerBoostLevel = state.upgradeLevels['sunflowerBoost'] || 0;
        if (sunflowerBoostLevel > 0) {
          yieldMultiplier = UPGRADES_CONFIG['sunflowerBoost'].effect(sunflowerBoostLevel);
        }
      }
      
      const newResources = { ...state.resources };
      Object.entries(cropConfig.yield).forEach(([resourceId, amount]) => {
        newResources[resourceId] = (newResources[resourceId] || 0) + (amount * yieldMultiplier);
      });

      const newPlotSlots = [...state.plotSlots];
      newPlotSlots[slotIndex] = null;

      newState.resources = newResources;
      newState.plotSlots = newPlotSlots;
      newState.chronoEnergy += 1; // Small ChronoEnergy gain on harvest
      break;
    }
    case 'ADD_AUTOMATION_RULE': {
      const ruleConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === action.payload.id);
      if (!ruleConfig || state.automationRules.find(r => r.id === ruleConfig.id)) return state; // Already exists or invalid

      newState.automationRules = [...state.automationRules, ruleConfig];
      newState.activeAutomations = {...state.activeAutomations, [ruleConfig.id]: true };
      newState.soilQuality = Math.max(0, state.soilQuality - 1); // Automation might impact soil
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
      const initial = getInitialState(); // Get a fresh initial state
      newState = {
        ...initial,
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
        Water: (state.resources.Water || 0) + 10, // Add 10 water on click
      };
      break;
    case 'GAME_TICK': {
      const now = Date.now();
      const elapsedSeconds = (now - state.lastTick) / 1000;

      // 1. Auto-generate Sunlight (e.g., 1 Sunlight per 5 seconds)
      if (elapsedSeconds >= 5) { // This logic is simplified, assumes tick is roughly every 5s for this
         newState.resources = { ...newState.resources, Sunlight: (newState.resources.Sunlight || 0) + 1 };
      }

      // 2. Apply Sprinkler effect (if active and built)
      const sprinklerRule = state.automationRules.find(r => r.id === 'sprinkler');
      if (sprinklerRule && state.activeAutomations['sprinkler']) {
         // Generates 1 Water every 10 seconds. Game tick is 1s, so check interval.
         if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
             newState.resources = { ...newState.resources, Water: (newState.resources.Water || 0) + 1 };
         }
      }

      // 3. Apply AutoHarvester effect (if active and built)
      const autoHarvesterRule = state.automationRules.find(r => r.id === 'autoharvester');
      if (autoHarvesterRule && state.activeAutomations['autoharvester']) {
        // Harvests one random mature crop every 15 seconds. Check interval.
        if (Math.floor(now / 15000) > Math.floor(state.lastTick / 15000)) {
            const matureSlots: number[] = [];
            state.plotSlots.forEach((slot, index) => {
                if (slot) {
                    const cropCfg = ALL_CROPS_MAP[slot.cropId];
                    let growthTime = cropCfg.growthTime;
                    const fasterGrowthLevel = state.upgradeLevels['fasterGrowth'] || 0;
                    if (fasterGrowthLevel > 0) {
                        growthTime *= UPGRADES_CONFIG['fasterGrowth'].effect(fasterGrowthLevel);
                    }
                    if ((now - slot.plantedAt) / 1000 >= growthTime) {
                        matureSlots.push(index);
                    }
                }
            });

            if (matureSlots.length > 0) {
                const randomMatureSlotIndex = matureSlots[Math.floor(Math.random() * matureSlots.length)];
                // Create a temporary state to apply harvest logic from reducer
                const tempStateForHarvest = gameReducer(newState, { type: 'HARVEST_CROP', payload: { slotIndex: randomMatureSlotIndex } });
                newState.resources = tempStateForHarvest.resources;
                newState.plotSlots = tempStateForHarvest.plotSlots;
                newState.chronoEnergy = tempStateForHarvest.chronoEnergy;
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
    }, 1000); // Game tick every 1 second

    return () => clearInterval(tickInterval);
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

    