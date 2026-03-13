import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Crosshair, TrendingDown, TrendingUp, ShieldAlert, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type SwotAnalysis = {
    name: string;
    industry: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    key_takeaway: string;
}

export const CompetitorAnalyzerForm = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [competitorQuery, setCompetitorQuery] = useState('');
    const [industryQuery, setIndustryQuery] = useState('');
    const [analysis, setAnalysis] = useState<SwotAnalysis | null>(null);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!competitorQuery) return;

        setIsLoading(true);
        setAnalysis(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/analyze-competitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    competitor: competitorQuery,
                    industry: industryQuery || "General"
                }),
            });

            if (!response.ok) throw new Error("Failed to connect to backend engine.");

            const result = await response.json();

            if (result.success && result.data) {
                setAnalysis(result.data);
                toast({ title: "Analysis Complete", description: `SWOT generated for ${result.data.name}` });
            } else {
                throw new Error(result.error || "Unknown error occurred.");
            }
        } catch (error: any) {
            toast({
                title: "Analysis Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle>Competitor Intelligence Engine</CardTitle>
                    <CardDescription>Enter a competitor's name or website to generate an instant AI-powered SWOT analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            placeholder="Competitor Name or URL (e.g. Zomato, localbakery.com)"
                            value={competitorQuery}
                            onChange={(e) => setCompetitorQuery(e.target.value)}
                            className="flex-1 bg-background"
                            disabled={isLoading}
                        />
                        <Input
                            placeholder="Industry (Optional)"
                            value={industryQuery}
                            onChange={(e) => setIndustryQuery(e.target.value)}
                            className="w-full sm:w-48 bg-background"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={!competitorQuery || isLoading} className="gap-2 shrink-0">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Run Analysis
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium animate-pulse">Scanning digital footprint & analyzing market position...</p>
                </div>
            )}

            {analysis && !isLoading && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="flex items-center gap-3 p-4 bg-accent/20 border border-accent/30 rounded-lg">
                        <div className="p-2 bg-accent/30 rounded-full text-accent">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Strategic Recommendation</p>
                            <p className="font-medium text-lg">{analysis.key_takeaway}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <Card className="border-t-4 border-t-emerald-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-emerald-600">
                                    <TrendingUp className="w-5 h-5" /> Strengths
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.strengths.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <span className="text-emerald-500 font-bold">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Weaknesses */}
                        <Card className="border-t-4 border-t-rose-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-rose-600">
                                    <TrendingDown className="w-5 h-5" /> Weaknesses
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.weaknesses.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <span className="text-rose-500 font-bold">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Opportunities */}
                        <Card className="border-t-4 border-t-blue-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-blue-600">
                                    <Crosshair className="w-5 h-5" /> Opportunities (For You)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.opportunities.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <span className="text-blue-500 font-bold">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Threats */}
                        <Card className="border-t-4 border-t-amber-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-amber-600">
                                    <ShieldAlert className="w-5 h-5" /> Threats
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {analysis.threats.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-sm">
                                            <span className="text-amber-500 font-bold">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
