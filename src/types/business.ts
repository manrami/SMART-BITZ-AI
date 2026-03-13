export interface UserProfile {
  budget: string;
  city: string;
  interest: string;
  experience: "beginner" | "experienced";
}

export interface BusinessIdea {
  id: string;
  name: string;
  description: string;
  investmentRange: string;
  expectedRevenue: string;
  profitMargin: string;
  riskLevel: "Low" | "Medium" | "High";
  breakEvenTime: string;
  icon: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string;
  avg_selling_price: number;
}

export interface Supplier {
  name: string;
  location: string;
  rating: number;
  priceRange: string;
  deliveryTime: string;
  minOrder: string;
  contactType: string;
  pros: string[];
  cons: string[];
}

export interface RawMaterial {
  name: string;
  sourceType: string;
  estimatedCost: string;
  tips: string;
  suppliers?: Supplier[];
}

export interface ProductionStep {
  step: string;
  description: string;
  costVsTime: string;
}

export interface WorkforceRequirement {
  role: string;
  skillLevel: string;
  count: number;
  estimatedSalary: string;
}

export interface LocationAdvice {
  areaType: string;
  shopSize: string;
  rentEstimate: string;
  setupNeeds: string[];
}

export interface PricingStrategy {
  costComponents: string[];
  costPrice: string;
  marketPriceRange: string;
  suggestedPrice: string;
  profitMargin: string;
}

export interface MarketingPlan {
  launchPlan: string[];
  onlineStrategies: string[];
  offlineStrategies: string[];
  lowBudgetIdeas: string[];
}

export interface GrowthRoadmap {
  month1to3: string[];
  month4to6: string[];
  expansionIdeas: string[];
  mistakesToAvoid: string[];
}

export interface ProgressTask {
  id: string;
  title: string;
  description: string;
  category: "setup" | "materials" | "marketing" | "operations" | "growth";
  completed: boolean;
  dueDate?: string;
}

export type DashboardTemplate =
  | "checklist"
  | "milestones"
  | "timeline"
  | "metrics";

export interface BusinessPlan {
  idea: BusinessIdea;
  product?: Product;
  rawMaterials: RawMaterial[];
  productionPlan?: ProductionStep[];
  workforce: WorkforceRequirement[];
  location: LocationAdvice;
  pricing: PricingStrategy;
  marketing: MarketingPlan;
  growth: GrowthRoadmap;
  preferredTemplate?: DashboardTemplate;
}
