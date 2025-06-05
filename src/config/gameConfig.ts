
import type { ComponentType } from 'react';
import { Briefcase, Atom, Settings, BrainCircuit, Sprout, Home, Leaf, Clock, Droplets, FlaskConical, Scroll, Dna, Bone, Tractor, Sun, Package, Wheat, Zap, Sparkles, Coins as CoinsIcon, Power, Flower2, Carrot as CarrotIcon, Apple as AppleIcon, Wind, SunDim, Mountain, Feather as FeatherIcon, SlidersHorizontal, Rocket, Recycle, CloudRain, CloudLightning, Target, Trophy, UserCircle, Palette, CheckSquare, Gift, Award, Users, MessageCircle, BookOpen } from 'lucide-react';

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
  specialGrowthCondition?: (gameState: any) => boolean;
  isIdleDependent?: boolean; // For Glowshroom
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

export type WeatherID = "clear" | "sunny" | "rainy" | "stormy" | "solarEclipse";

export interface WeatherConfigItem {
  id: WeatherID;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  durationSeconds: { min: number; max: number };
  effects: {
    sunlightFactor?: number;
    waterCostFactor?: number;
    globalGrowthSpeedFactor?: number; // For stormy
    automationTickMultiplier?: number; // For stormy, e.g., 1.5 means 1.5x longer ticks
    futureCropGrowthFactor?: number; // For solar eclipse
  };
  rarityWeight?: number; // For weighted random selection
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
  statToTrack: keyof GameState['goalProgressTrackers'];
}

export type QuestType = 'harvestSpecificCrop' | 'growWhileWeather';
export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed';

export interface QuestConfig {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  era: EraID;
  targetCropId?: string; // For 'harvestSpecificCrop'
  targetAmount?: number; // For 'harvestSpecificCrop'
  requiredWeatherId?: WeatherID; // For 'growWhileWeather'
  durationMinutes?: number; // Optional timer for quest
  reward: {
    type: "chronoEnergy" | "rareSeed" | "coins";
    amount: number;
  };
  dialogue: {
    greeting: string;
    questAccepted: string;
    questInProgress: string;
    questCompleted: string;
    questFailed?: string; // Dialogue for when a timed quest fails
  };
}

export type VisitorID = "gardenerGreg" | "cavechildKai" | "botanyBot9";

export interface VisitorConfig {
  id: VisitorID;
  name: string;
  era: EraID;
  icon: ComponentType<{ className?: string }>;
  quests: QuestConfig[]; // Potential quests this visitor can offer
  spawnChance: number; // e.g., 0.1 for 10% chance per suitable tick
}

export type PrestigeTierID = "Novice" | "Apprentice" | "Adept" | "Master" | "Grandmaster";
const TreePalm = Award; // Using Award as a placeholder for TreePalm, defined before usage.

export interface PrestigeTierConfig {
  id: PrestigeTierID;
  minPrestigeCount: number;
  icon: ComponentType<{ className?: string }>;
  title: string;
}

export interface LeaderboardEntry {
  id: string; // playerName or UID
  name: string;
  totalCropsHarvested: number;
  prestigeCount: number;
  totalChronoEnergyEarned: number;
  lastUpdate?: number;
}

export interface LoreEntry {
  id: string;
  title: string;
  content: string; // Can be multi-line
  unlockHint: string; // Hint for how to unlock it
  isUnlockedByDefault?: boolean;
}


export const GARDEN_PLOT_SIZE = 9;
export const GAME_VERSION = "v0.6.0"; 
export const IDLE_THRESHOLD_SECONDS = 10;
export const NANO_VINE_DECAY_WINDOW_SECONDS = 20;
export const VISITOR_SPAWN_CHECK_INTERVAL_SECONDS = 60; // Check every minute
export const QUEST_PROGRESS_SAVE_INTERVAL_SECONDS = 30; // Not actively used yet but good constant


export const PRESTIGE_TIERS_CONFIG: Record<PrestigeTierID, PrestigeTierConfig> = {
  Novice: { id: "Novice", minPrestigeCount: 0, icon: Sprout, title: "Novice Time Gardener" },
  Apprentice: { id: "Apprentice", minPrestigeCount: 1, icon: Leaf, title: "Apprentice Chronoculturist" },
  Adept: { id: "Adept", minPrestigeCount: 5, icon: Flower2, title: "Adept Temporal Botanist" },
  Master: { id: "Master", minPrestigeCount: 10, icon: TreePalm, title: "Master of Chrono-Harvests" },
  Grandmaster: { id: "Grandmaster", minPrestigeCount: 20, icon: BrainCircuit, title: "Grandmaster of the Eternal Garden" }
};


export const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "ChronoEnergy", name: "Chrono-Energy", icon: Zap, description: "Energy to manipulate time, unlock eras, and for powerful upgrades.", initialAmount: 0 },
  { id: "Water", name: "Water", icon: Droplets, description: "Essential for most plant life.", initialAmount: 50 },
  { id: "Sunlight", name: "Sunlight", icon: Sun, description: "Energy from the sun, vital for photosynthesis.", initialAmount: 50 },
  { id: "Coins", name: "Coins", icon: CoinsIcon, description: "Primary currency for purchases.", initialAmount: 100 },
  { id: "Energy", name: "Energy", icon: Power, description: "Used for automations and advanced upgrades.", initialAmount: 20 },
  { id: "Nutrients", name: "Basic Nutrients", icon: Leaf, description: "General purpose fertilizer.", initialAmount: 20 },
  { id: "DinoBone", name: "Dino Bone", icon: Bone, description: "Fossilized bone, a sturdy material.", initialAmount: 0 },
  { id: "MysticSpores", name: "Mystic Spores", icon: Sparkles, description: "Ancient spores with unusual properties.", initialAmount: 0 },
  { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source in the Future.", initialAmount: 0 },
  { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct.", initialAmount: 0 },
  { id: "ExoticGenes", name: "Exotic Genes", icon: Dna, description: "Advanced genetic material from Future crops.", initialAmount: 0 },
  { id: "ControlledAtmosphere", name: "Climate Control Units", icon: SunDim, description: "Maintains perfect growing conditions in domes.", initialAmount: 0 },
  { id: "AdvancedNutrients", name: "Advanced Nutrients", icon: Briefcase, description: "Precisely formulated plant food for Modern/Future crops.", initialAmount: 0 },
];

export const ALL_CROPS_LIST: Crop[] = [
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
  { id: "mossfruit", name: "Mossfruit", description: "Fast growing, low water cost, yields some ChronoEnergy.", icon: Sprout, growthTime: 20, cost: { "Water": 3 }, yield: { "Coins": 5, "ChronoEnergy": 1, "MysticSpores": 1 }, era: "Prehistoric" },
  { id: "dinoroot", name: "Dino Root", description: "Long grow time, high Energy and ChronoEnergy yield. Requires Dino Bones.", icon: Mountain, growthTime: 180, cost: { "Water": 15, "DinoBone": 1 }, yield: { "Energy": 20, "ChronoEnergy": 5, "DinoBone": 1 }, era: "Prehistoric"},
  { 
    id: "glowshroom", name: "Glowshroom", description: "Grows best when undisturbed, yields ChronoEnergy and Mystic Spores.", icon: Sparkles, growthTime: 100, cost: { "Water": 5, "MysticSpores": 1 }, yield: { "ChronoEnergy": 10, "MysticSpores": 3 }, era: "Prehistoric",
    isIdleDependent: true,
  },
  { id: "mandrake", name: "Mandrake", description: "A root with mystical properties, prized by alchemists.", icon: Scroll, growthTime: 180, cost: { "Water": 15, "Nutrients": 5 }, yield: { "Coins": 100, "ChronoEnergy": 2 }, era: "Medieval" },
  { id: "hydrocorn", name: "Hydroponic Corn", description: "Genetically modified corn that grows rapidly in hydroponic systems.", icon: Wheat, growthTime: 90, cost: { "Water": 25, "AdvancedNutrients": 2 }, yield: { "Coins": 150 }, era: "Modern" },
  { id: "synthbloom", name: "Synth Bloom", description: "High-tech hybrid flower, needs Energy instead of Water. Produces valuable Energy Credits.", icon: Rocket, growthTime: 150, cost: { "Energy": 20, "AdvancedNutrients": 5 }, yield: { "EnergyCredits": 50, "ChronoEnergy": 3 }, era: "Future" },
  { id: "nanovine", name: "Nano Vine", description: "Grows extremely fast using nanites, produces perfect produce and more nanites. Harvest quickly or it decays!", icon: Atom, growthTime: 15, cost: { "NaniteSolution": 2, "EnergyCredits": 10 }, yield: { "Coins": 75, "NaniteSolution": 3 }, era: "Future" },
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
    specialMechanic: "Utilize DinoBones and MysticSpores. Harvest crops to gain ChronoEnergy. Glowshrooms require player idle time.",
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
    specialMechanic: "AI crop engineers provide optimization. Climate domes allow precise environmental control. Gene splicing for hybrid crops. Nano Vines decay quickly if not harvested.",
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
  {
    id: "autoplanter_ai_future",
    name: "AutoPlanter AI (Future)",
    description: "AI system that automatically plants the most valuable Future crop.",
    cost: { "Coins": 1000, "ChronoEnergy": 50, "EnergyCredits": 200 },
    effect: "Attempts to plant the best Future crop in an empty plot every 25 seconds.",
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
    description: 'Present Day crops grow faster by 10% per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 50 * Math.pow(2, level), "Energy": 10 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.1),
    appliesTo: 'Present Era Crop Growth Time',
    era: "Present",
  },
  sunflowerBoost_Present: {
    id: 'sunflowerBoost_Present',
    name: 'Sunflower Sunlight Boost',
    description: 'Sunflowers produce 20% more Sunlight per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 75 * Math.pow(2, level), "Energy": 5 * Math.pow(1.5, level) }),
    effect: (level) => 1 + (level * 0.2),
    appliesTo: 'Sunflower Sunlight Yield',
    era: "Present",
  },
  cheaperCrops_Present: {
    id: 'cheaperCrops_Present',
    name: 'Cheaper Crop Costs (Present)',
    description: 'Reduces planting cost (non-Water) for Present Day crops by 15% per level.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 100 * Math.pow(2.5, level), "Energy": 20 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.15),
    appliesTo: 'Present Era Crop Non-Water Cost',
    era: "Present",
  },
  waterCost_Present: {
    id: 'waterCost_Present',
    name: 'Drip Irrigation (Present)',
    description: 'Reduces Water cost for planting Present Day crops by 20% per level.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 120 * Math.pow(2, level), "Energy": 15 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.20),
    appliesTo: 'Present Era Crop Water Cost',
    era: "Present",
  },
  passiveSunlight_Present: {
    id: 'passiveSunlight_Present',
    name: 'Solar Panels (Present)',
    description: 'Increases passive Sunlight generation by +1 per second per level in Present era.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 200 * Math.pow(2, level), "Energy": 50 * Math.pow(1.8, level) }),
    effect: (level) => level * 1,
    appliesTo: 'Present Era Passive Sunlight',
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
    appliesTo: 'Prehistoric Era Crop Growth Time',
    era: "Prehistoric",
  },
  yield_Prehistoric: {
    id: 'yield_Prehistoric',
    name: 'Ancient Spores Mastery (Prehistoric)',
    description: 'Increases yield of Mystic Spores and ChronoEnergy from Prehistoric crops by 10% per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 150 * Math.pow(2.1, level), "MysticSpores": 10 * Math.pow(1.7, level) }),
    effect: (level) => 1 + (level * 0.10),
    appliesTo: 'Prehistoric Era Crop Mystic Spore & ChronoEnergy Yield',
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
    appliesTo: 'Future Era Crop Growth Time',
    era: "Future",
  },
  yield_Future: {
    id: 'yield_Future',
    name: 'Nanite Yield Optimization (Future)',
    description: 'Increases yield of Energy Credits and Exotic Genes from Future crops by 15% per level.',
    maxLevel: 4,
    cost: (level) => ({ "EnergyCredits": 750 * Math.pow(2.2, level), "NaniteSolution": 5 * Math.pow(1.9, level) }),
    effect: (level) => 1 + (level * 0.15),
    appliesTo: 'Future Era Crop Energy Credit & Exotic Gene Yield',
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
    effect: (level) => 1 - (level * 0.05),
    effectDescription: (level) => `All crops grow ${level * 5}% faster.`
  },
  permStartWithAutoHarvestPresent: {
    id: 'permStartWithAutoHarvestPresent',
    name: 'Legacy Auto-Harvester Schematics',
    description: 'Begin each new timeline with the Present Day AutoHarvester already researched and built.',
    maxLevel: 1,
    cost: (level) => ({ rareSeeds: 5, chronoEnergy: 1000 }),
    effect: (level) => level >= 1,
    effectDescription: (level) => level >= 1 ? "Present AutoHarvester unlocked from start." : "Unlocks Present AutoHarvester from start."
  },
  permRareSeedChance: {
    id: 'permRareSeedChance',
    name: 'Echoes of Rarity',
    description: 'Slightly increases the chance of finding Rare Seeds during harvest.',
    maxLevel: 4,
    cost: (level) => ({ rareSeeds: (level + 1) * 3, chronoEnergy: 750 * Math.pow(2.8, level) }),
    effect: (level) => level * 0.0025, // +0.25% per level
    effectDescription: (level) => `+${(level * 0.25).toFixed(2)}% Rare Seed drop chance.`
  },
  permEraSwitchBonus: {
    id: 'permEraSwitchBonus',
    name: 'Temporal Attunement',
    description: 'Gain a small random resource bonus upon switching to a new era.',
    maxLevel: 3,
    cost: (level) => ({ rareSeeds: (level + 1) * 2, chronoEnergy: 700 * Math.pow(2.2, level) }),
    effect: (level) => level * 5, // Represents the amount of random resource bonus
    effectDescription: (level) => `Receive ${level * 5} of a random common resource when switching eras.`
  },
};

export const SYNERGY_CONFIG: Record<string, SynergyConfig> = {
  temporalCultivation: {
    id: 'temporalCultivation',
    name: 'Temporal Cultivation',
    description: (currentEffect) => `Increases ChronoEnergy yield from Future crops by ${Number(currentEffect).toFixed(1)}%. Based on Present crops.`,
    statToTrack: 'cropsHarvestedPresent',
    threshold: 100,
    effectPerLevel: 0.01, // 1%
    maxLevels: 20,
    valueSuffix: '%',
    appliesTo: 'futureChronoEnergyYield',
  },
  primordialEchoes: {
    id: 'primordialEchoes',
    name: 'Primordial Echoes',
    description: (currentEffect) => `Reduces Water cost for Present Day crops by ${Number(currentEffect).toFixed(1)}%. Based on Prehistoric crops.`,
    statToTrack: 'cropsHarvestedPrehistoric',
    threshold: 50,
    effectPerLevel: 0.01, // 1%
    maxLevels: 25, // Max 25% reduction
    valueSuffix: '%',
    appliesTo: 'presentWaterCost',
  },
};

export const WEATHER_CONFIG: Record<WeatherID, WeatherConfigItem> = {
  clear: {
    id: "clear", name: "Clear Skies", description: "A calm day in the garden.", icon: Sun,
    durationSeconds: { min: 60, max: 120 }, effects: { sunlightFactor: 1, waterCostFactor: 1 }, rarityWeight: 40,
  },
  sunny: {
    id: "sunny", name: "Sunny Day", description: "Bright sunshine boosts passive Sunlight generation by 20%.", icon: Sun,
    durationSeconds: { min: 45, max: 90 }, effects: { sunlightFactor: 1.2, waterCostFactor: 1 }, rarityWeight: 20,
  },
  rainy: {
    id: "rainy", name: "Gentle Rain", description: "Crops don't require Water for planting during the rain. Sunlight reduced by 20%.", icon: CloudRain,
    durationSeconds: { min: 30, max: 60 }, effects: { sunlightFactor: 0.8, waterCostFactor: 0 }, rarityWeight: 20,
  },
  stormy: {
    id: "stormy", name: "Temporal Storm", description: "Automations slowed (ticks take 50% longer), but crops grow 25% faster. Sunlight reduced by 30%.", icon: CloudLightning,
    durationSeconds: { min: 40, max: 80 }, effects: { globalGrowthSpeedFactor: 0.75, automationTickMultiplier: 1.5, sunlightFactor: 0.7 }, rarityWeight: 15,
  },
  solarEclipse: {
    id: "solarEclipse", name: "Solar Eclipse (Rare)", description: "Rare event! Future crops grow twice as fast. Sunlight severely reduced by 50%.", icon: SunDim,
    durationSeconds: { min: 20, max: 40 }, effects: { futureCropGrowthFactor: 0.5, sunlightFactor: 0.5 }, rarityWeight: 5,
  },
};

export const GOALS_CONFIG: Record<GoalID, GoalConfigItem> = {
  harvest10Carrots: {
    id: "harvest10Carrots", name: "First Harvest", description: "Harvest 10 Carrots in the Present Day era.",
    target: 10, reward: { type: "chronoEnergy", amount: 20 }, icon: CarrotIcon, statToTrack: "carrotsHarvested",
  },
  unlockPrehistoric: {
    id: "unlockPrehistoric", name: "Time Traveler", description: "Unlock the Prehistoric Era.",
    target: 1, reward: { type: "chronoEnergy", amount: 50 }, icon: Dna, statToTrack: "prehistoricUnlocked",
  },
  prestigeOnce: {
    id: "prestigeOnce", name: "Loop Master", description: "Prestige your garden for the first time.",
    target: 1, reward: { type: "rareSeed", amount: 1 }, icon: Recycle, statToTrack: "prestigeCount",
  },
  find3RareSeeds: {
    id: "find3RareSeeds", name: "Seed Collector", description: "Discover 3 different Rare Seeds.",
    target: 3, reward: { type: "chronoEnergy", amount: 100 }, icon: Sparkles, statToTrack: "rareSeedsFoundCount",
  }
};

export const NPC_QUESTS_CONFIG: Record<string, QuestConfig> = {
  present_harvestCarrots: {
    id: "present_harvestCarrots", title: "Carrot Craving", era: "Present",
    description: "Gardener Greg really wants some carrots. Harvest 20 Carrots for him within 3 minutes.",
    type: 'harvestSpecificCrop', targetCropId: 'carrot', targetAmount: 20, durationMinutes: 3,
    reward: { type: 'coins', amount: 100 },
    dialogue: {
      greeting: "Howdy, partner! Nice lookin' garden. Say, I'm starvin'! Could you fetch me 20 carrots? I'm on a tight schedule!",
      questAccepted: "Great! But be quick, I ain't got all day!",
      questInProgress: "Tick-tock! Those carrots ain't gonna pick themselves!",
      questCompleted: "Woo-ee! Just in time! These are mighty fine carrots. Here's a little something for your trouble.",
      questFailed: "Aw shucks, too slow. Maybe next time, partner. I gotta dash!",
    }
  },
  prehistoric_findGlowshrooms: {
    id: "prehistoric_findGlowshrooms", title: "Shiny Rocks!", era: "Prehistoric",
    description: "Cavechild Kai is fascinated by shiny things. Harvest 5 Glowshrooms for Kai.",
    type: 'harvestSpecificCrop', targetCropId: 'glowshroom', targetAmount: 5,
    reward: { type: 'rareSeed', amount: 1 },
    dialogue: {
      greeting: "Ugh! Kai want shiny rock! You find for Kai? Kai give good rock too!",
      questAccepted: "Kai wait! Bring shiny rock! Make Kai happy!",
      questInProgress: "Shiny rock? Where shiny rock? Kai getting sleepy...",
      questCompleted: "Ooh! So shiny! Kai happy! Here, you take this special rock. Also shiny. Good trade!",
      questFailed: "Kai sad. No shiny rock. You come back later maybe.",
    }
  },
  future_needSynthBloomsStorm: {
    id: "future_needSynthBloomsStorm", title: "Stormy Synthesis", era: "Future",
    description: "BotanyBot-9 needs data on Synth Blooms grown during a Temporal Storm. Grow and harvest 3 Synth Blooms while a storm is active. You have 5 minutes once the storm starts.",
    type: 'growWhileWeather', targetCropId: 'synthbloom', targetAmount: 3, requiredWeatherId: 'stormy', durationMinutes: 5,
    reward: { type: 'chronoEnergy', amount: 150 },
    dialogue: {
      greeting: "Greetings, Cultivator Unit. Anomaly detected: Temporal Storm imminent. Optimal conditions for unique Synth Bloom data acquisition. Your assistance is requested. Task must be completed within 5 minutes of storm commencement.",
      questAccepted: "Acknowledged. Monitoring for Synth Bloom harvest during designated meteorological event. Timer initiated upon storm detection.",
      questInProgress: "Awaiting Synth Bloom data. Ensure harvest occurs during Temporal Storm parameters. Time is a factor.",
      questCompleted: "Data acquired. Chrono-Energy compensation processed. Your efficiency is noted.",
      questFailed: "Objective parameters not met within designated timeframe. Data acquisition failed. Recalibrating.",
    }
  }
};

export const NPC_VISITORS_CONFIG: Record<VisitorID, VisitorConfig> = {
  gardenerGreg: {
    id: "gardenerGreg", name: "Gardener Greg", era: "Present", icon: UserCircle,
    quests: [NPC_QUESTS_CONFIG.present_harvestCarrots], spawnChance: 0.3
  },
  cavechildKai: {
    id: "cavechildKai", name: "Cavechild Kai", era: "Prehistoric", icon: UserCircle,
    quests: [NPC_QUESTS_CONFIG.prehistoric_findGlowshrooms], spawnChance: 0.25
  },
  botanyBot9: {
    id: "botanyBot9", name: "BotanyBot-9000", era: "Future", icon: Settings,
    quests: [NPC_QUESTS_CONFIG.future_needSynthBloomsStorm], spawnChance: 0.2
  }
};

export const LORE_CONFIG: Record<string, LoreEntry> = {
  lore_intro: {
    id: "lore_intro",
    title: "The ChronoGarden Beckons",
    content: "A strange anomaly ripples through time. A seed, a plot of land, and a whisper of ancient technology... This is the ChronoGarden. Can you master the art of temporal horticulture?",
    unlockHint: "Unlocked by default.",
    isUnlockedByDefault: true,
  },
  lore_nexus_discovery: {
    id: "lore_nexus_discovery",
    title: "Whispers of the Nexus",
    content: "The first Prestige... a cycle completed. The fabric of time shivers, revealing a hidden structure - the Chrono Nexus. It hums with contained temporal energy, promising permanent alterations to the flow of your garden.",
    unlockHint: "Unlocked after your first Prestige.",
  },
  lore_prehistoric_puzzle: {
    id: "lore_prehistoric_puzzle",
    title: "Ancient Echoes",
    content: "The Prehistoric era feels... incomplete. As if something grand once stood here, now lost to the ages. The Dino Roots pulse with a faint, mournful energy. What happened here?",
    unlockHint: "Unlocked by harvesting 10 Dino Roots.",
  },
  lore_future_tech: {
    id: "lore_future_tech",
    title: "A Calculated Future",
    content: "The Future Domes are marvels of bio-engineering. Synth Blooms glow with artificial life, Nano Vines construct themselves with impossible speed. Is this advancement... or something else entirely? The AI seems to know more than it lets on.",
    unlockHint: "Unlocked by building your first Future-era automation.",
  },
};


export interface GameState {
  currentEra: EraID;
  unlockedEras: EraID[];
  chronoEnergy: number;
  resources: Record<string, number>;
  plotSlots: Array<PlantedCrop | null>;
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
  goalProgressTrackers: {
    carrotsHarvested: number;
    prehistoricUnlocked: number;
    rareSeedsFoundCount: number;
    prestigeCount: number; // Ensure this is included
    dinoRootsHarvested?: number;
    futureAutomationsBuilt?: number;
    [key: string]: number | undefined; 
  };
  playerName: string;
  gardenName: string;
  currentVisitorId: VisitorID | null;
  activeQuest: {
    questId: string;
    visitorId: VisitorID;
    status: QuestStatus;
    progress: number;
    startTime?: number; // For timed quests
  } | null;
  completedQuests: string[]; // Array of completed quest IDs
  totalChronoEnergyEarned: number;
  totalCropsHarvestedAllTime: number;
  lastVisitorSpawnCheck: number;
  unlockedLoreIds: string[];
}
export interface PlantedCrop {
  cropId: string;
  era: EraID; 
  plantedAt: number;
  id: string;
  maturityCheckedForDecay?: boolean; // For NanoVine
}

export const getRandomWeatherId = (currentWeatherId: WeatherID | null): WeatherID => {
  const availableWeather = Object.values(WEATHER_CONFIG).filter(w => w.id !== currentWeatherId || Object.keys(WEATHER_CONFIG).length <= 1);
  const totalWeight = availableWeather.reduce((sum, weather) => sum + (weather.rarityWeight || 0), 0);
  
  if (totalWeight === 0) return "clear"; // Fallback if all weights are 0 or no other weather available

  let randomNum = Math.random() * totalWeight;
  
  for (const weather of availableWeather) {
    if (randomNum < (weather.rarityWeight || 0)) {
      return weather.id;
    }
    randomNum -= (weather.rarityWeight || 0);
  }
  return "clear"; // Fallback
};

export const getRandomWeatherDuration = (weatherId: WeatherID): number => {
    const config = WEATHER_CONFIG[weatherId];
    if (!config) return 60 * 1000; // Default to 1 minute if config not found
    const duration = Math.floor(Math.random() * (config.durationSeconds.max - config.durationSeconds.min + 1)) + config.durationSeconds.min;
    return duration * 1000;
};

export const COMMON_RESOURCES_FOR_BONUS: Array<keyof GameState['resources']> = ["Water", "Sunlight", "Coins", "Energy", "Nutrients"];

export const calculateEffectiveGrowthTime = (
    baseGrowthTime: number, 
    cropId: string, 
    cropEra: EraID, 
    gameState: GameState
  ): number => {
  let growthTime = baseGrowthTime;

  // Permanent Global Speed Boost
  const globalSpeedBoostLevel = gameState.permanentUpgradeLevels.permGlobalGrowSpeed || 0;
  if (globalSpeedBoostLevel > 0) {
    growthTime *= PERMANENT_UPGRADES_CONFIG.permGlobalGrowSpeed.effect(globalSpeedBoostLevel) as number;
  }

  // Rare Seed Speed Boost
  if (gameState.rareSeeds.includes(cropId)) {
    growthTime *= 0.9; // Rare seeds grow 10% faster
  }

  // Era-Specific Growth Upgrade
  const fasterGrowthUpgradeId = `cropGrowth_${cropEra}`;
  const fasterGrowthLevel = gameState.upgradeLevels[fasterGrowthUpgradeId] || 0;
  if (UPGRADES_CONFIG[fasterGrowthUpgradeId] && fasterGrowthLevel > 0) {
    growthTime *= UPGRADES_CONFIG[fasterGrowthUpgradeId].effect(fasterGrowthLevel);
  }

  // Automation Speed Boost (Future Specific)
  if (cropEra === "Future" && gameState.activeAutomations['growthoptimizer_future']) {
    growthTime *= 0.75; // Growth Optimizer Future effect (25% faster)
  }

  // Weather Effects
  if (gameState.currentWeatherId) {
    const weather = WEATHER_CONFIG[gameState.currentWeatherId];
    if (weather.effects.globalGrowthSpeedFactor) { // Stormy weather affects all crops
        growthTime *= weather.effects.globalGrowthSpeedFactor;
    }
    if (cropEra === "Future" && weather.effects.futureCropGrowthFactor) { // Solar Eclipse affects Future crops
        growthTime *= weather.effects.futureCropGrowthFactor;
    }
  }
  
  return Math.max(1, growthTime); // Ensure growth time is at least 1 second
};

export const getCurrentPrestigeTier = (prestigeCount: number): PrestigeTierConfig => {
  let currentTier: PrestigeTierConfig = PRESTIGE_TIERS_CONFIG.Novice;
  const sortedTiers = Object.values(PRESTIGE_TIERS_CONFIG).sort((a, b) => a.minPrestigeCount - b.minPrestigeCount);
  for (const tier of sortedTiers) {
    if (prestigeCount >= tier.minPrestigeCount) {
      currentTier = tier;
    } else {
      break; 
    }
  }
  return currentTier;
};

export const getInitialUnlockedLoreIds = (): string[] => {
  return Object.values(LORE_CONFIG)
    .filter(entry => entry.isUnlockedByDefault)
    .map(entry => entry.id);
};
