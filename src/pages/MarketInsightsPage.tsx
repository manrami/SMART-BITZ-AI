import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketTrendsBoard } from "@/components/trends/MarketTrendsBoard";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";

const MarketInsightsPage = () => {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !user) {
            navigate("/auth");
        }
    }, [user, isLoading, navigate]);

    if (isLoading) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col pt-16">
            <Header />

            <main className="flex-1 py-12 px-6">
                <div className="container max-w-6xl mx-auto space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Market Insights</h1>
                            <p className="text-muted-foreground text-lg">Live hyper-local trends forecasting based on your region.</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <MarketTrendsBoard />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default MarketInsightsPage;
