"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import type { EraID, Crop, AutomationRule } from '@/config/gameConfig';
import { ERAS, INITIAL_RESOURCES } from '@/config/gameConfig';

interface GameState {
  currentEra: EraID;
  unlockedEras: EraID[];
  chronoEnergy: number;
  resources: Record<string, number>;
  plantedCrops: Array<{ cropId: string; era: EraID; plantedAt: number; id: string }>;
  automationRules: AutomationRule[];
  rareSeeds: string[]; // crop IDs
  soilQuality: number; // 0-100, affects growth or yield
  isLoadingAiSuggestion: boolean;
  aiSuggestion: string | null;
}

const initialState: GameState = {
  currentEra: 'Present',
  unlockedEras: ['Present'],
  chronoEnergy: 0,
  resources: { ...INITIAL_RESOURCES.reduce((acc, r) => ({...acc, [r.id]: r.initialAmount ?? 0}), {}), Seeds: 10, Water: 50 },
  plantedCrops: [],
  automationRules: [],
  rareSeeds: [],
  soilQuality: 75,
  isLoadingAiSuggestion: false,
  aiSuggestion: null,
};

type GameAction =
  | { type: 'SET_ERA'; payload: EraID }
  | { type: 'UNLOCK_ERA'; payload: EraID }
  | { type: 'ADD_CHRONO_ENERGY'; payload: number }
  | { type: 'SPEND_CHRONO_ENERGY'; payload: number }
  | { type: 'UPDATE_RESOURCE'; payload: { resourceId: string; amount: number } }
  | { type: 'PLANT_CROP'; payload: { cropId: string; era: EraID } }
  | { type: 'HARVEST_CROP'; payload: string } // plantedCropId
  | { type: 'ADD_AUTOMATION_RULE'; payload: AutomationRule }
  | { type: 'REMOVE_AUTOMATION_RULE'; payload: string } // ruleId
  | { type: 'PRESTIGE_RESET' }
  | { type: 'UPDATE_SOIL_QUALITY'; payload: number }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'SET_AI_SUGGESTION'; payload: string | null };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_ERA':
      if (state.unlockedEras.includes(action.payload)) {
        return { ...state, currentEra: action.payload };
      }
      return state;
    case 'UNLOCK_ERA':
      if (!state.unlockedEras.includes(action.payload) && state.chronoEnergy >= (ERAS[action.payload]?.unlockCost || 0) ) {
        return {
          ...state,
          unlockedEras: [...state.unlockedEras, action.payload],
          chronoEnergy: state.chronoEnergy - (ERAS[action.payload]?.unlockCost || 0),
        };
      }
      return state;
    case 'ADD_CHRONO_ENERGY':
      return { ...state, chronoEnergy: state.chronoEnergy + action.payload };
    case 'SPEND_CHRONO_ENERGY':
        return { ...state, chronoEnergy: Math.max(0, state.chronoEnergy - action.payload) };
    case 'UPDATE_RESOURCE':
      return {
        ...state,
        resources: {
          ...state.resources,
          [action.payload.resourceId]: (state.resources[action.payload.resourceId] || 0) + action.payload.amount,
        },
      };
    case 'PLANT_CROP':
      // Basic planting logic, assumes seeds are available.
      // In a real game, check for seed resource.
      return {
        ...state,
        plantedCrops: [
          ...state.plantedCrops,
          { cropId: action.payload.cropId, era: action.payload.era, plantedAt: Date.now(), id: crypto.randomUUID() },
        ],
         // Example: Planting reduces soil quality slightly
        soilQuality: Math.max(0, state.soilQuality - 1),
      };
    case 'HARVEST_CROP': {
      const cropToHarvest = state.plantedCrops.find(c => c.id === action.payload);
      if (!cropToHarvest) return state;

      const cropConfig = ERAS[cropToHarvest.era]?.availableCrops.find(c => c.id === cropToHarvest.cropId);
      if (!cropConfig) return state;
      
      // Add yield to resources
      const newResources = { ...state.resources };
      Object.entries(cropConfig.yield).forEach(([resourceId, amount]) => {
        newResources[resourceId] = (newResources[resourceId] || 0) + amount;
      });

      return {
        ...state,
        resources: newResources,
        plantedCrops: state.plantedCrops.filter(c => c.id !== action.payload),
      };
    }
    case 'ADD_AUTOMATION_RULE':
      return {
        ...state,
        automationRules: [...state.automationRules, action.payload],
        // Example: Automation might impact soil quality
        soilQuality: Math.max(0, state.soilQuality - 2),
      };
    case 'REMOVE_AUTOMATION_RULE':
      return {
        ...state,
        automationRules: state.automationRules.filter(rule => rule.id !== action.payload),
      };
    case 'PRESTIGE_RESET':
      return {
        ...initialState,
        rareSeeds: [...state.rareSeeds], // Carry over rare seeds
        unlockedEras: ['Present'], // Start fresh with eras
      };
    case 'UPDATE_SOIL_QUALITY':
      return { ...state, soilQuality: Math.max(0, Math.min(100, state.soilQuality + action.payload)) };
    case 'SET_AI_LOADING':
      return { ...state, isLoadingAiSuggestion: action.payload };
    case 'SET_AI_SUGGESTION':
      return { ...state, aiSuggestion: action.payload, isLoadingAiSuggestion: false };
    default:
      return state;
  }
};

interface GameContextProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

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
