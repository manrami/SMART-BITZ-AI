import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getRecipeBreakdown } from "@/services/biIntelligenceService";
import type { RecipeBreakdown } from "@/types/productIntelligence";
import type { ProductionStep } from "@/types/business";
import {
    ChefHat, Clock, Flame, Info, CheckCircle2,
    Droplets, UtensilsCrossed, PackageOpen, Wrench, Sprout, ArrowRight, Cog, IndianRupee
} from "lucide-react";

interface RecipeFlowProps {
    businessType: string;
    productName?: string;
    fallbackPlan?: ProductionStep[];
}

export function RecipeFlow({ businessType, productName, fallbackPlan }: RecipeFlowProps) {
    const [data, setData] = useState<RecipeBreakdown | null>(null);
    const [loading, setLoading] = useState(true);

    const targetName = productName || businessType;

    useEffect(() => {
        if (!targetName) return;
        setLoading(true);
        getRecipeBreakdown(businessType, targetName).then((res) => {
            setData(res);
            setLoading(false);
        });
    }, [businessType, targetName]);

    if (loading) {
        return (
            <Card className="border-primary/20 bg-card shadow-sm border-dashed">
                <CardContent className="p-8 text-center space-y-4">
                    <Cog className="w-10 h-10 text-primary mx-auto animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">
                        AI is generating the optimal {productName ? `manufacturing flow for ${productName}` : "process flow"}...
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!data || data._fallback) {
        if (!fallbackPlan || fallbackPlan.length === 0) return null;

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Wrench className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Production & Manufacturing Steps</h3>
                </div>
                {fallbackPlan.map((step, index) => (
                    <div key={index} className="p-5 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm hover:border-primary/30 transition-colors">
                        <h4 className="font-semibold text-base text-primary flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">{index + 1}</span>
                            {step.step}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-10">{step.description}</p>
                        <div className="flex items-start gap-2 text-sm text-success bg-success/5 border border-success/10 p-3 rounded-xl ml-10">
                            <IndianRupee className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{step.costVsTime}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const {
        is_food_product, recipe_name, batch_size, total_time,
        ingredients, steps, quality_checklist, packaging_tip
    } = data;

    const Icon = is_food_product ? ChefHat : Wrench;

    return (
        <Card className="border-t-4 border-t-primary shadow-md bg-gradient-to-br from-card to-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-5 pointer-events-none">
                <Icon className="w-64 h-64" />
            </div>

            <CardHeader className="pb-4 border-b border-border/40 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/15 p-2.5 rounded-xl text-primary border border-primary/20">
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-primary">{recipe_name || `Creating ${targetName}`}</CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-1 text-sm font-medium">
                            {batch_size && <span className="flex items-center gap-1.5"><PackageOpen className="w-4 h-4" /> {batch_size}</span>}
                            {total_time && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {total_time}</span>}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 grid lg:grid-cols-12 gap-8 relative z-10">

                {/* LEFT: Ingredients & Quality */}
                <div className="lg:col-span-5 space-y-6">
                    {ingredients && ingredients.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-bold flex items-center gap-2 text-foreground/80">
                                {is_food_product ? <Sprout className="w-4 h-4 text-emerald-500" /> : <Droplets className="w-4 h-4 text-emerald-500" />}
                                {is_food_product ? "Ingredients Required" : "Materials & Components"}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 text-sm">
                                        <span className="font-medium text-foreground">{ing.name}</span>
                                        <Badge variant="outline" className="font-bold border-primary/20 text-primary">{ing.quantity}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {quality_checklist && quality_checklist.length > 0 && (
                        <div className="space-y-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <h4 className="font-semibold text-amber-700 flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Quality Control
                            </h4>
                            <ul className="space-y-2 text-sm text-amber-900/80 font-medium">
                                {quality_checklist.map((q, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />{q}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* RIGHT: Step by step flow */}
                <div className="lg:col-span-7">
                    <h4 className="font-bold flex items-center gap-2 mb-6 text-foreground/80">
                        {is_food_product ? <Flame className="w-4 h-4 text-orange-500" /> : <Cog className="w-4 h-4 text-orange-500" />}
                        Step-by-Step {is_food_product ? "Recipe" : "Process"}
                    </h4>

                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {steps?.map((step, idx) => (
                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Timeline Marker */}
                                <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-background bg-primary/20 text-primary font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-sm">
                                    {step.step_number || idx + 1}
                                </div>

                                {/* Content Card */}
                                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-border/60 bg-card group-hover:border-primary/40 group-hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-bold text-foreground">{step.title}</h5>
                                        {step.duration && <Badge variant="secondary" className="text-xs bg-muted"><Clock className="w-3 h-3 mr-1" />{step.duration}</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                        {step.description}
                                    </p>
                                    {step.tip && (
                                        <div className="flex gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 p-2 rounded-md">
                                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span>{step.tip}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {packaging_tip && (
                        <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-border/50 text-sm flex gap-3 text-muted-foreground">
                            <div className="bg-primary/10 p-2 rounded-lg shrink-0 h-fit">
                                <PackageOpen className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <strong className="text-foreground block mb-1">Packaging & Presentation</strong>
                                {packaging_tip}
                            </div>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}
