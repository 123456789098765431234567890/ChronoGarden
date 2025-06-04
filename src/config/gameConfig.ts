
import type { ComponentType } from 'react';
import { Briefcase, Atom, Settings, BrainCircuit, Sprout, Home, Leaf, Clock, Droplets, FlaskConical, Scroll, Dna, Bone, Tractor, Sun, Package, Wheat, Zap, Sparkles, Coins as CoinsIcon, Power, Flower2, Carrot as CarrotIcon, Apple as AppleIcon, Wind, SunDim } from 'lucide-react';

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
  requirements?: Record<string, { amount: number; eraSpecific?: boolean }>; // Kept for potential future use, but phase 1 uses direct cost
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
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  cost: (level: number) => Record<string, number>; // resourceId: amount
  effect: (level: number) => number; // Returns multiplier or bonus value
  appliesTo?: string; // e.g., 'cropGrowth', 'sunflowerYield', 'cropCost'
}


export const GARDEN_PLOT_SIZE = 9; // 3x3 grid

export const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "ChronoEnergy", name: "Chrono-Energy", icon: Zap, description: "Energy to manipulate time and unlock eras.", initialAmount: 0 },
  { id: "Water", name: "Water", icon: Droplets, description: "Essential for all plant life.", initialAmount: 50 },
  { id: "Sunlight", name: "Sunlight", icon: Sun, description: "Energy from the sun, vital for photosynthesis.", initialAmount: 50 },
  { id: "Coins", name: "Coins", icon: CoinsIcon, description: "Primary currency for purchases.", initialAmount: 100 },
  { id: "Energy", name: "Energy", icon: Power, description: "Used for automations and advanced upgrades.", initialAmount: 20 },
  // Seeds are handled per crop or as a general concept; for phase 1, direct planting cost.
  { id: "Nutrients", name: "Basic Nutrients", icon: Leaf, description: "General purpose fertilizer.", initialAmount: 20 },
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
        growthTime: 30, // 30 seconds
        cost: { "Water": 5, "Sunlight": 2 },
        yield: { "Coins": 10, "Carrot": 1 } // Yields some coins and the item itself
      },
      {
        id: "tomato", name: "Tomato", description: "Medium speed, medium value fruit.", icon: AppleIcon, // Using Apple as placeholder for tomato
        growthTime: 60, // 60 seconds
        cost: { "Water": 8, "Sunlight": 5 },
        yield: { "Coins": 25, "Tomato": 1 }
      },
      {
        id: "sunflower", name: "Sunflower", description: "Slow growing, yields Sunlight instead of Coins.", icon: Flower2,
        growthTime: 120, // 120 seconds
        cost: { "Water": 10, "Sunlight": 1 }, // Low sunlight cost as it generates it
        yield: { "Sunlight": 50, "SunflowerSeed": 1 } // Yields Sunlight and a seed
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
    unlockCost: 100,
    availableCrops: [
      { id: "giantfern", name: "Giant Fern", description: "A massive prehistoric fern that thrives in humid conditions.", icon: Leaf, growthTime: 120, cost: { "Water": 20, "DinoFertilizer": 1 }, yield: { "FernSpores": 5, "Biomass": 10 }, requirements: { "Water": {amount: 2}, "DinoFertilizer": { amount: 1, eraSpecific: true } } },
      { id: "amberfruit", name: "Amberfruit Tree", description: "Yields resinous, energy-rich fruits.", icon: Leaf, growthTime: 200, cost: { "Water": 30 }, yield: { "Amberfruit": 2, "RareSeeds": 1 }, requirements: { "Water": { amount: 3 } } },
    ],
    eraSpecificResources: [
      { id: "DinoFertilizer", name: "Dino Fertilizer", icon: Bone, description: "Potent fertilizer from ancient remains." },
      { id: "Biomass", name: "Raw Biomass", icon: Package, description: "Organic matter for various uses." },
    ],
    specialMechanic: "Utilize Dino-Fertilizer for enhanced growth. Plants may attract or be affected by dinosaurs (conceptual).",
  },
  "Medieval": {
    id: "Medieval",
    name: "Alchemist's Garden",
    description: "Enter an era of knights, castles, and budding alchemy. Enhance your crops with mystical concoctions.",
    icon: FlaskConical,
    unlockCost: 500,
    availableCrops: [
      { id: "mandrake", name: "Mandrake", description: "A root with mystical properties, prized by alchemists.", icon: Sprout, growthTime: 180, cost: { "Water": 15, "EnchantedSoil": 1 }, yield: { "MandrakeRoot": 1, "MysticEssence": 2 }, requirements: { "Water": {amount: 1}, "EnchantedSoil": { amount: 1, eraSpecific: true } } },
      { id: "moonpetal", name: "Moonpetal Flower", description: "Blooms only under moonlight, yields glowing petals.", icon: Sparkles, growthTime: 150, cost: { "Water": 10 }, yield: { "Moonpetal": 3, "Seeds": 1 }, requirements: { "Water": { amount: 1 } } },
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
      { id: "hydrocorn", name: "Hydroponic Corn", description: "Genetically modified corn that grows rapidly in hydroponic systems.", icon: Wheat, growthTime: 90, cost: { "Water": 25, "AdvancedNutrients": 2 }, yield: { "CornCobs": 10 }, requirements: { "Water": {amount: 5}, "AdvancedNutrients": { amount: 2, eraSpecific: true } } },
      { id: "biofuelbeans", name: "Biofuel Soybeans", description: "High-yield soybeans processed into efficient biofuel.", icon: Leaf, growthTime: 100, cost: { "Water": 15 }, yield: { "Soybeans": 8, "BiofuelPrecursor": 3 }, requirements: { "Water": { amount: 3 } } },
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
      { id: "photonbloom", name: "Photon Bloom", description: "A plant that converts light directly into pure energy.", icon: SunDim, growthTime: 240, cost: { "ControlledAtmosphere": 1 }, yield: { "EnergyCredits": 100, "ExoticGenes": 1 }, requirements: { "ControlledAtmosphere": { amount: 1, eraSpecific: true } } },
      { id: "naniteveggies", name: "Nanite Vegetables", description: "Self-replicating vegetables infused with nanites for perfect quality.", icon: Leaf, growthTime: 120, cost: { "NaniteSolution": 1 }, yield: { "PerfectProduce": 5 }, requirements: { "NaniteSolution": { amount: 1, eraSpecific: true } } },
    ],
    eraSpecificResources: [
      { id: "ControlledAtmosphere", name: "Climate Control Units", icon: SunDim, description: "Maintains perfect growing conditions in domes." },
      { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct." },
      { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source." }, // Note: Overlaps with general "Energy", might need differentiation
    ],
    specialMechanic: "AI crop engineers provide optimization. Climate domes allow precise environmental control. Gene splicing for hybrid crops.",
  },
};

export const getEraColor = (eraId: EraID): string => {
  switch (eraId) {
    case "Present": return "bg-green-500";
    case "Prehistoric": return "bg-yellow-600";
    case "Medieval": return "bg-indigo-500";
    case "Modern": return "bg-blue-500";
    case "Future": return "bg-purple-500";
    default: return "bg-gray-500";
  }
};

export const ALL_CROPS_MAP: Record<string, Crop> = Object.values(ERAS).reduce((acc, era) => {
  era.availableCrops.forEach(crop => {
    acc[crop.id] = crop;
  });
  return acc;
}, {} as Record<string, Crop>);

export const ALL_ERA_RESOURCES_MAP: Record<string, ResourceItem> = Object.values(ERAS).reduce((acc, era) => {
  era.eraSpecificResources.forEach(res => {
    acc[res.id] = res;
  });
  return acc;
}, {} as Record<string, ResourceItem>);

export const ALL_GAME_RESOURCES_MAP: Record<string, ResourceItem> = {
  ...INITIAL_RESOURCES.reduce((acc, r) => ({...acc, [r.id]: r}), {}),
  ...ALL_ERA_RESOURCES_MAP,
  ...Object.values(ALL_CROPS_MAP).reduce((acc, crop) => {
    Object.entries(crop.yield).forEach(([yieldKey, _]) => {
      if (!acc[yieldKey] && !INITIAL_RESOURCES.find(r => r.id === yieldKey) && !ALL_ERA_RESOURCES_MAP[yieldKey]) {
        // Try to find an icon from the crop itself if it's a unique yield item
        let icon = Package;
        const producingCrop = Object.values(ALL_CROPS_MAP).find(c => c.yield[yieldKey]);
        if (producingCrop) icon = producingCrop.icon;

        acc[yieldKey] = { id: yieldKey, name: yieldKey.replace(/([A-Z])/g, ' $1').trim(), icon: icon, description: `Product of ${crop.name}` };
      }
    });
    return acc;
  }, {} as Record<string, ResourceItem>)
};


export const AUTOMATION_RULES_CONFIG: AutomationRule[] = [
  {
    id: "sprinkler",
    name: "Sprinkler",
    description: "Waters crops every 10 seconds, generating a small amount of Water.",
    cost: { "Coins": 50, "Energy": 10 },
    effect: "Passively generates 1 Water every 10 seconds.",
    isPassive: true,
  },
  {
    id: "autoharvester",
    name: "AutoHarvester",
    description: "Harvests one random mature crop every 15 seconds.",
    cost: { "Coins": 100, "Energy": 25 },
    effect: "Automatically harvests one mature crop.",
    isPassive: true,
  },
  // Existing automations, costs might need review based on new resource system
  { id: "auto_water_legacy", name: "Auto-Water Sprinkler (Legacy)", description: "Automatically waters plants in its vicinity.", cost: { "ProcessedParts": 5, "EnergyCredits": 10 }, effect: "Reduces manual watering need." },
  { id: "auto_harvest_bot_legacy", name: "Harvest Bot (Legacy)", description: "A small bot that harvests mature crops.", cost: { "ProcessedParts": 10, "NaniteSolution": 2 }, effect: "Automates harvesting process." },
  { id: "soil_conditioner_unit", name: "Soil Conditioner", description: "Slowly improves soil quality over time.", cost: { "Biomass": 20, "MysticEssence": 5 }, effect: "Counteracts soil degradation." },
];

export const UPGRADES_CONFIG: Record<string, UpgradeConfig> = {
  fasterGrowth: {
    id: 'fasterGrowth',
    name: 'Faster Crop Growth',
    description: 'Crops grow faster.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 50 * Math.pow(2, level), "Energy": 10 * Math.pow(1.5, level) }),
    effect: (level) => 1 - (level * 0.1), // 10% reduction per level, effect is multiplier
    appliesTo: 'cropGrowth',
  },
  sunflowerBoost: {
    id: 'sunflowerBoost',
    name: 'Sunflower Sunlight Boost',
    description: 'Sunflowers produce more Sunlight.',
    maxLevel: 5,
    cost: (level) => ({ "Coins": 75 * Math.pow(2, level), "Energy": 5 * Math.pow(1.5, level) }),
    effect: (level) => 1 + (level * 0.2), // 20% bonus per level, effect is multiplier
    appliesTo: 'sunflowerYield',
  },
  cheaperCrops: {
    id: 'cheaperCrops',
    name: 'Cheaper Crop Costs',
    description: 'Reduces the Water and Sunlight cost to plant crops.',
    maxLevel: 3,
    cost: (level) => ({ "Coins": 100 * Math.pow(2.5, level), "Energy": 20 * Math.pow(1.8, level) }),
    effect: (level) => 1 - (level * 0.15), // 15% cost reduction per level, effect is multiplier
    appliesTo: 'cropCost',
  },
};

    
