
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useReducer, Dispatch, useEffect } from 'react';
import type { EraID, AutomationRule, Crop } from '@/config/gameConfig';
import { 
    ERAS, INITIAL_RESOURCES, GARDEN_PLOT_SIZE, ALL_CROPS_MAP, 
    AUTOMATION_RULES_CONFIG, UPGRADES_CONFIG, ALL_GAME_RESOURCES_MAP,
    PERMANENT_UPGRADES_CONFIG, SYNERGY_CONFIG
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
}

const createDefaultState = (): GameState => ({
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
  lastTick: 0, // Initialized to 0 for server/client consistency
  lastUserInteractionTime: 0, 
  lastAutoPlantTime: 0,
  prestigeCount: 0,
  permanentUpgradeLevels: Object.keys(PERMANENT_UPGRADES_CONFIG).reduce((acc, id) => { acc[id] = 0; return acc; }, {} as Record<string, number>),
  synergyStats: {
    cropsHarvestedPresent: 0,
    cropsHarvestedPrehistoric: 0,
    cropsHarvestedFuture: 0,
  },
});


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
  | { type: 'PURCHASE_UPGRADE'; payload: string } // Era-specific
  | { type: 'PURCHASE_PERMANENT_UPGRADE'; payload: string } // Chrono Nexus
  | { type: 'CLICK_WATER_BUTTON' }
  | { type: 'USER_INTERACTION' } 
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
      }
      break;
    case 'ADD_CHRONO_ENERGY':
      newState.chronoEnergy = state.chronoEnergy + action.payload;
      break;
    case 'SPEND_CHRONO_ENERGY': // Used by permanent upgrades
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

      // Apply Synergy: Primordial Echoes (reduced water cost for Present)
      let waterCostMultiplier = 1;
      if (cropConfig.era === "Present" && SYNERGY_CONFIG.primordialEchoes) {
        const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPrehistoric / SYNERGY_CONFIG.primordialEchoes.threshold);
        const maxSynergyLevel = SYNERGY_CONFIG.primordialEchoes.maxLevels || Infinity;
        const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
        waterCostMultiplier -= effectiveSynergyLevel * SYNERGY_CONFIG.primordialEchoes.effectPerLevel;
        waterCostMultiplier = Math.max(0.1, waterCostMultiplier); // Ensure not free
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
        newState.soilQuality = Math.max(0, state.soilQuality - 0.5); // General soil degradation
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
      // Global Permanent Speed Boost
      const globalSpeedBoostLevel = state.permanentUpgradeLevels.permGlobalGrowSpeed || 0;
      if (globalSpeedBoostLevel > 0) {
          growthTime *= PERMANENT_UPGRADES_CONFIG.permGlobalGrowSpeed.effect(globalSpeedBoostLevel) as number;
      }
      // Rare Seed Speed Boost
      const isRare = state.rareSeeds.includes(cropConfig.id);
      if (isRare) growthTime *= 0.9; 
      // Era-specific Growth Upgrade
      const cropGrowthUpgradeId = `cropGrowth_${plantedCrop.era}`;
      if (UPGRADES_CONFIG[cropGrowthUpgradeId] && state.upgradeLevels[cropGrowthUpgradeId] > 0) {
          growthTime *= UPGRADES_CONFIG[cropGrowthUpgradeId].effect(state.upgradeLevels[cropGrowthUpgradeId]);
      }
      // Future Growth Optimizer Automation
      if (plantedCrop.era === "Future" && state.activeAutomations['growthoptimizer_future']) {
        growthTime *= 0.75; // 25% reduction
      }

      if ((Date.now() - plantedCrop.plantedAt) / 1000 < growthTime) return state; // Not mature

      let yieldMultiplier = 1;
      // Era-specific Yield Upgrade
      const yieldUpgradeId = `yield_${plantedCrop.era}`; // e.g., yield_Prehistoric, yield_Future
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
        // Apply Synergy: Temporal Cultivation (ChronoEnergy from Future crops)
        if (resourceId === 'ChronoEnergy' && plantedCrop.era === "Future" && SYNERGY_CONFIG.temporalCultivation) {
            const synergyLevel = Math.floor(state.synergyStats.cropsHarvestedPresent / SYNERGY_CONFIG.temporalCultivation.threshold);
            const maxSynergyLevel = SYNERGY_CONFIG.temporalCultivation.maxLevels || Infinity;
            const effectiveSynergyLevel = Math.min(synergyLevel, maxSynergyLevel);
            finalAmount *= (1 + (effectiveSynergyLevel * SYNERGY_CONFIG.temporalCultivation.effectPerLevel));
        }
        newResources[resourceId] = (newResources[resourceId] || 0) + Math.round(finalAmount);
      });
      
      // Update Synergy Stats
      const newSynergyStats = { ...state.synergyStats };
      if (plantedCrop.era === "Present") newSynergyStats.cropsHarvestedPresent += 1;
      else if (plantedCrop.era === "Prehistoric") newSynergyStats.cropsHarvestedPrehistoric += 1;
      else if (plantedCrop.era === "Future") newSynergyStats.cropsHarvestedFuture += 1;
      newState.synergyStats = newSynergyStats;

      // Rare seed drop
      let baseRareSeedChance = 0.01; // 1%
      const permRareSeedChanceLevel = state.permanentUpgradeLevels.permRareSeedChance || 0;
      if (permRareSeedChanceLevel > 0) {
          baseRareSeedChance += PERMANENT_UPGRADES_CONFIG.permRareSeedChance.effect(permRareSeedChanceLevel) as number;
      }
      if (Math.random() < baseRareSeedChance && !state.rareSeeds.includes(cropConfig.id)) {
        newState.rareSeeds = [...state.rareSeeds, cropConfig.id];
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
      newState = {
        ...defaultForPrestige, 
        chronoEnergy: state.chronoEnergy, 
        rareSeeds: [...state.rareSeeds], 
        unlockedEras: ['Present'], 
        prestigeCount: state.prestigeCount + 1,
        permanentUpgradeLevels: { ...state.permanentUpgradeLevels },
        lastTick: Date.now(), // Reset timestamps for new session
        lastUserInteractionTime: Date.now(),
        lastAutoPlantTime: Date.now(),
      };
      // Re-apply "start with autoharvest" if purchased
      if (newState.permanentUpgradeLevels.permStartWithAutoHarvestPresent > 0) {
          const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
          if (presentAutoHarvestConfig && !newState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
              newState.automationRules.push(presentAutoHarvestConfig);
              newState.activeAutomations[presentAutoHarvestConfig.id] = true;
          }
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
    case 'PURCHASE_UPGRADE': { // Era-specific upgrades
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
            // Consume rare seeds (simple count based for now, not specific seeds)
            const newRareSeeds = [...state.rareSeeds];
            newRareSeeds.splice(0, cost.rareSeeds); // Removes first N seeds
            
            newState.rareSeeds = newRareSeeds;
            newState.chronoEnergy = state.chronoEnergy - cost.chronoEnergy;
            newState.permanentUpgradeLevels = { ...state.permanentUpgradeLevels, [upgradeId]: currentLevel + 1};

            // Special handling for 'permStartWithAutoHarvestPresent'
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
    case 'GAME_TICK': {
      // Prevent tick processing if lastTick is 0 (initial default state before client hydration/load)
      if (state.lastTick === 0) {
        return { ...state, lastTick: Date.now() }; // Set lastTick to prevent immediate re-trigger
      }
      const now = Date.now();
      const newResources = { ...newState.resources };

      // Passive Sunlight Generation (Present Era)
      let passiveSunlightBonus = 0;
      const solarPanelUpgradeId = 'passiveSunlight_Present';
      if (UPGRADES_CONFIG[solarPanelUpgradeId] && state.upgradeLevels[solarPanelUpgradeId] > 0 && state.currentEra === "Present") {
          passiveSunlightBonus = UPGRADES_CONFIG[solarPanelUpgradeId].effect(state.upgradeLevels[solarPanelUpgradeId]);
      }
      if (Math.floor(now / 5000) > Math.floor(state.lastTick / 5000)) { 
         newResources.Sunlight = (newResources.Sunlight || 0) + 1 + passiveSunlightBonus;
      }

      // Automation Effects
      state.automationRules.forEach(rule => {
        if (state.activeAutomations[rule.id] && rule.era === state.currentEra) { // Process only for current era active automations
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
                    // New state from harvest is merged back in, so resource updates are captured
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
                        newState.plotSlots = [...newState.plotSlots]; // Ensure new array for reactivity
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
                if (Math.floor(now / 20000) > Math.floor(state.lastTick / 20000)) { // Every 20s
                    const emptyFutureSlots = newState.plotSlots.map((s, i) => (s === null || (s && s.era !== "Future")) ? i : -1).filter(i => i !== -1);
                    if (emptyFutureSlots.length > 0 && newState.currentEra === "Future") { // Only plant if in future era for now
                        const synthBloomId = "synthbloom";
                        // Simplified: plant without strict cost check by AutoPlanter AI for now
                        newState = gameReducer(newState, { type: 'PLANT_CROP', payload: { cropId: synthBloomId, era: "Future", slotIndex: emptyFutureSlots[0] }});
                        Object.assign(newResources, newState.resources);
                    }
                }
                break;
            case 'energytransferdrone_future': // Cross-era effect
                if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                    if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                    if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
                }
                break;

            // GrowthOptimizerFuture is applied directly in harvest check / UI progress
          }
        } else if (rule.id === 'energytransferdrone_future' && state.activeAutomations[rule.id] && rule.era === "Future") { // Special case for cross-era drone even if not in Future
             if (Math.floor(now / 10000) > Math.floor(state.lastTick / 10000)) {
                if (state.unlockedEras.includes("Present")) newResources.Energy = (newResources.Energy || 0) + 1;
                if (state.unlockedEras.includes("Prehistoric")) newResources.Energy = (newResources.Energy || 0) + 1;
            }
        }
      });
      newState.resources = newResources;
      
      // Rare Seed Auto-Plant
      if (state.rareSeeds.length > 0 && (now - state.lastAutoPlantTime) / 1000 >= 30) {
        const emptyPlotIndexes = newState.plotSlots.map((slot, index) => slot === null ? index : -1).filter(index => index !== -1);
        if (emptyPlotIndexes.length > 0) {
          const randomRareSeedId = state.rareSeeds[Math.floor(Math.random() * state.rareSeeds.length)];
          const cropToPlant = ALL_CROPS_MAP[randomRareSeedId];
          if (cropToPlant && cropToPlant.era === newState.currentEra) {
            const randomEmptySlot = emptyPlotIndexes[Math.floor(Math.random() * emptyPlotIndexes.length)];
            // Simplified: Auto-plant for free.
            newState = gameReducer(newState, {type: 'PLANT_CROP', payload: {cropId: randomRareSeedId, era: newState.currentEra, slotIndex: randomEmptySlot }});
            newState.lastAutoPlantTime = now; 
          }
        }
      }

      // Soil Quality passive regeneration (very slow)
      if (Math.floor(now / 60000) > Math.floor(state.lastTick / 60000)) { // Every 60 seconds
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

  // Load state from localStorage on initial client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStateJson = localStorage.getItem('chronoGardenSave');
      if (savedStateJson) {
        try {
          const savedState = JSON.parse(savedStateJson) as Partial<GameState>;
          const defaultState = createDefaultState();
          
          // Deep merge to handle new properties and ensure all defaults are present
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
            lastTick: Date.now(), // Reset timestamps for current session
            lastUserInteractionTime: Date.now(),
            lastAutoPlantTime: Date.now(),
            prestigeCount: savedState.prestigeCount || 0,
          };

          // Ensure activeAutomations has entries for all built rules from saved state
          mergedState.automationRules.forEach(ruleConfig => {
            if (mergedState.activeAutomations[ruleConfig.id] === undefined) {
                mergedState.activeAutomations[ruleConfig.id] = true; 
            }
          });
          
          // Re-apply permStartWithAutoHarvestPresent if purchased
          if (mergedState.permanentUpgradeLevels.permStartWithAutoHarvestPresent > 0) {
              const presentAutoHarvestConfig = AUTOMATION_RULES_CONFIG.find(r => r.id === 'autoharvester_present');
              if (presentAutoHarvestConfig && !mergedState.automationRules.find(r => r.id === presentAutoHarvestConfig.id)) {
                  mergedState.automationRules.push(presentAutoHarvestConfig);
                  mergedState.activeAutomations[presentAutoHarvestConfig.id] = true;
              }
          }

          dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: mergedState });
        } catch (e) {
          console.error("Error loading saved game state:", e);
          // Fallback to default if loading fails
          dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: { ...createDefaultState(), lastTick: Date.now(), lastUserInteractionTime: Date.now(), lastAutoPlantTime: Date.now() } });
        }
      } else {
         // If no saved state, initialize timestamps for the new session
         dispatch({ type: 'LOAD_STATE_FROM_STORAGE', payload: { ...createDefaultState(), lastTick: Date.now(), lastUserInteractionTime: Date.now(), lastAutoPlantTime: Date.now() } });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  // Save state to localStorage whenever it changes (but not on initial default render)
  useEffect(() => {
    if (typeof window !== 'undefined' && state.lastTick !== 0) { // Only save if state is initialized
      localStorage.setItem('chronoGardenSave', JSON.stringify(state));
    }
  }, [state]);

  // Game tick interval
  useEffect(() => {
    if (state.lastTick === 0) return; // Don't start tick if state is not initialized

    const tickInterval = setInterval(() => {
      dispatch({ type: 'GAME_TICK' });
    }, 1000); 

    return () => clearInterval(tickInterval);
  }, [state.lastTick]); // Depend on lastTick to re-init interval if it changes drastically (e.g. load)

  // User activity listener
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

