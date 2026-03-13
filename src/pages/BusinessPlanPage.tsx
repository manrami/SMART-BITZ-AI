import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlanSection, ListItem, InfoRow } from "@/components/plan/PlanSection";
import { FinancialCharts } from "@/components/charts/FinancialCharts";
import { EnrichedSupplierTab } from "@/components/bi/EnrichedSupplierTab";
import { ProgressDashboard } from "@/components/dashboard/ProgressDashboard";
import { CostCalculator } from "@/components/calculator/CostCalculator";
import { AdPostGenerator } from "@/components/marketing/AdPostGenerator";
import { CashFlowWidget } from "@/components/dashboard/CashFlowWidget";
import { FaceAuthGuard } from "@/components/auth/FaceAuthGuard";
import { RecipeFlow } from "@/components/bi/RecipeFlow";
import { PitchDeckGenerator } from "@/components/dashboard/PitchDeckGenerator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BusinessPlan, BusinessIdea, UserProfile } from "@/types/business";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BusinessNameStep } from "@/components/form/BusinessNameStep";
import { toast } from "sonner";
import { generateBusinessPlanPDF } from "@/utils/pdfGenerator";
import {
  Package,
  Users,
  MapPin,
  Calculator,
  Megaphone,
  TrendingUp,
  ArrowLeft,
  Download,
  Lightbulb,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  BarChart3,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import type { ProductionStep } from "@/types/business";

// ── Product-selector + RecipeFlow for the Raw Materials tab ──────────────────
function ProductMaterialsView({
  items,
  businessType,
  fallbackPlan,
}: {
  items: string[];
  businessType: string;
  fallbackPlan?: ProductionStep[];
}) {
  const [selected, setSelected] = useState(items[0] || "");

  return (
    <div className="space-y-6">
      {/* Product pills */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select a product to view its raw materials & recipe
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item}
              onClick={() => setSelected(item)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selected === item
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "bg-muted/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* RecipeFlow for selected product */}
      {selected && (
        <RecipeFlow
          key={selected}           // remount when product changes → triggers fresh AI fetch
          businessType={businessType}
          productName={selected}
          fallbackPlan={fallbackPlan}
        />
      )}
    </div>
  );
}

const BusinessPlanPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessIdea | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [planName, setPlanName] = useState("");
  const [saveNameChosen, setSaveNameChosen] = useState(false); // whether name step is done
  const [planId, setPlanId] = useState<string>("");

  useEffect(() => {
    const storedBusiness = sessionStorage.getItem("selectedBusiness");
    const storedProfile = sessionStorage.getItem("userProfile");
    const storedProduct = sessionStorage.getItem("selectedProduct");
    const loadedPlan = sessionStorage.getItem("loadedPlan");

    if (storedBusiness && storedProfile) {
      const business = JSON.parse(storedBusiness);
      const profile = JSON.parse(storedProfile);
      const product = storedProduct ? JSON.parse(storedProduct) : null;

      setSelectedBusiness(business);
      setUserProfile(profile);
      setSelectedProduct(product);
      setPlanName(business.name);

      let currentPlanId = sessionStorage.getItem("currentPlanId");
      if (!currentPlanId) {
        currentPlanId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem("currentPlanId", currentPlanId);
      }
      setPlanId(currentPlanId);

      if (loadedPlan) {
        const parsedPlan = JSON.parse(loadedPlan);
        setPlan({ idea: business, ...parsedPlan });
        if (product) {
          generateBusinessPlan(profile, business, product);
        } else {
          setIsLoading(false);
        }
        sessionStorage.removeItem("loadedPlan");
      } else {
        generateBusinessPlan(profile, business, product);
      }
    } else {
      navigate("/recommendations");
    }
  }, [navigate]);

  const generateBusinessPlan = async (
    profile: UserProfile,
    business: BusinessIdea,
    product: any = null,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // TEMPORARY: Using backend endpoint instead of Supabase Edge Function due to 401 API Gateway Error
      const res = await fetch("http://127.0.0.1:5000/api/bi/generate-business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userProfile: profile,
          selectedBusiness: business,
          selectedProduct: product,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate business plan");
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data);
      // Save for Dashboard to load
      sessionStorage.setItem("currentGeneratedPlan", JSON.stringify(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate business plan";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (userProfile && selectedBusiness) {
      generateBusinessPlan(userProfile, selectedBusiness, selectedProduct);
    }
  };

  const handleDownloadPDF = async () => {
    if (!plan) return;
    setIsDownloading(true);
    try {
      await generateBusinessPlanPDF(plan);
      toast.success("Business plan downloaded successfully!");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!user) { toast.error("Please sign in to save your plan"); navigate("/auth"); return; }
    if (!plan || !userProfile || !selectedBusiness || !planName.trim()) {
      toast.error("Please enter a name for your plan");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("saved_business_plans").insert([{
        user_id: user.id,
        plan_name: planName.trim(),
        user_profile: JSON.parse(JSON.stringify(userProfile)),
        business_idea: JSON.parse(JSON.stringify(selectedBusiness)),
        business_plan: JSON.parse(JSON.stringify(plan)),
      }]);

      if (error) throw error;

      toast.success("Business plan saved successfully!");
      setSaveDialogOpen(false);

      if (plan && userProfile && selectedBusiness) {
        const updatedBusiness = { ...selectedBusiness, name: planName.trim() };
        setSelectedBusiness(updatedBusiness);
        setPlan({ ...plan, idea: updatedBusiness });
        sessionStorage.setItem("selectedBusiness", JSON.stringify(updatedBusiness));
      }
    } catch (err) {
      toast.error("Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Generating your business plan...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/recommendations")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />Go Back
              </Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!plan) return null;

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Header />

      <main className="flex-1 py-10 px-4 pb-28">
        <div className="container max-w-6xl mx-auto space-y-8">

          {/* ── HERO HEADER ─────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="gradient-primary absolute inset-0" />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative p-8 md:p-10">
              {/* Top Nav Row */}
              <div className="flex items-center justify-between mb-8">
                <Button
                  variant="ghost" size="sm"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full gap-2"
                  onClick={() => navigate("/recommendations")}
                >
                  <ArrowLeft className="h-4 w-4" />Back to Ideas
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost" size="sm"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full gap-2"
                    onClick={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full gap-2"
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm rounded-full gap-2 border border-white/30"
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                  >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                </div>
              </div>

              {/* Business Identity */}
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-5xl backdrop-blur-sm border border-white/30 shadow-inner shrink-0">
                  {plan.idea.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                      {plan.idea.name}
                    </h1>
                    <Badge className="bg-white/20 text-white border border-white/30 text-sm px-3 py-1 font-semibold backdrop-blur-sm">
                      {plan.idea.riskLevel} Risk
                    </Badge>
                  </div>
                  <p className="text-primary-foreground/80 max-w-2xl text-base leading-relaxed">
                    {plan.idea.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABBED CONTENT ──────────────────────────────────────── */}
          <Tabs defaultValue="dashboard" className="space-y-6">
            {/* Tab Bar - scrollable */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <TabsList className="inline-flex w-auto min-w-full h-auto gap-1 bg-background/60 backdrop-blur-sm border border-border/50 p-1.5 rounded-2xl shadow-sm">
                {[
                  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { value: "financials", label: "Financials", icon: BarChart3 },
                  { value: "suppliers", label: "Suppliers", icon: ShoppingCart },
                  { value: "materials", label: "Raw Materials", icon: Package },
                  { value: "workforce", label: "Workforce", icon: Users },
                  { value: "location", label: "Location", icon: MapPin },
                  { value: "pricing", label: "Pricing", icon: Calculator },
                  { value: "marketing", label: "Marketing", icon: Megaphone },
                  { value: "growth", label: "Growth", icon: TrendingUp },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all shrink-0"
                  >
                    <tab.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Dashboard ── */}
            <TabsContent value="dashboard" className="animate-fade-in">
              <ProgressDashboard plan={plan} />
              <div className="mt-8">
                <PitchDeckGenerator businessPlan={plan} />
              </div>
            </TabsContent>

            {/* ── Financials ── */}
            <TabsContent value="financials" className="animate-fade-in space-y-8">
              <FinancialCharts idea={plan.idea} pricing={plan.pricing} />
              <div className="pt-8 border-t border-border">
                <div className="mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    Dynamic Cash Flow Management
                  </h3>
                  <p className="text-muted-foreground text-sm">Track real-time expenses and forecast your 12-month trajectory.</p>
                </div>
                <FaceAuthGuard>
                  <CashFlowWidget />
                </FaceAuthGuard>
              </div>
            </TabsContent>

            {/* ── Suppliers ── */}
            <TabsContent value="suppliers" className="animate-fade-in">
              {(() => {
                const productList = (plan.product?.name || "")
                  .split(",").map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                return (
                  <EnrichedSupplierTab
                    materials={[]}
                    businessType={plan.idea.name || plan.idea.description || "Business"}
                    productName={productList[0] || plan.product?.name}
                    products={productList.length > 0 ? productList : undefined}
                    city={userProfile?.city || "India"}
                  />
                );
              })()}
            </TabsContent>

            {/* ── Raw Materials ── */}
            <TabsContent value="materials" className="animate-fade-in">
              {(() => {
                // Split comma-joined selected products into individual pills
                const productList = (plan.product?.name || "")
                  .split(",")
                  .map((p: string) => p.trim())
                  .filter((p: string) => p.length > 0);

                // If no product selected, use business type as single item
                const items = productList.length > 0 ? productList : [plan.idea.name || "Business"];

                return <ProductMaterialsView items={items} businessType={plan.idea.name || plan.idea.description || "Business"} fallbackPlan={plan.productionPlan} />;
              })()}
            </TabsContent>

            {/* ── Workforce ── */}
            <TabsContent value="workforce" className="animate-fade-in">
              <PlanSection icon={Users} title="Skill & Workforce Requirements">
                <div className="overflow-x-auto rounded-2xl border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-5 py-4 font-semibold text-muted-foreground">Role</th>
                        <th className="text-left px-5 py-4 font-semibold text-muted-foreground">Skill Level</th>
                        <th className="text-center px-5 py-4 font-semibold text-muted-foreground">Count</th>
                        <th className="text-right px-5 py-4 font-semibold text-muted-foreground">Monthly Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {plan.workforce?.map((worker, index) => (
                        <tr key={index} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4 font-medium">{worker.role}</td>
                          <td className="px-5 py-4 text-muted-foreground">{worker.skillLevel}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">{worker.count}</span>
                          </td>
                          <td className="px-5 py-4 text-right text-success font-bold">{worker.estimatedSalary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Location ── */}
            <TabsContent value="location" className="animate-fade-in space-y-6">

              {/* ── Map ──────────────────────────────────────────────────── */}
              {(() => {
                const rawCity = (userProfile?.city && userProfile.city.toLowerCase() !== "india")
                  ? `${userProfile.city}, India`
                  : "India";
                const city = encodeURIComponent(rawCity);
                // Google Maps embed — no API key needed, auto-zooms to the named location
                const mapSrc = `https://maps.google.com/maps?q=${city}&z=13&output=embed`;
                return (
                  <div className="rounded-2xl overflow-hidden border border-border/50 shadow-md">
                    {/* Map header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {userProfile?.city || "India"} — Business Location Map
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${city}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Open in Google Maps ↗
                      </a>
                    </div>
                    <iframe
                      title="Business Location Map"
                      src={mapSrc}
                      className="w-full h-72 md:h-96"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                    />
                    <div className="px-5 py-2.5 bg-muted/30 border-t border-border/40 text-xs text-muted-foreground">
                      📍 Showing <strong>{userProfile?.city || "India"}</strong> — scout shop locations, competitors & foot traffic zones
                    </div>
                  </div>
                );
              })()}


              {/* ── Location advice cards ─────────────────────────────── */}
              <PlanSection icon={MapPin} title="Offline Setup & Location Advice">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { label: "Recommended Area", value: plan.location?.areaType },
                      { label: "Shop Size", value: plan.location?.shopSize },
                      { label: "Estimated Rent", value: plan.location?.rentEstimate },
                    ].map((item) => (
                      <div key={item.label} className="p-5 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">{item.label}</p>
                        <p className="font-bold text-foreground">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Setup Requirements
                    </h4>
                    <ul className="space-y-2">
                      {plan.location?.setupNeeds?.map((need, index) => (
                        <ListItem key={index}>{need}</ListItem>
                      ))}
                    </ul>
                  </div>
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Pricing ── */}
            <TabsContent value="pricing" className="animate-fade-in">
              <PlanSection icon={Calculator} title="Pricing Strategy">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">Cost Components</h4>
                    <ul className="space-y-2">
                      {plan.pricing?.costComponents?.map((component, index) => (
                        <ListItem key={index}>{component}</ListItem>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Cost Price (avg)", value: plan.pricing?.costPrice, highlight: false },
                      { label: "Market Price Range", value: plan.pricing?.marketPriceRange, highlight: false },
                      { label: "Suggested Price", value: plan.pricing?.suggestedPrice, highlight: true },
                      { label: "Profit Margin", value: plan.pricing?.profitMargin, highlight: true },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between p-4 rounded-xl border ${row.highlight ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/50"}`}
                      >
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
              <PlanSection icon={Megaphone} title="Marketing & Advertising Plan">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4">30-Day Launch Plan</h4>
                    <ul className="space-y-2">
                      {plan.marketing?.launchPlan?.map((step, index) => (
                        <ListItem key={index} bullet={`${index + 1}.`}>{step}</ListItem>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Online Strategies</h4>
                    <ul className="space-y-2 mb-6">
                      {plan.marketing?.onlineStrategies?.map((strategy, index) => (
                        <ListItem key={index}>{strategy}</ListItem>
                      ))}
                    </ul>
                    <h4 className="font-semibold mb-3">Offline Strategies</h4>
                    <ul className="space-y-2">
                      {plan.marketing?.offlineStrategies?.map((strategy, index) => (
                        <ListItem key={index}>{strategy}</ListItem>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-2xl bg-success/5 border border-success/20">
                  <h4 className="font-semibold mb-3 text-success flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Low-Budget Ideas
                  </h4>
                  <ul className="space-y-2">
                    {plan.marketing?.lowBudgetIdeas?.map((idea, index) => (
                      <ListItem key={index}>{idea}</ListItem>
                    ))}
                  </ul>
                </div>

                <div className="mt-10 pt-8 border-t border-border">
                  <AdPostGenerator
                    businessName={plan.idea.name}
                    businessType={plan.idea.description}
                    planId={planId}
                    planName={plan.idea.name}
                    userId={user?.id}
                  />
                </div>
              </PlanSection>
            </TabsContent>

            {/* ── Growth ── */}
            <TabsContent value="growth" className="animate-fade-in">
              <PlanSection icon={TrendingUp} title="Business Growth Roadmap">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
                      Month 1–3: Foundation
                    </h4>
                    <ul className="space-y-2 mb-8">
                      {plan.growth?.month1to3?.map((action, index) => (
                        <ListItem key={index}>{action}</ListItem>
                      ))}
                    </ul>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
                      Month 4–6: Growth
                    </h4>
                    <ul className="space-y-2">
                      {plan.growth?.month4to6?.map((action, index) => (
                        <ListItem key={index}>{action}</ListItem>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4">Expansion Ideas</h4>
                    <ul className="space-y-2 mb-8">
                      {plan.growth?.expansionIdeas?.map((idea, index) => (
                        <ListItem key={index}>{idea}</ListItem>
                      ))}
                    </ul>
                    <div className="p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
                      <h4 className="font-semibold mb-3 text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Common Mistakes to Avoid
                      </h4>
                      <ul className="space-y-2">
                        {plan.growth?.mistakesToAvoid?.map((mistake, index) => (
                          <ListItem key={index}>{mistake}</ListItem>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </PlanSection>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ── STICKY BOTTOM ACTION BAR ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 bg-background/95 backdrop-blur-md py-3 px-4 shadow-2xl">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/recommendations")}
            className="rounded-full border-border/60 hover:border-primary/40 gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Different Business
          </Button>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="rounded-full border-primary/20 hover:bg-primary/5 text-primary gap-2 hidden sm:flex text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />My Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(true)}
              className="rounded-full gap-2 text-sm"
            >
              <Save className="h-4 w-4" />Save Plan
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-sm"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <Footer />

      {/* ── SAVE DIALOG ─────────────────────────────────────────── */}
      <Dialog open={saveDialogOpen} onOpenChange={(open) => { setSaveDialogOpen(open); if (!open) setSaveNameChosen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Business Plan</DialogTitle>
            <DialogDescription>
              {user
                ? saveNameChosen
                  ? "Ready to save your business plan."
                  : "First, give your business a name."
                : "Sign in to save your business plan and access it later."}
            </DialogDescription>
          </DialogHeader>
          {user ? (
            saveNameChosen ? (
              /* Confirm & save */
              <>
                <div className="py-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Saving as:</p>
                  <p className="text-lg font-bold">{planName}</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveNameChosen(false)}>Change Name</Button>
                  <Button onClick={handleSavePlan} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Plan</>}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              /* Name picking step */
              <div className="py-2">
                <BusinessNameStep
                  businessIdea={selectedBusiness?.description || selectedBusiness?.name || ""}
                  industry={selectedBusiness?.name || ""}
                  onComplete={(name) => { setPlanName(name); setSaveNameChosen(true); }}
                />
              </div>
            )
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => navigate("/auth")}>Sign In to Save</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessPlanPage;
