/**
 * NearbySupplierMap.tsx — AI-Powered Smart Supplier Discovery System
 *
 * Uses imperative Leaflet (via LeafletMap.tsx) — NO react-leaflet — to avoid
 * the react-leaflet v5 / React 18.3 Context API crash.
 *
 * Sources:
 *   • AI / Internal  →  getEnrichedSuppliers() (existing BI service)
 *   • Discovered     →  Overpass API (live OpenStreetMap data)
 *
 * Features:
 *   ✅ Overpass API real OSM business discovery
 *   ✅ Supplier ranking / scoring (40% match + 30% dist + 20% rating + 10% contact)
 *   ✅ All / AI Verified / Discovered filter tabs
 *   ✅ Call / WhatsApp / View Location action buttons
 *   ✅ "Claim this Business" for Overpass-discovered listings
 *   ✅ Dedup + merge from multiple sources
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import L from "leaflet";
import { LeafletMap } from "@/components/suppliers/LeafletMap";
import { ICONS } from "@/components/suppliers/leafletSetup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getEnrichedSuppliers } from "@/services/biIntelligenceService";
import type { EnrichedSupplier } from "@/types/productIntelligence";
import type { RawMaterial } from "@/types/business";
import { SupplierClaimModal } from "@/components/suppliers/SupplierClaimModal";
import {
    MapPin, Navigation, Phone, Mail, Globe, Package,
    Star, AlertCircle, Loader2, Search, RefreshCw,
    MessageCircle, Building2, ExternalLink, Trophy,
} from "lucide-react";

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
    rawMaterial?: string;   // which raw material this supplier covers
    moq?: string;
    delivery_time?: string;
    approx_cost?: string;
    payment_terms?: string;
    export_capable?: boolean;
    verified?: boolean;
    score: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        // BigDataCloud — free, no key, CORS-safe from localhost
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

function computeScore(s: Omit<UnifiedSupplier, "score">, productKeywords: string[]): number {
    const text = `${s.name} ${s.specialization || ""}`.toLowerCase();
    const matchCount = productKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
    const productScore = Math.min(40, (matchCount / Math.max(productKeywords.length, 1)) * 40);
    const distScore = s.distKm !== undefined ? Math.max(0, 30 - (s.distKm / 30) * 30) : 15;
    const ratingScore = ((s.rating || 3) / 5) * 20;
    const contactScore = (s.phone ? 5 : 0) + (s.email || s.website ? 3 : 0) + (s.verified ? 2 : 0);
    return Math.round(productScore + distScore + ratingScore + contactScore);
}

// Simple in-memory cache — keyed by "product+lat+lng" to avoid hammering Overpass on re-renders
const overpassCache = new Map<string, Omit<UnifiedSupplier, "score">[]>();

async function fetchOverpassSuppliers(
    lat: number, lng: number, product: string, radiusM = 25000, limit = 15
): Promise<Omit<UnifiedSupplier, "score">[]> {
    const cacheKey = `${product}|${lat.toFixed(3)}|${lng.toFixed(3)}|${limit}`;
    if (overpassCache.has(cacheKey)) return overpassCache.get(cacheKey)!;

    const kw = product.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() || "supplier";
    const query = `
[out:json][timeout:25];
(
  node["shop"~"${kw}",i](around:${radiusM},${lat},${lng});
  node["industrial"~"${kw}",i](around:${radiusM},${lat},${lng});
  node["office"~"${kw}",i](around:${radiusM},${lat},${lng});
  node["name"~"${kw}",i](around:${radiusM},${lat},${lng})["amenity"!~""];
  way["name"~"${kw}",i](around:${radiusM},${lat},${lng})["shop"];
  way["name"~"${kw}",i](around:${radiusM},${lat},${lng})["industrial"];
);
out center ${limit};`;
    try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) return [];
        const json = await res.json();
        const elements: Omit<UnifiedSupplier, "score">[] = [];
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
            elements.push({
                id: `osm-${el.id}`,
                name,
                address: [tags["addr:street"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ") || "Address not listed",
                city: tags["addr:city"] || "",
                phone: tags.phone || tags["contact:phone"] || undefined,
                email: tags.email || tags["contact:email"] || undefined,
                website: tags.website || tags["contact:website"] || undefined,
                lat: elLat,
                lng: elLng,
                distKm,
                rating: 3.5,
                source: "discovered",
                specialization: tags.shop || tags.industrial || tags.office || kw,
                verified: false,
            });
        }
        const sorted = elements.sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
        overpassCache.set(cacheKey, sorted);
        return sorted;
    } catch { return []; }
}

const isPlausiblePhone = (phone?: string) => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return false;
    if (/0000+|1111+|2222+|3333+|4444+|5555+|6666+|7777+|8888+|9999+|12345/.test(digits)) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    return true;
};

function fromAI(s: EnrichedSupplier, userLat: number, userLng: number): Omit<UnifiedSupplier, "score"> {
    const [sLat, sLng] = pseudoLatLng(userLat, userLng, s.name);
    return {
        id: `ai-${s.name}`,
        name: s.name,
        address: `${s.city || ""}, ${s.country || ""}`.trim().replace(/^,\s*/, ""),
        city: s.city || "",
        phone: isPlausiblePhone(s.phone) ? s.phone : undefined,
        email: s.email || undefined,
        website: s.website || undefined,
        lat: sLat,
        lng: sLng,
        distKm: parseFloat(haversineKm(userLat, userLng, sLat, sLng).toFixed(1)),
        rating: s.rating || 4,
        source: "ai",
        specialization: s.specialization || "",
        moq: s.moq,
        delivery_time: s.delivery_time,
        approx_cost: s.approx_cost,
        payment_terms: s.payment_terms,
        export_capable: s.export_capable,
        verified: s.verified,
    };
}

function mergeAndRank(
    ai: Omit<UnifiedSupplier, "score">[],
    discovered: Omit<UnifiedSupplier, "score">[],
    productKeywords: string[]
): UnifiedSupplier[] {
    const seen = new Set<string>();
    const all: UnifiedSupplier[] = [];
    for (const s of [...ai, ...discovered]) {
        const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ ...s, score: computeScore(s, productKeywords) });
    }
    return all.sort((a, b) => b.score - a.score);
}

// ── Star rating ────────────────────────────────────────────────────────────────
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

type FilterTab = "all" | "ai" | "discovered";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
    { value: "all", label: "🏆 All Suppliers" },
    { value: "ai", label: "🤖 AI Verified" },
    { value: "discovered", label: "🔍 Discovered (OSM)" },
];

interface NearbySupplierMapProps {
    businessType: string;
    productName?: string;
    materials?: RawMaterial[];  // raw materials for the selected product/business
    lang?: "en" | "hi" | "mr";
}

// ── Main component ────────────────────────────────────────────────────────────
export function NearbySupplierMap({ businessType, productName, materials, lang = "en" }: NearbySupplierMapProps) {
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);
    const [city, setCity] = useState("");
    const [cityInput, setCityInput] = useState("");
    const [geoError, setGeoError] = useState("");
    const [geoLoading, setGeoLoading] = useState(false);

    const [aiSuppliers, setAiSuppliers] = useState<Omit<UnifiedSupplier, "score">[]>([]);
    const [osmSuppliers, setOsmSuppliers] = useState<Omit<UnifiedSupplier, "score">[]>([]);
    const [merged, setMerged] = useState<UnifiedSupplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
    const [claimTarget, setClaimTarget] = useState<UnifiedSupplier | null>(null);
    const [displayLimit, setDisplayLimit] = useState(15);

    // Keep a ref to the L.Map instance for imperative marker management
    const markersRef = useRef<L.Layer[]>([]);
    const mapRef = useRef<L.Map | null>(null);

    // Guard against concurrent fetches firing Overpass multiple times
    const isFetchingRef = useRef(false);

    // When materials are available, search by raw material names; otherwise fall back to product/business
    const materialNames = useMemo(
        () => (materials && materials.length > 0 ? materials.map((m) => m.name) : []),
        [materials]
    );

    // Keywords for ranking/scoring — all material names + business context
    const productKeywords = useMemo(
        () =>
            materialNames.length > 0
                ? [...materialNames, businessType]
                : [businessType, productName || ""].join(" ").split(/[\s,]+/).filter(Boolean),
        [materialNames, businessType, productName]
    );

    // Primary search term for Overpass OSM (pipe-joined for regex, max 4 materials to stay within query limits)
    const materialSearchTerm = useMemo(
        () =>
            materialNames.length > 0
                ? materialNames
                    .slice(0, 4)
                    .map((n) => n.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim())
                    .filter(Boolean)
                    .join("|")
                : (productName || businessType).toLowerCase().replace(/[^a-z0-9 ]/g, ""),
        [materialNames, productName, businessType]
    );

    // ── Update map markers imperatively ──────────────────────────────────────
    const updateMapMarkers = useCallback((map: L.Map, lat: number, lng: number, suppliers: Omit<UnifiedSupplier, "score">[]) => {
        // Clear old markers
        markersRef.current.forEach((m) => map.removeLayer(m));
        markersRef.current = [];

        // User marker
        const userMarker = L.marker([lat, lng], { icon: ICONS.user })
            .bindPopup(`<strong>📍 You are here</strong><br/>${city}`);
        userMarker.addTo(map);
        markersRef.current.push(userMarker);

        // Radius circle
        const circle = L.circle([lat, lng], {
            radius: 25000,
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.05,
            weight: 2,
            dashArray: "6 4",
        }).addTo(map);
        markersRef.current.push(circle);

        // Supplier markers
        for (const s of suppliers) {
            if (s.lat === undefined || s.lng === undefined) continue;
            const icon = s.source === "ai" ? ICONS.ai : ICONS.osm;
            const marker = L.marker([s.lat, s.lng], { icon })
                .bindPopup(`
                    <div style="min-width:160px">
                        <p style="font-weight:700;margin-bottom:2px">${s.name}</p>
                        <p style="font-size:11px;color:${s.source === "ai" ? "#6366f1" : "#059669"}">${s.source === "ai" ? "🤖 AI Verified" : "🔍 Discovered"}</p>
                        <p style="font-size:12px;color:#64748b">${s.specialization || ""}</p>
                        ${s.phone ? `<p style="font-size:12px">📞 ${s.phone}</p>` : ""}
                        ${s.distKm !== undefined ? `<p style="font-size:11px;color:#6366f1;margin-top:3px">${s.distKm} km away</p>` : ""}
                    </div>
                `);
            marker.addTo(map);
            markersRef.current.push(marker);
        }
    }, [city]);

    const handleMapReady = useCallback((map: L.Map) => {
        mapRef.current = map;
        if (userLat !== null && userLng !== null) {
            updateMapMarkers(map, userLat, userLng, [...aiSuppliers, ...osmSuppliers]);
        }
    }, [userLat, userLng, aiSuppliers, osmSuppliers, updateMapMarkers]);

    // Update markers when suppliers change
    useEffect(() => {
        if (mapRef.current && userLat !== null && userLng !== null) {
            updateMapMarkers(mapRef.current, userLat, userLng, [...aiSuppliers, ...osmSuppliers]);
        }
    }, [aiSuppliers, osmSuppliers, userLat, userLng, updateMapMarkers]);

    // ── Fetch suppliers ──────────────────────────────────────────────────────
    const fetchAI = useCallback(async (cityName: string, force = false): Promise<EnrichedSupplier[]> => {
        if (!cityName.trim()) return [];
        if (materialNames.length > 0) {
            // Fetch AI suppliers for each raw material (sequential to be rate-limit friendly)
            const all: EnrichedSupplier[] = [];
            for (const mat of materialNames.slice(0, 4)) {
                if (force) {
                    try { localStorage.removeItem(`bi:suppliers:${businessType}:${mat}:${cityName}`); } catch { }
                }
                const data = await getEnrichedSuppliers(businessType, mat, cityName);
                const sups = (data?.suppliers || []).map((s) => ({ ...s, _materialLabel: mat }));
                all.push(...sups);
            }
            return all;
        }
        // Fallback: search by product/business name
        if (force) {
            try { localStorage.removeItem(`bi:suppliers:${businessType}:${productName || businessType}:${cityName}`); } catch { }
        }
        const data = await getEnrichedSuppliers(businessType, productName || businessType, cityName);
        return data?.suppliers || [];
    }, [businessType, productName, materialNames]);

    const runDiscovery = useCallback(async (lat: number, lng: number, cityName: string, force = false) => {
        if (isFetchingRef.current) return; // block concurrent calls
        isFetchingRef.current = true;
        setLoading(true);
        setLoaded(false);
        setDisplayLimit(15);
        try {
            const [aiRaw, osmRaw] = await Promise.all([
                fetchAI(cityName, force),
                // Use materialSearchTerm so Overpass finds matching raw material suppliers
                fetchOverpassSuppliers(lat, lng, materialSearchTerm, 25000, 15),
            ]);
            // Preserve the _materialLabel field added by fetchAI
            const aiFormatted = (aiRaw || []).map((s) => ({
                ...fromAI(s, lat, lng),
                rawMaterial: (s as EnrichedSupplier & { _materialLabel?: string })._materialLabel,
            }));
            setAiSuppliers(aiFormatted);
            setOsmSuppliers(osmRaw);
            const ranked = mergeAndRank(aiFormatted, osmRaw, productKeywords);
            setMerged(ranked);
        } finally {
            setLoading(false);
            setLoaded(true);
            isFetchingRef.current = false;
        }
    }, [fetchAI, materialSearchTerm, productKeywords]);

    const runCityOnlyDiscovery = useCallback(async (cityName: string, force = false) => {
        setLoading(true);
        setLoaded(false);
        const aiRaw = await fetchAI(cityName, force);
        const aiFormatted = (aiRaw || []).map((s) => ({
            id: `ai-${s.name}`, name: s.name,
            address: `${s.city || cityName}, ${s.country || "India"}`,
            city: s.city || cityName, source: "ai" as SourceType,
            distKm: undefined, lat: undefined, lng: undefined,
            rating: s.rating || 4, specialization: s.specialization,
            moq: s.moq, delivery_time: s.delivery_time,
            approx_cost: s.approx_cost, payment_terms: s.payment_terms,
            export_capable: s.export_capable, verified: s.verified,
            phone: isPlausiblePhone(s.phone) ? s.phone : undefined,
            email: s.email || undefined, website: s.website || undefined,
        }));
        setAiSuppliers(aiFormatted);
        setOsmSuppliers([]);
        const ranked = mergeAndRank(aiFormatted, [], productKeywords);
        setMerged(ranked);
        setLoading(false);
        setLoaded(true);
    }, [fetchAI, productKeywords]);

    // ── Geolocation ───────────────────────────────────────────────────────────
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) { setGeoError("Geolocation not supported."); return; }
        setGeoLoading(true); setGeoError("");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLat(latitude); setUserLng(longitude);
                const detected = await reverseGeocode(latitude, longitude);
                const resolvedCity = detected || "India";
                setCity(resolvedCity);
                setGeoLoading(false);
                runDiscovery(latitude, longitude, resolvedCity);
            },
            (err) => {
                setGeoLoading(false);
                setGeoError(
                    err.code === err.PERMISSION_DENIED
                        ? "Location access denied."
                        : "Could not detect location. Please enter your city below."
                );
            },
            { timeout: 10000, maximumAge: 300000 }
        );
    }, [runDiscovery]);

    useEffect(() => { requestLocation(); }, [requestLocation]);

    const handleManualSearch = () => {
        const c = cityInput.trim();
        if (!c) return;
        setCity(c); setCityInput(""); setGeoError("");
        if (userLat !== null && userLng !== null) runDiscovery(userLat, userLng, c);
        else runCityOnlyDiscovery(c);
    };

    const handleRefresh = () => {
        if (userLat !== null && userLng !== null) runDiscovery(userLat, userLng, city, true);
        else if (city) runCityOnlyDiscovery(city, true);
    };

    const filtered = activeFilter === "all" ? merged : merged.filter((s) => s.source === activeFilter);
    const aiCount = merged.filter((s) => s.source === "ai").length;
    const osmCount = merged.filter((s) => s.source === "discovered").length;
    const displayed = filtered.slice(0, displayLimit);
    const hasMore = filtered.length > displayLimit;

    const handleLoadMore = async () => {
        const nextLimit = displayLimit + 15;
        setDisplayLimit(nextLimit);
        // Re-fetch Overpass with a higher limit to get fresh results
        if (userLat !== null && userLng !== null) {
            const more = await fetchOverpassSuppliers(userLat, userLng, productName || businessType, 25000, nextLimit);
            setOsmSuppliers(more);
            const ranked = mergeAndRank(aiSuppliers, more, productKeywords);
            setMerged(ranked);
        }
    };

    const openWhatsApp = (phone: string) =>
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
    const openMap = (lat: number, lng: number) =>
        window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`, "_blank");

    return (
        <div className="space-y-5">
            {/* Location loading */}
            {geoLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Detecting your location…
                </div>
            )}

            {/* Geo error + manual city input */}
            {geoError && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />{geoError}
                    </p>
                    <div className="flex gap-2">
                        <Input placeholder="e.g. Mumbai, Pune, Surat…" value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleManualSearch(); }}
                            className="rounded-full flex-1" />
                        <Button onClick={handleManualSearch} size="sm" className="gap-1.5 rounded-full" disabled={!cityInput.trim()}>
                            <Search className="h-3.5 w-3.5" /> Search
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={requestLocation} className="gap-2 w-fit rounded-full">
                        <Navigation className="h-3.5 w-3.5" /> Allow Location
                    </Button>
                </div>
            )}

            {/* City badge */}
            {city && !geoError && (
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 rounded-full border-primary/30 bg-primary/5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-primary" />{city}
                    </Badge>
                    <div className="flex gap-2">
                        <Input placeholder="Change city…" value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleManualSearch(); }}
                            className="rounded-full h-8 text-sm w-40" />
                        <Button onClick={handleManualSearch} size="sm" variant="outline" className="rounded-full h-8 px-3" disabled={!cityInput.trim()}>
                            <Search className="h-3 w-3" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 rounded-full" onClick={handleRefresh}>
                        <RefreshCw className="h-3 w-3" /> Refresh
                    </Button>
                </div>
            )}

            {/* ── Imperative Leaflet Map (no react-leaflet) ── */}
            {userLat !== null && userLng !== null && (
                <div className="rounded-2xl overflow-hidden border border-border/60 shadow-md">
                    <LeafletMap
                        center={[userLat, userLng]}
                        zoom={12}
                        style={{ height: 340 }}
                        onMapReady={handleMapReady}
                    />
                </div>
            )}

            {/* Map legend */}
            {userLat && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> AI Verified</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Discovered (OSM)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Your location</span>
                </div>
            )}

            {/* Loading skeletons */}
            {loading && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" /> Scanning AI & OSM sources simultaneously…
                    </div>
                    {[1, 2, 3].map((i) => (
                        <Card key={i}><CardContent className="p-4">
                            <div className="flex gap-4">
                                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        </CardContent></Card>
                    ))}
                </div>
            )}

            {/* Results */}
            {!loading && loaded && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            <strong className="text-foreground">{merged.length}</strong> suppliers found near {city}
                        </p>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">🤖 {aiCount} AI</Badge>
                            <Badge variant="outline" className="text-xs">🔍 {osmCount} OSM</Badge>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-1 p-1 rounded-xl border border-border/40 bg-muted/20 w-fit flex-wrap">
                        {FILTER_TABS.map((tab) => (
                            <button key={tab.value} onClick={() => setActiveFilter(tab.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === tab.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                {tab.label}
                                {tab.value !== "all" && (
                                    <span className="ml-1 opacity-70">({tab.value === "ai" ? aiCount : osmCount})</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">No suppliers in this category.</p>
                    )}

                    {/* Supplier cards */}
                    {displayed.map((s, idx) => (
                        <Card key={s.id} className={`transition-all hover:shadow-md ${s.source === "discovered" ? "hover:border-emerald-500/30" : "hover:border-primary/30"}`}>
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-2.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {idx < 3 && (
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? "bg-amber-400 text-amber-900" : idx === 1 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"}`}>{idx + 1}</span>
                                            )}
                                            <h4 className="font-bold text-base">{s.name}</h4>
                                            <Badge variant="outline" className={`text-xs font-medium ${SOURCE_META[s.source].className}`}>{SOURCE_META[s.source].label}</Badge>
                                            {s.distKm !== undefined && (
                                                <Badge variant="outline" className="gap-1 text-xs bg-primary/5 border-primary/20 text-primary font-semibold">
                                                    <Navigation className="h-3 w-3" />{s.distKm} km
                                                </Badge>
                                            )}
                                            {s.verified && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">✓ Verified</Badge>}
                                        </div>

                                        {/* Raw material this supplier covers */}
                                        {s.rawMaterial && (
                                            <div className="flex items-center gap-1.5">
                                                <Package className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                                                    Raw Material: {s.rawMaterial}
                                                </span>
                                            </div>
                                        )}

                                        {/* Score bar */}
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: `${Math.min(100, s.score)}%` }} />
                                            </div>
                                            <span className="text-xs text-muted-foreground font-semibold">{s.score}/100</span>
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                                            {s.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{s.address}</span>}
                                            {s.specialization && <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 shrink-0" />{s.specialization}</span>}
                                            {s.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{s.phone}</span>}
                                            {s.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" />{s.email}</span>}
                                            {s.website && (
                                                <a href={`https://${s.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                                                    <Globe className="h-3.5 w-3.5 shrink-0" />{s.website}
                                                </a>
                                            )}
                                        </div>

                                        {s.source === "ai" && (
                                            <div className="flex flex-wrap gap-1.5 text-xs">
                                                {s.moq && <Badge variant="secondary" className="font-normal">MOQ: {s.moq}</Badge>}
                                                {s.delivery_time && <Badge variant="secondary" className="font-normal">⏱ {s.delivery_time}</Badge>}
                                                {s.export_capable && <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-normal">Export Ready</Badge>}
                                                {s.approx_cost && <Badge variant="secondary" className="font-normal">{s.approx_cost}</Badge>}
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex gap-2 flex-wrap pt-1">
                                            {s.phone && (
                                                <a href={`tel:${s.phone}`}>
                                                    <Button size="sm" variant="outline" className="gap-1.5 rounded-full h-8 text-xs"><Phone className="h-3 w-3" /> Call</Button>
                                                </a>
                                            )}
                                            {s.phone && (
                                                <Button size="sm" variant="outline" className="gap-1.5 rounded-full h-8 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10" onClick={() => openWhatsApp(s.phone!)}>
                                                    <MessageCircle className="h-3 w-3" /> WhatsApp
                                                </Button>
                                            )}
                                            {s.lat !== undefined && s.lng !== undefined && (
                                                <Button size="sm" variant="outline" className="gap-1.5 rounded-full h-8 text-xs" onClick={() => openMap(s.lat!, s.lng!)}>
                                                    <ExternalLink className="h-3 w-3" /> View Location
                                                </Button>
                                            )}
                                            {s.website && (
                                                <a href={s.website} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" variant="default" className="gap-1.5 rounded-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                                        <ExternalLink className="h-3 w-3" /> View Profile
                                                    </Button>
                                                </a>
                                            )}
                                            {s.source === "discovered" && (
                                                <Button size="sm" variant="ghost" className="gap-1.5 rounded-full h-8 text-xs text-amber-600 hover:bg-amber-500/10 border border-amber-500/30" onClick={() => setClaimTarget(s)}>
                                                    <Building2 className="h-3 w-3" /> Claim this Business
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 md:text-right space-y-1.5">
                                        <StarRow rating={s.rating} />
                                        {s.approx_cost && s.source === "ai" && <p className="font-bold text-primary text-sm">{s.approx_cost}</p>}
                                        {s.payment_terms && s.source === "ai" && <p className="text-xs text-muted-foreground">{s.payment_terms}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Show More / Show Less */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">
                            Showing <strong>{displayed.length}</strong> of <strong>{filtered.length}</strong> suppliers
                        </p>
                        <div className="flex gap-2">
                            {hasMore && (
                                <Button variant="outline" size="sm" className="gap-1.5 rounded-full h-8 text-xs"
                                    onClick={handleLoadMore}>
                                    <RefreshCw className="h-3 w-3" /> Show More (+15)
                                </Button>
                            )}
                            {displayLimit > 15 && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs rounded-full"
                                    onClick={() => setDisplayLimit(15)}>
                                    Show Less
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {claimTarget && (
                <SupplierClaimModal open={!!claimTarget} onClose={() => setClaimTarget(null)}
                    supplierName={claimTarget.name} supplierAddress={claimTarget.address} />
            )}
        </div>
    );
}
