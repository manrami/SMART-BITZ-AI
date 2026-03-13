import { useState, useEffect, useRef } from "react";
import { NearbySupplierMap } from "@/components/suppliers/NearbySupplierMap";
import { RawMaterialSupplierDiscovery } from "@/components/suppliers/RawMaterialSupplierDiscovery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getEnrichedSuppliers } from "@/services/biIntelligenceService";
import type { EnrichedSupplier, EnrichedSuppliersData } from "@/types/productIntelligence";
import { RawMaterial } from "@/types/business";
import {
    Star, MapPin, Phone, Mail, Globe, Package, Clock,
    ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Shield,
    Loader2, RefreshCw, Sparkles, Info, Scale, Search,
} from "lucide-react";

interface EnrichedSupplierTabProps {
    materials: RawMaterial[];
    businessType: string;
    productName?: string;
    products?: string[];   // list of all user-selected products for the dropdown
    city?: string;
    lang?: "en" | "hi" | "mr";
}

const T = {
    en: {
        title: "AI-Enriched Supplier Intelligence",
        subtitle: "Verified global & India suppliers researched by AI",
        selectMaterial: "Quick Select",
        customSearch: "Search any product / material...",
        searchBtn: "Find Suppliers",
        findSuppliers: "Find AI Suppliers",
        finding: "Researching verified suppliers...",
        found: (n: number, m: string) => `${n} verified suppliers found for "${m}"`,
        noResult: "No suppliers found. Try a different product.",
        altCountries: "Alternative Sourcing Countries:",
        tip: "Sourcing Tip:",
        moq: "MOQ", cost: "Approx Cost", delivery: "Delivery",
        exportYes: "Export Ready", exportNo: "Local Only",
        pros: "Pros", cons: "Cons", payment: "Payment Terms",
        specializes: "Specializes in",
        compare: "Supplier Comparison", selected: "Selected",
        refresh: "Refresh",
        fallback: "Showing estimated data",
        suggested: "Suggested for your business",
        or: "OR search any product below",
    },
    hi: {
        title: "AI-संवर्धित आपूर्तिकर्ता इंटेलिजेंस",
        subtitle: "AI द्वारा शोधित सत्यापित वैश्विक और भारतीय आपूर्तिकर्ता",
        selectMaterial: "त्वरित चयन",
        customSearch: "कोई भी उत्पाद / सामग्री खोजें...",
        searchBtn: "आपूर्तिकर्ता खोजें",
        findSuppliers: "AI आपूर्तिकर्ता खोजें",
        finding: "सत्यापित आपूर्तिकर्ता खोजे जा रहे हैं...",
        found: (n: number, m: string) => `"${m}" के लिए ${n} सत्यापित आपूर्तिकर्ता मिले`,
        noResult: "कोई आपूर्तिकर्ता नहीं मिला।",
        altCountries: "वैकल्पिक सोर्सिंग देश:",
        tip: "सोर्सिंग टिप:",
        moq: "न्यूनतम ऑर्डर", cost: "अनुमानित लागत", delivery: "डिलीवरी",
        exportYes: "निर्यात तैयार", exportNo: "केवल स्थानीय",
        pros: "फायदे", cons: "नुकसान", payment: "भुगतान शर्तें",
        specializes: "विशेषज्ञता",
        compare: "आपूर्तिकर्ता तुलना", selected: "चुना गया",
        refresh: "रिफ्रेश",
        fallback: "अनुमानित डेटा दिखाया जा रहा है",
        suggested: "आपके व्यवसाय के लिए सुझाए गए",
        or: "या नीचे कोई भी उत्पाद खोजें",
    },
    mr: {
        title: "AI-समृद्ध पुरवठादार इंटेलिजेंस",
        subtitle: "AI द्वारे संशोधित सत्यापित जागतिक आणि भारतीय पुरवठादार",
        selectMaterial: "जलद निवड",
        customSearch: "कोणताही उत्पाद / साहित्य शोधा...",
        searchBtn: "पुरवठादार शोधा",
        findSuppliers: "AI पुरवठादार शोधा",
        finding: "सत्यापित पुरवठादार शोधत आहे...",
        found: (n: number, m: string) => `"${m}" साठी ${n} सत्यापित पुरवठादार सापडले`,
        noResult: "कोणताही पुरवठादार सापडला नाही.",
        altCountries: "पर्यायी सोर्सिंग देश:",
        tip: "सोर्सिंग टिप:",
        moq: "किमान ऑर्डर", cost: "अंदाजे खर्च", delivery: "वितरण",
        exportYes: "निर्यात तयार", exportNo: "फक्त स्थानीय",
        pros: "फायदे", cons: "तोटे", payment: "पेमेंट अटी",
        specializes: "तज्ञता",
        compare: "पुरवठादार तुलना", selected: "निवडले",
        refresh: "रिफ्रेश",
        fallback: "अंदाजित डेटा दाखवत आहे",
        suggested: "आपल्या व्यवसायासाठी सुचवलेले",
        or: "किंवा खाली कोणताही उत्पाद शोधा",
    },
};

/** Split a possibly comma-joined product name into individual clean chips */
function splitProductNames(productName?: string): string[] {
    if (!productName) return [];
    return productName
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/** Auto-suggest default search chips for any business type */
function getDefaultChips(businessType: string, productName?: string): string[] {
    const bt = businessType.toLowerCase();
    if (bt.includes("chai") || bt.includes("tea")) return ["Tea leaves", "Milk", "Sugar", "Cups", "Gas burner"];
    if (bt.includes("bakery") || bt.includes("bread")) return ["Flour (Maida)", "Sugar", "Yeast", "Butter", "Packaging boxes"];
    if (bt.includes("restaurant") || bt.includes("dhaba") || bt.includes("food")) return ["Rice", "Dal", "Vegetables", "LPG gas", "Packaging containers"];
    if (bt.includes("cloth") || bt.includes("garment") || bt.includes("textile") || bt.includes("saree")) return ["Cotton fabric", "Polyester yarn", "Buttons", "Zippers", "Packaging poly bags"];
    if (bt.includes("kirana") || bt.includes("grocery") || bt.includes("retail")) return ["Packaging bags", "POS billing machine", "Storage racks", "FMCG products", "Weighing scale"];
    if (bt.includes("mobile") || bt.includes("electronic") || bt.includes("repair")) return ["LCD screens", "Phone batteries", "Soldering tools", "PCB boards", "Tools kit"];
    if (bt.includes("beauty") || bt.includes("salon") || bt.includes("parlour")) return ["Hair products", "Face cream", "Wax", "Combs & scissors", "Chair & mirror"];
    if (bt.includes("auto") || bt.includes("bike") || bt.includes("vehicle")) return ["Engine oil", "Air filter", "Brake pads", "Tyres", "Mechanic tools"];
    if (bt.includes("sweet") || bt.includes("mithai") || bt.includes("cake")) return ["Milk powder", "Sugar", "Ghee", "Nuts & dry fruits", "Sweet boxes"];
    if (bt.includes("digital") || bt.includes("marketing") || bt.includes("software") || bt.includes("tech")) return ["Desktop / Laptop", "Software licenses", "Web hosting", "Office furniture", "High-speed internet"];
    if (bt.includes("printng") || bt.includes("print")) return ["A4 paper rolls", "Printer ink cartridge", "Lamination sheets", "Visiting card stock", "Banner vinyl"];
    if (bt.includes("coaching") || bt.includes("tuition") || bt.includes("education")) return ["Whiteboard", "Stationery", "Study material printing", "Projector", "Chairs & desks"];
    const productChips = splitProductNames(productName);
    return [...(productChips.length ? productChips : [businessType]), "Office supplies", "Packaging material", "Equipment & tools", "Raw materials"];
}

const StarRow = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
        ))}
        <span className="ml-1 text-xs font-semibold">{rating.toFixed(1)}</span>
    </div>
);

export function EnrichedSupplierTab({ materials, businessType, productName, products, city = "India", lang = "en" }: EnrichedSupplierTabProps) {
    // ── View state ──
    const [supplierView, setSupplierView] = useState<"global" | "nearby" | "discovered" | "rawmaterial">("global");

    // Split selected product names (they may arrive as comma-joined string)
    const productChips = splitProductNames(productName);
    // All chips: selected products first, then plan rawMaterials, then AI-suggested defaults
    const planChips = materials.map(m => m.name);
    const defaultChips = getDefaultChips(businessType, productName);
    const allChips = [
        ...productChips,
        ...planChips.filter(c => !productChips.some(p => p.toLowerCase() === c.toLowerCase())),
        ...defaultChips.filter(c => !planChips.some(p => p.toLowerCase() === c.toLowerCase()) && !productChips.some(p => p.toLowerCase() === c.toLowerCase())),
    ];

    const [selectedChip, setSelectedChip] = useState(allChips[0] || businessType);
    const [customInput, setCustomInput] = useState("");
    const [activeSearch, setActiveSearch] = useState(""); // what was actually searched
    const [supplierData, setSupplierData] = useState<EnrichedSuppliersData | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [compareList, setCompareList] = useState<string[]>([]);
    const t = T[lang];
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchSuppliers = async (query: string, force = false) => {
        if (!query.trim() || !businessType) return;
        setActiveSearch(query.trim());
        if (force) {
            try { localStorage.removeItem(`bi:suppliers:${businessType}:${query}:${city}`); } catch { }
        }
        setLoading(true);
        setHasLoaded(false);
        const data = await getEnrichedSuppliers(businessType, query.trim(), city);
        setSupplierData(data);
        setHasLoaded(true);
        setLoading(false);
        setCompareList([]);
    };

    const handleChipClick = (chip: string) => {
        setSelectedChip(chip);
        setCustomInput("");
        fetchSuppliers(chip);
    };

    const handleCustomSearch = () => {
        const q = customInput.trim();
        if (!q) return;
        setSelectedChip(q);
        fetchSuppliers(q);
        setCustomInput("");
    };

    const toggleCompare = (name: string) => {
        setCompareList(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 3 ? [...prev, name] : prev
        );
    };

    const suppliers: EnrichedSupplier[] = supplierData?.suppliers || [];
    const compared = suppliers.filter(s => compareList.includes(s.name));

    return (
        <div className="space-y-6">
            {/* ── View Switcher ── */}
            <div className="flex items-center gap-1.5 p-1 rounded-full border border-border/50 bg-muted/30 w-fit flex-wrap">
                <button
                    onClick={() => setSupplierView("global")}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${supplierView === "global"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        }`}
                >
                    🌏 Global Suppliers
                </button>
                <button
                    onClick={() => setSupplierView("nearby")}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${supplierView === "nearby"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        }`}
                >
                    📍 Nearby Suppliers
                    <span className="text-xs font-normal opacity-70">(20–30 km)</span>
                </button>
                <button
                    onClick={() => setSupplierView("discovered")}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${supplierView === "discovered"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        }`}
                >
                    🔍 Discovered Suppliers
                    <span className="text-xs font-normal opacity-70">(OSM)</span>
                </button>
                <button
                    onClick={() => setSupplierView("rawmaterial")}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${supplierView === "rawmaterial"
                        ? "bg-orange-600 text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        }`}
                >
                    🏭 Raw Material Suppliers
                    <span className="text-xs font-normal opacity-70">(by material)</span>
                </button>
            </div>

            {/* ── Nearby + Discovered views ── */}
            {(supplierView === "nearby" || supplierView === "discovered") && (
                <NearbySupplierMap
                    businessType={businessType}
                    productName={productName}
                    materials={materials}
                    lang={lang}
                />
            )}

            {/* ── Raw Material Suppliers View — grouped per material ── */}
            {supplierView === "rawmaterial" && (
                <RawMaterialSupplierDiscovery
                    materials={materials}
                    businessType={businessType}
                    productName={productName}
                    products={products}
                    lang={lang}
                />
            )}

            {/* ── Global Suppliers View — existing logic, completely unchanged ── */}
            {supplierView === "global" && (
                <>
                    {/* ── Quick-select Dropdown ──────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {planChips.length > 0 ? t.selectMaterial : t.suggested}
                            </p>
                        </div>
                        <Select value={selectedChip} onValueChange={handleChipClick}>
                            <SelectTrigger className="w-full md:w-[350px] border-primary/30 bg-primary/5 rounded-xl font-medium">
                                <SelectValue placeholder="Select a product to find suppliers" />
                            </SelectTrigger>
                            <SelectContent>
                                {allChips.slice(0, 15).map(chip => (
                                    <SelectItem key={chip} value={chip} className="cursor-pointer">
                                        {chip}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ── Custom free-text search ────────────────────────────── */}
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                placeholder={t.customSearch}
                                className="pl-9 rounded-full"
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCustomSearch(); }}
                            />
                        </div>
                        <Button onClick={handleCustomSearch} className="rounded-full gap-2 shrink-0" disabled={!customInput.trim()}>
                            <Sparkles className="h-4 w-4" />
                            {t.searchBtn}
                        </Button>
                    </div>

                    {/* ── Initial CTA (no search yet) ────────────────────────── */}
                    {!hasLoaded && !loading && (
                        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                            <CardContent className="p-8 text-center space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
                                    <Sparkles className="h-7 w-7 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
                                </div>
                                <Button onClick={() => fetchSuppliers(selectedChip || businessType)} size="lg" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {t.findSuppliers}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Loading skeleton ────────────────────────────────────── */}
                    {loading && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center animate-pulse">{t.finding}</p>
                            {[1, 2, 3].map(i => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-5 w-1/3" />
                                                <Skeleton className="h-4 w-1/2" />
                                                <Skeleton className="h-4 w-2/3" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* ── Results ─────────────────────────────────────────────── */}
                    {!loading && hasLoaded && (
                        <>
                            {/* header row */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <p className="text-sm text-muted-foreground font-medium">
                                        {suppliers.length > 0 ? t.found(suppliers.length, activeSearch) : t.noResult}
                                    </p>
                                    {supplierData?._fallback && (
                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 gap-1">
                                            <Info className="w-3 h-3" />{t.fallback}
                                        </Badge>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetchSuppliers(activeSearch, true)}>
                                    <RefreshCw className="h-3.5 w-3.5" />{t.refresh}
                                </Button>
                            </div>

                            {/* Sourcing tip */}
                            {supplierData?.sourcing_tips && (
                                <div className="flex items-start gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <span className="font-semibold text-primary">{t.tip} </span>
                                        {supplierData.sourcing_tips}
                                    </div>
                                </div>
                            )}

                            {/* Supplier cards */}
                            <div className="grid gap-4">
                                {suppliers.map(s => (
                                    <Card key={s.name} className={`transition-all ${compareList.includes(s.name) ? "ring-2 ring-primary shadow-md" : "hover:border-primary/30"}`}>
                                        <CardContent className="p-5">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                {/* Left */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <Checkbox
                                                            checked={compareList.includes(s.name)}
                                                            onCheckedChange={() => toggleCompare(s.name)}
                                                            id={`cmp-${s.name}`}
                                                        />
                                                        <label htmlFor={`cmp-${s.name}`} className="font-bold text-base cursor-pointer">{s.name}</label>
                                                        {s.verified && (
                                                            <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-xs shadow-none">
                                                                <Shield className="h-3 w-3" />
                                                                Verified
                                                            </Badge>
                                                        )}
                                                        {s.supplier_type && (
                                                            <Badge variant="outline" className="text-xs bg-muted/30 border-primary/20">
                                                                {s.supplier_type}
                                                            </Badge>
                                                        )}
                                                        {!s.export_capable && (
                                                            <Badge variant="outline" className="text-xs bg-muted/50 border-none text-muted-foreground shadow-none">
                                                                {t.exportNo}
                                                            </Badge>
                                                        )}
                                                        {s.export_capable && (
                                                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-xs">
                                                                {t.exportYes}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{s.city}, {s.country}</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{s.delivery_time}</span>
                                                        <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{t.moq}: {s.moq}</span>
                                                        {s.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{s.phone}</span>}
                                                        {s.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{s.email}</span>}
                                                        {s.website && (
                                                            <a href={`https://${s.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-primary hover:underline">
                                                                <Globe className="h-3.5 w-3.5" />{s.website}
                                                            </a>
                                                        )}
                                                    </div>

                                                    {s.specialization && (
                                                        <p className="text-sm"><span className="font-medium">{t.specializes}:</span> {s.specialization}</p>
                                                    )}
                                                </div>

                                                {/* Right: rating + cost */}
                                                <div className="md:text-right space-y-2 shrink-0">
                                                    <StarRow rating={s.rating} />
                                                    <p className="font-bold text-primary text-sm">{s.approx_cost}</p>
                                                    <p className="text-xs text-muted-foreground">{s.payment_terms}</p>
                                                </div>
                                            </div>

                                            {/* Expand pros/cons */}
                                            <Button variant="ghost" size="sm" className="mt-3 w-full text-muted-foreground hover:text-foreground"
                                                onClick={() => setExpanded(e => e === s.name ? null : s.name)}>
                                                {expanded === s.name
                                                    ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Details</>
                                                    : <><ChevronDown className="h-4 w-4 mr-2" />View Pros & Cons</>}
                                            </Button>

                                            {expanded === s.name && (
                                                <div className="mt-4 pt-4 border-t grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="font-semibold text-emerald-600 flex items-center gap-1.5 mb-2 text-sm">
                                                            <ThumbsUp className="h-4 w-4" />{t.pros}
                                                        </h5>
                                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                                            {s.pros?.map((p, i) => (
                                                                <li key={i} className="flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-red-500 flex items-center gap-1.5 mb-2 text-sm">
                                                            <ThumbsDown className="h-4 w-4" />{t.cons}
                                                        </h5>
                                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                                            {s.cons?.map((c, i) => (
                                                                <li key={i} className="flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{c}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Alternative countries */}
                            {supplierData?.alternative_countries?.length ? (
                                <div className="flex items-center gap-3 flex-wrap text-sm">
                                    <span className="text-muted-foreground font-medium">{t.altCountries}</span>
                                    {supplierData.alternative_countries.map(c => (
                                        <Badge key={c} variant="outline" className="gap-1"><Globe className="w-3 h-3" />{c}</Badge>
                                    ))}
                                </div>
                            ) : null}

                            {/* Comparison helper hint */}
                            {compareList.length > 0 && compareList.length < 2 && (
                                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                                    <Scale className="h-3.5 w-3.5" />Select at least 2 suppliers to compare side-by-side
                                </p>
                            )}

                            {/* Comparison table */}
                            {compared.length >= 2 && (
                                <Card className="border-primary/20">
                                    <CardContent className="p-5">
                                        <h4 className="font-bold flex items-center gap-2 mb-4"><Scale className="h-4 w-4 text-primary" />{t.compare}</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50">
                                                    <tr>
                                                        {["", ...compared.map(s => s.name)].map(h => (
                                                            <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {[
                                                        { label: "Rating", fn: (s: EnrichedSupplier) => <StarRow rating={s.rating} /> },
                                                        { label: t.cost, fn: (s: EnrichedSupplier) => <span className="font-semibold text-primary">{s.approx_cost}</span> },
                                                        { label: t.moq, fn: (s: EnrichedSupplier) => s.moq },
                                                        { label: t.delivery, fn: (s: EnrichedSupplier) => s.delivery_time },
                                                        { label: "Country", fn: (s: EnrichedSupplier) => s.country },
                                                        { label: "Export Ready", fn: (s: EnrichedSupplier) => s.export_capable ? "✅ Yes" : "❌ No" },
                                                        { label: t.payment, fn: (s: EnrichedSupplier) => s.payment_terms },
                                                    ].map(row => (
                                                        <tr key={row.label} className="hover:bg-muted/20">
                                                            <td className="px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
                                                            {compared.map(s => (
                                                                <td key={s.name} className="px-4 py-2.5">{row.fn(s)}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
