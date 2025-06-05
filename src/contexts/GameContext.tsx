
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop, WeatherID, GoalID, VisitorID, QuestConfig, QuestStatus, LeaderboardEntry, LoreEntry } from '@/config/gameConfig';
import { 
    ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, 
    AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP,
    PERMANENT_UPGRADES_CONFIG, SYNERGY_CONFIG, WEATHER_CONFIG, GOALS_CONFIG, LORE_CONFIG, getInitialUnlockedLoreIds,
    getRandomWeatherId, getRandomWeatherDuration, GameState as ConfigGameState,
    IDLE_THRESHOLD_SECONDS, NANO_VINE_DECAY_WINDOW_SECONDS, ALL_CROPS_LIST,
    calculateEffectiveGrowthTime, COMMON_RESOURCES_FOR_BONUS,
    NPC_VISITORS_CONFIG, NPC_QUESTS_CONFIG, VISITOR_SPAWN_CHECK_INTERVAL_SECONDS,
    PRESTIGE_TIERS_CONFIG
} from '@/config/gameConfig';
import type { PlantedCrop } from '@/config/gameConfig';
import { database } from '@/lib/firebase'; // Firebase integration
import { ref, set, serverTimestamp } from 'firebase/database'; // Firebase RTDB functions


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
    lastUserInteractionTime: 0, 
    lastAutoPlantTime: 0, 
    prestigeCount: 0,
    permanentUpgradeLevels: Object.keys(PERMANENT_UPGRADES_CONFIG).reduce((acc, id) => { acc[id] = 0; return acc; }, {} as Record<string, number>),
    synergyStats: {
      cropsHarvestedPresent: 0,
      cropsHarvestedPrehistoric: 0,
      cropsHarvestedFuture: 0,
    },
    currentWeatherId: "clear", 
    weatherEndTime: 0, 
    goalStatus: initialGoalStatus,
    goalProgressTrackers: {
      carrotsHarvested: 0,
      prehistoricUnlocked: 0,
      rareSeedsFoundCount: 0,
      prestigeCount: 0,
      dinoRootsHarvested: 0,
      futureAutomationsBuilt: 0,
    },
    playerName: "Time Gardener",
    gardenName: "My ChronoGarden",
    currentVisitorId: null,
    activeQuest: null,
    completedQuests: [],
    totalChronoEnergyEarned: 0,
    totalCropsHarvestedAllTime: 0,
    lastVisitorSpawnCheck: 0,
    unlockedLoreIds: getInitialUnlockedLoreIds(),
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
  | { type: 'UPDATE_GOAL_PROGRESS'; payload: { goalId: GoalID; increment?: number; absoluteValue?: number } }
  | { type: 'COMPLETE_GOAL'; payload: GoalID }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_GARDEN_NAME'; payload: string }
  | { type: 'SPAWN_VISITOR'; payload: VisitorID }
  | { type: 'ACCEPT_QUEST'; payload: { visitorId: VisitorID, questId: string } }
  | { type: 'PROGRESS_QUEST'; payload: { cropId?: string, weatherId?: WeatherID } }
  | { type: 'COMPLETE_QUEST' }
  | { type: 'FAIL_QUEST' } 
  | { type: 'DISMISS_VISITOR' }
  | { type: 'UNLOCK_LORE'; payload: string } // Lore ID
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
        newState.currentVisitorId = null; 
        newState.activeQuest = null;

        const attunementLevel = newState.permanentUpgradeLevels.permEraSwitchBonus || 0;
        if (attunementLevel > 0 && PERMANENT_UPGRADES_CONFIG.permEraSwitchBonus) {
            const bonusAmount = PERMANENT_UPGRADES_CONFIG.permEraSwitchBonus.effect(attunementLevel) as number;
            const randomResourceIndex = Math.floor(Math.random() * COMMON_RESOURCES_FOR_BONUS.length);
            const resourceToBonus = COMMON_RESOURCES_FOR_BONUS[randomResourceIndex];
            newState.resources = {
                ...newState.resources,
                [resourceToBonus]: (newState.resources[resourceToBonus] || 0) + bonusAmount,
            };
        }
      }
      break;
    case 'UNLOCK_ERA':
      const eraToUnlockConfig = ERAS[action.payload];
      if (eraToUnlockConfig && !state.unlockedEras.includes(action.payload) && state.chronoEnergy >= eraToUnlockConfig.unlockCost ) {
        newState.unlockedEras = [...state.unlockedEras, action.payload];
        newState.chronoEnergy = state.chronoEnergy - eraToUnlockConfig.unlockCost;
        if (action.payload === 'Prehistoric') {
          newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: 'unlockPrehistoric', absoluteValue: 1 } });
        }
      }
      break;
    case 'ADD_CHRONO_ENERGY':
      newState.chronoEnergy = state.chronoEnergy + action.payload;
      newState.totalChronoEnergyEarned = (state.totalChronoEnergyEarned || 0) + action.payload;
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
        return state;
      }
       if (cropConfig.isIdleDependent && (Date.now() - state.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS) {
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

      newState.totalCropsHarvestedAllTime = (state.totalCropsHarvestedAllTime || 0) + 1;

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
        
        if (resourceId === 'ChronoEnergy') {
            if (plantedCrop.era === "Future" && SYNERGY_CONFIG.temporalCultivation) {
                const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPresent / SYNERGY_CONFIG.temporalCultivation.threshold);
                const maxSynergyLevel = SYNERGY_CONFIG.temporalCultivation.maxLevels || Infinity;
                const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
                finalAmount *= (1 + (effectiveSynergyLevel * SYNERGY_CONFIG.temporalCultivation.effectPerLevel));
            }
            newState.totalChronoEnergyEarned = (newState.totalChronoEnergyEarned || 0) + Math.round(finalAmount);
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
      if (cropConfig.id === "dinoroot") {
        newState.goalProgressTrackers.dinoRootsHarvested = (newState.goalProgressTrackers.dinoRootsHarvested || 0) + 1;
        if (newState.goalProgressTrackers.dinoRootsHarvested === 10 && !newState.unlockedLoreIds.includes('lore_prehistoric_puzzle')) {
          newState = gameReducer(newState, { type: 'UNLOCK_LORE', payload: 'lore_prehistoric_puzzle' });
        }
      }


      if (state.activeQuest && state.activeQuest.status === 'active') {
        newState = gameReducer(newState, { type: 'PROGRESS_QUEST', payload: { cropId: cropConfig.id, weatherId: state.currentWeatherId || undefined } });
      }
      
      let baseRareSeedChance = 0.01; 
      const permRareSeedChanceLevel = state.permanentUpgradeLevels.permRareSeedChance || 0;
      if (permRareSeedChanceLevel > 0 && PERMANENT_UPGRADES_CONFIG.permRareSeedChance) {
          baseRareSeedChance += PERMANENT_UPGRADES_CONFIG.permRareSeedChance.effect(permRareSeedChanceLevel) as number;
      }
      if (Math.random() < baseRareSeedChance && !state.rareSeeds.includes(cropConfig.id)) {
        newState.rareSeeds = [...state.rareSeeds, cropConfig.id];
        newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", absoluteValue: newState.rareSeeds.length }});
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

      if (ruleConfig.era === 'Future') {
        newState.goalProgressTrackers.futureAutomationsBuilt = (newState.goalProgressTrackers.futureAutomationsBuilt || 0) + 1;
        if (newState.goalProgressTrackers.futureAutomationsBuilt === 1 && !newState.unlockedLoreIds.includes('lore_future_tech')) {
            newState = gameReducer(newState, { type: 'UNLOCK_LORE', payload: 'lore_future_tech'});
        }
      }
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
        totalChronoEnergyEarned: state.totalChronoEnergyEarned,
        totalCropsHarvestedAllTime: state.totalCropsHarvestedAllTime,
        playerName: state.playerName,
        gardenName: state.gardenName,
        completedQuests: [...state.completedQuests],
        rareSeeds: [...state.rareSeeds], 
        unlockedEras: ['Present'], 
        prestigeCount: currentPrestigeCount,
        permanentUpgradeLevels: { ...state.permanentUpgradeLevels },
        lastTick: Date.now(), 
        lastUserInteractionTime: Date.now(),
        lastAutoPlantTime: Date.now(),
        lastVisitorSpawnCheck: Date.now(),
        currentWeatherId: getRandomWeatherId(null), 
        weatherEndTime: Date.now() + getRandomWeatherDuration(getRandomWeatherId(null)),
        goalProgressTrackers: { 
            ...defaultForPrestige.goalProgressTrackers,
            prestigeCount: currentPrestigeCount,
             rareSeedsFoundCount: state.rareSeeds.length, // Carry over rare seed count for goal
        },
        unlockedLoreIds: [...getInitialUnlockedLoreIds()], // Reset lore but keep defaults
      };
      // Recalculate goal statuses after prestige
        const recalculatedGoalStatus: Record<GoalID, { progress: number; completed: boolean }> = 
        Object.keys(GOALS_CONFIG).reduce((acc, goalId) => {
            const gId = goalId as GoalID;
            const goalConfig = GOALS_CONFIG[gId];
            let currentProgress = 0;
            if (goalConfig.statToTrack === 'prestigeCount') {
                currentProgress = newState.prestigeCount;
            } else if (goalConfig.statToTrack === 'rareSeedsFoundCount') {
                currentProgress = newState.rareSeeds.length;
            } else {
                 // For other goals, progress resets unless specified otherwise
                currentProgress = defaultForPrestige.goalStatus[gId]?.progress || 0;
            }
            acc[gId] = { progress: currentProgress, completed: currentProgress >= goalConfig.target };
            return acc;
        }, {} as Record<GoalID, { progress: number; completed: boolean }>);
        newState.goalStatus = recalculatedGoalStatus;
      
      if (newState.permanentUpgradeLevels.permStartWithAutoHarvestPresent > 0) {
          const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
          if (presentAutoHarvestConfig && !newState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
              newState.automationRules.push(presentAutoHarvestConfig);
              newState.activeAutomations[presentAutoHarvestConfig.id] = true;
          }
      }
      newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "prestigeOnce", absoluteValue: currentPrestigeCount }});
      if (currentPrestigeCount >= 1 && !newState.unlockedLoreIds.includes('lore_nexus_discovery')) {
         newState = gameReducer(newState, { type: 'UNLOCK_LORE', payload: 'lore_nexus_discovery' });
      }
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
      const { goalId, increment, absoluteValue } = action.payload;
      if (!state.goalStatus[goalId] || state.goalStatus[goalId].completed) return state;

      const newGoalStatus = { ...state.goalStatus };
      const goalConfig = GOALS_CONFIG[goalId];
      
      let currentProgressValue = 0;
      if (absoluteValue !== undefined) {
        currentProgressValue = absoluteValue;
      } else if (goalConfig.statToTrack === "prestigeCount") {
        currentProgressValue = state.prestigeCount + (increment || 0); 
      } else if (goalConfig.statToTrack === "rareSeedsFoundCount"){
        currentProgressValue = state.rareSeeds.length; // Use the length of the array
      } else {
        currentProgressValue = (state.goalProgressTrackers[goalConfig.statToTrack] || 0) + (increment || 0);
      }
      
      newState.goalProgressTrackers[goalConfig.statToTrack] = currentProgressValue;
      newGoalStatus[goalId] = { ...newGoalStatus[goalId], progress: currentProgressValue };
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
        newState = gameReducer(newState, { type: 'ADD_CHRONO_ENERGY', payload: goalConfig.reward.amount});
      } else if (goalConfig.reward.type === 'resource' && goalConfig.reward.resourceId) {
        newState.resources[goalConfig.reward.resourceId] = (newState.resources[goalConfig.reward.resourceId] || 0) + goalConfig.reward.amount;
      } else if (goalConfig.reward.type === 'rareSeed') {
        const availableCropsForRareSeed = ALL_CROPS_LIST.filter(c => !state.rareSeeds.includes(c.id));
        if (availableCropsForRareSeed.length > 0) {
            const randomCrop = availableCropsForRareSeed[Math.floor(Math.random() * availableCropsForRareSeed.length)];
            newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
            newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", absoluteValue: newState.rareSeeds.length }});
        } else if (ALL_CROPS_LIST.length > 0) { 
            const randomCrop = ALL_CROPS_LIST[Math.floor(Math.random() * ALL_CROPS_LIST.length)];
             if (!state.rareSeeds.includes(randomCrop.id)) {
               newState.rareSeeds = [...state.rareSeeds, randomCrop.id];
               newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", absoluteValue: newState.rareSeeds.length }});
             }
        }
      }
      break;
    }
    case 'SET_PLAYER_NAME':
        newState.playerName = action.payload;
        break;
    case 'SET_GARDEN_NAME':
        newState.gardenName = action.payload;
        break;
    case 'SPAWN_VISITOR':
        newState.currentVisitorId = action.payload;
        newState.activeQuest = null; 
        break;
    case 'ACCEPT_QUEST':
        const visitorConfig = NPC_VISITORS_CONFIG[action.payload.visitorId];
        const questToAccept = visitorConfig?.quests.find(q => q.id === action.payload.questId);
        if (questToAccept && !newState.completedQuests.includes(questToAccept.id)) {
            newState.activeQuest = {
                questId: questToAccept.id,
                visitorId: action.payload.visitorId,
                status: 'active',
                progress: 0,
                startTime: questToAccept.durationMinutes ? Date.now() : undefined
            };
        }
        break;
    case 'PROGRESS_QUEST':
        if (newState.activeQuest && newState.activeQuest.status === 'active') {
            const questConfig = NPC_QUESTS_CONFIG[newState.activeQuest.questId];
            if (!questConfig) break;

            let progressMade = false;
            if (questConfig.type === 'harvestSpecificCrop' && questConfig.targetCropId === action.payload.cropId) {
                newState.activeQuest.progress += 1;
                progressMade = true;
            } else if (questConfig.type === 'growWhileWeather' && questConfig.targetCropId === action.payload.cropId && questConfig.requiredWeatherId === action.payload.weatherId) {
                newState.activeQuest.progress += 1;
                progressMade = true;
            }

            if (progressMade && newState.activeQuest.progress >= (questConfig.targetAmount || Infinity)) {
                 newState = gameReducer(newState, { type: 'COMPLETE_QUEST' });
            }
        }
        break;
    case 'COMPLETE_QUEST':
        if (newState.activeQuest && newState.activeQuest.status === 'active') {
            const questConfig = NPC_QUESTS_CONFIG[newState.activeQuest.questId];
            if (questConfig && newState.activeQuest.progress >= (questConfig.targetAmount || 0)) {
                if (questConfig.reward.type === 'chronoEnergy') {
                    newState = gameReducer(newState, { type: 'ADD_CHRONO_ENERGY', payload: questConfig.reward.amount });
                } else if (questConfig.reward.type === 'coins') {
                    newState.resources.Coins = (newState.resources.Coins || 0) + questConfig.reward.amount;
                } else if (questConfig.reward.type === 'rareSeed') {
                    const availableCropsForRareSeed = ALL_CROPS_LIST.filter(c => !newState.rareSeeds.includes(c.id));
                    if (availableCropsForRareSeed.length > 0) {
                        const randomCrop = availableCropsForRareSeed[Math.floor(Math.random() * availableCropsForRareSeed.length)];
                        newState.rareSeeds = [...newState.rareSeeds, randomCrop.id];
                         newState = gameReducer(newState, { type: 'UPDATE_GOAL_PROGRESS', payload: { goalId: "find3RareSeeds", absoluteValue: newState.rareSeeds.length }});
                    }
                }
                newState.activeQuest.status = 'completed';
                newState.completedQuests = [...newState.completedQuests, questConfig.id];
                 // Check for lore unlocks tied to quest completion
                if (questConfig.id === NPC_QUESTS_CONFIG.prehistoric_findGlowshrooms.id && !newState.unlockedLoreIds.includes('lore_prehistoric_puzzle')) {
                     // This is a placeholder, the actual unlock logic for lore_prehistoric_puzzle is on harvesting Dino Roots.
                     // A quest could unlock a different lore entry.
                }
            }
        }
        break;
    case 'FAIL_QUEST':
        if (newState.activeQuest) {
            newState.activeQuest.status = 'failed';
        }
        break;
    case 'DISMISS_VISITOR':
        newState.currentVisitorId = null;
        newState.activeQuest = null; 
        break;
    case 'UNLOCK_LORE':
        if (!newState.unlockedLoreIds.includes(action.payload)) {
            newState.unlockedLoreIds = [...newState.unlockedLoreIds, action.payload];
        }
        break;
    case 'GAME_TICK': {
      const now = Date.now();
      if (state.lastTick === 0) { 
        newState.lastTick = now;
        newState.lastUserInteractionTime = state.lastUserInteractionTime === 0 ? now : state.lastUserInteractionTime;
        newState.lastAutoPlantTime = state.lastAutoPlantTime === 0 ? now : state.lastAutoPlantTime;
        newState.lastVisitorSpawnCheck = state.lastVisitorSpawnCheck === 0 ? now : state.lastVisitorSpawnCheck;
        if (newState.weatherEndTime === 0 || newState.weatherEndTime <= now ) {
            const initialWeatherId = getRandomWeatherId(null);
            const initialWeatherDuration = getRandomWeatherDuration(initialWeatherId);
            newState.currentWeatherId = initialWeatherId;
            newState.weatherEndTime = now + initialWeatherDuration;
        }
        return newState;
      }

      let newResources = { ...newState.resources };

      if (now >= state.weatherEndTime && state.weatherEndTime !== 0) {
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

      state.automationRules.forEach(rule => {
        const baseInterval = 
            rule.id === 'sprinkler_present' ? 10000 :
            rule.id === 'autoharvester_present' ? 15000 :
            rule.id === 'raptorharvester_prehistoric' ? 10000 :
            rule.id === 'tarpitsprinkler_prehistoric' ? 20000 :
            rule.id === 'autoplanter_ai_future' ? 25000 :
            rule.id === 'energytransferdrone_future' ? 10000 : 10000; 
        
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
                        if (cropCfg) {
                          const effGrowthTime = calculateEffectiveGrowthTime(cropCfg.growthTime, slot.cropId, slot.era, newState);
                          if ((now - slot.plantedAt) / 1000 >= effGrowthTime) matureSlots.push(index);
                        }
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
                         if (cropCfg) {
                            const effGrowthTime = calculateEffectiveGrowthTime(cropCfg.growthTime, slot.cropId, slot.era, newState);
                            if ((now - slot.plantedAt) / 1000 >= effGrowthTime) matureSlots.push(index);
                        }
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
                            const modifiedCost = getModifiedCropCostHelper(crop, newState); 
                            let canAfford = true;
                            Object.entries(modifiedCost).forEach(([resId, amount]) => {
                                if ((newState.resources[resId] || 0) < amount) canAfford = false;
                            });

                            if (canAfford) {
                                const effGrowthTime = calculateEffectiveGrowthTime(crop.growthTime, crop.id, crop.era, newState);
                                let totalYieldValue = 0; 
                                if(crop.yield.Coins) totalYieldValue += crop.yield.Coins;
                                if(crop.yield.EnergyCredits) totalYieldValue += crop.yield.EnergyCredits; 

                                const valPerSec = totalYieldValue / Math.max(1, effGrowthTime);
                                if (valPerSec > maxValPerSec) {
                                    maxValPerSec = valPerSec;
                                    bestCropToPlant = crop;
                                }
                            }
                        });
                        
                        if (bestCropToPlant) {
                             const targetSlotIndex = emptyFutureSlotsIndexes[0]; 
                             newState = gameReducer(newState, { type: 'PLANT_CROP', payload: { cropId: bestCropToPlant.id, era: "Future", slotIndex: targetSlotIndex }});
                             Object.assign(newResources, newState.resources); 
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
             if (!(cropToPlant.isIdleDependent && (Date.now() - newState.lastUserInteractionTime) / 1000 < IDLE_THRESHOLD_SECONDS)) {
                const randomEmptySlot = emptyPlotIndexes[Math.floor(Math.random() * emptyPlotIndexes.length)];
                newState = gameReducer(newState, {type: 'PLANT_CROP', payload: {cropId: randomRareSeedId, era: newState.currentEra, slotIndex: randomEmptySlot }});
                newState.lastAutoPlantTime = now; 
             }
          }
        }
      }

      if (Math.floor(now / 60000) > Math.floor(state.lastTick / 60000)) { 
        newState.soilQuality = Math.min(100, newState.soilQuality + 0.25);
      }

      if ((now - state.lastVisitorSpawnCheck) / 1000 >= VISITOR_SPAWN_CHECK_INTERVAL_SECONDS && !state.currentVisitorId) {
        newState.lastVisitorSpawnCheck = now;
        const potentialVisitorsForEra = Object.values(NPC_VISITORS_CONFIG).filter(v => v.era === state.currentEra);
        if (potentialVisitorsForEra.length > 0) {
            const randomVisitor = potentialVisitorsForEra[Math.floor(Math.random() * potentialVisitorsForEra.length)];
            if (Math.random() < randomVisitor.spawnChance) {
                const allQuestsCompletedForVisitor = randomVisitor.quests.every(q => newState.completedQuests.includes(q.id));
                if (!allQuestsCompletedForVisitor) {
                    newState = gameReducer(newState, { type: 'SPAWN_VISITOR', payload: randomVisitor.id });
                }
            }
        }
      }
      if (newState.activeQuest && newState.activeQuest.status === 'active' && newState.activeQuest.startTime) {
        const questConfig = NPC_QUESTS_CONFIG[newState.activeQuest.questId];
        if (questConfig && questConfig.durationMinutes && (now - newState.activeQuest.startTime) / (1000 * 60) > questConfig.durationMinutes) {
            newState = gameReducer(newState, { type: 'FAIL_QUEST' }); 
            newState = gameReducer(newState, { type: 'DISMISS_VISITOR' }); 
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

const getModifiedCropCostHelper = (crop: Crop, state: GameState): Record<string, number> => {
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
            ...initialState, 
            ...savedState, 
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
            unlockedLoreIds: Array.isArray(savedState.unlockedLoreIds) ? savedState.unlockedLoreIds : getInitialUnlockedLoreIds(),
            lastTick: Date.now(), 
            lastUserInteractionTime: savedState.lastUserInteractionTime && savedState.lastUserInteractionTime > 0 ? savedState.lastUserInteractionTime : Date.now(),
            lastAutoPlantTime: savedState.lastAutoPlantTime && savedState.lastAutoPlantTime > 0 ? savedState.lastAutoPlantTime : Date.now(),
            lastVisitorSpawnCheck: savedState.lastVisitorSpawnCheck && savedState.lastVisitorSpawnCheck > 0 ? savedState.lastVisitorSpawnCheck : Date.now(),
            prestigeCount: savedState.prestigeCount || 0,
            currentWeatherId: savedState.currentWeatherId && WEATHER_CONFIG[savedState.currentWeatherId] ? savedState.currentWeatherId : "clear",
            weatherEndTime: savedState.weatherEndTime && savedState.weatherEndTime > Date.now() ? savedState.weatherEndTime : 0,
            playerName: savedState.playerName || initialState.playerName,
            gardenName: savedState.gardenName || initialState.gardenName,
            currentVisitorId: savedState.currentVisitorId || null,
            activeQuest: savedState.activeQuest || null,
            completedQuests: Array.isArray(savedState.completedQuests) ? savedState.completedQuests : [],
            totalChronoEnergyEarned: savedState.totalChronoEnergyEarned || 0,
            totalCropsHarvestedAllTime: savedState.totalCropsHarvestedAllTime || 0,
          };
          
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
          
          Object.values(GOALS_CONFIG).forEach(goalConfig => {
            if (mergedState.goalStatus[goalConfig.id]) {
                let progress = 0;
                if (goalConfig.statToTrack === 'prestigeCount') {
                    progress = mergedState.prestigeCount;
                } else if (goalConfig.statToTrack === 'rareSeedsFoundCount') {
                    progress = mergedState.rareSeeds.length;
                } else if (goalConfig.statToTrack === 'prehistoricUnlocked') {
                    progress = mergedState.unlockedEras.includes("Prehistoric") ? 1 : 0;
                } else {
                    progress = mergedState.goalProgressTrackers[goalConfig.statToTrack] || 0;
                }
                mergedState.goalStatus[goalConfig.id].progress = progress;
                if (progress >= goalConfig.target) {
                    mergedState.goalStatus[goalConfig.id].completed = true;
                }
            }
          });
          initialState = mergedState; 
        } catch (e) {
          console.error("Error loading saved game state:", e);
          const newWeatherId = getRandomWeatherId(null);
          const newWeatherDuration = getRandomWeatherDuration(newWeatherId);
          initialState.currentWeatherId = newWeatherId;
          initialState.weatherEndTime = Date.now() + newWeatherDuration;
          initialState.lastTick = Date.now();
          initialState.lastUserInteractionTime = Date.now();
          initialState.lastAutoPlantTime = Date.now();
          initialState.lastVisitorSpawnCheck = Date.now();
        }
      } else {
        const newWeatherId = getRandomWeatherId(null);
        const newWeatherDuration = getRandomWeatherDuration(newWeatherId);
        initialState.currentWeatherId = newWeatherId;
        initialState.weatherEndTime = Date.now() + newWeatherDuration;
        initialState.lastTick = Date.now();
        initialState.lastUserInteractionTime = Date.now();
        initialState.lastAutoPlantTime = Date.now();
        initialState.lastVisitorSpawnCheck = Date.now();
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
    if (state.lastTick === 0) return; 

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

  // Effect to update Firebase leaderboard
  useEffect(() => {
    if (typeof window !== 'undefined' && state.playerName && state.playerName !== "Time Gardener") {
      const updateLeaderboard = async () => {
        try {
          const playerData: LeaderboardEntry = {
            id: state.playerName, // Using playerName as ID for simplicity
            name: state.playerName,
            totalCropsHarvested: state.totalCropsHarvestedAllTime || 0,
            prestigeCount: state.prestigeCount || 0,
            totalChronoEnergyEarned: Math.floor(state.totalChronoEnergyEarned || 0),
            lastUpdate: serverTimestamp() as unknown as number // Firebase server timestamp
          };
          // Using set to overwrite/create the player's entry
          await set(ref(database, `leaderboard/${state.playerName}`), playerData);
        } catch (error) {
          console.error("Error updating leaderboard:", error);
        }
      };
      
      // Debounce or call directly - for now, direct call on relevant stat changes
      // A more sophisticated approach might debounce updates.
      updateLeaderboard();
    }
  }, [state.totalCropsHarvestedAllTime, state.prestigeCount, state.totalChronoEnergyEarned, state.playerName]);


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

