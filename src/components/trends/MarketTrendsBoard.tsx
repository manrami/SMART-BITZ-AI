import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, TrendingDown, Target, Zap, AlertCircle } from "lucide-react";

interface TrendItem {
    name: string;
    demand: string;
    competition: string;
    growth: string;
}

interface TrendResponse {
    city: string;
    trending_categories: TrendItem[];
    key_insights: string[];
    source: string;
    is_live?: boolean;
}

export const MarketTrendsBoard = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [trends, setTrends] = useState<TrendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get city from profile or default
    const [city, setCity] = useState("India");

    useEffect(() => {
        const storedProfile = sessionStorage.getItem("userProfile");
        if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            if (profile.city) {
                setCity(profile.city);
            }
        }
        fetchTrends(city);
    }, []);

    const fetchTrends = async (cityName: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/market-trends?city=${encodeURIComponent(cityName)}`);
            if (!response.ok) throw new Error("Failed to fetch trends");

            const result = await response.json();
            if (result.success) {
                setTrends(result.data);
            } else {
                throw new Error(result.error || "Failed to fetch trends");
            }
        } catch (err) {
            console.error(err);
            setError("Unable to connect to the Market Trends Engine.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Analyzing {city}'s Local Market Data...</p>
                <p className="text-sm text-muted-foreground mt-2">Fetching live Google Trends data for your region.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-destructive border border-destructive/20 bg-destructive/5 rounded-xl">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
            </div>
        );
    }

    if (!trends) return null;

    const isLive = trends.is_live === true;

    return (
        <div className="space-y-6">
            {/* Live / Estimated badge */}
            <div className="flex items-center gap-2">
                {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                        LIVE — Google Trends
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                        ESTIMATED — Live data temporarily unavailable
                    </span>
                )}
                <span className="text-xs text-muted-foreground">Results for {trends.city}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {trends.key_insights.map((insight, idx) => (
                    <Card key={idx} className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-full text-primary mt-1">
                                <Zap className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{insight}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
                {trends.trending_categories.map((trend, idx) => (
                    <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex justify-between items-start">
                                {trend.name}
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    trend.growth.startsWith('+')
                                        ? 'text-green-400 bg-green-500/10'
                                        : 'text-red-400 bg-red-500/10'
                                }`}>
                                    {trend.growth}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4" /> Demand
                                </span>
                                <span className="font-semibold">{trend.demand}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Target className="w-4 h-4" /> Competition
                                </span>
                                <span className={`font-semibold ${trend.competition === 'Low' ? 'text-green-400' : trend.competition === 'High' ? 'text-red-400' : ''}`}>
                                    {trend.competition}
                                </span>
                            </div>

                            <p className="text-xs text-muted-foreground pt-2">
                                {trend.competition === 'Low' && (trend.demand === 'High' || trend.demand === 'Very High')
                                    ? "🔥 Hot Opportunity: High demand with unsaturated market."
                                    : trend.competition === 'High'
                                        ? "⚠️ Competitive space — strong differentiation needed."
                                        : "Market is steady — consistent local demand."}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="text-xs text-center text-muted-foreground mt-8 opacity-60">
                {trends.source} • Results cached for up to 6 hours per city
            </p>
        </div>
    );
};
