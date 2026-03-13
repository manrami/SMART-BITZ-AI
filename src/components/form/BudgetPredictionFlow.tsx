import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BudgetPredictionProps {
  onComplete: (data: {
    predicted_budget: number;
    user_budget: number;
    feasibility: any;
    business_idea: string;
  }) => void;
}

export const BudgetPredictionFlow = ({ onComplete }: BudgetPredictionProps) => {
  const [step, setStep] = useState<"idea" | "prediction" | "user_budget">(
    "idea",
  );
  const [businessIdea, setBusinessIdea] = useState("");
  const [predictedBudget, setPredictedBudget] = useState<number | null>(null);
  const [budgetBreakdown, setBudgetBreakdown] = useState<any>(null);
  const [userBudget, setUserBudget] = useState("");
  const [feasibility, setFeasibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePredictBudget = async () => {
    if (!businessIdea.trim()) {
      toast.error("Please describe your business idea");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/predict-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: businessIdea }),
      });

      if (!response.ok) throw new Error("Failed to predict budget");

      const data = await response.json();
      setPredictedBudget(data.predicted_budget);
      setBudgetBreakdown(data.budget_breakdown);
      setStep("prediction");
      toast.success("Budget predicted successfully!");
    } catch (error) {
      console.error("Budget prediction error:", error);
      toast.error("Failed to predict budget. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareBudget = async () => {
    const budget = parseFloat(userBudget);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/predict-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: businessIdea,
          user_budget: budget,
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze feasibility");

      const data = await response.json();
      setFeasibility(data.feasibility);
      setStep("user_budget");
      // onComplete called when user clicks "Continue to Next Step"
    } catch (error) {
      console.error("Feasibility analysis error:", error);
      toast.error("Failed to analyze feasibility. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Business Idea Input */}
      {step === "idea" && (
        <Card>
          <CardHeader>
            <CardTitle>Describe Your Business Idea</CardTitle>
            <CardDescription>
              Tell us about your business idea in detail. Our AI will analyze it
              and predict the required budget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business-idea">Business Idea Description</Label>
              <Textarea
                id="business-idea"
                placeholder="Example: I want to start a cloud kitchen in Bangalore specializing in healthy meal prep. I'll focus on office workers and fitness enthusiasts..."
                value={businessIdea}
                onChange={(e) => setBusinessIdea(e.target.value)}
                rows={6}
                className="mt-2"
              />
            </div>
            <Button
              onClick={handlePredictBudget}
              disabled={isLoading || !businessIdea.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Predict Required Budget
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Show Predicted Budget */}
      {step === "prediction" && predictedBudget && (
        <Card>
          <CardHeader>
            <CardTitle>AI Budget Prediction</CardTitle>
            <CardDescription>
              Based on your business idea, here's the estimated budget
              requirement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Predicted Budget - Red Color */}
            <div className="text-center p-6 bg-red-50 dark:bg-red-950 rounded-lg border-2 border-red-200 dark:border-red-800">
              <p className="text-sm text-muted-foreground mb-2">
                Predicted Required Budget
              </p>
              <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(predictedBudget)}
              </p>
            </div>

            {/* Budget Breakdown */}
            {budgetBreakdown && (
              <div className="space-y-3">
                <h4 className="font-semibold">Budget Breakdown:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(budgetBreakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="capitalize text-sm">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(value as number)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Budget Input */}
            <div className="space-y-4 pt-4 border-t">
              <Label htmlFor="user-budget">
                What is your available budget?
              </Label>
              <Input
                id="user-budget"
                type="number"
                placeholder="Enter your budget in ₹"
                value={userBudget}
                onChange={(e) => setUserBudget(e.target.value)}
              />
              <Button
                onClick={handleCompareBudget}
                disabled={isLoading || !userBudget}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Feasibility...
                  </>
                ) : (
                  "Compare & Analyze Feasibility"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Feasibility Analysis */}
      {step === "user_budget" && feasibility && (
        <Card>
          <CardHeader>
            <CardTitle>Feasibility Analysis</CardTitle>
            <CardDescription>
              Comparison of required vs available budget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Alert */}
            <Alert
              variant={
                feasibility.status === "feasible" ? "default" : "destructive"
              }
            >
              {feasibility.status === "feasible" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <strong className="capitalize">{feasibility.status}</strong>
                {feasibility.gap > 0 && (
                  <span className="ml-2">
                    - Budget Gap: {formatCurrency(feasibility.gap)}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Budget Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Required</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(predictedBudget!)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(parseFloat(userBudget))}
                </p>
              </div>
            </div>

            {/* Optimization Suggestions */}
            {feasibility.optimization_suggestions &&
              feasibility.optimization_suggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">
                    💡 Cost Optimization Suggestions:
                  </h4>
                  <ul className="space-y-2">
                    {feasibility.optimization_suggestions.map(
                      (suggestion: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {/* Scaling Strategy */}
            {feasibility.scaling_strategy && (
              <div className="space-y-2">
                <h4 className="font-semibold">📈 Recommended Strategy:</h4>
                <p className="text-sm text-muted-foreground">
                  {feasibility.scaling_strategy}
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                onComplete({
                  predicted_budget: predictedBudget!,
                  user_budget: parseFloat(userBudget),
                  feasibility,
                  business_idea: businessIdea,
                });
              }}
              className="w-full"
            >
              Continue to Next Step
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
