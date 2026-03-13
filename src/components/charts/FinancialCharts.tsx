import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BusinessIdea } from "@/types/business";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

interface FinancialChartsProps {
  idea: BusinessIdea;
  pricing?: {
    costComponents?: string[];
    costPrice: string;
    suggestedPrice: string;
    profitMargin: string;
  };
}

export function FinancialCharts({ idea, pricing }: FinancialChartsProps) {
  // Parse investment range
  const parseAmount = (str: string): number => {
    const match = str.match(/[\d,]+/g);
    if (match) {
      const nums = match.map((n) => parseInt(n.replace(/,/g, "")));
      return nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
    }
    return 0;
  };

  const investment = parseAmount(idea.investmentRange);
  const monthlyRevenue = parseAmount(idea.expectedRevenue);
  const profitMarginPercent = parseInt(
    idea.profitMargin.match(/\d+/)?.[0] || "35",
  );
  const monthlyProfit = (monthlyRevenue * profitMarginPercent) / 100;
  const breakEvenMonths = parseInt(idea.breakEvenTime.match(/\d+/)?.[0] || "4");

  // Calculate cumulative profit for break-even analysis
  const breakEvenData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const revenue =
      month <= 2
        ? monthlyRevenue * 0.6
        : month <= 4
          ? monthlyRevenue * 0.8
          : monthlyRevenue;
    const profit = (revenue * profitMarginPercent) / 100;

    let cumulativeProfit = -investment;
    for (let m = 1; m <= month; m++) {
      const r =
        m <= 2
          ? monthlyRevenue * 0.6
          : m <= 4
            ? monthlyRevenue * 0.8
            : monthlyRevenue;
      cumulativeProfit += (r * profitMarginPercent) / 100;
    }

    return {
      month: `Month ${month}`,
      cumulative: Math.round(cumulativeProfit),
      breakEven: 0,
    };
  });

  // ROI data
  const roiData = [
    {
      period: "Month 3",
      roi: Math.round(((monthlyProfit * 3 - investment) / investment) * 100),
    },
    {
      period: "Month 6",
      roi: Math.round(((monthlyProfit * 6 - investment) / investment) * 100),
    },
    {
      period: "Month 12",
      roi: Math.round(((monthlyProfit * 12 - investment) / investment) * 100),
    },
    {
      period: "Year 2",
      roi: Math.round(((monthlyProfit * 24 - investment) / investment) * 100),
    },
  ];

  // Cost breakdown data - make it dynamic based on AI pricing components if available
  const defaultCostBreakdown = [
    { name: "Raw Materials", value: 45, color: "hsl(var(--primary))" },
    { name: "Rent & Utilities", value: 15, color: "hsl(var(--chart-2))" },
    { name: "Staff Salaries", value: 20, color: "hsl(var(--chart-3))" },
    { name: "Marketing", value: 10, color: "hsl(var(--chart-4))" },
    { name: "Miscellaneous", value: 10, color: "hsl(var(--chart-5))" },
  ];

  let costBreakdownData = defaultCostBreakdown;

  if (pricing && pricing.costComponents && pricing.costComponents.length > 0) {
    const defaultColors = [
      "hsl(var(--primary))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ];

    let totalPercentage = 0;
    const parsedData = pricing.costComponents.map((comp, index) => {
      // Look for a percentage in the string, e.g., "Raw Materials: 40%"
      const match = comp.match(/(\d+(?:\.\d+)?)\s*%/);
      const percentage = match ? parseFloat(match[1]) : 0;
      totalPercentage += percentage;

      // Clean the name
      let name = comp;
      if (match) {
        // Remove the percentage, and any trailing colons or dashes
        name = name.replace(match[0], "").replace(/[:\-]+/g, "").trim();
      }

      // Max words limit for cleaner display
      if (name.length > 25) {
        name = name.substring(0, 25) + "...";
      }

      return {
        name: name || `Component ${index + 1}`,
        value: percentage,
        color: defaultColors[index % defaultColors.length],
      };
    });

    // If AI gave valid percentages that roughly add up to 90-100%, use them
    if (totalPercentage >= 90 && totalPercentage <= 101) {
      costBreakdownData = parsedData;
    } else {
      // If no valid percentages found, distribute 100% evenly among the components
      const evenDist = Math.floor(100 / pricing.costComponents.length);
      let remainder = 100 - (evenDist * pricing.costComponents.length);
      
      costBreakdownData = parsedData.map((item, index) => {
        let val = evenDist;
        if (remainder > 0) {
          val += 1;
          remainder -= 1;
        }
        return {
          ...item,
          value: val,
        };
      });
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`;
    }
    return `₹${value}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Break-Even Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Break-Even Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={breakEvenData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tickFormatter={formatCurrency} className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative P/L"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="breakEven"
                    name="Break-Even"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Expected break-even in{" "}
              <span className="font-semibold text-primary">
                {breakEvenMonths} months
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Cost Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Projection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Return on Investment (ROI) Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roiData.map((item) => (
              <div
                key={item.period}
                className={`text-center p-4 rounded-lg ${
                  item.roi >= 0 ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {item.period}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    item.roi >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {item.roi > 0 ? "+" : ""}
                  {item.roi}%
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Based on investment of {formatCurrency(investment)} with{" "}
            {profitMarginPercent}% profit margin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
