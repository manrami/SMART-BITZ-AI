// BI Intelligence Service — client-side with localStorage caching
// Never throws — always returns gracefully degraded data on error

import type {
    ProductIntelligence,
    EnrichedSuppliersData,
    ProductMaterialsData,
    RecipeBreakdown,
} from "@/types/productIntelligence";

const BASE = "http://127.0.0.1:5000/api/bi";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── localStorage cache helpers ────────────────────────────────────────────────
const CACHE_PREFIX = "bi_v2:";

function cacheGet<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(`${CACHE_PREFIX}${key}`); return null; }
        return data as T;
    } catch { return null; }
}

function cacheSet(key: string, data: unknown) {
    try { localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data })); }
    catch { /* storage full — skip */ }
}

async function postBI<T>(endpoint: string, body: object): Promise<T | null> {
    try {
        const res = await fetch(`${BASE}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getProductIntelligence(
    businessType: string,
    productName = ""
): Promise<ProductIntelligence | null> {
    const key = `product:${businessType}:${productName}`;
    const cached = cacheGet<ProductIntelligence>(key);
    if (cached) return cached;
    const data = await postBI<ProductIntelligence>("research-product", {
        business_type: businessType,
        product_name: productName,
    });
    if (data) cacheSet(key, data);
    return data;
}

export async function getEnrichedSuppliers(
    businessType: string,
    productName: string,
    city = "India"
): Promise<EnrichedSuppliersData | null> {
    const key = `suppliers:${businessType}:${productName}:${city}`;
    const cached = cacheGet<EnrichedSuppliersData>(key);
    if (cached) return cached;
    const data = await postBI<EnrichedSuppliersData>("enriched-suppliers", {
        business_type: businessType,
        product_name: productName,
        city,
    });
    if (data) cacheSet(key, data);
    return data;
}

export async function getProductMaterials(
    businessType: string,
    productName: string
): Promise<ProductMaterialsData | null> {
    const key = `materials:${businessType}:${productName}`;
    const cached = cacheGet<ProductMaterialsData>(key);
    if (cached) return cached;
    const data = await postBI<ProductMaterialsData>("product-materials", {
        business_type: businessType,
        product_name: productName,
    });
    if (data) cacheSet(key, data);
    return data;
}

export async function getRecipeBreakdown(
    businessType: string,
    productName: string
): Promise<RecipeBreakdown | null> {
    const key = `recipe:${businessType}:${productName}`;
    const cached = cacheGet<RecipeBreakdown>(key);
    if (cached) return cached;
    const data = await postBI<RecipeBreakdown>("recipe-breakdown", {
        business_type: businessType,
        product_name: productName,
    });
    if (data) cacheSet(key, data);
    return data;
}
