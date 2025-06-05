
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop, WeatherID, GoalID } from '@/config/gameConfig';
import { 
    ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, 
    AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP,
    PERMANENT_UPGRADES_CONFIG, SYNERGY_CONFIG, WEATHER_CONFIG, GOALS_CONFIG,
    getRandomWeatherId, getRandomWeatherDuration
} from '@/config/gameConfig';

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
  upgradeLevels: Record<string, number>; // For era-specific upgrades
  lastTick: number;
  lastUserInteractionTime: number; 
  lastAutoPlantTime: number;
  prestigeCount: number;
  permanentUpgradeLevels: Record<string, number>; // For Chrono Nexus upgrades
  synergyStats: {
    cropsHarvestedPresent: number;
    cropsHarvestedPrehistoric: number;
    cropsHarvestedFuture: number;
  };
  currentWeatherId: WeatherID | null;
  weatherEndTime: number;
  goalStatus: Record<GoalID, { progress: number; completed: boolean }>;
  goalProgressTrackers: {
    carrotsHarvested: number;
    prehistoricUnlocked: number;
    rareSeedsFoundCount: number;
    // prestigeCount is directly from state.prestigeCount
  };
}

const createDefaultState = (): GameState => {
  const initialGoalStatus: Record<GoalID, { progress: number; completed: boolean }> = 
    Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
      acc[goalId as GoalID] = { progress: 0, completed: false };
      return acc;
    }, {} as Record<GoalID, { progress: number; completed: boolean }>);

  return {
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
    lastTick: 0, 
    lastUserInteractionTime: 0, 
    lastAutoPlantTime: 0,
    prestigeCount: 0,
    permanentUpgradeLevels: Object.keys(PERMANENT_UPGRADES_CONFIG).reduce((acc, id) => { acc[id] = 0; return acc; }, {} as Record<string, number>),
    synergyStats: {
      cropsHarvestedPresent: 0,
      cropsHarvestedPrehistoric: 0,
      cropsHarvestedFuture: 0,
    },
    currentWeatherId: null,
    weatherEndTime: 0,
    goalStatus: initialGoalStatus,
    goalProgressTrackers: {
      carrotsHarvested: 0,
      prehistoricUnlocked: 0,
      rareSeedsFoundCount: 0,
    },
  };
};


type GameAction =
  | { type: 'LOAD_STATE_FROM_STORAGE'; payload: GameState }
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
  | { type: 'PURCHASE_PERMANENT_UPGRADE'; payload: string } 
  | { type: 'CLICK_WATER_BUTTON' }
  | { type: 'USER_INTERACTION' } 
  | { type: 'SET_WEATHER'; payload: { weatherId: WeatherID | null; duration?: number } }
  | { type: 'UPDATE_GOAL_PROGRESS'; payload: { goalId: GoalID; increment: number } }
  | { type: 'COMPLETE_GOAL'; payload: GoalID }
  | { type: 'GAME_TICK' };


const gameReducer = (state: GameState, action: GameAction): GameState => {
  let newState = { ...state };

  if (action.type !== 'GAME_TICK' && action.type !== 'USER_INTERACTION' && action.type !== 'LOAD_STATE_FROM_STORAGE') {
    newState.lastUserInteractionTime = Date.now();
  }
  if (action.type === 'USER_INTERACTION') {
    newState.lastUserInteractionTime = Date.now();
    return newState; 
  }

  switch (action.type) {
    case 'LOAD_STATE_FROM_STORAGE':
      return action.payload;
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
        if (action.payload === 'Prehistoric') {
          newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: 'unlockPrehistoric', increment: 1 } });
        }
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
      const { cropId, slotIndex } = action.payload; 
      const cropConfig = ALL_CROPS_MAP[cropId];
      if (!cropConfig || slotIndex < 0 || slotIndex >= GARDEN_PLOT_SIZE || state.plotSlots[slotIndex] || cropConfig.era !== state.currentEra) {
        return state; 
      }

      let waterCostMultiplier = 1;
      if (state.currentWeatherId === "rainy" && WEATHER_CONFIG[state.currentWeatherId]) {
        waterCostMultiplier = WEATHER_CONFIG[state.currentWeatherId].effects.waterCostFactor ?? 1;
      }
      
      if (cropConfig.era === "Present" && SYNERGY_CONFIG.primordialEchoes) {
        const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPrehistoric / SYNERGY_CONFIG.primordialEchoes.threshold);
        const maxSynergyLevel = SYNERGY_CONFIG.primordialEchoes.maxLevels || Infinity;
        const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
        waterCostMultiplier *= (1 - (effectiveSynergyLevel * SYNERGY_CONFIG.primordialEchoes.effectPerLevel));
        waterCostMultiplier = Math.max(0, waterCostMultiplier); 
      }

      let costMultiplier = 1;
      const cheaperCropsUpgradeId = `cheaperCrops_${state.currentEra}`;
      if (UPGRADES_CONFIG[cheaperCropsUpgradeId] && state.upgradeLevels[cheaperCropsUpgradeId] > 0) {
          costMultiplier = UPGRADES_CONFIG[cheaperCropsUpgradeId].effect(state.upgradeLevels[cheaperCropsUpgradeId]);
      }
      const dripIrrigationUpgradeId = `waterCost_${state.currentEra}`;
      if (UPGRADES_CONFIG[dripIrrigationUpgradeId] && state.upgradeLevels[dripIrrigationUpgradeId] > 0){
          waterCostMultiplier *= UPGRADES_CONFIG[dripIrrigationUpgradeId].effect(state.upgradeLevels[dripIrrigationUpgradeId]);
      }
      
      const finalCosts = { ...cropConfig.cost };
      Object.keys(finalCosts).forEach(resId => {
        let currentMultiplier = costMultiplier;
        if (resId === "Water") {
          currentMultiplier *= waterCostMultiplier;
        }
        finalCosts[resId] *= currentMultiplier; 
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
      
      let growthTime = cropConfig.growthTime;
      
      const globalSpeedBoostLevel = state.permanentUpgradeLevels.permGlobalGrowSpeed || 0;
      if (globalSpeedBoostLevel > 0) {
          growthTime *= PERMANENT_UPGRADES_CONFIG.permGlobalGrowSpeed.effect(globalSpeedBoostLevel) as number;
      }
      
      const isRare = state.rareSeeds.includes(cropConfig.id);
      if (isRare) growthTime *= 0.9; 
      
      const cropGrowthUpgradeId = `cropGrowth_${plantedCrop.era}`;
      if (UPGRADES_CONFIG[cropGrowthUpgradeId] && state.upgradeLevels[cropGrowthUpgradeId] > 0) {
          growthTime *= UPGRADES_CONFIG[cropGrowthUpgradeId].effect(state.upgradeLevels[cropGrowthUpgradeId]);
      }
      
      if (plantedCrop.era === "Future" && state.activeAutomations['growthoptimizer_future']) {
        growthTime *= 0.75; 
      }

      if ((Date.now() - plantedCrop.plantedAt) / 1000 < growthTime) return state; 

      let yieldMultiplier = 1;
      
      const yieldUpgradeId = `yield_${plantedCrop.era}`; 
      if (UPGRADES_CONFIG[yieldUpgradeId] && state.upgradeLevels[yieldUpgradeId] > 0) {
          yieldMultiplier *= UPGRADES_CONFIG[yieldUpgradeId].effect(state.upgradeLevels[yieldUpgradeId]);
      }
      if (cropConfig.id === 'sunflower' && UPGRADES_CONFIG.sunflowerBoost_Present && state.upgradeLevels.sunflowerBoost_Present > 0) {
          yieldMultiplier = UPGRADES_CONFIG.sunflowerBoost_Present.effect(state.upgradeLevels.sunflowerBoost_Present);
      }
      
      const newResources = { ...state.resources };
      Object.entries(cropConfig.yield).forEach(([resourceId, amount]) => {
        let finalAmount = amount * yieldMultiplier;
        if (isRare && (resourceId === 'Coins' || resourceId === 'Energy' || resourceId === 'Sunlight' || resourceId === 'ChronoEnergy' || resourceId === 'EnergyCredits')) {
            finalAmount += 1; 
        }
        
        if (resourceId === 'ChronoEnergy' && plantedCrop.era === "Future" && SYNERGY_CONFIG.temporalCultivation) {
            const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPresent / SYNERGY_CONFIG.temporalCultivation.threshold);
            const maxSynergyLevel = SYNERGY_CONFIG.temporalCultivation.maxLevels || Infinity;
            const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
            finalAmount *= (1 + (effectiveSynergyLevel * SYNERGY_CONFIG.temporalCultivation.effectPerLevel));
        }
        newResources[resourceId] = (newResources[resourceId] || 0) + Math.round(finalAmount);
      });
      
      
      const newSynergyStats = { ...state.synergyStats };
      if (plantedCrop.era === "Present") newSynergyStats.cropsHarvestedPresent += 1;
      else if (plantedCrop.era === "Prehistoric") newSynergyStats.cropsHarvestedPrehistoric += 1;
      else if (plantedCrop.era === "Future") newSynergyStats.cropsHarvestedFuture += 1;
      newState.synergyStats = newSynergyStats;

      // Update Goal Progress
      if (cropConfig.id === "carrot") {
        newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "harvest10Carrots", increment: 1 }});
      }
      
      let baseRareSeedChance = 0.01; 
      const permRareSeedChanceLevel = state.permanentUpgradeLevels.permRareSeedChance || 0;
      if (permRareSeedChanceLevel > 0) {
          baseRareSeedChance += PERMANENT_UPGRADES_CONFIG.permRareSeedChance.effect(permRareSeedChanceLevel) as number;
      }
      if (Math.random() < baseRareSeedChance && !state.rareSeeds.includes(cropConfig.id)) {
        newState.rareSeeds = [...state.rareSeeds, cropConfig.id];
        newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", increment: 1 }});
      }

      const newPlotSlots = [...state.plotSlots];
      newPlotSlots[slotIndex] = null;
      newState.resources = newResources;
      newState.plotSlots = newPlotSlots;
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
      const defaultForPrestige = createDefaultState(); 
      const currentPrestigeCount = state.prestigeCount + 1;
      newState = {
        ...defaultForPrestige, 
        chronoEnergy: state.chronoEnergy, 
        rareSeeds: [...state.rareSeeds], 
        unlockedEras: ['Present'], 
        prestigeCount: currentPrestigeCount,
        permanentUpgradeLevels: { ...state.permanentUpgradeLevels },
        lastTick: Date.now(), 
        lastUserInteractionTime: Date.now(),
        lastAutoPlantTime: Date.now(),
        goalProgressTrackers: { // Reset specific trackers, keep prestigeCount linked
            ...defaultForPrestige.goalProgressTrackers,
        },
        goalStatus: Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
            acc[goalId as GoalID] = { progress: 0, completed: false }; // Reset progress, keep completed status for some if desired
            return acc;
        }, {} as Record<GoalID, { progress: number; completed: boolean }>),
      };
      
      if (newState.permanentUpgradeLevels.permStartWithAutoHarvestPresent > 0) {
          const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
          if (presentAutoHarvestConfig && !newState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
              newState.automationRules.push(presentAutoHarvestConfig);
              newState.activeAutomations[presentAutoHarvestConfig.id] = true;
          }
      }
      // Update prestige goal immediately after prestige
      newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "prestigeOnce", increment: 1 }});
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
    case 'PURCHASE_PERMANENT_UPGRADE': {
        const upgradeId = action.payload;
        const config = PERMANENT_UPGRADES_CONFIG[upgradeId];
        const currentLevel = state.permanentUpgradeLevels[upgradeId] || 0;

        if (!config || currentLevel >= config.maxLevel) return state;
        
        const cost = config.cost(currentLevel);
        if (state.rareSeeds.length >= cost.rareSeeds && state.chronoEnergy >= cost.chronoEnergy) {
            
            const newRareSeeds = [...state.rareSeeds];
            newRareSeeds.splice(0, cost.rareSeeds); 
            
            newState.rareSeeds = newRareSeeds;
            newState.chronoEnergy = state.chronoEnergy - cost.chronoEnergy;
            newState.permanentUpgradeLevels = { ...state.permanentUpgradeLevels, [upgradeId]: currentLevel + 1};
            
            if (upgradeId === 'permStartWithAutoHarvestPresent' && (currentLevel + 1) === 1) {
                const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
                if (presentAutoHarvestConfig && !newState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
                    newState.automationRules = [...newState.automationRules, presentAutoHarvestConfig];
                    newState.activeAutomations = {...newState.activeAutomations, [presentAutoHarvestConfig.id]: true };
                }
            }
        }
        break;
    }
    case 'CLICK_WATER_BUTTON':
      newState.resources = {
        ...state.resources,
        Water: (state.resources.Water || 0) + 10,
      };
      break;
    case 'SET_WEATHER':
      newState.currentWeatherId = action.payload.weatherId;
      newState.weatherEndTime = action.payload.duration ? Date.now() + action.payload.duration : 0;
      break;
    case 'UPDATE_GOAL_PROGRESS': {
      const { goalId, increment } = action.payload;
      if (!state.goalStatus[goalId] || state.goalStatus[goalId].completed) return state;

      const newGoalStatus = { ...state.goalStatus };
      const newProgressTrackers = { ...state.goalProgressTrackers };
      const goalConfig = GOALS_CONFIG[goalId];

      let currentProgress = 0;
      if(goalConfig.statToTrack === "prestigeCount") {
        currentProgress = state.prestigeCount; // Use direct state value for prestige count
      } else {
        currentProgress = (newProgressTrackers[goalConfig.statToTrack] || 0) + increment;
        newProgressTrackers[goalConfig.statToTrack] = currentProgress;
      }
      
      newGoalStatus[goalId] = { ...newGoalStatus[goalId], progress: currentProgress };
      newState.goalProgressTrackers = newProgressTrackers;
      newState.goalStatus = newGoalStatus;

      if (currentProgress >= goalConfig.target) {
        newState = gameReducer(newState, { type: 'COMPLETE_GOAL', payload: goalId });
      }
      break;
    }
    case 'COMPLETE_GOAL': {
      const goalId = action.payload;
      if (!state.goalStatus[goalId] || state.goalStatus[goalId].completed) return state;

      const newGoalStatus = { ...state.goalStatus };
      newGoalStatus[goalId] = { ...newGoalStatus[goalId], completed: true };
      newState.goalStatus = newGoalStatus;

      const goalConfig = GOALS_CONFIG[goalId];
      if (goalConfig.reward.type === 'chronoEnergy') {
        newState.chronoEnergy += goalConfig.reward.amount;
      } else if (goalConfig.reward.type === 'resource' && goalConfig.reward.resourceId) {
        newState.resources[goalConfig.reward.resourceId] = (newState.resources[goalConfig.reward.resourceId] || 0) + goalConfig.reward.amount;
      } else if (goalConfig.reward.type === 'rareSeed') {
        // Give a random rare seed not already owned, or a random one if all owned (simplified)
        const availableCropsForRareSeed = ALL_CROPS_LIST.filter(c => !state.rareSeeds.includes(c.id));
        if (availableCropsForRareSeed.length > 0) {
            const randomCrop = availableCropsForRareSeed[Math.floor(Math.random() * availableCropsForRareSeed.length)];
            newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
        } else if (ALL_CROPS_LIST.length > 0) { // Fallback: give any random rare seed if all already found (unlikely)
            const randomCrop = ALL_CROPS_LIST[Math.floor(Math.random() * ALL_CROPS_LIST.length)];
             if (!state.rareSeeds.includes(randomCrop.id)) newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
        }
      }
      break;
    }
    case 'GAME_TICK': {
      if (state.lastTick === 0) {
        return { ...state, lastTick: Date.now() }; 
      }
      const now = Date.now();
      let newResources = { ...newState.resources };

      // Weather System
      if (!state.currentWeatherId || now >= state.weatherEndTime) {
        const nextWeatherId = getRandomWeatherId(state.currentWeatherId);
        const duration = getRandomWeatherDuration(nextWeatherId);
        newState = gameReducer(newState, {type: 'SET_WEATHER', payload: { weatherId: nextWeatherId, duration }});
      }
      
      let sunlightFactor = 1;
      if(state.currentWeatherId && WEATHER_CONFIG[state.currentWeatherId]) {
          sunlightFactor = WEATHER_CONFIG[state.currentWeatherId].effects.sunlightFactor ?? 1;
      }

      let passiveSunlightBonus = 0;
      const solarPanelUpgradeId = 'passiveSunlight_Present';
      if (UPGRADES_CONFIG[solarPanelUpgradeId] && state.upgradeLevels[solarPanelUpgradeId] > 0 && state.currentEra === "Present") {
          passiveSunlightBonus = UPGRADES_CONFIG[solarPanelUpgradeId].effect(state.upgradeLevels[solarPanelUpgradeId]);
      }
      if (Math.floor(now / 5000) > Math.floor(state.lastTick / 5000)) { 
         newResources.Sunlight = (newResources.Sunlight || 0) + (1 + passiveSunlightBonus) * sunlightFactor;
      }

      // Automation Effects
      state.automationRules.forEach(rule => {
        if (state.activeAutomations[rule.id] && rule.era === state.currentEra) { 
          switch (rule.id) {
            case 'sprinkler_present':
              if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                 newResources.Water = (newResources.Water || 0) + 1;
              }
              break;
            case 'autoharvester_present':
              if (Math.floor(now / 15000) > Math.floor(state.lastTick / 15000)) {
                const presentMatureSlots: number[] = [];
                state.plotSlots.forEach((slot, index) => {
                    if (slot && slot.era === "Present") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        let gTime = cropCfg.growthTime;
                        if (state.permanentUpgradeLevels.permGlobalGrowSpeed > 0) gTime *= PERMANENT_UPGRADES_CONFIG.permGlobalGrowSpeed.effect(state.permanentUpgradeLevels.permGlobalGrowSpeed) as number;
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
                    Object.assign(newResources, newState.resources); 
                }
              }
              break;
            case 'raptorharvester_prehistoric':
              if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                const prehistoricMatureSlots: number[] = [];
                state.plotSlots.forEach((slot, index) => {
                    if (slot && slot.era === "Prehistoric") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        let gTime = cropCfg.growthTime;
                        if (state.permanentUpgradeLevels.permGlobalGrowSpeed > 0) gTime *= PERMANENT_UPGRADES_CONFIG.permGlobalGrowSpeed.effect(state.permanentUpgradeLevels.permGlobalGrowSpeed) as number;
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
                    Object.assign(newResources, newState.resources);
                }
                if (Math.random() < 0.05) {
                    const youngPlantsIndexes = state.plotSlots.map((s, i) => s && s.era === "Prehistoric" ? i : -1).filter(i => i !== -1);
                    if (youngPlantsIndexes.length > 0) {
                        const unluckyIndex = youngPlantsIndexes[Math.floor(Math.random() * youngPlantsIndexes.length)];
                        newState.plotSlots = [...newState.plotSlots]; 
                        newState.plotSlots[unluckyIndex] = null;
                    }
                }
              }
              break;
            case 'tarpitsprinkler_prehistoric':
              if (Math.floor(now / 20000) > Math.floor(state.lastTick / 20000)) { 
                 newResources.Water = (newResources.Water || 0) + 2;
                 newResources.MysticSpores = (newResources.MysticSpores || 0) + 1;
              }
              break;
            case 'autoplanter_ai_future':
                if (Math.floor(now / 20000) > Math.floor(state.lastTick / 20000)) { 
                    const emptyFutureSlots = newState.plotSlots.map((s, i) => (s === null || (s && s.era !== "Future")) ? i : -1).filter(i => i !== -1);
                    if (emptyFutureSlots.length > 0 && newState.currentEra === "Future") { 
                        const synthBloomId = "synthbloom";
                        newState = gameReducer(newState, { type: 'PLANT_CROP', payload: { cropId: synthBloomId, era: "Future", slotIndex: emptyFutureSlots[0] }});
                        Object.assign(newResources, newState.resources);
                    }
                }
                break;
            case 'energytransferdrone_future': 
                if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                    if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                    if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
                }
                break;
          }
        } else if (rule.id === 'energytransferdrone_future' && state.activeAutomations[rule.id] && rule.era === "Future") { 
             if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
            }
        }
      });
      newState.resources = newResources;
      
      if (state.rareSeeds.length > 0 && (now - state.lastAutoPlantTime) / 1000 >= 30) {
        const emptyPlotIndexes = newState.plotSlots.map((slot, index) => slot === null ? index : -1).filter(index => index !== -1);
        if (emptyPlotIndexes.length > 0) {
          const randomRareSeedId = state.rareSeeds[Math.floor(Math.random() * state.rareSeeds.length)];
          const cropToPlant = ALL_CROPS_MAP[randomRareSeedId];
          if (cropToPlant && cropToPlant.era === newState.currentEra) {
            const randomEmptySlot = emptyPlotIndexes[Math.floor(Math.random() * emptyPlotIndexes.length)];
            newState = gameReducer(newState, {type: 'PLANT_CROP', payload: {cropId: randomRareSeedId, era: newState.currentEra, slotIndex: randomEmptySlot }});
            newState.lastAutoPlantTime = now; 
          }
        }
      }

      if (Math.floor(now / 60000) > Math.floor(state.lastTick / 60000)) { 
        newState.soilQuality = Math.min(100, newState.soilQuality + 0.25);
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
  const [state, dispatch] = useReducer(gameReducer, createDefaultState());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStateJson = localStorage.getItem('chronoGardenSave');
      if (savedStateJson) {
        try {
          const savedState = JSON.parse(savedStateJson) as Partial<GameState>;
          const defaultState = createDefaultState();
          
          const initialGoalStatus: Record<GoalID, { progress: number; completed: boolean }> = 
            Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
              acc[goalId as GoalID] = { progress: 0, completed: false };
              return acc;
            }, {} as Record<GoalID, { progress: number; completed: boolean }>);

          const mergedState: GameState = {
            ...defaultState,
            ...savedState,
            resources: { ...defaultState.resources, ...savedState.resources },
            plotSlots: Array.isArray(savedState.plotSlots) && savedState.plotSlots.length === GARDEN_PLOT_SIZE 
              ? savedState.plotSlots 
              : Array(GARDEN_PLOT_SIZE).fill(null),
            automationRules: Array.isArray(savedState.automationRules) ? savedState.automationRules : [],
            activeAutomations: savedState.activeAutomations || {},
            rareSeeds: Array.isArray(savedState.rareSeeds) ? savedState.rareSeeds : [],
            upgradeLevels: { ...defaultState.upgradeLevels, ...savedState.upgradeLevels },
            permanentUpgradeLevels: { ...defaultState.permanentUpgradeLevels, ...savedState.permanentUpgradeLevels },
            synergyStats: { ...defaultState.synergyStats, ...savedState.synergyStats },
            currentWeatherId: savedState.currentWeatherId || null,
            weatherEndTime: savedState.weatherEndTime || 0,
            goalStatus: { ...initialGoalStatus, ...savedState.goalStatus }, // Merge carefully
            goalProgressTrackers: { ...defaultState.goalProgressTrackers, ...savedState.goalProgressTrackers},
            lastTick: Date.now(), 
            lastUserInteractionTime: Date.now(),
            lastAutoPlantTime: Date.now(),
            prestigeCount: savedState.prestigeCount || 0,
          };

          mergedState.automationRules.forEach(ruleConfig => {
            if (mergedState.activeAutomations[ruleConfig.id] === undefined) {
                mergedState.activeAutomations[ruleConfig.id] = true; 
            }
          });
          
          if (mergedState.permanentUpgradeLevels.permStartWithAutoHarvestPresent > 0) {
              const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
              if (presentAutoHarvestConfig && !mergedState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
                  mergedState.automationRules.push(presentAutoHarvestConfig);
                  mergedState.activeAutomations[presentAutoHarvestConfig.id] = true;
              }
          }
          // Ensure goal trackers are updated based on loaded state if necessary
          if (mergedState.goalStatus.unlockPrehistoric && mergedState.unlockedEras.includes("Prehistoric")) {
             mergedState.goalProgressTrackers.prehistoricUnlocked = 1;
             if(mergedState.goalStatus.unlockPrehistoric.progress < 1) mergedState.goalStatus.unlockPrehistoric.progress = 1;
          }
          mergedState.goalProgressTrackers.rareSeedsFoundCount = mergedState.rareSeeds.length;
           if(mergedState.goalStatus.find3RareSeeds && mergedState.goalStatus.find3RareSeeds.progress < mergedState.rareSeeds.length) {
             mergedState.goalStatus.find3RareSeeds.progress = mergedState.rareSeeds.length;
           }


          dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: mergedState });
        } catch (e) {
          console.error("Error loading saved game state:", e);
          dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: { ...createDefaultState(), lastTick: Date.now(), lastUserInteractionTime: Date.now(), lastAutoPlantTime: Date.now() } });
        }
      } else {
         dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: { ...createDefaultState(), lastTick: Date.now(), lastUserInteractionTime: Date.now(), lastAutoPlantTime: Date.now(), currentWeatherId: getRandomWeatherId(null), weatherEndTime: Date.now() + getRandomWeatherDuration(getRandomWeatherId(null))} });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (typeof window !== 'undefined' && state.lastTick !== 0) { 
      localStorage.setItem('chronoGardenSave', JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (state.lastTick === 0) return; 

    const tickInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, 1000); 

    return () => clearInterval(tickInterval);
  }, [state.lastTick]); 

  useEffect(() => {
    const userActivityListener = () => dispatch({ type: 'USER_INTERACTION' });
    window.addEventListener('mousemove', userActivityListener);
    window.addEventListener('click', userActivityListener);
    window.addEventListener('keypress', userActivityListener);

    return () => {
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

