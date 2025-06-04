import type { ComponentType } from 'react';
import { Briefcase, Atom, Settings, BrainCircuit, Sprout, Home, Leaf, Clock, Droplets, FlaskConical, Scroll, Dna, Bone, Tractor, SunDim, Package, Wheat, Zap, Sparkles } from 'lucide-react';

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
  growthTime: number; // conceptual ticks/seconds
  yield: Record<string, number>; // resourceId: amount
  requirements: Record<string, { amount: number; eraSpecific?: boolean }>; // resourceId: { amount, isEraSpecificResource }
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
}

export const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "ChronoEnergy", name: "Chrono-Energy", icon: Zap, description: "Energy to manipulate time and unlock eras.", initialAmount: 0 },
  { id: "Water", name: "Water", icon: Droplets, description: "Essential for all plant life.", initialAmount: 50 },
  { id: "Seeds", name: "Basic Seeds", icon: Sprout, description: "Used to grow common plants.", initialAmount: 10 },
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
      { id: "tomato", name: "Tomato", description: "A versatile and common garden plant.", icon: Leaf, growthTime: 60, yield: { "Tomatoes": 3, "Seeds": 1 }, requirements: { "Water": { amount: 1 }, "Nutrients": {amount: 0.5} } },
      { id: "lettuce", name: "Lettuce", description: "Quick-growing leafy greens.", icon: Leaf, growthTime: 40, yield: { "LettuceHeads": 2, "Seeds": 1 }, requirements: { "Water": { amount: 1 } } },
    ],
    eraSpecificResources: [],
    specialMechanic: "Basic tools and understanding of farming.",
  },
  "Prehistoric": {
    id: "Prehistoric",
    name: "Primordial Jungle",
    description: "Travel to a time of colossal flora and ancient creatures. Harness raw, powerful natural resources.",
    icon: Dna,
    unlockCost: 100, // Example cost
    availableCrops: [
      { id: "giantfern", name: "Giant Fern", description: "A massive prehistoric fern that thrives in humid conditions.", icon: Leaf, growthTime: 120, yield: { "FernSpores": 5, "Biomass": 10 }, requirements: { "Water": {amount: 2}, "DinoFertilizer": { amount: 1, eraSpecific: true } } },
      { id: "amberfruit", name: "Amberfruit Tree", description: "Yields resinous, energy-rich fruits.", icon: Leaf, growthTime: 200, yield: { "Amberfruit": 2, "RareSeeds": 1 }, requirements: { "Water": { amount: 3 } } },
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
      { id: "mandrake", name: "Mandrake", description: "A root with mystical properties, prized by alchemists.", icon: Sprout, growthTime: 180, yield: { "MandrakeRoot": 1, "MysticEssence": 2 }, requirements: { "Water": {amount: 1}, "EnchantedSoil": { amount: 1, eraSpecific: true } } },
      { id: "moonpetal", name: "Moonpetal Flower", description: "Blooms only under moonlight, yields glowing petals.", icon: Sparkles, growthTime: 150, yield: { "Moonpetal": 3, "Seeds": 1 }, requirements: { "Water": { amount: 1 } } },
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
      { id: "hydrocorn", name: "Hydroponic Corn", description: "Genetically modified corn that grows rapidly in hydroponic systems.", icon: Wheat, growthTime: 90, yield: { "CornCobs": 10 }, requirements: { "Water": {amount: 5}, "AdvancedNutrients": { amount: 2, eraSpecific: true } } },
      { id: "biofuelbeans", name: "Biofuel Soybeans", description: "High-yield soybeans processed into efficient biofuel.", icon: Leaf, growthTime: 100, yield: { "Soybeans": 8, "BiofuelPrecursor": 3 }, requirements: { "Water": { amount: 3 } } },
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
      { id: "photonbloom", name: "Photon Bloom", description: "A plant that converts light directly into pure energy.", icon: SunDim, growthTime: 240, yield: { "EnergyCredits": 100, "ExoticGenes": 1 }, requirements: { "ControlledAtmosphere": { amount: 1, eraSpecific: true } } },
      { id: "naniteveggies", name: "Nanite Vegetables", description: "Self-replicating vegetables infused with nanites for perfect quality.", icon: Leaf, growthTime: 120, yield: { "PerfectProduce": 5 }, requirements: { "NaniteSolution": { amount: 1, eraSpecific: true } } },
    ],
    eraSpecificResources: [
      { id: "ControlledAtmosphere", name: "Climate Control Units", icon: SunDim, description: "Maintains perfect growing conditions in domes." },
      { id: "NaniteSolution", name: "Nanite Solution", icon: Atom, description: "Microscopic robots that enhance and construct." },
      { id: "EnergyCredits", name: "Energy Credits", icon: Zap, description: "Universal currency and power source." },
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
  // Add crop yields as resources too for tracking, if needed
  ...Object.values(ALL_CROPS_MAP).reduce((acc, crop) => {
    Object.keys(crop.yield).forEach(yieldKey => {
      if (!acc[yieldKey]) {
        acc[yieldKey] = { id: yieldKey, name: yieldKey, icon: crop.icon, description: `Product of ${crop.name}` };
      }
    });
    return acc;
  }, {} as Record<string, ResourceItem>)
};

export const AUTOMATION_RULES_CONFIG: AutomationRule[] = [
  { id: "auto_water", name: "Auto-Water Sprinkler", description: "Automatically waters plants in its vicinity.", cost: { "ProcessedParts": 5, "EnergyCredits": 10 }, effect: "Reduces manual watering need." },
  { id: "auto_harvest_bot", name: "Harvest Bot", description: "A small bot that harvests mature crops.", cost: { "ProcessedParts": 10, "NaniteSolution": 2 }, effect: "Automates harvesting process." },
  { id: "soil_conditioner_unit", name: "Soil Conditioner", description: "Slowly improves soil quality over time.", cost: { "Biomass": 20, "MysticEssence": 5 }, effect: "Counteracts soil degradation." },
];

