import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Wallet,
  Plus,
  TrendingUp,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { calculateCashFlow, CashFlowInputs } from "@/utils/cashflowUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
}

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  type: "income" as "income" | "expense",
  amount: "",
  category: "",
  description: "",
};

export const CashFlowWidget = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [newTransaction, setNewTransaction] = useState(EMPTY_FORM);

  // Projection State
  const [projectionInputs, setProjectionInputs] = useState<CashFlowInputs>({
    price: 1000,
    monthlySales: 50,
    fixedCosts: 15000,
    variableCosts: 400,
    marketingBudget: 5000,
    taxPercent: 10,
  });

  const projectionResult = calculateCashFlow(projectionInputs);

  useEffect(() => {
    if (user) {
      loadTransactions();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from("cash_flow")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Supabase load error:", error);
        setDbError(error.message);
        // Keep existing local state; don't wipe it
        return;
      }
      setTransactions(data || []);
    } catch (err: any) {
      console.error("Unexpected load error:", err);
      setDbError(err?.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    // ── Validation ─────────────────────────────────────────
    if (!newTransaction.amount || Number(newTransaction.amount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!newTransaction.category.trim()) {
      toast.error("Please enter a category (e.g. Salary, Rent, Marketing)");
      return;
    }
    if (!newTransaction.date) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: user?.id,
      date: newTransaction.date,
      type: newTransaction.type,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category.trim(),
      description: newTransaction.description.trim(),
    };

    try {
      const { data, error } = await supabase
        .from("cash_flow")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);

        // ── Fallback: add to local state so UI still works ──
        const localTx: Transaction = {
          id: `local-${Date.now()}`,
          ...payload,
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description.trim(),
        };
        setTransactions((prev) => [localTx, ...prev]);
        toast.warning(
          `Saved locally (DB error: ${error.message}). Run the dashboard migration in Supabase to persist data.`
        );
      } else {
        setTransactions((prev) => [data, ...prev]);
        toast.success("Transaction added successfully! ✅");
      }

      // Reset form & close dialog on either path
      setNewTransaction(EMPTY_FORM);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error("Unexpected insert error:", err);
      toast.error(`Failed to add transaction: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Cash Flow
            </CardTitle>
            <CardDescription>Track income and expenses</CardDescription>
          </div>

          {/* ── Add Transaction Dialog ─────────────────────── */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" id="add-transaction-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>Record income or expense</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Type */}
                <div className="space-y-1">
                  <Label htmlFor="tx-type">Type</Label>
                  <Select
                    value={newTransaction.type}
                    onValueChange={(value: "income" | "expense") =>
                      setNewTransaction({ ...newTransaction, type: value })
                    }
                  >
                    <SelectTrigger id="tx-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">💚 Income</SelectItem>
                      <SelectItem value="expense">🔴 Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <Label htmlFor="tx-date">Date</Label>
                  <Input
                    id="tx-date"
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, date: e.target.value })
                    }
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <Label htmlFor="tx-amount">Amount (₹) *</Label>
                  <Input
                    id="tx-amount"
                    type="number"
                    min="1"
                    step="any"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, amount: e.target.value })
                    }
                    placeholder="e.g. 5000"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label htmlFor="tx-category">Category *</Label>
                  <Input
                    id="tx-category"
                    value={newTransaction.category}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, category: e.target.value })
                    }
                    placeholder="Salary, Rent, Marketing, Sales…"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="tx-description">Description (optional)</Label>
                  <Input
                    id="tx-description"
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, description: e.target.value })
                    }
                    placeholder="Optional notes"
                  />
                </div>

                {/* Submit */}
                <Button
                  id="confirm-add-transaction"
                  onClick={handleAddTransaction}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="tracker" className="w-full">
          <div className="px-6 border-b">
            <TabsList className="mb-4">
              <TabsTrigger value="tracker">Expense Tracker</TabsTrigger>
              <TabsTrigger value="projection">AI Projection Planner</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Expense Tracker Tab ──────────────────────────── */}
          <TabsContent value="tracker" className="space-y-6 p-6 mt-0">

            {/* DB Error Banner */}
            {dbError && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-400">Database not set up yet</p>
                  <p className="text-muted-foreground mt-1">
                    Run <code className="bg-muted px-1 rounded">CREATE_DASHBOARD_TABLES.sql</code> in your Supabase SQL editor to enable persistent transactions.
                    Transactions added now are stored locally in this session.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Balance</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ₹{balance.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Income</p>
                <p className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 mb-1">Expenses</p>
                <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
              </div>
            </div>

            {/* Transactions List */}
            <div>
              <h4 className="font-semibold mb-3">Recent Transactions</h4>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {tx.type === "income" ? (
                          <ArrowUpCircle className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">{tx.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            {tx.description && ` • ${tx.description}`}
                            {tx.id.startsWith("local-") && (
                              <span className="ml-2 text-xs text-amber-400">(local)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold shrink-0 ${tx.type === "income" ? "text-green-500" : "text-red-500"}`}>
                        {tx.type === "income" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click <strong>+ Add Transaction</strong> above to get started
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── AI Projection Planner Tab ────────────────────── */}
          <TabsContent value="projection" className="space-y-6 p-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Sell Price (₹)", key: "price" as const },
                { label: "Monthly Sales Volume", key: "monthlySales" as const },
                { label: "Fixed Costs (₹)", key: "fixedCosts" as const },
                { label: "Variable Cost per Unit (₹)", key: "variableCosts" as const },
                { label: "Marketing Budget (₹)", key: "marketingBudget" as const },
                { label: "Estimated Tax (%)", key: "taxPercent" as const },
              ].map(({ label, key }) => (
                <div className="space-y-2" key={key}>
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={projectionInputs[key]}
                    onChange={(e) =>
                      setProjectionInputs({ ...projectionInputs, [key]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Calculated Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-xl font-bold">₹{projectionResult.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-xl font-bold">₹{projectionResult.grossProfit.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">Net Profit</p>
                <p className={`text-xl font-bold ${projectionResult.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ₹{projectionResult.netProfit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">Break-even Point</p>
                <p className="text-xl font-bold text-blue-600">{projectionResult.breakEvenPoint} Units</p>
              </div>
            </div>

            {/* 12-Month Chart */}
            <div className="h-[300px] w-full border rounded-lg p-4">
              <h4 className="font-semibold mb-4 text-sm text-muted-foreground">
                12-Month Projection Tracker
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={projectionResult.yearlyProjection}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <RechartsTooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="Net Profit" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
