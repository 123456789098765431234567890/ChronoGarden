
import type { ComponentType } from 'react';
import { Briefcase, Atom, Settings, BrainCircuit, Sprout, Home, Leaf, Clock, Droplets, FlaskConical, Scroll, Dna, Bone, Tractor, Sun, Package, Wheat, Zap, Sparkles, Coins as CoinsIcon, Power, Flower2, Carrot as CarrotIcon, Apple as AppleIcon, Wind, SunDim, Mountain, Feather as FeatherIcon, SlidersHorizontal, Rocket, Recycle, CloudRain, Target, Trophy } from 'lucide-react'; // Added CloudRain, Target, Trophy

export type EraID = "Present" | "Prehistoric" | "Medieval" | "Modern" | "Future";

export interface ResourceItem {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
  initialAmount?: number;
}

export interface Crop {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  growthTime: number; // in seconds
  cost: Record<string, number>; // resourceId: amount
  yield: Record<string, number>; // resourceId: amount
  era: EraID; // Indicates which era this crop primarily belongs to
  unlockCost?: number; // chrono-energy to unlock this crop
  specialGrowthCondition?: (gameState: any) => boolean; // For QuantumBud
}

export interface EraConfig {
  id: EraID;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  unlockCost: number; // chrono-energy to unlock
  availableCrops: string[]; // IDs of crops available in this era
  specialMechanic?: string;
  eraSpecificResources: ResourceItem[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>; // Cost to implement/run
  effect: string; // Description of what it does
  isPassive?: boolean; // True if it provides a continuous effect handled by game tick
  era: EraID; // Era this automation belongs to
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  cost: (level: number) => Record<string, number>; // resourceId: amount
  effect: (level: number) => number; // Returns multiplier or bonus value
  appliesTo?: string; // e.g., 'cropGrowth', 'sunflowerYield', 'cropCost', 'passiveSunlight'
  era: EraID; // Era this upgrade belongs to
}

export interface PermanentUpgradeConfig {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  cost: (level: number) => { rareSeeds: number; chronoEnergy: number };
  effect: (level: number) => number | boolean; // Can be a multiplier or a boolean flag
  effectDescription: (level: number) => string;
}

export interface SynergyConfig {
  id: string;
  name: string;
  description: (currentEffect: number | string) => string;
  statToTrack: keyof GameState['synergyStats'];
  threshold: number; // How much of statToTrack for one level of synergy
  effectPerLevel: number;
  maxLevels?: number;
  valueSuffix?: string;
  appliesTo: 'futureChronoEnergyYield' | 'presentWaterCost' | 'prehistoricGrowthSpeed'; // Example application points
}

export type WeatherID = "clear" | "sunny" | "rainy"; // Add "stormy", "eclipse" later

export interface WeatherConfigItem {
  id: WeatherID;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  durationSeconds: { min: number; max: number };
  effects: {
    sunlightFactor?: number; // Multiplier for passive sunlight
    waterCostFactor?: number; // Multiplier for water cost when planting
    // growthSpeedFactor?: number; // For stormy
    // automationSpeedFactor?: number; // For stormy
  };
}

export type GoalID = "harvest10Carrots" | "prestigeOnce" | "unlockPrehistoric" | "find3RareSeeds";

export interface GoalConfigItem {
  id: GoalID;
  name: string;
  description: string;
  target: number;
  reward: {
    type: "chronoEnergy" | "resource" | "rareSeed";
    resourceId?: string; // if type is 'resource'
    amount: number;
  };
  icon: ComponentType<{ className?: string }>;
  statToTrack: keyof GameState['goalProgressTrackers']; // Points to specific tracker in GameState
}


export const GARDEN_PLOT_SIZE = 9; // 3x3 grid
export const GAME_VERSION = "v0.4.0"; // Updated Version

export const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "ChronoEnergy", name: "Chrono-Energy", icon: Zap, description: "Energy to manipulate time, unlock eras, and for powerful upgrades.", initialAmount: 0 },
  { id: "Water", name: "Water", icon: Droplets, description: "Essential for most plant life.", initialAmount: 50 },
  { id: "Sunlight", name: "Sunlight", icon: Sun, description: "Energy from the sun, vital for photosynthesis.", initialAmount: 50 },
  { id: "Coins", name: "Coins", icon: CoinsIcon, description: "Primary currency for purchases.", initialAmount: 100 },
  { id: "Energy", name: "Energy", icon: Power, description: "Used for automations and advanced upgrades.", initialAmount: 20 },
  { id: "Nutrients", name: "Basic Nutrients", icon: Leaf, description: "General purpose fertilizer.", initialAmount: 20 },
  // Prehistoric specific resources
  { id: "DinoBone", name: "Dino Bone", icon: Bone, description: "Fossilized bone, a sturdy material.", initialAmount: 0 },
  { id: "MysticSpores", name: "Mystic Spores", icon: Sparkles, description: "Ancient spores with unusual properties.", initialAmount: 0 },
  // Future specific resources (will be added to ALL_GAME_RESOURCES_MAP dynamically if not here)
  { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source in the Future.", initialAmount: 0 },
  { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct.", initialAmount: 0 },
  { id: "ExoticGenes", name: "Exotic Genes", icon: Dna, description: "Advanced genetic material from Future crops.", initialAmount: 0 },
  { id: "ControlledAtmosphere", name: "Climate Control Units", icon: SunDim, description: "Maintains perfect growing conditions in domes.", initialAmount: 0 },
  { id: "AdvancedNutrients", name: "Advanced Nutrients", icon: Briefcase, description: "Precisely formulated plant food for Modern/Future crops.", initialAmount: 0 },
];

export const ALL_CROPS_LIST: Crop[] = [
  // Present
  {
    id: "carrot", name: "Carrot", description: "Fast growing, low value root vegetable.", icon: CarrotIcon,
    growthTime: 30, cost: { "Water": 5, "Sunlight": 2 }, yield: { "Coins": 10 }, era: "Present"
  },
  {
    id: "tomato", name: "Tomato", description: "Medium speed, medium value fruit.", icon: AppleIcon,
    growthTime: 60, cost: { "Water": 8, "Sunlight": 5 }, yield: { "Coins": 25 }, era: "Present"
  },
  {
    id: "sunflower", name: "Sunflower", description: "Slow growing, yields Sunlight.", icon: Flower2,
    growthTime: 120, cost: { "Water": 10, "Sunlight": 1 }, yield: { "Sunlight": 50 }, era: "Present"
  },
  // Prehistoric
  { id: "mossfruit", name: "Mossfruit", description: "Fast growing, low water cost, yields some ChronoEnergy.", icon: Sprout, growthTime: 20, cost: { "Water": 3 }, yield: { "Coins": 5, "ChronoEnergy": 1, "MysticSpores": 1 }, era: "Prehistoric" },
  { id: "dinoroot", name: "Dino Root", description: "Long grow time, high Energy and ChronoEnergy yield. Requires Dino Bones.", icon: Mountain, growthTime: 180, cost: { "Water": 15, "DinoBone": 1 }, yield: { "Energy": 20, "ChronoEnergy": 5, "DinoBone": 1 }, era: "Prehistoric"},
  { id: "glowshroom", name: "Glowshroom", description: "Grows in the dark depths, yields ChronoEnergy and Mystic Spores.", icon: Sparkles, growthTime: 100, cost: { "Water": 5, "MysticSpores": 1 }, yield: { "ChronoEnergy": 10, "MysticSpores": 3 }, era: "Prehistoric"},
  // Medieval (placeholder, to be detailed in a future phase)
  { id: "mandrake", name: "Mandrake", description: "A root with mystical properties, prized by alchemists.", icon: Scroll, growthTime: 180, cost: { "Water": 15, "Nutrients": 5 }, yield: { "Coins": 100, "ChronoEnergy": 2 }, era: "Medieval" },
  // Modern (placeholder, to be detailed in a future phase)
  { id: "hydrocorn", name: "Hydroponic Corn", description: "Genetically modified corn that grows rapidly in hydroponic systems.", icon: Wheat, growthTime: 90, cost: { "Water": 25, "AdvancedNutrients": 2 }, yield: { "Coins": 150 }, era: "Modern" },
  // Future
  { id: "synthbloom", name: "Synth Bloom", description: "High-tech hybrid flower, needs Energy instead of Water. Produces valuable Energy Credits.", icon: Rocket, growthTime: 150, cost: { "Energy": 20, "AdvancedNutrients": 5 }, yield: { "EnergyCredits": 50, "ChronoEnergy": 3 }, era: "Future" },
  { id: "nanovine", name: "Nano Vine", description: "Grows extremely fast using nanites, produces perfect produce and more nanites.", icon: Atom, growthTime: 15, cost: { "NaniteSolution": 2, "EnergyCredits": 10 }, yield: { "Coins": 75, "NaniteSolution": 3 }, era: "Future" },
  {
    id: "quantumbud", name: "Quantum Bud", description: "Grows only when other eras are thriving. Yields rare Exotic Genes and significant ChronoEnergy.", icon: BrainCircuit,
    growthTime: 300, cost: { "ChronoEnergy": 25, "EnergyCredits": 100 }, yield: { "ExoticGenes": 1, "ChronoEnergy": 50 }, era: "Future",
    specialGrowthCondition: (gameState) => (gameState.synergyStats.cropsHarvestedPresent >= 50 && gameState.synergyStats.cropsHarvestedPrehistoric >= 25)
  },
];

export const ALL_CROPS_MAP: Record<string, Crop> = ALL_CROPS_LIST.reduce((acc, crop) => {
  acc[crop.id] = crop;
  return acc;
}, {} as Record<string, Crop>);


export const ERAS: Record<EraID, EraConfig> = {
  "Present": {
    id: "Present",
    name: "Present Day Fields",
    description: "Your journey begins in a familiar setting. Master the basics of cultivation.",
    icon: Home,
    unlockCost: 0,
    availableCrops: ["carrot", "tomato", "sunflower"],
    eraSpecificResources: [],
    specialMechanic: "Basic tools and understanding of farming. Manage Water, Sunlight, Coins and Energy.",
  },
  "Prehistoric": {
    id: "Prehistoric",
    name: "Primordial Jungle",
    description: "Travel to a time of colossal flora and ancient creatures. Harness raw, powerful natural resources.",
    icon: Dna,
    unlockCost: 100,
    availableCrops: ["mossfruit", "dinoroot", "glowshroom"],
    eraSpecificResources: [
       { id: "DinoBone", name: "Dino Bone", icon: Bone, description: "Fossilized bone, a sturdy material." },
       { id: "MysticSpores", name: "Mystic Spores", icon: Sparkles, description: "Ancient spores with unusual properties." },
    ],
    specialMechanic: "Utilize DinoBones and MysticSpores. Harvest crops to gain ChronoEnergy.",
  },
  "Medieval": {
    id: "Medieval",
    name: "Alchemist's Garden",
    description: "Enter an era of knights, castles, and budding alchemy. (Content for this era coming in a future phase).",
    icon: FlaskConical,
    unlockCost: 500,
    availableCrops: ["mandrake"],
    eraSpecificResources: [],
    specialMechanic: "Alchemy-based upgrades for soil and plants. (Mechanics to be implemented).",
  },
  "Modern": {
    id: "Modern",
    name: "Automated Farmlands",
    description: "The age of technology and efficiency. (Content for this era coming in a future phase).",
    icon: Settings,
    unlockCost: 2000,
    availableCrops: ["hydrocorn"],
    eraSpecificResources: [],
    specialMechanic: "Deploy drones, sprinklers, and automated harvesters. (Mechanics to be implemented).",
  },
  "Future": {
    id: "Future",
    name: "Bio-Engineered Domes",
    description: "Step into a future where nature and technology are seamlessly integrated. Optimize crops with AI and control climate.",
    icon: BrainCircuit,
    unlockCost: 5000,
    availableCrops: ["synthbloom", "nanovine", "quantumbud"],
    eraSpecificResources: [
      { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source in the Future." },
      { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct." },
      { id: "ExoticGenes", name: "Exotic Genes", icon: Dna, description: "Advanced genetic material from Future crops." },
      { id: "ControlledAtmosphere", name: "Atmo Regulator", icon: Wind, description: "Device to manage dome atmosphere, used by some plants." },
      { id: "AdvancedNutrients", name: "Advanced Nutrients", icon: Briefcase, description: "Precisely formulated plant food." },
    ],
    specialMechanic: "AI crop engineers provide optimization. Climate domes allow precise environmental control. Gene splicing for hybrid crops.",
  },
};

const combinedEraResources = Object.values(ERAS).reduce((acc, era) => {
  era.eraSpecificResources.forEach(res => {
    if (!acc[res.id]) {
      acc[res.id] = res;
    }
  });
  return acc;
}, {} as Record<string, ResourceItem>);

export const ALL_GAME_RESOURCES_MAP: Record<string, ResourceItem> = {
  ...INITIAL_RESOURCES.reduce((acc, r) => ({...acc, [r.id]: r}), {}),
  ...combinedEraResources,
  ...ALL_CROPS_LIST.reduce((acc, crop) => {
    Object.keys(crop.yield).forEach((yieldKey) => {
      if (!acc[yieldKey] && !INITIAL_RESOURCES.find(r => r.id === yieldKey) && !combinedEraResources[yieldKey]) {
        const defaultIcon = crop.icon || Package;
        acc[yieldKey] = { id: yieldKey, name: yieldKey.replace(/([A-Z])/g, ' $1').trim(), icon: defaultIcon, description: `Product of ${crop.name}` };
      }
    });
    return acc;
  }, {} as Record<string, ResourceItem>)
};


export const AUTOMATION_RULES_CONFIG: AutomationRule[] = [
  // Present
  {
    id: "sprinkler_present",
    name: "Basic Sprinkler",
    description: "Waters crops, passively generating a small amount of Water.",
    cost: { "Coins": 50, "Energy": 10 },
    effect: "Passively generates 1 Water every 10 seconds.",
    isPassive: true,
    era: "Present",
  },
  {
    id: "autoharvester_present",
    name: "Basic AutoHarvester",
    description: "Harvests one random mature crop from the Present Day era.",
    cost: { "Coins": 100, "Energy": 25 },
    effect: "Automatically harvests one mature Present Day crop every 15 seconds.",
    isPassive: true,
    era: "Present",
  },
  // Prehistoric
  {
    id: "raptorharvester_prehistoric",
    name: "Raptor Harvester",
    description: "A swift raptor helps harvest mature Prehistoric crops. A bit clumsy.",
    cost: { "Coins": 200, "Energy": 50, "DinoBone": 5 },
    effect: "Harvests one random mature Prehistoric crop every 10s. 5% chance to uproot young plant.",
    isPassive: true,
    era: "Prehistoric",
  },
  {
    id: "tarpitsprinkler_prehistoric",
    name: "Tar Pit Sprinkler",
    description: "Slowly seeps nutrient-rich water and mystic spores.",
    cost: { "Coins": 150, "Energy": 40, "MysticSpores": 10 },
    effect: "Passively generates 2 Water and 1 Mystic Spore every 20 seconds.",
    isPassive: true,
    era: "Prehistoric",
  },
  // Future
  {
    id: "autoplanter_ai_future",
    name: "AutoPlanter AI",
    description: "AI system that automatically plants Synth Blooms in empty Future plots.",
    cost: { "Coins": 1000, "ChronoEnergy": 50, "EnergyCredits": 200 },
    effect: "Automatically plants a Synth Bloom in an empty Future plot every 20 seconds if resources allow.",
    isPassive: true,
    era: "Future",
  },
  {
    id: "growthoptimizer_future",
    name: "Growth Optimizer (Future)",
    description: "Advanced temporal field that reduces growth times for all Future era crops by 25%.",
    cost: { "Coins": 2000, "ChronoEnergy": 100, "EnergyCredits": 500 },
    effect: "Future era crops grow 25% faster.",
    isPassive: true,
    era: "Future",
  },
  {
    id: "energytransferdrone_future",
    name: "Energy Transfer Drone",
    description: "Drones that efficiently transfer surplus energy to other active eras.",
    cost: { "Coins": 1500, "ChronoEnergy": 75, "NaniteSolution": 10 },
    effect: "Passively generates 1 Energy every 10 seconds in Present & Prehistoric eras if active.",
    isPassive: true,
    era: "Future",
  },
];

export const UPGRADES_CONFIG: Record<string, UpgradeConfig> = {
  // Present Day Upgrades
  cropGrowth_Present: {
    id: 'cropGrowth_Present',
    name: 'Faster Crop Growth (Present)',
    description: 'Present Day crops grow faster.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 50 * Math.pow(2, level), "Energy": 10 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.1), // 10% reduction per level
    appliesTo: 'cropGrowth_Present',
    era: "Present",
  },
  sunflowerBoost_Present: {
    id: 'sunflowerBoost_Present',
    name: 'Sunflower Sunlight Boost',
    description: 'Sunflowers produce more Sunlight.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 75 * Math.pow(2, level), "Energy": 5 * Math.pow(1.5, level) }),
    effect: (level) => 1 + (level * 0.2), // 20% bonus per level
    appliesTo: 'sunflowerYield',
    era: "Present",
  },
  cheaperCrops_Present: {
    id: 'cheaperCrops_Present',
    name: 'Cheaper Crop Costs (Present)',
    description: 'Reduces planting cost for Present Day crops.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 100 * Math.pow(2.5, level), "Energy": 20 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.15), // 15% cost reduction per level
    appliesTo: 'cropCost_Present',
    era: "Present",
  },
  waterCost_Present: {
    id: 'waterCost_Present',
    name: 'Drip Irrigation (Present)',
    description: 'Reduces Water cost for planting Present Day crops by 20% per level.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 120 * Math.pow(2, level), "Energy": 15 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.20),
    appliesTo: 'waterCost_Present',
    era: "Present",
  },
  passiveSunlight_Present: {
    id: 'passiveSunlight_Present',
    name: 'Solar Panels (Present)',
    description: 'Increases passive Sunlight generation by 1 per level in Present era.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 200 * Math.pow(2, level), "Energy": 50 * Math.pow(1.8, level) }),
    effect: (level) => level * 1,
    appliesTo: 'passiveSunlight_Present',
    era: "Present",
  },
  // Prehistoric Upgrades
  cropGrowth_Prehistoric: {
    id: 'cropGrowth_Prehistoric',
    name: 'Dino Dung Fertilizer (Prehistoric)',
    description: 'Prehistoric crops grow 15% faster per level. Requires Dino Bones.',
    maxLevel: 4,
    cost: (level) => ({ "Coins": 100 * Math.pow(2.2, level), "DinoBone": 5 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.15),
    appliesTo: 'cropGrowth_Prehistoric',
    era: "Prehistoric",
  },
  yield_Prehistoric: {
    id: 'yield_Prehistoric',
    name: 'Ancient Spores Mastery (Prehistoric)',
    description: 'Increases yield of Mystic Spores and ChronoEnergy from Prehistoric crops by 10% per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 150 * Math.pow(2.1, level), "MysticSpores": 10 * Math.pow(1.7, level) }),
    effect: (level) => 1 + (level * 0.10),
    appliesTo: 'yield_Prehistoric',
    era: "Prehistoric",
  },
  // Future Upgrades
  cropGrowth_Future: {
    id: 'cropGrowth_Future',
    name: 'Quantum Entanglement Growth (Future)',
    description: 'Future crops benefit from temporal manipulation, growing 12% faster per level.',
    maxLevel: 5,
    cost: (level) => ({ "EnergyCredits": 500 * Math.pow(2, level), "ChronoEnergy": 20 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.12),
    appliesTo: 'cropGrowth_Future',
    era: "Future",
  },
  yield_Future: {
    id: 'yield_Future',
    name: 'Nanite Yield Optimization (Future)',
    description: 'Increases yield of Energy Credits and Exotic Genes from Future crops by 15% per level.',
    maxLevel: 4,
    cost: (level) => ({ "EnergyCredits": 750 * Math.pow(2.2, level), "NaniteSolution": 5 * Math.pow(1.9, level) }),
    effect: (level) => 1 + (level * 0.15),
    appliesTo: 'yield_Future',
    era: "Future",
  },
};

export const PERMANENT_UPGRADES_CONFIG: Record<string, PermanentUpgradeConfig> = {
  permGlobalGrowSpeed: {
    id: 'permGlobalGrowSpeed',
    name: 'Global Chronal Acceleration',
    description: 'All crops across all eras grow slightly faster permanently.',
    maxLevel: 5,
    cost: (level) => ({ rareSeeds: (level + 1) * 2, chronoEnergy: 500 * Math.pow(2.5, level) }),
    effect: (level) => 1 - (level * 0.05), // 5% reduction per level
    effectDescription: (level) => `All crops grow ${level * 5}% faster.`
  },
  permStartWithAutoHarvestPresent: {
    id: 'permStartWithAutoHarvestPresent',
    name: 'Legacy Auto-Harvester Schematics',
    description: 'Begin each new timeline with the Present Day AutoHarvester already researched and built.',
    maxLevel: 1,
    cost: (level) => ({ rareSeeds: 5, chronoEnergy: 1000 }),
    effect: (level) => level >= 1, // boolean flag
    effectDescription: (level) => level >= 1 ? "Present AutoHarvester unlocked from start." : "Unlocks Present AutoHarvester from start."
  },
  permRareSeedChance: {
    id: 'permRareSeedChance',
    name: 'Echoes of Rarity',
    description: 'Slightly increases the chance of finding Rare Seeds during harvest.',
    maxLevel: 4, // Max +1%
    cost: (level) => ({ rareSeeds: (level + 1) * 3, chronoEnergy: 750 * Math.pow(2.8, level) }),
    effect: (level) => level * 0.0025, // +0.25% per level (added to base 1%)
    effectDescription: (level) => `+${(level * 0.25).toFixed(2)}% Rare Seed drop chance.`
  },
};

export const SYNERGY_CONFIG: Record<string, SynergyConfig> = {
  temporalCultivation: {
    id: 'temporalCultivation',
    name: 'Temporal Cultivation',
    description: (currentEffect) => `Increases ChronoEnergy yield from Future crops by ${Number(currentEffect).toFixed(1)}%.`,
    statToTrack: 'cropsHarvestedPresent',
    threshold: 100, // crops for 1%
    effectPerLevel: 0.01, // 1%
    maxLevels: 20, // Max 20%
    valueSuffix: '%',
    appliesTo: 'futureChronoEnergyYield',
  },
  primordialEchoes: {
    id: 'primordialEchoes',
    name: 'Primordial Echoes',
    description: (currentEffect) => `Reduces Water cost for Present Day crops by ${Number(currentEffect).toFixed(1)}%.`,
    statToTrack: 'cropsHarvestedPrehistoric',
    threshold: 50, // crops for 1%
    effectPerLevel: 0.01, // 1%
    maxLevels: 25, // Max 25%
    valueSuffix: '%',
    appliesTo: 'presentWaterCost',
  },
};

export const WEATHER_CONFIG: Record<WeatherID, WeatherConfigItem> = {
  clear: {
    id: "clear",
    name: "Clear Skies",
    description: "A calm day in the garden.",
    icon: Sun, // Placeholder, could be a "clear sky" icon or Sun
    durationSeconds: { min: 60, max: 120 },
    effects: { sunlightFactor: 1, waterCostFactor: 1 },
  },
  sunny: {
    id: "sunny",
    name: "Sunny Day",
    description: "Bright sunshine boosts passive Sunlight generation.",
    icon: Sun,
    durationSeconds: { min: 45, max: 90 },
    effects: { sunlightFactor: 1.2, waterCostFactor: 1 }, // +20% passive sunlight
  },
  rainy: {
    id: "rainy",
    name: "Gentle Rain",
    description: "Crops don't require Water for planting during the rain.",
    icon: CloudRain,
    durationSeconds: { min: 30, max: 60 },
    effects: { sunlightFactor: 0.8, waterCostFactor: 0 }, // No water cost
  },
};

export const GOALS_CONFIG: Record<GoalID, GoalConfigItem> = {
  harvest10Carrots: {
    id: "harvest10Carrots",
    name: "First Harvest",
    description: "Harvest 10 Carrots in the Present Day era.",
    target: 10,
    reward: { type: "chronoEnergy", amount: 20 },
    icon: CarrotIcon,
    statToTrack: "carrotsHarvested",
  },
  unlockPrehistoric: {
    id: "unlockPrehistoric",
    name: "Time Traveler",
    description: "Unlock the Prehistoric Era.",
    target: 1,
    reward: { type: "chronoEnergy", amount: 50 },
    icon: Dna,
    statToTrack: "prehistoricUnlocked",
  },
  prestigeOnce: {
    id: "prestigeOnce",
    name: "Loop Master",
    description: "Prestige your garden for the first time.",
    target: 1,
    reward: { type: "rareSeed", amount: 1 }, // Gives 1 random rare seed
    icon: Recycle,
    statToTrack: "prestigeCount",
  },
  find3RareSeeds: {
    id: "find3RareSeeds",
    name: "Seed Collector",
    description: "Discover 3 different Rare Seeds.",
    target: 3,
    reward: { type: "chronoEnergy", amount: 100 },
    icon: Sparkles,
    statToTrack: "rareSeedsFoundCount",
  }
};


// For GameContext state, to avoid circular dependencies.
// This is a simplified version for type checking in GameContext.
// The actual state object will be in GameContext.
export interface GameState {
  currentEra: EraID;
  unlockedEras: EraID[];
  chronoEnergy: number;
  resources: Record<string, number>;
  plotSlots: Array<any | null>; // Simplified PlantedCrop
  automationRules: AutomationRule[];
  activeAutomations: Record<string, boolean>;
  rareSeeds: string[];
  soilQuality: number;
  isLoadingAiSuggestion: boolean;
  aiSuggestion: string | null;
  upgradeLevels: Record<string, number>;
  lastTick: number;
  lastUserInteractionTime: number;
  lastAutoPlantTime: number;
  prestigeCount: number;
  permanentUpgradeLevels: Record<string, number>;
  synergyStats: {
    cropsHarvestedPresent: number;
    cropsHarvestedPrehistoric: number;
    cropsHarvestedFuture: number;
  };
  currentWeatherId: WeatherID | null;
  weatherEndTime: number;
  goalStatus: Record<GoalID, { progress: number; completed: boolean }>;
  goalProgressTrackers: { // Specific counters for goals
    carrotsHarvested: number;
    prehistoricUnlocked: number; // Binary 0 or 1
    // prestigeCount is already in GameState
    rareSeedsFoundCount: number; // Tracks unique rare seeds found for goal
  };
}

// Helper to get a random weather ID, excluding current and 'clear' if possible
export const getRandomWeatherId = (currentWeatherId: WeatherID | null): WeatherID => {
  const weatherKeys = Object.keys(WEATHER_CONFIG) as WeatherID[];
  let possibleWeather = weatherKeys.filter(id => id !== currentWeatherId);
  if (possibleWeather.length === 0) possibleWeather = weatherKeys; // Fallback if only one weather defined

  // Try to avoid 'clear' back-to-back if other options exist
  if (currentWeatherId !== 'clear' && possibleWeather.includes('clear') && possibleWeather.length > 1) {
      possibleWeather = possibleWeather.filter(id => id !== 'clear');
  }
  
  return possibleWeather[Math.floor(Math.random() * possibleWeather.length)];
};

// Helper to get a random duration for weather
export const getRandomWeatherDuration = (weatherId: WeatherID): number => {
    const config = WEATHER_CONFIG[weatherId];
    if (!config) return 60 * 1000; // Default 60 seconds
    const duration = Math.floor(Math.random() * (config.durationSeconds.max - config.durationSeconds.min + 1)) + config.durationSeconds.min;
    return duration * 1000; // Convert to milliseconds
};

