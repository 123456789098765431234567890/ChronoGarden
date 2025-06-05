
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop, WeatherID, GoalID } from '@/config/gameConfig';
import { 
    ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, 
    AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP,
    PERMANENT_UPGRADES_CONFIG, SYNERGY_CONFIG, WEATHER_CONFIG, GOALS_CONFIG,
    getRandomWeatherId, getRandomWeatherDuration, GameState as ConfigGameState, // Import GameState from config
    IDLE_THRESHOLD_SECONDS, NANO_VINE_DECAY_WINDOW_SECONDS, ALL_CROPS_LIST,
    calculateEffectiveGrowthTime, COMMON_RESOURCES_FOR_BONUS
} from '@/config/gameConfig';

export interface PlantedCrop {
  cropId: string;
  era: EraID; 
  plantedAt: number;
  id: string;
  maturityCheckedForDecay?: boolean; // For NanoVine
}

// Use the imported GameState type
type GameState = ConfigGameState;


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
    lastUserInteractionTime: 0, // Initialize with 0 for server/client consistency
    lastAutoPlantTime: 0, // Initialize with 0 for server/client consistency
    prestigeCount: 0,
    permanentUpgradeLevels: Object.keys(PERMANENT_UPGRADES_CONFIG).reduce((acc, id) => { acc[id] = 0; return acc; }, {} as Record<string, number>),
    synergyStats: {
      cropsHarvestedPresent: 0,
      cropsHarvestedPrehistoric: 0,
      cropsHarvestedFuture: 0,
    },
    currentWeatherId: "clear", // Static default for initial render consistency
    weatherEndTime: 0, // Signal to initialize client-side
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

  if (action.type !== 'GAME_TICK' && action.type !== 'LOAD_STATE_FROM_STORAGE') {
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
      if (state.unlockedEras.includes(action.payload) && state.currentEra !== action.payload) {
        newState.currentEra = action.payload;
        // Temporal Attunement Bonus
        const attunementLevel = newState.permanentUpgradeLevels.permEraSwitchBonus || 0;
        if (attunementLevel > 0) {
            const bonusAmount = PERMANENT_UPGRADES_CONFIG.permEraSwitchBonus.effect(attunementLevel) as number;
            const randomResourceIndex = Math.floor(Math.random() * COMMON_RESOURCES_FOR_BONUS.length);
            const resourceToBonus = COMMON_RESOURCES_FOR_BONUS[randomResourceIndex];
            newState.resources = {
                ...newState.resources,
                [resourceToBonus]: (newState.resources[resourceToBonus] || 0) + bonusAmount,
            };
            // Toast for this bonus will be handled in EraNavigation component where dispatch happens
        }
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
       if (cropConfig.specialGrowthCondition && !cropConfig.specialGrowthCondition(state)) {
        return state; // Cannot plant due to special conditions
      }
       if (cropConfig.isIdleDependent && state.lastUserInteractionTime !== 0 && (Date.now() - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
         // Optionally, show a toast or prevent planting if player is too active for Glowshroom
         // For now, just let it plant, growth will be stalled if active
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
        newPlotSlots[slotIndex] = { cropId, era: state.currentEra, plantedAt: Date.now(), id: crypto.randomUUID(), maturityCheckedForDecay: false };
        
        newState.resources = newResources;
        newState.plotSlots = newPlotSlots;
        newState.soilQuality = Math.max(0, state.soilQuality - 0.5); 
      }
      break;
    }
    case 'HARVEST_CROP': {
      const { slotIndex } = action.payload;
      const plantedCrop = state.plotSlots[slotIndex] as PlantedCrop | null;
      if (!plantedCrop) return state;

      const cropConfig = ALL_CROPS_MAP[plantedCrop.cropId];
      if (!cropConfig) return state;
      
      const effectiveGrowthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, plantedCrop.cropId, plantedCrop.era, state);

      if ((Date.now() - plantedCrop.plantedAt) / 1000 < effectiveGrowthTime) return state; 

      let yieldMultiplier = 1;
      const isRare = state.rareSeeds.includes(cropConfig.id);
      
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
        currentWeatherId: getRandomWeatherId(null), // Get new weather on prestige
        weatherEndTime: Date.now() + getRandomWeatherDuration(getRandomWeatherId(null)),
        goalProgressTrackers: { 
            ...defaultForPrestige.goalProgressTrackers,
        },
        goalStatus: Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
            acc[goalId as GoalID] = { progress: 0, completed: false }; 
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

      let currentProgressValue = 0;
      if(goalConfig.statToTrack === "prestigeCount") {
        currentProgressValue = state.prestigeCount; 
      } else if (goalConfig.statToTrack === "rareSeedsFoundCount") {
        currentProgressValue = state.rareSeeds.length;
      } else {
        currentProgressValue = (newProgressTrackers[goalConfig.statToTrack] || 0) + increment;
        newProgressTrackers[goalConfig.statToTrack] = currentProgressValue;
      }
      
      newGoalStatus[goalId] = { ...newGoalStatus[goalId], progress: currentProgressValue };
      newState.goalProgressTrackers = newProgressTrackers; // Ensure trackers are updated
      newState.goalStatus = newGoalStatus;

      if (currentProgressValue >= goalConfig.target) {
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
        const availableCropsForRareSeed = ALL_CROPS_LIST.filter(c => !state.rareSeeds.includes(c.id));
        if (availableCropsForRareSeed.length > 0) {
            const randomCrop = availableCropsForRareSeed[Math.floor(Math.random() * availableCropsForRareSeed.length)];
            newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
            newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", increment: 0 }}); // Re-check goal with new seed count
        } else if (ALL_CROPS_LIST.length > 0) { 
            const randomCrop = ALL_CROPS_LIST[Math.floor(Math.random() * ALL_CROPS_LIST.length)];
             if (!state.rareSeeds.includes(randomCrop.id)) {
               newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
               newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", increment: 0 }});
             }
        }
      }
      break;
    }
    case 'GAME_TICK': {
      const now = Date.now();
      if (state.lastTick === 0) { // First tick after load or reset
        newState.lastTick = now;
        newState.lastUserInteractionTime = now;
        newState.lastAutoPlantTime = now;
        // Initialize weather if it's marked as needing init (weatherEndTime is 0)
        if (newState.weatherEndTime === 0) {
            const initialWeatherId = getRandomWeatherId(null);
            const initialWeatherDuration = getRandomWeatherDuration(initialWeatherId);
            newState.currentWeatherId = initialWeatherId;
            newState.weatherEndTime = now + initialWeatherDuration;
        }
        return newState;
      }

      let newResources = { ...newState.resources };

      // Weather System
      if (now >= state.weatherEndTime && state.weatherEndTime !== 0) { // Check weatherEndTime !== 0 to avoid init loop if it was 0
        const nextWeatherId = getRandomWeatherId(state.currentWeatherId);
        const duration = getRandomWeatherDuration(nextWeatherId);
        newState = gameReducer(newState, {type: 'SET_WEATHER', payload: { weatherId: nextWeatherId, duration }});
      }
      
      let sunlightFactor = 1;
      let automationTickMultiplier = 1;
      if(state.currentWeatherId && WEATHER_CONFIG[state.currentWeatherId]) {
          sunlightFactor = WEATHER_CONFIG[state.currentWeatherId].effects.sunlightFactor ?? 1;
          automationTickMultiplier = WEATHER_CONFIG[state.currentWeatherId].effects.automationTickMultiplier ?? 1;
      }

      let passiveSunlightBonus = 0;
      const solarPanelUpgradeId = 'passiveSunlight_Present';
      if (UPGRADES_CONFIG[solarPanelUpgradeId] && state.upgradeLevels[solarPanelUpgradeId] > 0 && state.currentEra === "Present") {
          passiveSunlightBonus = UPGRADES_CONFIG[solarPanelUpgradeId].effect(state.upgradeLevels[solarPanelUpgradeId]);
      }
      if (Math.floor(now / 5000) > Math.floor(state.lastTick / 5000)) { 
         newResources.Sunlight = (newResources.Sunlight || 0) + Math.round((1 + passiveSunlightBonus) * sunlightFactor);
      }

      // NanoVine Decay Check
      const newPlotSlotsForDecay = [...newState.plotSlots];
      let plotChangedByDecay = false;
      newPlotSlotsForDecay.forEach((slotData, index) => {
        const slot = slotData as PlantedCrop | null;
        if (slot && slot.cropId === 'nanovine') {
            const cropConfig = ALL_CROPS_MAP.nanovine;
            const effectiveGrowthTime = calculateEffectiveGrowthTime(cropConfig.growthTime, slot.cropId, slot.era, newState);
            const maturityTime = slot.plantedAt + effectiveGrowthTime * 1000;
            if (now > maturityTime && now > maturityTime + NANO_VINE_DECAY_WINDOW_SECONDS * 1000) {
                newPlotSlotsForDecay[index] = null;
                plotChangedByDecay = true;
            }
        }
      });
      if (plotChangedByDecay) newState.plotSlots = newPlotSlotsForDecay;


      // Automation Effects
      state.automationRules.forEach(rule => {
        const baseInterval = 
            rule.id === 'sprinkler_present' ? 10000 :
            rule.id === 'autoharvester_present' ? 15000 :
            rule.id === 'raptorharvester_prehistoric' ? 10000 :
            rule.id === 'tarpitsprinkler_prehistoric' ? 20000 :
            rule.id === 'autoplanter_ai_future' ? 25000 :
            rule.id === 'energytransferdrone_future' ? 10000 : 10000; // Default for any new ones
        
        const currentAutomationTickInterval = baseInterval * automationTickMultiplier;

        if (state.activeAutomations[rule.id] && rule.era === state.currentEra) { 
          switch (rule.id) {
            case 'sprinkler_present':
              if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) {
                 newResources.Water = (newResources.Water || 0) + 1;
              }
              break;
            case 'autoharvester_present':
              if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) {
                const matureSlots: number[] = [];
                newState.plotSlots.forEach((slotData, index) => {
                    const slot = slotData as PlantedCrop | null;
                    if (slot && slot.era === "Present") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        const effGrowthTime = calculateEffectiveGrowthTime(cropCfg.growthTime, slot.cropId, slot.era, newState);
                        if ((now - slot.plantedAt) / 1000 >= effGrowthTime) matureSlots.push(index);
                    }
                });
                if (matureSlots.length > 0) {
                    const randIdx = matureSlots[Math.floor(Math.random() * matureSlots.length)];
                    newState = gameReducer(newState, { type: 'HARVEST_CROP', payload: { slotIndex: randIdx }});
                    Object.assign(newResources, newState.resources); 
                }
              }
              break;
            case 'raptorharvester_prehistoric':
              if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) {
                const matureSlots: number[] = [];
                newState.plotSlots.forEach((slotData, index) => {
                    const slot = slotData as PlantedCrop | null;
                    if (slot && slot.era === "Prehistoric") {
                        const cropCfg = ALL_CROPS_MAP[slot.cropId];
                        const effGrowthTime = calculateEffectiveGrowthTime(cropCfg.growthTime, slot.cropId, slot.era, newState);
                        if ((now - slot.plantedAt) / 1000 >= effGrowthTime) matureSlots.push(index);
                    }
                });
                if (matureSlots.length > 0) {
                    const randIdx = matureSlots[Math.floor(Math.random() * matureSlots.length)];
                    newState = gameReducer(newState, { type: 'HARVEST_CROP', payload: { slotIndex: randIdx }});
                    Object.assign(newResources, newState.resources);
                }
                if (Math.random() < 0.05) {
                    const youngPlantsIndexes = newState.plotSlots.map((s, i) => s && (s as PlantedCrop).era === "Prehistoric" ? i : -1).filter(i => i !== -1);
                    if (youngPlantsIndexes.length > 0) {
                        const unluckyIndex = youngPlantsIndexes[Math.floor(Math.random() * youngPlantsIndexes.length)];
                        newState.plotSlots = [...newState.plotSlots]; 
                        newState.plotSlots[unluckyIndex] = null;
                    }
                }
              }
              break;
            case 'tarpitsprinkler_prehistoric':
              if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) { 
                 newResources.Water = (newResources.Water || 0) + 2;
                 newResources.MysticSpores = (newResources.MysticSpores || 0) + 1;
              }
              break;
            case 'autoplanter_ai_future':
                if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) { 
                    const emptyFutureSlotsIndexes = newState.plotSlots.map((s, i) => (s === null) ? i : -1).filter(i => i !== -1);
                    if (emptyFutureSlotsIndexes.length > 0 && newState.currentEra === "Future") {
                        let bestCropToPlant: Crop | null = null;
                        let maxValPerSec = -1;

                        ALL_CROPS_LIST.filter(c => c.era === "Future").forEach(crop => {
                            const modifiedCost = getModifiedCropCost(crop, newState); // Helper needed
                            let canAfford = true;
                            Object.entries(modifiedCost).forEach(([resId, amount]) => {
                                if ((newState.resources[resId] || 0) < amount) canAfford = false;
                            });

                            if (canAfford) {
                                const effGrowthTime = calculateEffectiveGrowthTime(crop.growthTime, crop.id, crop.era, newState);
                                let totalYieldValue = 0; // Simplified: sum of coin/energy credit yields
                                if(crop.yield.Coins) totalYieldValue += crop.yield.Coins;
                                if(crop.yield.EnergyCredits) totalYieldValue += crop.yield.EnergyCredits; // Assuming 1 EC = 1 Coin for value calc

                                const valPerSec = totalYieldValue / Math.max(1, effGrowthTime);
                                if (valPerSec > maxValPerSec) {
                                    maxValPerSec = valPerSec;
                                    bestCropToPlant = crop;
                                }
                            }
                        });
                        
                        if (bestCropToPlant) {
                             const targetSlotIndex = emptyFutureSlotsIndexes[0]; // Plant in first available empty slot
                             newState = gameReducer(newState, { type: 'PLANT_CROP', payload: { cropId: bestCropToPlant.id, era: "Future", slotIndex: targetSlotIndex }});
                             Object.assign(newResources, newState.resources); // Update resources if planting happened
                        }
                    }
                }
                break;
            case 'energytransferdrone_future': 
                if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) {
                    if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                    if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
                }
                break;
          }
        } else if (rule.id === 'energytransferdrone_future' && state.activeAutomations[rule.id] && rule.era === "Future") { 
             if (Math.floor(now / currentAutomationTickInterval) > Math.floor(state.lastTick / currentAutomationTickInterval)) {
                if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
            }
        }
      });
      newState.resources = newResources;
      
      if (state.rareSeeds.length > 0 && (now - state.lastAutoPlantTime) / 1000 >= 30 && state.lastAutoPlantTime !== 0) {
        const emptyPlotIndexes = newState.plotSlots.map((slot, index) => slot === null ? index : -1).filter(index => index !== -1);
        if (emptyPlotIndexes.length > 0) {
          const randomRareSeedId = state.rareSeeds[Math.floor(Math.random() * state.rareSeeds.length)];
          const cropToPlant = ALL_CROPS_MAP[randomRareSeedId];
          if (cropToPlant && cropToPlant.era === newState.currentEra) {
            // Check if can afford this rare seed planting (it should be free as per original spec)
            // For now, assume free planting of rare seeds by auto-plant
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

// Helper function for AutoPlanter AI
const getModifiedCropCost = (crop: Crop, state: GameState): Record<string, number> => {
    let waterCostMultiplier = 1;
    if (state.currentWeatherId === "rainy" && WEATHER_CONFIG[state.currentWeatherId]) {
      waterCostMultiplier = WEATHER_CONFIG[state.currentWeatherId].effects.waterCostFactor ?? 1;
    }
    if (crop.era === "Present" && SYNERGY_CONFIG.primordialEchoes) {
      const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPrehistoric / SYNERGY_CONFIG.primordialEchoes.threshold);
      const maxSynergyLevel = SYNERGY_CONFIG.primordialEchoes.maxLevels || Infinity;
      const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
      waterCostMultiplier *= (1 - (effectiveSynergyLevel * SYNERGY_CONFIG.primordialEchoes.effectPerLevel));
      waterCostMultiplier = Math.max(0, waterCostMultiplier);
    }

    let costMultiplier = 1;
    const cheaperCropsUpgradeId = `cheaperCrops_${crop.era}`;
    if (UPGRADES_CONFIG[cheaperCropsUpgradeId] && state.upgradeLevels[cheaperCropsUpgradeId] > 0) {
        costMultiplier = UPGRADES_CONFIG[cheaperCropsUpgradeId].effect(state.upgradeLevels[cheaperCropsUpgradeId]);
    }
    const dripIrrigationUpgradeId = `waterCost_${crop.era}`;
    if (UPGRADES_CONFIG[dripIrrigationUpgradeId] && state.upgradeLevels[dripIrrigationUpgradeId] > 0){
        waterCostMultiplier *= UPGRADES_CONFIG[dripIrrigationUpgradeId].effect(state.upgradeLevels[dripIrrigationUpgradeId]);
    }
    
    const finalCosts: Record<string, number> = { ...crop.cost };
    Object.keys(finalCosts).forEach(resId => {
      let currentMultiplier = costMultiplier;
      if (resId === "Water") {
        currentMultiplier *= waterCostMultiplier;
      }
      finalCosts[resId] *= currentMultiplier; 
      finalCosts[resId] = Math.max(0, Math.round(finalCosts[resId]));
    });
    return finalCosts;
};


interface GameContextProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, createDefaultState());

  useEffect(() => {
    let initialState = createDefaultState();
    if (typeof window !== 'undefined') {
      const savedStateJson = localStorage.getItem('chronoGardenSave');
      if (savedStateJson) {
        try {
          const savedState = JSON.parse(savedStateJson) as Partial<GameState>;
          
          const initialGoalStatus: Record<GoalID, { progress: number; completed: boolean }> = 
            Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
              acc[goalId as GoalID] = { progress: 0, completed: false };
              return acc;
            }, {} as Record<GoalID, { progress: number; completed: boolean }>);

          let mergedState: GameState = {
            ...initialState, // Start with fresh defaults
            ...savedState, // Overlay saved data
            resources: { ...initialState.resources, ...savedState.resources },
            plotSlots: Array.isArray(savedState.plotSlots) && savedState.plotSlots.length === GARDEN_PLOT_SIZE 
              ? savedState.plotSlots.map(p => p ? {...p, maturityCheckedForDecay: p.maturityCheckedForDecay ?? false} : null)
              : Array(GARDEN_PLOT_SIZE).fill(null),
            automationRules: Array.isArray(savedState.automationRules) ? savedState.automationRules : [],
            activeAutomations: savedState.activeAutomations || {},
            rareSeeds: Array.isArray(savedState.rareSeeds) ? savedState.rareSeeds : [],
            upgradeLevels: { ...initialState.upgradeLevels, ...savedState.upgradeLevels },
            permanentUpgradeLevels: { ...initialState.permanentUpgradeLevels, ...savedState.permanentUpgradeLevels },
            synergyStats: { ...initialState.synergyStats, ...savedState.synergyStats },
            goalStatus: { ...initialGoalStatus, ...savedState.goalStatus },
            goalProgressTrackers: { ...initialState.goalProgressTrackers, ...savedState.goalProgressTrackers},
            lastTick: Date.now(), 
            lastUserInteractionTime: savedState.lastUserInteractionTime && savedState.lastUserInteractionTime > 0 ? savedState.lastUserInteractionTime : Date.now(),
            lastAutoPlantTime: savedState.lastAutoPlantTime && savedState.lastAutoPlantTime > 0 ? savedState.lastAutoPlantTime : Date.now(),
            prestigeCount: savedState.prestigeCount || 0,
            // Weather: load saved or initialize if expired/missing
            currentWeatherId: savedState.currentWeatherId && WEATHER_CONFIG[savedState.currentWeatherId] ? savedState.currentWeatherId : "clear",
            weatherEndTime: savedState.weatherEndTime && savedState.weatherEndTime > Date.now() ? savedState.weatherEndTime : 0,
          };
          
          // If weather is invalid or expired, set new client-side weather
          if (mergedState.weatherEndTime === 0 || mergedState.weatherEndTime <= Date.now()) {
            const newWeatherId = getRandomWeatherId(mergedState.currentWeatherId);
            const newWeatherDuration = getRandomWeatherDuration(newWeatherId);
            mergedState.currentWeatherId = newWeatherId;
            mergedState.weatherEndTime = Date.now() + newWeatherDuration;
          }


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
          
          if (mergedState.goalStatus.unlockPrehistoric && mergedState.unlockedEras.includes("Prehistoric")) {
             mergedState.goalProgressTrackers.prehistoricUnlocked = 1;
             if(mergedState.goalStatus.unlockPrehistoric.progress < 1) mergedState.goalStatus.unlockPrehistoric.progress = 1;
          }
          mergedState.goalProgressTrackers.rareSeedsFoundCount = mergedState.rareSeeds.length;
           if(mergedState.goalStatus.find3RareSeeds && mergedState.goalStatus.find3RareSeeds.progress < mergedState.rareSeeds.length) {
             mergedState.goalStatus.find3RareSeeds.progress = mergedState.rareSeeds.length;
           }
            if (mergedState.goalStatus.prestigeOnce && mergedState.prestigeCount > mergedState.goalStatus.prestigeOnce.progress) {
                mergedState.goalStatus.prestigeOnce.progress = mergedState.prestigeCount;
            }

          initialState = mergedState; // Use merged state as the initial state for dispatch
        } catch (e) {
          console.error("Error loading saved game state:", e);
          // Fallback to default, but initialize weather client-side
          const newWeatherId = getRandomWeatherId(null);
          const newWeatherDuration = getRandomWeatherDuration(newWeatherId);
          initialState.currentWeatherId = newWeatherId;
          initialState.weatherEndTime = Date.now() + newWeatherDuration;
          initialState.lastTick = Date.now();
          initialState.lastUserInteractionTime = Date.now();
          initialState.lastAutoPlantTime = Date.now();
        }
      } else {
        // No saved state, initialize weather client-side
        const newWeatherId = getRandomWeatherId(null);
        const newWeatherDuration = getRandomWeatherDuration(newWeatherId);
        initialState.currentWeatherId = newWeatherId;
        initialState.weatherEndTime = Date.now() + newWeatherDuration;
        initialState.lastTick = Date.now();
        initialState.lastUserInteractionTime = Date.now();
        initialState.lastAutoPlantTime = Date.now();
      }
      dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: initialState });
    }
  }, []); 

  useEffect(() => {
    if (typeof window !== 'undefined' && state.lastTick !== 0) { 
      localStorage.setItem('chronoGardenSave', JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (state.lastTick === 0 && typeof window !== 'undefined') {
        // This handles the case where the game loads for the very first time (no localStorage)
        // or if localStorage parsing failed and state.lastTick remained 0 from createDefaultState.
        // We need to ensure the game tick starts.
        // The LOAD_STATE_FROM_STORAGE in the previous useEffect already sets lastTick to Date.now()
        // so this might only be needed if that effect somehow doesn't run or state isn't updated.
        // A safer approach might be to ensure lastTick is set to non-zero in the LOAD_STATE_FROM_STORAGE payload.
        // For now, let's assume previous useEffect handles setting lastTick correctly for client-side init.
    }

    if (state.lastTick === 0) return; // Don't start tick if not initialized by LOAD_STATE_FROM_STORAGE yet


    const tickInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, 1000); 

    return () => clearInterval(tickInterval);
  }, [state.lastTick]); 

  useEffect(() => {
    const userActivityListener = () => dispatch({ type: 'USER_INTERACTION' });
    window.addEventListener('click', userActivityListener);
    window.addEventListener('keydown', userActivityListener); 
    window.addEventListener('mousemove', userActivityListener); 

    return () => {
      window.removeEventListener('click', userActivityListener);
      window.removeEventListener('keydown', userActivityListener);
      window.removeEventListener('mousemove', userActivityListener);
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

