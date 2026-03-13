/**
 * RawMaterialSupplierDiscovery.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays suppliers GROUPED BY RAW MATERIAL for the selected business.
 *
 * Per-material discovery pipeline:
 *   1. Browser Geolocation → lat/lng → Nominatim city name
 *   2. getEnrichedSuppliers(businessType, materialName, city)  — AI/BI backend
 *   3. Overpass API (OpenStreetMap) → real nearby businesses matching material
 *   4. Merge + dedup by name, rank by score
 *   5. Render collapsible material accordion → supplier cards with
 *      Call / WhatsApp / View Location buttons + Claim this Business
 *
 * Does NOT touch any existing project logic. Zero side-effects on other tabs.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import { LeafletMap } from "@/components/suppliers/LeafletMap";
import { ensureLeafletIcons, ICONS } from "@/components/suppliers/leafletSetup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnrichedSuppliers, getProductMaterials } from "@/services/biIntelligenceService";
import { RawMaterial } from "@/types/business";
import { SupplierClaimModal } from "@/components/suppliers/SupplierClaimModal";
import {
    MapPin, Navigation, Phone, Mail, Globe, Package,
    Star, AlertCircle, Loader2, Search, RefreshCw,
    MessageCircle, Building2, ExternalLink, Trophy,
    ChevronDown, ChevronUp, Zap,
} from "lucide-react";

// Shared Leaflet setup (runs once across all map components)
ensureLeafletIcons();

const userIcon = ICONS.user;
const aiIcon = ICONS.ai;
const osmIcon = ICONS.osm;

// ── Types ─────────────────────────────────────────────────────────────────────
type SourceType = "ai" | "discovered";

interface UnifiedSupplier {
    id: string;
    name: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
    website?: string;
    lat?: number;
    lng?: number;
    distKm?: number;
    rating: number;
    source: SourceType;
    specialization?: string;
    moq?: string;
    delivery_time?: string;
    approx_cost?: string;
    payment_terms?: string;
    export_capable?: boolean;
    verified?: boolean;
    score: number;
}

interface MaterialSupplierGroup {
    material: RawMaterial;
    suppliers: UnifiedSupplier[];
    loading: boolean;
    loaded: boolean;
    expanded: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        // BigDataCloud — CORS-safe, no API key needed
        const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (!res.ok) return null;
        const j = await res.json();
        return j.city || j.locality || j.principalSubdivision || null;
    } catch { return null; }
}

function pseudoLatLng(baseLat: number, baseLng: number, seed: string): [number, number] {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    const rng = (mod: number) => (Math.abs(h % (mod * 1000)) / 1000 - mod / 2);
    return [baseLat + rng(0.36), baseLng + rng(0.36)];
}

/** Supplier ranking — same formula used in NearbySupplierMap */
function computeScore(s: Omit<UnifiedSupplier, "score">, keywords: string[]): number {
    const text = `${s.name} ${s.specialization || ""}`.toLowerCase();
    const matchCount = keywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    const productScore = Math.min(40, (matchCount / Math.max(keywords.length, 1)) * 40);
    const distScore = s.distKm !== undefined ? Math.max(0, 30 - (s.distKm / 30) * 30) : 15;
    const ratingScore = ((s.rating || 3) / 5) * 20;
    const contactScore = (s.phone ? 5 : 0) + (s.email || s.website ? 3 : 0) + (s.verified ? 2 : 0);
    return Math.round(productScore + distScore + ratingScore + contactScore);
}

// Per-material Overpass cache to avoid re-fetching on re-renders
const materialOverpassCache = new Map<string, Omit<UnifiedSupplier, "score">[]>();

/** Overpass API — fetch real OSM businesses for a material keyword (limited to 15 initially) */
async function fetchOverpassForMaterial(
    lat: number,
    lng: number,
    materialName: string,
    radiusM = 25000,
    limit = 15
): Promise<Omit<UnifiedSupplier, "score">[]> {
    const kw = materialName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (!kw) return [];
    const cacheKey = `${kw}|${lat.toFixed(3)}|${lng.toFixed(3)}|${limit}`;
    if (materialOverpassCache.has(cacheKey)) return materialOverpassCache.get(cacheKey)!;
    const query = `
[out:json][timeout:20];
(
  node["name"~"${kw}",i](around:${radiusM},${lat},${lng});
  node["shop"~"${kw}",i](around:${radiusM},${lat},${lng});
  node["industrial"~"${kw}",i](around:${radiusM},${lat},${lng});
  way["name"~"${kw}",i]["shop"](around:${radiusM},${lat},${lng});
  way["name"~"${kw}",i]["industrial"](around:${radiusM},${lat},${lng});
);
out center ${limit};`;
    try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) return [];
        const json = await res.json();
        const results: Omit<UnifiedSupplier, "score">[] = [];
        for (const el of (json.elements || [])) {
            const tags = el.tags || {};
            const name = tags.name;
            if (!name) continue;
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            const distKm = elLat !== undefined && elLng !== undefined
                ? parseFloat(haversineKm(lat, lng, elLat, elLng).toFixed(1))
                : undefined;
            if (distKm !== undefined && distKm > 30) continue;
            results.push({
                id: `osm-${el.id}`,
                name,
                address: [tags["addr:street"], tags["addr:city"], tags["addr:state"]]
                    .filter(Boolean).join(", ") || "Address not listed",
                city: tags["addr:city"] || "",
                phone: tags.phone || tags["contact:phone"] || undefined,
                email: tags.email || tags["contact:email"] || undefined,
                website: tags.website || tags["contact:website"] || undefined,
                lat: elLat,
                lng: elLng,
                distKm,
                rating: 3.5,
                source: "discovered",
                specialization: tags.shop || tags.industrial || materialName,
                verified: false,
            });
        }
        const sorted = results.sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
        materialOverpassCache.set(cacheKey, sorted);
        return sorted;
    } catch { return []; }
}

/** Merge AI + Overpass results, dedup, rank */
function mergeAndRank(
    ai: Omit<UnifiedSupplier, "score">[],
    discovered: Omit<UnifiedSupplier, "score">[],
    keywords: string[]
): UnifiedSupplier[] {
    const seen = new Set<string>();
    const all: UnifiedSupplier[] = [];
    for (const s of [...ai, ...discovered]) {
        const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ ...s, score: computeScore(s, keywords) });
    }
    return all.sort((a, b) => b.score - a.score);
}

// ── Imperative map helpers (no react-leaflet) ────────────────────────────────
function buildMapLayers(
    map: L.Map,
    markerLayersRef: React.MutableRefObject<L.Layer[]>,
    userLat: number,
    userLng: number,
    cityName: string,
    suppliers: UnifiedSupplier[]
) {
    // Remove previous layers
    markerLayersRef.current.forEach((l) => map.removeLayer(l));
    markerLayersRef.current = [];

    // User marker
    const userMarker = L.marker([userLat, userLng], { icon: ICONS.user })
        .bindPopup(`<strong>📍 You</strong><br/>${cityName}`);
    userMarker.addTo(map);
    markerLayersRef.current.push(userMarker);

    // 25 km radius
    const circle = L.circle([userLat, userLng], {
        radius: 25000,
        color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.05, weight: 2, dashArray: "6 4",
    }).addTo(map);
    markerLayersRef.current.push(circle);

    // Supplier markers
    for (const s of suppliers) {
        if (s.lat === undefined || s.lng === undefined) continue;
        const icon = s.source === "ai" ? ICONS.ai : ICONS.osm;
        const m = L.marker([s.lat, s.lng], { icon })
            .bindPopup(`<div style="min-width:160px"><strong>${s.name}</strong><br/><span style="font-size:11px;color:#64748b">${s.address}</span>${s.phone ? `<br/>📞 ${s.phone}` : ""}${s.distKm !== undefined ? `<br/><span style="font-size:11px;color:#6366f1">${s.distKm} km away</span>` : ""}</div>`);
        m.addTo(map);
        markerLayersRef.current.push(m);
    }
}

const StarRow = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-3 w-3 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
        ))}
        <span className="ml-1 text-xs font-semibold">{rating.toFixed(1)}</span>
    </div>
);

const SOURCE_META: Record<SourceType, { label: string; className: string }> = {
    ai: { label: "🤖 AI Verified", className: "bg-primary/10 text-primary border-primary/20" },
    discovered: { label: "🔍 Discovered", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
};

// ── Supplier Card ─────────────────────────────────────────────────────────────
function SupplierCard({
    s, idx, materialName, onClaim,
}: {
    s: UnifiedSupplier;
    idx: number;
    materialName: string;
    onClaim: (s: UnifiedSupplier) => void;
}) {
    const openWhatsApp = (phone: string) =>
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
    const openMap = (lat: number, lng: number) =>
        window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, "_blank");

    return (
        <Card className={`transition-all hover:shadow-md ${s.source === "discovered" ? "hover:border-emerald-500/30" : "hover:border-primary/30"}`}>
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 space-y-2">
                        {/* Name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {idx < 3 && (
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${idx === 0 ? "bg-amber-400 text-amber-900" : idx === 1 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"}`}>
                                    {idx + 1}
                                </span>
                            )}
                            <h5 className="font-bold text-sm">{s.name}</h5>
                            <Badge variant="outline" className={`text-xs ${SOURCE_META[s.source].className}`}>
                                {SOURCE_META[s.source].label}
                            </Badge>
                            {s.distKm !== undefined && (
                                <Badge variant="outline" className="gap-1 text-xs bg-primary/5 border-primary/20 text-primary">
                                    <Navigation className="h-2.5 w-2.5" />{s.distKm} km
                                </Badge>
                            )}
                            {s.verified && <Badge className="bg-blue-500/10 text-blue-600 text-xs">✓ Verified</Badge>}
                        </div>

                        {/* Score bar */}
                        <div className="flex items-center gap-2">
                            <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: `${Math.min(100, s.score)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground font-semibold">{s.score}/100</span>
                        </div>

                        {/* Contact info */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {s.address && (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{s.address}</span>
                            )}
                            {s.specialization && (
                                <span className="flex items-center gap-1"><Package className="h-3 w-3 shrink-0" />{s.specialization}</span>
                            )}
                            {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{s.phone}</span>}
                            {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" />{s.email}</span>}
                            {s.website && (
                                <a href={`https://${s.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                    <Globe className="h-3 w-3 shrink-0" />{s.website}
                                </a>
                            )}
                        </div>

                        {/* AI meta badges */}
                        {s.source === "ai" && (
                            <div className="flex flex-wrap gap-1 text-xs">
                                {s.moq && <Badge variant="secondary" className="font-normal text-xs">MOQ: {s.moq}</Badge>}
                                {s.delivery_time && <Badge variant="secondary" className="font-normal text-xs">⏱ {s.delivery_time}</Badge>}
                                {s.approx_cost && <Badge variant="secondary" className="font-normal text-xs">{s.approx_cost}</Badge>}
                                {s.export_capable && <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-normal text-xs">Export Ready</Badge>}
                            </div>
                        )}

                        {/* Material label */}
                        <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Supplies:</span> {materialName}
                        </p>

                        {/* Action buttons */}
                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                            {s.phone && (
                                <a href={`tel:${s.phone}`}>
                                    <Button size="sm" variant="outline" className="gap-1 rounded-full h-7 text-xs px-2.5">
                                        <Phone className="h-2.5 w-2.5" /> Call
                                    </Button>
                                </a>
                            )}
                            {s.phone && (
                                <Button size="sm" variant="outline"
                                    className="gap-1 rounded-full h-7 text-xs px-2.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                                    onClick={() => openWhatsApp(s.phone!)}>
                                    <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                                </Button>
                            )}
                            {s.lat !== undefined && s.lng !== undefined && (
                                <Button size="sm" variant="outline" className="gap-1 rounded-full h-7 text-xs px-2.5"
                                    onClick={() => openMap(s.lat!, s.lng!)}>
                                    <ExternalLink className="h-2.5 w-2.5" /> View Location
                                </Button>
                            )}
                            {s.website && (
                                <a href={s.website} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="default" className="gap-1 rounded-full h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                        <ExternalLink className="h-2.5 w-2.5" /> View Profile
                                    </Button>
                                </a>
                            )}
                            {s.source === "discovered" && (
                                <Button size="sm" variant="ghost"
                                    className="gap-1 rounded-full h-7 text-xs px-2.5 text-amber-600 hover:bg-amber-500/10 border border-amber-500/30"
                                    onClick={() => onClaim(s)}>
                                    <Building2 className="h-2.5 w-2.5" /> Claim
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right: rating */}
                    <div className="shrink-0 md:text-right space-y-1">
                        <StarRow rating={s.rating} />
                        {s.approx_cost && s.source === "ai" && (
                            <p className="text-xs font-bold text-primary">{s.approx_cost}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Product → Raw Materials lookup (instant, no API needed) ─────────────────
const PRODUCT_RAW_MATERIALS: Record<string, { name: string; sourceType: string; estimatedCost: string; tips: string }[]> = {
    "Candle": [
        { name: "Paraffin Wax / Soy Wax", sourceType: "Wholesale Market", estimatedCost: "₹80–150/kg", tips: "Buy in bulk from chemical dealers for best rates" },
        { name: "Fragrance Oil", sourceType: "Chemical Supplier", estimatedCost: "₹300–800/kg", tips: "Cosmetic-grade oils give best scent throw" },
        { name: "Cotton Wicks", sourceType: "Craft Store / Online", estimatedCost: "₹50–200/100 pcs", tips: "Match wick size to candle diameter" },
        { name: "Candle Dye / Pigment", sourceType: "Chemical Supplier", estimatedCost: "₹200–500/100g", tips: "Liquid dyes blend easier than chips" },
        { name: "Packaging Material", sourceType: "Packaging Supplier", estimatedCost: "₹5–30/unit", tips: "Kraft boxes add premium feel" },
    ],
    "Soap": [
        { name: "Soap Base (SLS-free)", sourceType: "Chemical Supplier", estimatedCost: "₹120–250/kg", tips: "Melt & pour base is easiest for beginners" },
        { name: "Caustic Soda (NaOH)", sourceType: "Chemical Dealer", estimatedCost: "₹40–80/kg", tips: "Store in cool dry place; handle with gloves" },
        { name: "Fragrance / Essential Oil", sourceType: "Chemical Supplier", estimatedCost: "₹300–800/kg", tips: "Use 2–3% max in cold-process soap" },
        { name: "Color Pigments", sourceType: "Craft Store", estimatedCost: "₹150–400/100g", tips: "Oxide pigments are stable in alkaline soap" },
        { name: "Coconut Oil / Olive Oil", sourceType: "Grocery Wholesale", estimatedCost: "₹120–200/L", tips: "Coconut oil adds lather; olive adds moisture" },
        { name: "Packaging Material", sourceType: "Packaging Supplier", estimatedCost: "₹5–25/unit", tips: "Shrink wrap or kraft paper work well" },
    ],
    "Vada Pav": [
        { name: "Potatoes", sourceType: "Vegetable Market", estimatedCost: "₹15–30/kg", tips: "Buy fresh from local mandi for best price" },
        { name: "Pav Bread", sourceType: "Bakery Wholesale", estimatedCost: "₹6–10/piece", tips: "Fresh daily supply essential; tie up with local bakery" },
        { name: "Besan (Gram Flour)", sourceType: "Grocery Wholesale", estimatedCost: "₹60–90/kg", tips: "Buy in 25 kg bags for kitchen scale savings" },
        { name: "Cooking Oil", sourceType: "Grocery Wholesale", estimatedCost: "₹100–140/L", tips: "Sunflower or groundnut oil preferred" },
        { name: "Spices & Masala", sourceType: "Spice Market", estimatedCost: "₹200–500/kg", tips: "Pre-mix in bulk to save prep time" },
        { name: "Packaging / Paper", sourceType: "Packaging Supplier", estimatedCost: "₹300–600/1000 sheets", tips: "Food-grade greaseproof paper for wrapping" },
    ],
    "Steel Fabrication": [
        { name: "Steel Sheets / MS Plates", sourceType: "Steel Trader", estimatedCost: "₹55–75/kg", tips: "Buy from certified ISI-marked suppliers" },
        { name: "Iron Rods / TMT Bars", sourceType: "Steel Trader", estimatedCost: "₹50–65/kg", tips: "Buy by weight from wholesale yards" },
        { name: "Welding Rods / Wire", sourceType: "Industrial Supplier", estimatedCost: "₹80–150/kg", tips: "Match rod grade to base metal" },
        { name: "Grinding Wheels / Discs", sourceType: "Hardware Supplier", estimatedCost: "₹30–100/piece", tips: "Norton or Bosch recommended for long life" },
        { name: "Angle / Channel Section", sourceType: "Steel Trader", estimatedCost: "₹52–70/kg", tips: "Standard 40×40 angle is most versatile" },
    ],
    "Bakery": [
        { name: "Wheat Flour (Maida)", sourceType: "Flour Mill / Wholesale", estimatedCost: "₹30–45/kg", tips: "Strong flour (11%+ protein) for bread" },
        { name: "Sugar", sourceType: "Grocery Wholesale", estimatedCost: "₹38–48/kg", tips: "Buy in 50 kg bags" },
        { name: "Butter / Shortening", sourceType: "Dairy Supplier", estimatedCost: "₹350–500/kg", tips: "Amul and Britannia reliable for bulk" },
        { name: "Yeast", sourceType: "Bakery Supplier", estimatedCost: "₹200–400/kg", tips: "Instant dry yeast has longer shelf life" },
        { name: "Eggs", sourceType: "Poultry Farm", estimatedCost: "₹5–7/egg", tips: "Farm-direct daily supply reduces cost 20%" },
        { name: "Packaging Boxes", sourceType: "Packaging Supplier", estimatedCost: "₹8–30/box", tips: "Window patty boxes increase perceived value" },
    ],
    "Clothing / Garments": [
        { name: "Fabric (Cotton/Polyester)", sourceType: "Textile Market", estimatedCost: "₹80–300/meter", tips: "Surat textile market offers best wholesale rates" },
        { name: "Thread / Yarn", sourceType: "Textile Supplier", estimatedCost: "₹50–150/spool", tips: "Match thread weight to fabric weight" },
        { name: "Buttons / Zippers", sourceType: "Haberdashery Shop", estimatedCost: "₹1–20/piece", tips: "Buy assorted packs for variety" },
        { name: "Elastic Band", sourceType: "Textile Supplier", estimatedCost: "₹20–60/meter", tips: "Braided elastic more durable than knitted" },
        { name: "Packaging Bags", sourceType: "Packaging Supplier", estimatedCost: "₹3–15/piece", tips: "Polybags with hang holes for retail display" },
    ],
    "Paper Bag": [
        { name: "Kraft Paper", sourceType: "Paper Dealer", estimatedCost: "₹60–100/kg", tips: "90–120 GSM for standard shopping bags" },
        { name: "Paper Rope / Handle", sourceType: "Paper Dealer", estimatedCost: "₹100–200/kg", tips: "Twisted paper rope most eco-friendly" },
        { name: "Printing Ink", sourceType: "Printer Supplier", estimatedCost: "₹400–800/kg", tips: "Water-based eco ink for food contact" },
        { name: "Adhesive / Glue", sourceType: "Chemical Supplier", estimatedCost: "₹80–200/L", tips: "PVA glue dries clear and strong" },
    ],
    "Pickle": [
        { name: "Raw Mangoes / Vegetables", sourceType: "Mandi / Farm", estimatedCost: "₹20–60/kg", tips: "Seasonal buying reduces cost significantly" },
        { name: "Mustard Oil", sourceType: "Oil Mill", estimatedCost: "₹120–160/L", tips: "Cold-pressed kachi ghani best for authentic pickle" },
        { name: "Spices (Methi, Fennel, Chilli)", sourceType: "Spice Market", estimatedCost: "₹200–600/kg", tips: "Buy whole and grind fresh for better quality" },
        { name: "Salt", sourceType: "Grocery Wholesale", estimatedCost: "₹15–25/kg", tips: "Non-iodized rock salt preferred for pickling" },
        { name: "Jars / Packaging", sourceType: "Packaging Supplier", estimatedCost: "₹15–60/jar", tips: "Pet jars lighter than glass; glass preferred for premium" },
    ],
    "Agarbatti (Incense)": [
        { name: "Bamboo Sticks", sourceType: "Bamboo Dealer", estimatedCost: "₹50–120/kg", tips: "8–11 inch length most common" },
        { name: "Charcoal / Sawdust Paste", sourceType: "Chemical Supplier", estimatedCost: "₹30–60/kg", tips: "Mix ratio critical for burn time" },
        { name: "Fragrance Oil / Dhoop", sourceType: "Fragrance Supplier", estimatedCost: "₹300–800/kg", tips: "Jasmine and sandalwood best sellers" },
        { name: "Jigit / Binding Powder", sourceType: "Chemical Supplier", estimatedCost: "₹40–80/kg", tips: "Controls moisture absorption" },
        { name: "Packaging Box", sourceType: "Packaging Supplier", estimatedCost: "₹3–15/box", tips: "Combo packs (10+1 free) move faster in retail" },
    ],
};

const POPULAR_PRODUCTS = Object.keys(PRODUCT_RAW_MATERIALS);

function lookupMaterials(product: string): RawMaterial[] {
    const key = Object.keys(PRODUCT_RAW_MATERIALS).find(
        (k) => k.toLowerCase() === product.toLowerCase()
    );
    if (key) return PRODUCT_RAW_MATERIALS[key];
    // Partial match fallback
    const partial = Object.keys(PRODUCT_RAW_MATERIALS).find(
        (k) => k.toLowerCase().includes(product.toLowerCase()) || product.toLowerCase().includes(k.toLowerCase())
    );
    if (partial) return PRODUCT_RAW_MATERIALS[partial];
    // Generic fallback for any product not in DB
    return [];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface RawMaterialSupplierDiscoveryProps {
    materials: RawMaterial[];
    businessType: string;
    productName?: string;   // the specific product selected by the user
    products?: string[];    // all user-selected products from the business plan (for dropdown)
    lang?: "en" | "hi" | "mr";
}

// ── Main component ─────────────────────────────────────────────────────────────
export function RawMaterialSupplierDiscovery({
    materials: propMaterials,
    businessType,
    productName,
    products,
    lang = "en",
}: RawMaterialSupplierDiscoveryProps) {
    // Product selector state — only shown when no plan materials are available
    // Pre-fill with productName (user's selected product) if available, else businessType
    const [productInput, setProductInput] = useState(productName || businessType || "");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [manualMaterials, setManualMaterials] = useState<RawMaterial[]>([]);

    // Use plan materials if available, otherwise use manually selected ones
    const materials = propMaterials.length > 0 ? propMaterials : manualMaterials;
    const showProductPicker = propMaterials.length === 0;

    // Whether we have a real user-defined product list from the business plan
    const hasPlanProducts = products && products.length > 0;

    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

    const selectProduct = async (p: string) => {
        setProductInput(p);
        setSelectedProduct(p);

        const localMaterials = lookupMaterials(p);
        if (localMaterials.length > 0) {
            setManualMaterials(localMaterials);
            return;
        }

        // Fetch from AI backend for unknown products
        setIsLoadingMaterials(true);
        setManualMaterials([]); // clear while loading
        try {
            const res = await getProductMaterials(businessType, p);
            if (res && res.materials && res.materials.length > 0) {
                const aiMaterials = res.materials.map((m: any) => ({
                    name: m.name,
                    sourceType: m.supplier_source || "Wholesale Market",
                    estimatedCost: m.cost_estimate || "Contact supplier for quote",
                    tips: m.quality_tip || ""
                }));
                setManualMaterials(aiMaterials);
            } else {
                setManualMaterials([
                    { name: `${p} Raw Material`, sourceType: "Wholesale Market", estimatedCost: "Contact supplier for quote", tips: `Search '${p} material supplier near me'` },
                    { name: `${p} Packaging`, sourceType: "Packaging Supplier", estimatedCost: "₹5–50/unit", tips: "Negotiate bulk pricing" },
                ]);
            }
        } catch (e) {
            console.error("Failed to fetch product materials:", e);
            setManualMaterials([
                { name: `${p} Raw Material`, sourceType: "Wholesale Market", estimatedCost: "Contact supplier for quote", tips: `Search '${p} material supplier near me'` },
                { name: `${p} Packaging`, sourceType: "Packaging Supplier", estimatedCost: "₹5–50/unit", tips: "Negotiate bulk pricing" },
            ]);
        } finally {
            setIsLoadingMaterials(false);
        }
    };

    const handleProductSearch = () => {
        const p = productInput.trim();
        if (!p) return;
        selectProduct(p);
    };

    // Auto-trigger search when productName or products[0] is provided and no plan materials exist
    useEffect(() => {
        if (propMaterials.length > 0) return; // plan materials take priority
        if (selectedProduct) return;           // already selected
        const autoProduct = hasPlanProducts ? products![0] : productName;
        if (autoProduct) selectProduct(autoProduct);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productName, products]);

    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);
    const [city, setCity] = useState("");
    const [cityInput, setCityInput] = useState("");
    const [geoError, setGeoError] = useState("");
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoReady, setGeoReady] = useState(false);

    const [groups, setGroups] = useState<MaterialSupplierGroup[]>(() =>
        materials.map((m) => ({ material: m, suppliers: [], loading: false, loaded: false, expanded: false }))
    );

    const [claimTarget, setClaimTarget] = useState<UnifiedSupplier | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [activeMapSuppliers, setActiveMapSuppliers] = useState<UnifiedSupplier[]>([]);

    // Update groups if materials change (plan or manual)
    useEffect(() => {
        setGroups(materials.map((m) => ({ material: m, suppliers: [], loading: false, loaded: false, expanded: false })));
    }, [materials]);


    const isPlausiblePhone = (phone?: string) => {
        if (!phone) return false;
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return false;
        if (/0000+|1111+|2222+|3333+|4444+|5555+|6666+|7777+|8888+|9999+|12345/.test(digits)) return false;
        if (/^(\d)\1+$/.test(digits)) return false;
        return true;
    };

    // ── Fetch suppliers for one material ─────────────────────────────────────
    const fetchForMaterial = useCallback(async (
        materialIdx: number,
        lat: number | null,
        lng: number | null,
        cityName: string
    ) => {
        const material = materials[materialIdx];
        if (!material) return;

        setGroups((prev) => prev.map((g, i) =>
            i === materialIdx ? { ...g, loading: true, loaded: false } : g
        ));

        const keywords = [material.name, businessType].join(" ").split(/[\s,]+/).filter(Boolean);

        // Parallel: AI backend + Overpass API
        const [aiData, osmData] = await Promise.all([
            getEnrichedSuppliers(businessType, material.name, cityName || "India"),
            lat !== null && lng !== null
                ? fetchOverpassForMaterial(lat, lng, material.name)
                : Promise.resolve([] as Omit<UnifiedSupplier, "score">[]),
        ]);

        // Normalize AI suppliers
        const aiFormatted: Omit<UnifiedSupplier, "score">[] = (aiData?.suppliers || []).map((s) => {
            const [sLat, sLng] = lat !== null && lng !== null
                ? pseudoLatLng(lat, lng, s.name)
                : [0, 0];
            return {
                id: `ai-${s.name}`,
                name: s.name,
                address: `${s.city || ""}, ${s.country || ""}`.trim().replace(/^,\s*/, ""),
                city: s.city || "",
                phone: isPlausiblePhone(s.phone) ? s.phone : undefined,
                email: s.email || undefined,
                website: s.website || undefined,
                lat: lat !== null && lng !== null ? sLat : undefined,
                lng: lat !== null && lng !== null ? sLng : undefined,
                distKm: lat !== null && lng !== null
                    ? parseFloat(haversineKm(lat, lng, sLat, sLng).toFixed(1))
                    : undefined,
                rating: s.rating || 4,
                source: "ai" as SourceType,
                specialization: s.specialization || material.name,
                moq: s.moq,
                delivery_time: s.delivery_time,
                approx_cost: s.approx_cost,
                payment_terms: s.payment_terms,
                export_capable: s.export_capable,
                verified: s.verified,
            };
        });

        const ranked = mergeAndRank(aiFormatted, osmData, keywords);

        setGroups((prev) => prev.map((g, i) =>
            i === materialIdx ? { ...g, suppliers: ranked, loading: false, loaded: true, expanded: true } : g
        ));
    }, [materials, businessType]);

    // ── Fetch ALL materials in sequence (rate-limit friendly) ────────────────
    const fetchAll = useCallback(async (lat: number | null, lng: number | null, cityName: string) => {
        for (let i = 0; i < materials.length; i++) {
            await fetchForMaterial(i, lat, lng, cityName);
            // Small delay to avoid hammering APIs
            if (i < materials.length - 1) await new Promise((r) => setTimeout(r, 400));
        }
    }, [materials, fetchForMaterial]);

    // ── Geolocation ─────────────────────────────────────────────────────────
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoError("Geolocation not supported.");
            return;
        }
        setGeoLoading(true);
        setGeoError("");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLat(latitude);
                setUserLng(longitude);
                const detected = await reverseGeocode(latitude, longitude);
                const resolvedCity = detected || "India";
                setCity(resolvedCity);
                setGeoLoading(false);
                setGeoReady(true);
                fetchAll(latitude, longitude, resolvedCity);
            },
            (err) => {
                setGeoLoading(false);
                setGeoError(
                    err.code === err.PERMISSION_DENIED
                        ? "Location access denied."
                        : "Cannot detect location. Enter your city to continue."
                );
            },
            { timeout: 10000, maximumAge: 300000 }
        );
    }, [fetchAll]);

    useEffect(() => { requestLocation(); }, [requestLocation]);

    // Manual city search
    const handleManualSearch = () => {
        const c = cityInput.trim();
        if (!c) return;
        setCity(c);
        setCityInput("");
        setGeoError("");
        setGeoReady(true);
        fetchAll(userLat, userLng, c);
    };

    // Toggle material group open/closed
    const toggleExpand = (idx: number) => {
        setGroups((prev) => prev.map((g, i) =>
            i === idx ? { ...g, expanded: !g.expanded } : g
        ));
    };

    // Show map for a material
    const handleViewMap = (group: MaterialSupplierGroup) => {
        setActiveMapSuppliers(group.suppliers.filter((s) => s.lat !== undefined && s.lng !== undefined));
        setShowMap(true);
    };

    const allLoaded = groups.every((g) => g.loaded);
    const totalSuppliers = groups.reduce((acc, g) => acc + g.suppliers.length, 0);

    return (
        <div className="space-y-5">

            {/* ── Product Picker (only when no plan materials) ──────────────── */}
            {showProductPicker && (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 space-y-4">
                    <div>
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            {hasPlanProducts ? "Select a Product" : "Select Your Product"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {hasPlanProducts
                                ? "Click a product below to see its raw materials and nearby suppliers."
                                : "Choose or type your product — we'll instantly show its raw materials and nearby suppliers."}
                        </p>
                    </div>

                    {hasPlanProducts ? (
                        /* ── Plan product pill selector ── */
                        <div className="flex flex-wrap gap-2">
                            {products!.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => selectProduct(p)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${selectedProduct === p
                                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                        : "bg-background text-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5"
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* ── Free-text + generic chips (fallback) ── */
                        <>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. Candle, Soap, Steel Fabrication, Vada Pav…"
                                    value={productInput}
                                    onChange={(e) => setProductInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleProductSearch(); }}
                                    className="rounded-full flex-1 bg-background"
                                />
                                <Button
                                    onClick={handleProductSearch}
                                    disabled={!productInput.trim()}
                                    className="rounded-full gap-1.5"
                                    size="sm"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    Find Suppliers
                                </Button>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">Quick select:</p>
                                <div className="flex flex-wrap gap-2">
                                    {POPULAR_PRODUCTS.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => selectProduct(p)}
                                            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5 transition-all"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Selected product banner (when product is chosen from plan pills) ── */}
            {showProductPicker && selectedProduct && hasPlanProducts && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 w-fit">
                    <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {selectedProduct}
                    </span>
                    <span className="text-xs text-muted-foreground">• {materials.length} raw materials loaded</span>
                </div>
            )}

            {/* ── Selected product banner (free-text mode) ─────────────────── */}
            {showProductPicker && selectedProduct && !hasPlanProducts && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 w-fit">
                    <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {selectedProduct}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {isLoadingMaterials ? (
                            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> researching raw materials...</span>
                        ) : (
                            `• ${materials.length} raw materials found`
                        )}
                    </span>
                    <button
                        onClick={() => { setSelectedProduct(""); setManualMaterials([]); }}
                        className="text-xs text-primary hover:underline ml-1"
                    >
                        Change
                    </button>
                </div>
            )}

            {/* ── Location bar ──────────────────────────────────────────────── */}
            {geoLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting your location…
                </div>
            )}

            {geoError && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {geoError}
                    </p>
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. Mumbai, Pune, Surat…"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleManualSearch(); }}
                            className="rounded-full flex-1"
                        />
                        <Button onClick={handleManualSearch} size="sm" className="gap-1.5 rounded-full" disabled={!cityInput.trim()}>
                            <Search className="h-3.5 w-3.5" /> Search
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={requestLocation} className="gap-2 w-fit rounded-full">
                        <Navigation className="h-3.5 w-3.5" /> Try Again
                    </Button>
                </div>
            )}

            {/* City badge + override */}
            {city && !geoError && (
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 rounded-full border-primary/30 bg-primary/5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {city}
                    </Badge>
                    <div className="flex gap-2 items-center">
                        <Input
                            placeholder="Change city…"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleManualSearch(); }}
                            className="rounded-full h-8 text-sm w-36"
                        />
                        <Button onClick={handleManualSearch} size="sm" variant="outline" className="rounded-full h-8 px-3" disabled={!cityInput.trim()}>
                            <Search className="h-3 w-3" />
                        </Button>
                    </div>
                    {allLoaded && (
                        <Badge variant="outline" className="text-xs gap-1.5 text-emerald-700 border-emerald-500/30">
                            <Zap className="h-3 w-3" />
                            {totalSuppliers} suppliers found
                        </Badge>
                    )}
                </div>
            )}

            {/* ── Imperative Leaflet Map (no react-leaflet) ── */}
            {showMap && userLat !== null && userLng !== null && (
                <div className="rounded-2xl overflow-hidden border border-border/60 shadow-md space-y-2">
                    <div className="flex justify-between items-center px-4 pt-3">
                        <p className="text-sm font-semibold">Supplier Map</p>
                        <Button variant="ghost" size="sm" onClick={() => setShowMap(false)} className="h-7 text-xs">Close Map</Button>
                    </div>
                    <LeafletMap
                        center={[userLat, userLng]}
                        zoom={12}
                        style={{ height: 320 }}
                        onMapReady={(map) => {
                            const layersRef = { current: [] as L.Layer[] };
                            buildMapLayers(map, layersRef, userLat, userLng, city, activeMapSuppliers);
                        }}
                    />
                    <div className="flex gap-4 px-4 pb-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> AI Verified</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Discovered</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> You</span>
                    </div>
                </div>
            )}


            {/* ── Material groups ────────────────────────────────────────────── */}
            {groups.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                    No raw materials found for this business. Go back and generate a business plan first.
                </p>
            )}

            {groups.map((group, idx) => {
                const aiCount = group.suppliers.filter((s) => s.source === "ai").length;
                const osmCount = group.suppliers.filter((s) => s.source === "discovered").length;

                return (
                    <Card key={group.material.name} className={`transition-all ${group.expanded ? "border-primary/30 shadow-md" : "hover:border-border"}`}>
                        <CardContent className="p-0">
                            {/* Material header row */}
                            <button
                                className="w-full flex items-center gap-4 p-4 text-left"
                                onClick={() => {
                                    if (!group.loaded && !group.loading && geoReady) {
                                        fetchForMaterial(idx, userLat, userLng, city || "India");
                                    }
                                    toggleExpand(idx);
                                }}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-base">{group.material.name}</h4>
                                        <Badge variant="secondary" className="text-xs font-normal">{group.material.estimatedCost}</Badge>
                                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{group.material.sourceType}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.material.tips}</p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {group.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    {group.loaded && !group.loading && (
                                        <div className="flex gap-1">
                                            <Badge variant="outline" className="text-xs gap-1">🤖 {aiCount}</Badge>
                                            <Badge variant="outline" className="text-xs gap-1">🔍 {osmCount}</Badge>
                                        </div>
                                    )}
                                    {!group.loaded && !group.loading && geoReady && (
                                        <span className="text-xs text-primary font-medium">Click to load</span>
                                    )}
                                    {!group.loaded && !group.loading && !geoReady && (
                                        <span className="text-xs text-muted-foreground">Enter city first</span>
                                    )}
                                    {group.expanded
                                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    }
                                </div>
                            </button>

                            {/* Expanded supplier list */}
                            {group.expanded && (
                                <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                                    {/* Skeleton while loading */}
                                    {group.loading && (
                                        <div className="space-y-3">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="flex gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-1/3" />
                                                        <Skeleton className="h-3 w-1/2" />
                                                    </div>
                                                </div>
                                            ))}
                                            <p className="text-xs text-muted-foreground animate-pulse text-center">
                                                Searching AI + OSM for {group.material.name} suppliers…
                                            </p>
                                        </div>
                                    )}

                                    {/* No results */}
                                    {group.loaded && !group.loading && group.suppliers.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-muted-foreground">No suppliers found nearby. Try a different city.</p>
                                            <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs"
                                                onClick={() => fetchForMaterial(idx, userLat, userLng, city || "India")}>
                                                <RefreshCw className="h-3 w-3" /> Retry
                                            </Button>
                                        </div>
                                    )}

                                    {/* Supplier cards */}
                                    {group.loaded && !group.loading && group.suppliers.length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-xs">🤖 {aiCount} AI</Badge>
                                                    <Badge variant="outline" className="text-xs">🔍 {osmCount} OSM</Badge>
                                                </div>
                                                <div className="flex gap-2">
                                                    {userLat && group.suppliers.some(s => s.lat !== undefined) && (
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                                            onClick={() => handleViewMap(group)}>
                                                            <MapPin className="h-3 w-3" /> View on Map
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                                        onClick={() => fetchForMaterial(idx, userLat, userLng, city || "India")}>
                                                        <RefreshCw className="h-3 w-3" /> Refresh
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                {group.suppliers.map((s, sIdx) => (
                                                    <SupplierCard
                                                        key={s.id}
                                                        s={s}
                                                        idx={sIdx}
                                                        materialName={group.material.name}
                                                        onClaim={setClaimTarget}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {/* ── Claim Modal ────────────────────────────────────────────────── */}
            {claimTarget && (
                <SupplierClaimModal
                    open={!!claimTarget}
                    onClose={() => setClaimTarget(null)}
                    supplierName={claimTarget.name}
                    supplierAddress={claimTarget.address}
                />
            )}
        </div>
    );
}
