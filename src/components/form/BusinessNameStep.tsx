import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BusinessNameStepProps {
  businessIdea?: string;
  industry?: string;
  onComplete: (businessName: string) => void;
}

interface NameSuggestion {
  name: string;
  category: string;
  tagline: string;
  domain_available?: boolean;
}

export const BusinessNameStep = ({
  businessIdea,
  industry,
  onComplete,
}: BusinessNameStepProps) => {
  const [choice, setChoice] = useState<"manual" | "ai" | null>(null);
  const [manualName, setManualName] = useState("");
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateNames = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/generate-business-names",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_idea: businessIdea || "",
            industry: industry || "",
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to generate names");

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      toast.success("Business names generated!");
    } catch (error) {
      console.error("Name generation error:", error);
      toast.error("Failed to generate names. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    const finalName = choice === "manual" ? manualName : selectedName;

    if (!finalName.trim()) {
      toast.error("Please enter or select a business name");
      return;
    }

    // Save to session storage
    sessionStorage.setItem("businessName", finalName);
    onComplete(finalName);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Professional:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Creative:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Trendy: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      Premium:
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>What will be your business name?</CardTitle>
        <CardDescription>
          Choose a memorable name for your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Initial Choice */}
        {!choice && (
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setChoice("manual")}
              className="flex flex-col items-start p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-all text-left"
            >
              <h3 className="font-semibold text-lg mb-2">I have a name</h3>
              <p className="text-sm text-muted-foreground">
                Enter your business name manually
              </p>
            </button>

            <button
              onClick={() => {
                setChoice("ai");
                handleGenerateNames();
              }}
              className="flex flex-col items-start p-6 border-2 rounded-lg hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Suggest names for me</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                AI will generate creative business names
              </p>
            </button>
          </div>
        )}

        {/* Manual Entry */}
        {choice === "manual" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                placeholder="Enter your business name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="text-lg"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setChoice(null)}>
                Back
              </Button>
              <Button onClick={handleContinue} disabled={!manualName.trim()}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {choice === "ai" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  Generating creative names...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">AI Generated Names</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateNames}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>

                <RadioGroup
                  value={selectedName}
                  onValueChange={setSelectedName}
                >
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="relative">
                        <RadioGroupItem
                          value={suggestion.name}
                          id={`name-${index}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`name-${index}`}
                          className="flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-lg">
                              {suggestion.name}
                            </span>
                            <Badge
                              className={getCategoryColor(suggestion.category)}
                            >
                              {suggestion.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.tagline}
                          </p>
                          {suggestion.domain_available !== undefined && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Domain:{" "}
                              {suggestion.domain_available
                                ? "✓ Available"
                                : "✗ Taken"}
                            </p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setChoice(null)}>
                    Back
                  </Button>
                  <Button onClick={handleContinue} disabled={!selectedName}>
                    Continue with Selected Name
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
