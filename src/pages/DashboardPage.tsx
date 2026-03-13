import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard, TrendingUp, Megaphone,
  Globe, Package, Users, MapPin, Calculator, IndianRupee,
  BarChart3, ShoppingCart, Lightbulb, AlertCircle, CheckCircle2,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { SalesWidget } from "@/components/dashboard/SalesWidget.tsx";
import { CashFlowWidget } from "@/components/dashboard/CashFlowWidget.tsx";
import { PhaseTrackerWidget } from "@/components/dashboard/PhaseTrackerWidget.tsx";
import { AdvertisingWidget } from "@/components/dashboard/AdvertisingWidget.tsx";
import { FaceAuthGuard } from "@/components/auth/FaceAuthGuard";
import { AdPostGenerator } from "@/components/marketing/AdPostGenerator";
import { PlanSection, ListItem } from "@/components/plan/PlanSection";
import { FinancialCharts } from "@/components/charts/FinancialCharts";
import { SupplierComparison } from "@/components/suppliers/SupplierComparison";
import { ProgressDashboard } from "@/components/dashboard/ProgressDashboard";
import { ProductIntelligencePanel } from "@/components/bi/ProductIntelligencePanel";
import { EnrichedSupplierTab } from "@/components/bi/EnrichedSupplierTab";
import { RawMaterialsEnriched } from "@/components/bi/RawMaterialsEnriched";
import { RecipeFlow } from "@/components/bi/RecipeFlow";
import { motion } from "framer-motion";
import { BusinessPlan } from "@/types/business";

// ─────────────────────────────────────────────────────────────────────────────
// i18n — ALL content strings
// ─────────────────────────────────────────────────────────────────────────────
type Lang = "en" | "hi" | "mr";

const T = {
  en: {
    // Header
    title: (n: string | null) => n ? `${n} Command Center` : "Dashboard",
    subtitle: "Your full business intelligence hub — plans, finances, suppliers & more.",
    fullPlan: "Full Plan",
    noplan_title: "No Business Plan Yet",
    noplan_body: "Generate a business plan first, then your full dashboard will appear here with all details.",
    noplan_btn: "Start with a Business Idea",

    // Stat labels
    investment: "Investment", revenue: "Revenue", profitMargin: "Profit Margin", breakeven: "Break-even",
    required: "Required", expectedPerMonth: "Expected/month", estimated: "Estimated", timeToProfit: "Time to profit",

    // Tabs
    tabOverview: "Overview", tabFinancials: "Financials", tabSuppliers: "Suppliers",
    tabMaterials: "Raw Materials", tabWorkforce: "Workforce", tabLocation: "Location",
    tabPricing: "Pricing", tabMarketing: "Marketing", tabGrowth: "Growth",

    // Financials
    cashflowTitle: "Dynamic Cash Flow Management",
    cashflowDesc: "Track real-time expenses and forecast your 12-month trajectory.",

    // Suppliers
    suppliersTitle: "Supplier Comparison",

    // Materials
    materialsTitle: "Raw Material & Supplier Guidance",
    source: "Source", noMaterials: "No raw material data available.",
    productionTitle: "Production & Manufacturing Steps",

    // Workforce
    workforceTitle: "Skill & Workforce Requirements",
    role: "Role", skillLevel: "Skill Level", count: "Count", monthlySalary: "Monthly Salary",
    noWorkforce: "No workforce data available.",

    // Location
    locationTitle: "Offline Setup & Location Advice",
    recommendedArea: "Recommended Area", shopSize: "Shop Size", estimatedRent: "Estimated Rent",
    setupReqs: "Setup Requirements",

    // Pricing
    pricingTitle: "Pricing Strategy",
    costComponents: "Cost Components",
    costPrice: "Cost Price (avg)", marketPriceRange: "Market Price Range",
    suggestedPrice: "Suggested Price", profitMarginLabel: "Profit Margin",

    // Marketing
    marketingTitle: "Marketing & Advertising Plan",
    launchPlan: "30-Day Launch Plan", onlineStrat: "Online Strategies",
    offlineStrat: "Offline Strategies", lowBudget: "Low-Budget Ideas",

    // Growth
    growthTitle: "Business Growth Roadmap",
    m1to3: "Month 1–3: Foundation", m4to6: "Month 4–6: Growth",
    expansion: "Expansion Ideas", mistakes: "Common Mistakes to Avoid",
  },

  hi: {
    title: (n: string | null) => n ? `${n} कमांड सेंटर` : "डैशबोर्ड",
    subtitle: "आपका पूर्ण व्यवसाय इंटेलिजेंस हब — योजनाएं, वित्त, आपूर्तिकर्ता और बहुत कुछ।",
    fullPlan: "पूरी योजना",
    noplan_title: "अभी तक कोई व्यवसाय योजना नहीं",
    noplan_body: "पहले एक व्यवसाय योजना बनाएं, फिर आपका पूरा डैशबोर्ड यहाँ दिखाई देगा।",
    noplan_btn: "व्यवसाय विचार से शुरू करें",

    investment: "निवेश", revenue: "राजस्व", profitMargin: "लाभ मार्जिन", breakeven: "ब्रेक-ईवन",
    required: "आवश्यक", expectedPerMonth: "अपेक्षित/माह", estimated: "अनुमानित", timeToProfit: "लाभ तक का समय",

    tabOverview: "अवलोकन", tabFinancials: "वित्त", tabSuppliers: "आपूर्तिकर्ता",
    tabMaterials: "कच्चा माल", tabWorkforce: "कार्यबल", tabLocation: "स्थान",
    tabPricing: "मूल्य निर्धारण", tabMarketing: "मार्केटिंग", tabGrowth: "विकास",

    cashflowTitle: "गतिशील नकद प्रवाह प्रबंधन",
    cashflowDesc: "वास्तविक समय व्यय ट्रैक करें और 12 महीने का पूर्वानुमान लगाएं।",

    suppliersTitle: "आपूर्तिकर्ता तुलना",

    materialsTitle: "कच्चा माल और आपूर्तिकर्ता मार्गदर्शन",
    source: "स्रोत", noMaterials: "कोई कच्चे माल का डेटा उपलब्ध नहीं।",
    productionTitle: "उत्पादन और निर्माण चरण",

    workforceTitle: "कौशल और कार्यबल आवश्यकताएं",
    role: "भूमिका", skillLevel: "कौशल स्तर", count: "संख्या", monthlySalary: "मासिक वेतन",
    noWorkforce: "कोई कार्यबल डेटा उपलब्ध नहीं।",

    locationTitle: "ऑफलाइन सेटअप और स्थान सलाह",
    recommendedArea: "अनुशंसित क्षेत्र", shopSize: "दुकान का आकार", estimatedRent: "अनुमानित किराया",
    setupReqs: "सेटअप आवश्यकताएं",

    pricingTitle: "मूल्य निर्धारण रणनीति",
    costComponents: "लागत घटक",
    costPrice: "लागत मूल्य (औसत)", marketPriceRange: "बाजार मूल्य सीमा",
    suggestedPrice: "सुझाया गया मूल्य", profitMarginLabel: "लाभ मार्जिन",

    marketingTitle: "मार्केटिंग और विज्ञापन योजना",
    launchPlan: "30 दिन की लॉन्च योजना", onlineStrat: "ऑनलाइन रणनीतियां",
    offlineStrat: "ऑफलाइन रणनीतियां", lowBudget: "कम बजट के विचार",

    growthTitle: "व्यवसाय विकास रोडमैप",
    m1to3: "माह 1–3: नींव", m4to6: "माह 4–6: विकास",
    expansion: "विस्तार के विचार", mistakes: "आम गलतियों से बचें",
  },

  mr: {
    title: (n: string | null) => n ? `${n} कमांड सेंटर` : "डॅशबोर्ड",
    subtitle: "तुमचा संपूर्ण व्यवसाय माहिती केंद्र — योजना, वित्त, पुरवठादार आणि बरेच काही.",
    fullPlan: "पूर्ण योजना",
    noplan_title: "अद्याप कोणतीही व्यवसाय योजना नाही",
    noplan_body: "प्रथम व्यवसाय योजना तयार करा, नंतर तुमचा संपूर्ण डॅशबोर्ड येथे दिसेल.",
    noplan_btn: "व्यवसाय कल्पनेने सुरुवात करा",

    investment: "गुंतवणूक", revenue: "महसूल", profitMargin: "नफा मार्जिन", breakeven: "ब्रेक-इव्हन",
    required: "आवश्यक", expectedPerMonth: "अपेक्षित/महिना", estimated: "अंदाजे", timeToProfit: "नफ्यापर्यंत वेळ",

    tabOverview: "आढावा", tabFinancials: "वित्त", tabSuppliers: "पुरवठादार",
    tabMaterials: "कच्चा माल", tabWorkforce: "कामगार", tabLocation: "स्थान",
    tabPricing: "किंमत", tabMarketing: "विपणन", tabGrowth: "वाढ",

    cashflowTitle: "गतिमान रोख प्रवाह व्यवस्थापन",
    cashflowDesc: "वास्तविक वेळेतील खर्च ट्रॅक करा आणि 12 महिन्यांचा अंदाज घ्या.",

    suppliersTitle: "पुरवठादार तुलना",

    materialsTitle: "कच्चा माल आणि पुरवठादार मार्गदर्शन",
    source: "स्रोत", noMaterials: "कच्च्या मालाचा डेटा उपलब्ध नाही.",
    productionTitle: "उत्पादन आणि उत्पादन चरण",

    workforceTitle: "कौशल्य आणि कामगार आवश्यकता",
    role: "भूमिका", skillLevel: "कौशल्य पातळी", count: "संख्या", monthlySalary: "मासिक पगार",
    noWorkforce: "कामगार डेटा उपलब्ध नाही.",

    locationTitle: "ऑफलाइन सेटअप आणि स्थान सल्ला",
    recommendedArea: "शिफारस केलेला परिसर", shopSize: "दुकानाचा आकार", estimatedRent: "अंदाजे भाडे",
    setupReqs: "सेटअप आवश्यकता",

    pricingTitle: "किंमत धोरण",
    costComponents: "खर्चाचे घटक",
    costPrice: "किंमत मूल्य (सरासरी)", marketPriceRange: "बाजार किंमत श्रेणी",
    suggestedPrice: "सुचवलेली किंमत", profitMarginLabel: "नफा मार्जिन",

    marketingTitle: "विपणन आणि जाहिरात योजना",
    launchPlan: "30 दिवसांची लॉन्च योजना", onlineStrat: "ऑनलाइन रणनीती",
    offlineStrat: "ऑफलाइन रणनीती", lowBudget: "कमी बजेटच्या कल्पना",

    growthTitle: "व्यवसाय वाढ रोडमॅप",
    m1to3: "महिना 1–3: पाया", m4to6: "महिना 4–6: वाढ",
    expansion: "विस्ताराच्या कल्पना", mistakes: "सामान्य चुका टाळा",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
const PGRST_NOT_FOUND_CODE = "PGRST116";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  const t = T[lang];

  const langOptions: { code: Lang; flag: string; label: string }[] = [
    { code: "en", flag: "🇬🇧", label: "EN" },
    { code: "hi", flag: "🇮🇳", label: "हि" },
    { code: "mr", flag: "🗺️", label: "म" },
  ];



  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    const storedBusiness = sessionStorage.getItem("selectedBusiness");
    const storedPlan = sessionStorage.getItem("currentGeneratedPlan");
    const currentPlanId = sessionStorage.getItem("currentPlanId");

    if (storedBusiness && storedPlan) {
      try {
        setPlan(JSON.parse(storedPlan));
        setPlanId(currentPlanId || "");
        setIsLoading(false);
        return;
      } catch { /* fall through */ }
    }

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("saved_business_plans")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setPlan({ idea: data.business_idea as any, ...(data.business_plan as any) });
          setPlanId(data.id?.toString() || "");
        }
      } catch { /* no saved plans */ }
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadPlan();
  }, [user, navigate, loadPlan]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LayoutDashboard className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const businessName = plan?.idea?.name || sessionStorage.getItem("businessName") || null;

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-24 max-w-2xl flex flex-col items-center justify-center text-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <LayoutDashboard className="h-12 w-12 text-primary/60" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">{t.noplan_title}</h1>
          <p className="text-muted-foreground text-lg">{t.noplan_body}</p>
          <Button size="lg" className="rounded-full gap-2 shadow-lg shadow-primary/20" onClick={() => navigate("/recommendations")}>
            <ArrowRight className="h-5 w-5" />{t.noplan_btn}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="container max-w-7xl mx-auto space-y-10 relative">

          {/* Decorative blobs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10 opacity-40 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl -z-10 opacity-30 pointer-events-none" />

          {/* ── HERO HEADER ─────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="gradient-primary absolute inset-0" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }} />
            <div className="relative p-8 md:p-10">
              {/* Top bar */}
              <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <motion.h1 className="text-3xl md:text-4xl font-black text-white tracking-tight"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    {t.title(businessName)}
                  </motion.h1>
                  <p className="text-primary-foreground/70 text-sm mt-1 max-w-xl">{t.subtitle}</p>
                </div>

                <motion.div className="flex items-center gap-2 flex-wrap" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                  {/* Language switcher */}
                  <div className="flex items-center gap-1 p-1 rounded-full border border-white/20 bg-black/20 backdrop-blur-sm">
                    <Globe className="h-4 w-4 text-white/60 ml-1" />
                    {langOptions.map((opt) => (
                      <button key={opt.code} onClick={() => setLang(opt.code)}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${lang === opt.code ? "bg-white text-primary shadow" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                        {opt.flag} {opt.label}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary-foreground/80 hover:text-white hover:bg-white/10 rounded-full gap-2" onClick={() => navigate("/plan")}>
                    <ArrowRight className="h-4 w-4" /><span className="hidden sm:inline">{t.fullPlan}</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary-foreground/80 hover:text-white hover:bg-white/10 rounded-full gap-2" onClick={loadPlan}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              {/* Business identity */}
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-4xl backdrop-blur-sm border border-white/30 shadow-inner shrink-0">
                  {plan.idea.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">{plan.idea.name}</h2>
                    <Badge className="bg-white/20 text-white border border-white/30 text-xs px-2 py-0.5 font-semibold">
                      {plan.idea.riskLevel} Risk
                    </Badge>
                  </div>
                  <p className="text-primary-foreground/70 text-sm max-w-2xl">{plan.idea.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────────── */}
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 bg-background/60 backdrop-blur-sm border border-border/50 p-1.5 rounded-2xl shadow-sm">
                {[
                  { value: "overview", label: t.tabOverview, icon: LayoutDashboard },
                  { value: "financials", label: t.tabFinancials, icon: BarChart3 },
                  { value: "suppliers", label: t.tabSuppliers, icon: ShoppingCart },
                  { value: "materials", label: t.tabMaterials, icon: Package },
                  { value: "workforce", label: t.tabWorkforce, icon: Users },
                  { value: "location", label: t.tabLocation, icon: MapPin },
                  { value: "pricing", label: t.tabPricing, icon: Calculator },
                  { value: "marketing", label: t.tabMarketing, icon: Megaphone },
                  { value: "growth", label: t.tabGrowth, icon: TrendingUp },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all shrink-0">
                    <tab.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Overview ── */}
            <TabsContent value="overview" className="animate-fade-in">
              <div className="mb-8"><ProgressDashboard plan={plan} /></div>
              {/* BI Market Intelligence Panel */}
              <div className="mb-8">
                <ProductIntelligencePanel
                  businessType={plan.idea.name}
                  lang={lang}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <motion.div className="lg:col-span-8 space-y-8" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                  <SalesWidget /><AdvertisingWidget />
                </motion.div>
                <motion.div className="lg:col-span-4 space-y-8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                  <PhaseTrackerWidget />
                  <FaceAuthGuard><CashFlowWidget /></FaceAuthGuard>
                </motion.div>
              </div>
            </TabsContent>

            {/* ── Financials ── */}
            <TabsContent value="financials" className="animate-fade-in space-y-8">
              <FinancialCharts idea={plan.idea} pricing={plan.pricing} />
              <div className="pt-8 border-t border-border">
                <div className="mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-primary" />{t.cashflowTitle}
                  </h3>
                  <p className="text-muted-foreground text-sm">{t.cashflowDesc}</p>
                </div>
                <FaceAuthGuard><CashFlowWidget /></FaceAuthGuard>
              </div>
            </TabsContent>

            {/* ── Suppliers ── */}
            <TabsContent value="suppliers" className="animate-fade-in">
              <PlanSection icon={ShoppingCart} title={t.suppliersTitle}>
                {/* AI-enriched supplier tab with material selector, global supplier data, pros/cons, compare */}
                <EnrichedSupplierTab
                  materials={plan.rawMaterials || []}
                  businessType={plan.idea.name}
                  productName={plan.product?.name}
                  lang={lang}
                />
              </PlanSection>
            </TabsContent>

            {/* ── Raw Materials ── */}
            <TabsContent value="materials" className="animate-fade-in">
              <PlanSection icon={Package} title={t.materialsTitle}>
                <div className="space-y-4">
                  {plan.rawMaterials?.length ? plan.rawMaterials.map((m, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3 hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-base">{m.name}</h4>
                        <Badge variant="secondary" className="font-bold">{m.estimatedCost}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground"><strong>{t.source}:</strong> {m.sourceType}</p>
                      <div className="flex items-start gap-2 text-sm text-primary bg-primary/5 border border-primary/10 p-3 rounded-xl">
                        <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" /><span>{m.tips}</span>
                      </div>
                    </div>
                  )) : <p className="text-muted-foreground text-sm">{t.noMaterials}</p>}
                </div>
              </PlanSection>

              <div className="mt-8">
                <RecipeFlow
                  businessType={plan.idea.name}
                  productName={plan.product?.name}
                  fallbackPlan={plan.productionPlan}
                />
              </div>

              {/* AI-enriched material intelligence + food recipe breakdown */}
              {(plan.rawMaterials || []).length > 0 && (
                <div className="mt-8">
                  <RawMaterialsEnriched
                    materials={plan.rawMaterials || []}
                    businessType={plan.idea.name}
                    lang={lang}
                  />
                </div>
              )}
            </TabsContent>

            {/* ── Workforce ── */}
            <TabsContent value="workforce" className="animate-fade-in">
              <PlanSection icon={Users} title={t.workforceTitle}>
                {plan.workforce?.length ? (
                  <div className="overflow-x-auto rounded-2xl border border-border/50">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-5 py-4 font-semibold text-muted-foreground">{t.role}</th>
                          <th className="text-left px-5 py-4 font-semibold text-muted-foreground">{t.skillLevel}</th>
                          <th className="text-center px-5 py-4 font-semibold text-muted-foreground">{t.count}</th>
                          <th className="text-right px-5 py-4 font-semibold text-muted-foreground">{t.monthlySalary}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {plan.workforce.map((w, i) => (
                          <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-4 font-medium">{w.role}</td>
                            <td className="px-5 py-4 text-muted-foreground">{w.skillLevel}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">{w.count}</span>
                            </td>
                            <td className="px-5 py-4 text-right text-success font-bold">{w.estimatedSalary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-muted-foreground text-sm">{t.noWorkforce}</p>}
              </PlanSection>
            </TabsContent>

            {/* ── Location ── */}
            <TabsContent value="location" className="animate-fade-in">
              <PlanSection icon={MapPin} title={t.locationTitle}>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: t.recommendedArea, value: plan.location?.areaType },
                      { label: t.shopSize, value: plan.location?.shopSize },
                      { label: t.estimatedRent, value: plan.location?.rentEstimate },
                    ].map((item) => (
                      <div key={item.label} className="p-5 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">{item.label}</p>
                        <p className="font-bold text-foreground">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {plan.location?.setupNeeds?.length ? (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />{t.setupReqs}
                      </h4>
                      <ul className="space-y-2">{plan.location.setupNeeds.map((n, i) => <ListItem key={i}>{n}</ListItem>)}</ul>
                    </div>
                  ) : null}
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Pricing ── */}
            <TabsContent value="pricing" className="animate-fade-in">
              <PlanSection icon={Calculator} title={t.pricingTitle}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">{t.costComponents}</h4>
                    <ul className="space-y-2">
                      {plan.pricing?.costComponents?.map((c, i) => <ListItem key={i}>{c}</ListItem>)}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: t.costPrice, value: plan.pricing?.costPrice, highlight: false },
                      { label: t.marketPriceRange, value: plan.pricing?.marketPriceRange, highlight: false },
                      { label: t.suggestedPrice, value: plan.pricing?.suggestedPrice, highlight: true },
                      { label: t.profitMarginLabel, value: plan.pricing?.profitMargin, highlight: true },
                    ].map((row) => (
                      <div key={row.label} className={`flex items-center justify-between p-4 rounded-xl border ${row.highlight ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/50"}`}>
                        <span className="text-sm text-muted-foreground font-medium">{row.label}</span>
                        <span className={`font-bold text-sm ${row.highlight ? "text-primary" : ""}`}>{row.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Marketing ── */}
            <TabsContent value="marketing" className="animate-fade-in">
              <PlanSection icon={Megaphone} title={t.marketingTitle}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">{t.launchPlan}</h4>
                    <ul className="space-y-2">
                      {plan.marketing?.launchPlan?.map((s, i) => <ListItem key={i} bullet={`${i + 1}.`}>{s}</ListItem>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">{t.onlineStrat}</h4>
                    <ul className="space-y-2 mb-6">
                      {plan.marketing?.onlineStrategies?.map((s, i) => <ListItem key={i}>{s}</ListItem>)}
                    </ul>
                    <h4 className="font-semibold mb-3">{t.offlineStrat}</h4>
                    <ul className="space-y-2">
                      {plan.marketing?.offlineStrategies?.map((s, i) => <ListItem key={i}>{s}</ListItem>)}
                    </ul>
                  </div>
                </div>
                {plan.marketing?.lowBudgetIdeas?.length ? (
                  <div className="mt-6 p-5 rounded-2xl bg-success/5 border border-success/20">
                    <h4 className="font-semibold mb-3 text-success flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />{t.lowBudget}
                    </h4>
                    <ul className="space-y-2">{plan.marketing.lowBudgetIdeas.map((idea, i) => <ListItem key={i}>{idea}</ListItem>)}</ul>
                  </div>
                ) : null}

                <div className="mt-10 pt-8 border-t border-border">
                  <AdPostGenerator
                    businessName={plan.idea.name}
                    businessType={plan.idea.name}
                    planId={planId}
                    planName={plan.idea.name}
                    userId={user?.id}
                  />
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Growth ── */}
            <TabsContent value="growth" className="animate-fade-in">
              <PlanSection icon={TrendingUp} title={t.growthTitle}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
                      {t.m1to3}
                    </h4>
                    <ul className="space-y-2 mb-8">
                      {plan.growth?.month1to3?.map((a, i) => <ListItem key={i}>{a}</ListItem>)}
                    </ul>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
                      {t.m4to6}
                    </h4>
                    <ul className="space-y-2">
                      {plan.growth?.month4to6?.map((a, i) => <ListItem key={i}>{a}</ListItem>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">{t.expansion}</h4>
                    <ul className="space-y-2 mb-8">
                      {plan.growth?.expansionIdeas?.map((idea, i) => <ListItem key={i}>{idea}</ListItem>)}
                    </ul>
                    <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
                      <h4 className="font-semibold mb-3 text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />{t.mistakes}
                      </h4>
                      <ul className="space-y-2">
                        {plan.growth?.mistakesToAvoid?.map((m, i) => <ListItem key={i}>{m}</ListItem>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </PlanSection>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
