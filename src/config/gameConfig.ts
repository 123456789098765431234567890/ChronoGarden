
import type { ComponentType } from 'react';
import { Briefcase, Atom, Settings, BrainCircuit, Sprout, Home, Leaf, Clock, Droplets, FlaskConical, Scroll, Dna, Bone, Tractor, Sun, Package, Wheat, Zap, Sparkles, Coins as CoinsIcon, Power, Flower2, Carrot as CarrotIcon, Apple as AppleIcon, Wind, SunDim, Mountain, Wind as FeatherIcon } from 'lucide-react'; // Added Mountain, FeatherIcon

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
}

export interface EraConfig {
  id: EraID;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  unlockCost: number; // chrono-energy to unlock
  availableCrops: Crop[];
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


export const GARDEN_PLOT_SIZE = 9; // 3x3 grid

export const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "ChronoEnergy", name: "Chrono-Energy", icon: Zap, description: "Energy to manipulate time and unlock eras.", initialAmount: 0 },
  { id: "Water", name: "Water", icon: Droplets, description: "Essential for all plant life.", initialAmount: 50 },
  { id: "Sunlight", name: "Sunlight", icon: Sun, description: "Energy from the sun, vital for photosynthesis.", initialAmount: 50 },
  { id: "Coins", name: "Coins", icon: CoinsIcon, description: "Primary currency for purchases.", initialAmount: 100 },
  { id: "Energy", name: "Energy", icon: Power, description: "Used for automations and advanced upgrades.", initialAmount: 20 },
  { id: "Nutrients", name: "Basic Nutrients", icon: Leaf, description: "General purpose fertilizer.", initialAmount: 20 },
  // Prehistoric specific resources
  { id: "DinoBone", name: "Dino Bone", icon: Bone, description: "Fossilized bone, a sturdy material.", initialAmount: 0 },
  { id: "MysticSpores", name: "Mystic Spores", icon: Sparkles, description: "Ancient spores with unusual properties.", initialAmount: 0 },
];


export const ERAS: Record<EraID, EraConfig> = {
  "Present": {
    id: "Present",
    name: "Present Day Fields",
    description: "Your journey begins in a familiar setting. Master the basics of cultivation.",
    icon: Home,
    unlockCost: 0,
    availableCrops: [
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
    ],
    eraSpecificResources: [],
    specialMechanic: "Basic tools and understanding of farming. Manage Water, Sunlight, Coins and Energy.",
  },
  "Prehistoric": {
    id: "Prehistoric",
    name: "Primordial Jungle",
    description: "Travel to a time of colossal flora and ancient creatures. Harness raw, powerful natural resources.",
    icon: Dna,
    unlockCost: 100, // ChronoEnergy
    availableCrops: [
      { id: "mossfruit", name: "Mossfruit", description: "Fast growing, low water cost, yields some ChronoEnergy.", icon: Sprout, growthTime: 20, cost: { "Water": 3 }, yield: { "Coins": 5, "ChronoEnergy": 1 }, era: "Prehistoric" },
      { id: "dinoroot", name: "Dino Root", description: "Long grow time, high Energy and ChronoEnergy yield.", icon: Mountain, growthTime: 180, cost: { "Water": 15, "DinoBone": 1 }, yield: { "Energy": 20, "ChronoEnergy": 5 }, era: "Prehistoric"},
      { id: "glowshroom", name: "Glowshroom", description: "Grows in the dark depths, yields ChronoEnergy and Mystic Spores.", icon: Sparkles, growthTime: 100, cost: { "Water": 5, "MysticSpores": 1 }, yield: { "ChronoEnergy": 10, "MysticSpores": 2 }, era: "Prehistoric"},
    ],
    eraSpecificResources: [ // These are defined in INITIAL_RESOURCES now if they start at 0
      // { id: "DinoBone", name: "Dino Bone", icon: Bone, description: "Fossilized bone, a sturdy material." },
      // { id: "MysticSpores", name: "Mystic Spores", icon: Sparkles, description: "Ancient spores with unusual properties." },
    ],
    specialMechanic: "Utilize DinoBones and MysticSpores. Harvest crops to gain ChronoEnergy.",
  },
  "Medieval": {
    id: "Medieval",
    name: "Alchemist's Garden",
    description: "Enter an era of knights, castles, and budding alchemy. Enhance your crops with mystical concoctions.",
    icon: FlaskConical,
    unlockCost: 500,
    availableCrops: [
      { id: "mandrake", name: "Mandrake", description: "A root with mystical properties, prized by alchemists.", icon: Sprout, growthTime: 180, cost: { "Water": 15, "EnchantedSoil": 1 }, yield: { "MandrakeRoot": 1, "MysticEssence": 2 }, era: "Medieval" },
      { id: "moonpetal", name: "Moonpetal Flower", description: "Blooms only under moonlight, yields glowing petals.", icon: Sparkles, growthTime: 150, cost: { "Water": 10 }, yield: { "Moonpetal": 3, "Seeds": 1 }, era: "Medieval" },
    ],
    eraSpecificResources: [
      { id: "EnchantedSoil", name: "Enchanted Soil", icon: Sparkles, description: "Soil imbued with alchemical properties." },
      { id: "MysticEssence", name: "Mystic Essence", icon: Atom, description: "A key ingredient in alchemical recipes." },
    ],
    specialMechanic: "Alchemy-based upgrades for soil and plants. Discover recipes for potions and enchantments.",
  },
  "Modern": {
    id: "Modern",
    name: "Automated Farmlands",
    description: "The age of technology and efficiency. Implement automated systems for mass production.",
    icon: Settings,
    unlockCost: 2000,
    availableCrops: [
      { id: "hydrocorn", name: "Hydroponic Corn", description: "Genetically modified corn that grows rapidly in hydroponic systems.", icon: Wheat, growthTime: 90, cost: { "Water": 25, "AdvancedNutrients": 2 }, yield: { "CornCobs": 10 }, era: "Modern" },
      { id: "biofuelbeans", name: "Biofuel Soybeans", description: "High-yield soybeans processed into efficient biofuel.", icon: Leaf, growthTime: 100, cost: { "Water": 15 }, yield: { "Soybeans": 8, "BiofuelPrecursor": 3 }, era: "Modern" },
    ],
    eraSpecificResources: [
      { id: "AdvancedNutrients", name: "Advanced Nutrients", icon: Briefcase, description: "Precisely formulated plant food." },
      { id: "ProcessedParts", name: "Processed Parts", icon: Settings, description: "Components for building machinery." },
    ],
    specialMechanic: "Deploy drones, sprinklers, and automated harvesters. Manage power and resource logistics.",
  },
  "Future": {
    id: "Future",
    name: "Bio-Engineered Domes",
    description: "Step into a future where nature and technology are seamlessly integrated. Optimize crops with AI and control climate.",
    icon: BrainCircuit,
    unlockCost: 10000,
    availableCrops: [
      { id: "photonbloom", name: "Photon Bloom", description: "A plant that converts light directly into pure energy.", icon: SunDim, growthTime: 240, cost: { "ControlledAtmosphere": 1 }, yield: { "EnergyCredits": 100, "ExoticGenes": 1 }, era: "Future" },
      { id: "naniteveggies", name: "Nanite Vegetables", description: "Self-replicating vegetables infused with nanites for perfect quality.", icon: Leaf, growthTime: 120, cost: { "NaniteSolution": 1 }, yield: { "PerfectProduce": 5 }, era: "Future" },
    ],
    eraSpecificResources: [
      { id: "ControlledAtmosphere", name: "Climate Control Units", icon: SunDim, description: "Maintains perfect growing conditions in domes." },
      { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct." },
      { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source." },
    ],
    specialMechanic: "AI crop engineers provide optimization. Climate domes allow precise environmental control. Gene splicing for hybrid crops.",
  },
};

export const ALL_CROPS_MAP: Record<string, Crop> = Object.values(ERAS).reduce((acc, era) => {
  era.availableCrops.forEach(crop => {
    acc[crop.id] = crop;
  });
  return acc;
}, {} as Record<string, Crop>);

// Combine initial resources and era-specific resources that might not be in initial list
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
  // Dynamically add crop yield products if they aren't defined elsewhere
  ...Object.values(ALL_CROPS_MAP).reduce((acc, crop) => {
    Object.keys(crop.yield).forEach((yieldKey) => {
      if (!acc[yieldKey] && !INITIAL_RESOURCES.find(r => r.id === yieldKey) && !combinedEraResources[yieldKey]) {
        acc[yieldKey] = { id: yieldKey, name: yieldKey.replace(/([A-Z])/g, ' $1').trim(), icon: crop.icon, description: `Product of ${crop.name}` };
      }
    });
    return acc;
  }, {} as Record<string, ResourceItem>)
};


export const AUTOMATION_RULES_CONFIG: AutomationRule[] = [
  {
    id: "sprinkler",
    name: "Basic Sprinkler",
    description: "Waters crops, passively generating a small amount of Water.",
    cost: { "Coins": 50, "Energy": 10 },
    effect: "Passively generates 1 Water every 10 seconds.",
    isPassive: true,
    era: "Present",
  },
  {
    id: "autoharvester",
    name: "Basic AutoHarvester",
    description: "Harvests one random mature crop from the current era.",
    cost: { "Coins": 100, "Energy": 25 },
    effect: "Automatically harvests one mature crop every 15 seconds.",
    isPassive: true,
    era: "Present",
  },
  // Prehistoric Automations
  {
    id: "raptorharvester",
    name: "Raptor Harvester",
    description: "A swift (but slightly clumsy) raptor helps harvest mature crops.",
    cost: { "Coins": 200, "Energy": 50, "DinoBone": 5 },
    effect: "Harvests one random mature crop every 10 seconds. May occasionally uproot a young plant (5% chance).",
    isPassive: true,
    era: "Prehistoric",
  },
  {
    id: "tarpitsprinkler",
    name: "Tar Pit Sprinkler",
    description: "Slowly seeps nutrient-rich water and mystic spores.",
    cost: { "Coins": 150, "Energy": 40, "MysticSpores": 10 },
    effect: "Passively generates 2 Water and 1 Mystic Spore every 20 seconds.",
    isPassive: true,
    era: "Prehistoric",
  },
  // Legacy/Placeholder, to be reviewed or removed if not used
  { id: "auto_water_legacy", name: "Auto-Water Sprinkler (Legacy)", description: "Automatically waters plants.", cost: { "ProcessedParts": 5, "EnergyCredits": 10 }, effect: "Reduces manual watering need.", era: "Modern" },
  { id: "auto_harvest_bot_legacy", name: "Harvest Bot (Legacy)", description: "A bot that harvests crops.", cost: { "ProcessedParts": 10, "NaniteSolution": 2 }, effect: "Automates harvesting.", era: "Modern" },
  { id: "soil_conditioner_unit", name: "Soil Conditioner", description: "Slowly improves soil quality.", cost: { "Biomass": 20, "MysticEssence": 5 }, effect: "Counteracts soil degradation.", era: "Medieval"},
];

export const UPGRADES_CONFIG: Record<string, UpgradeConfig> = {
  // Present Day Upgrades
  fasterGrowth: {
    id: 'fasterGrowth',
    name: 'Faster Crop Growth (Present)',
    description: 'Present Day crops grow faster.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 50 * Math.pow(2, level), "Energy": 10 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.1), // 10% reduction per level
    appliesTo: 'cropGrowth_Present',
    era: "Present",
  },
  sunflowerBoost: {
    id: 'sunflowerBoost',
    name: 'Sunflower Sunlight Boost',
    description: 'Sunflowers produce more Sunlight.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 75 * Math.pow(2, level), "Energy": 5 * Math.pow(1.5, level) }),
    effect: (level) => 1 + (level * 0.2), // 20% bonus per level
    appliesTo: 'sunflowerYield',
    era: "Present",
  },
  cheaperCrops: {
    id: 'cheaperCrops',
    name: 'Cheaper Crop Costs (Present)',
    description: 'Reduces planting cost for Present Day crops.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 100 * Math.pow(2.5, level), "Energy": 20 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.15), // 15% cost reduction per level
    appliesTo: 'cropCost_Present',
    era: "Present",
  },
  dripIrrigation: {
    id: 'dripIrrigation',
    name: 'Drip Irrigation',
    description: 'Reduces Water cost for planting Present Day crops by 20% per level.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 120 * Math.pow(2, level), "Energy": 15 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.20), // 20% water cost reduction per level
    appliesTo: 'waterCost_Present',
    era: "Present",
  },
  solarPanels: {
    id: 'solarPanels',
    name: 'Solar Panels',
    description: 'Increases passive Sunlight generation by 1 per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 200 * Math.pow(2, level), "Energy": 50 * Math.pow(1.8, level) }),
    effect: (level) => level * 1, // +1 passive sunlight per level
    appliesTo: 'passiveSunlight',
    era: "Present",
  },
  // Prehistoric Upgrades
  dungFertilizer: {
    id: 'dungFertilizer',
    name: 'Dino Dung Fertilizer',
    description: 'Prehistoric crops grow 15% faster per level. Requires Dino Bones.',
    maxLevel: 4,
    cost: (level) => ({ "Coins": 100 * Math.pow(2, level), "DinoBone": 5 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.15), // 15% growth time reduction
    appliesTo: 'cropGrowth_Prehistoric',
    era: "Prehistoric",
  },
  ancientSporesBoost: {
    id: 'ancientSporesBoost',
    name: 'Ancient Spores Mastery',
    description: 'Increases yield of Mystic Spores and ChronoEnergy from Prehistoric crops by 10% per level.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 150 * Math.pow(2, level), "MysticSpores": 10 * Math.pow(1.5, level) }),
    effect: (level) => 1 + (level * 0.10), // 10% yield increase
    appliesTo: 'yield_Prehistoric',
    era: "Prehistoric",
  },
};

    