import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import React, { Suspense } from "react";
const Index = React.lazy(() => import("./pages/Index"));
const StartPage = React.lazy(() => import("./pages/StartPage"));
const RecommendationsPage = React.lazy(() => import("./pages/RecommendationsPage"));
const BusinessPlanPage = React.lazy(() => import("./pages/BusinessPlanPage"));
const AuthPage = React.lazy(() => import("./pages/AuthPage"));
const SavedPlansPage = React.lazy(() => import("./pages/SavedPlansPage"));
const MarketplacePage = React.lazy(() => import("./pages/MarketplacePage"));
const SmartBizAgent = React.lazy(() => import("./pages/SmartBizAgent"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const TrackingParametersPage = React.lazy(() => import("./pages/TrackingParametersPage"));
const SignupPage = React.lazy(() => import("./pages/SignupPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const ScoreboardPage = React.lazy(() => import("./pages/ScoreboardPage"));
const CompliancePage = React.lazy(() => import("./pages/CompliancePage"));
const MarketInsightsPage = React.lazy(() => import("./pages/MarketInsightsPage"));
const KhataErpPage = React.lazy(() => import("./pages/KhataErpPage"));
const CommunityPage = React.lazy(() => import("./pages/CommunityPage"));
const CompetitorPage = React.lazy(() => import("./pages/CompetitorPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <div className="min-h-screen page-fade bg-background text-foreground">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-t-transparent"></div>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/start" element={<StartPage />} />
                  <Route
                    path="/recommendations"
                    element={<RecommendationsPage />}
                  />
                  <Route path="/plan" element={<BusinessPlanPage />} />
                  <Route path="/saved-plans" element={<SavedPlansPage />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/ai-agent" element={<SmartBizAgent />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route
                    path="/tracking-parameters"
                    element={<TrackingParametersPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/scoreboard" element={<ScoreboardPage />} />
                  <Route path="/compliance" element={<CompliancePage />} />
                  <Route path="/insights" element={<MarketInsightsPage />} />
                  <Route path="/khata" element={<KhataErpPage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/competitor" element={<CompetitorPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
