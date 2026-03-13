// Product Intelligence metadata layer — extends existing types, never replaces them

export interface TopProduct {
    name: string;
    country_of_origin: string;
    global_demand: "High" | "Medium" | "Low";
    price_range: string;
    margin_estimate: string;
    investment_range: string;
}

export interface ProductIntelligence {
    demand_level: "High" | "Medium" | "Low";
    demand_trend: "Rising" | "Stable" | "Declining";
    profit_margin_estimate: string;
    investment_range: string;
    risk_score: number; // 1-10
    top_markets: string[];
    market_size: string;
    competition_level: "High" | "Medium" | "Low";
    best_season: string;
    top_products: TopProduct[];
    _fallback?: boolean;
}

export interface EnrichedSupplier {
    name: string;
    country: string;
    city: string;
    email: string;
    phone: string;
    moq: string;
    approx_cost: string;
    rating: number;
    export_capable: boolean;
    website: string;
    specialization: string;
    delivery_time: string;
    payment_terms: string;
    pros: string[];
    cons: string[];
    verified: boolean;
    supplier_type?: string;
}

export interface EnrichedSuppliersData {
    suppliers: EnrichedSupplier[];
    alternative_countries: string[];
    sourcing_tips: string;
    _fallback?: boolean;
}

export interface EnrichedMaterial {
    name: string;
    quantity_per_100_units: string;
    cost_estimate: string;
    supplier_source: string;
    storage_requirement: string;
    shelf_life: string;
    quality_tip: string;
}

export interface ProductMaterialsData {
    materials: EnrichedMaterial[];
    total_material_cost_per_100_units: string;
    critical_material: string;
    _fallback?: boolean;
}

export interface RecipeIngredient {
    name: string;
    quantity: string;
    cost: string;
    source: string;
}

export interface RecipeStep {
    step_number: number;
    title: string;
    description: string;
    duration: string;
    tip: string;
}

export interface RecipeBreakdown {
    is_food_product: boolean;
    recipe_name?: string;
    batch_size?: string;
    prep_time?: string;
    cook_time?: string;
    total_time?: string;
    yield_ratio?: string;
    ingredients?: RecipeIngredient[];
    steps?: RecipeStep[];
    cost_per_unit?: string;
    selling_price_per_unit?: string;
    profit_per_unit?: string;
    profit_margin?: string;
    quality_checklist?: string[];
    packaging_tip?: string;
    _fallback?: boolean;
}
