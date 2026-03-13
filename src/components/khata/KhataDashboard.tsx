import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, ArrowUpRight, ArrowDownRight, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Real column names from the existing khata_transactions table:
// id, user_id, type ('Sale' | 'Expense'), amount, description, transaction_date, created_at
type Transaction = {
    id: string;
    type: 'Sale' | 'Expense';
    amount: number;
    description: string;
    transaction_date: string;
    created_at: string;
}

// Real column names from the existing khata_inventory table:
// id, user_id, item_name, quantity_in_stock, reorder_threshold, created_at
type InventoryItem = {
    id: string;
    item_name: string;
    quantity_in_stock: number;
    reorder_threshold: number;
}

export const KhataDashboard = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    // Transaction form
    const [txAmount, setTxAmount] = useState('');
    const [txDesc, setTxDesc] = useState('');
    const [txType, setTxType] = useState<'Sale' | 'Expense'>('Sale');
    const [txSubmitting, setTxSubmitting] = useState(false);

    // Inventory form
    const [invName, setInvName] = useState('');
    const [invQty, setInvQty] = useState('');
    const [invSubmitting, setInvSubmitting] = useState(false);

    useEffect(() => {
        if (user) fetchData();
        else setIsLoading(false);
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [txRes, invRes] = await Promise.all([
                supabase
                    .from('khata_transactions')
                    .select('*')
                    .eq('user_id', user?.id)
                    .order('transaction_date', { ascending: false })
                    .limit(20),
                supabase
                    .from('khata_inventory')
                    .select('*')
                    .eq('user_id', user?.id)
                    .order('item_name', { ascending: true })
            ]);

            if (txRes.error) throw txRes.error;
            if (invRes.error) throw invRes.error;

            setTransactions(txRes.data || []);
            setInventory(invRes.data || []);
        } catch (error: any) {
            console.error('Khata fetch error:', error);
            toast.error(`Failed to load data: ${error?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const addTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txAmount || Number(txAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!txDesc.trim()) {
            toast.error('Please enter a description');
            return;
        }

        setTxSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('khata_transactions')
                .insert([{
                    user_id: user?.id,
                    type: txType,                          // 'Sale' or 'Expense'
                    amount: parseFloat(txAmount),
                    description: txDesc.trim(),
                    transaction_date: new Date().toISOString().split('T')[0], // DATE format
                }])
                .select()
                .single();

            if (error) throw error;

            setTransactions(prev => [data, ...prev]);
            toast.success('Transaction recorded! ✅');
            setTxAmount('');
            setTxDesc('');
        } catch (err: any) {
            console.error('Transaction insert error:', err);
            toast.error(`Failed to add: ${err?.message}`);
        } finally {
            setTxSubmitting(false);
        }
    };

    const addInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invName.trim()) {
            toast.error('Please enter an item name');
            return;
        }
        if (!invQty || Number(invQty) < 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        setInvSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('khata_inventory')
                .insert([{
                    user_id: user?.id,
                    item_name: invName.trim(),             // correct column name
                    quantity_in_stock: parseFloat(invQty), // correct column name
                    reorder_threshold: 5,                  // correct column name
                }])
                .select()
                .single();

            if (error) throw error;

            setInventory(prev => [...prev, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
            toast.success('Item added to inventory! ✅');
            setInvName('');
            setInvQty('');
        } catch (err: any) {
            console.error('Inventory insert error:', err);
            toast.error(`Failed to add item: ${err?.message}`);
        } finally {
            setInvSubmitting(false);
        }
    };

    const totalIncome  = transactions.filter(t => t.type === 'Sale').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Current Balance <TrendingUp className="w-4 h-4 text-primary" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ₹{balance.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Total Sales <ArrowUpRight className="w-4 h-4 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">₹{totalIncome.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Total Expenses <ArrowDownRight className="w-4 h-4 text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">₹{totalExpense.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Transactions */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Record sales and expenses</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <form onSubmit={addTransaction} className="flex gap-2 mb-6">
                            <select
                                value={txType}
                                onChange={(e) => setTxType(e.target.value as 'Sale' | 'Expense')}
                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-28 shrink-0"
                            >
                                <option value="Sale">Sale</option>
                                <option value="Expense">Expense</option>
                            </select>
                            <Input
                                placeholder="Amount"
                                type="number"
                                min="1"
                                value={txAmount}
                                onChange={e => setTxAmount(e.target.value)}
                                className="w-24 shrink-0"
                            />
                            <Input
                                placeholder="Description"
                                value={txDesc}
                                onChange={e => setTxDesc(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={txSubmitting}>
                                {txSubmitting
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Plus className="w-4 h-4" />}
                            </Button>
                        </form>

                        <div className="space-y-2 flex-1 overflow-auto">
                            {transactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No transactions recorded yet.<br />
                                    <span className="text-xs opacity-60">Select type, enter amount & description ↑</span>
                                </p>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                                        <div>
                                            <p className="font-medium text-sm">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className={`font-bold text-sm ${tx.type === 'Sale' ? 'text-green-500' : 'text-red-500'}`}>
                                            {tx.type === 'Sale' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Inventory Tracker</CardTitle>
                        <CardDescription>Manage raw materials & stock</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <form onSubmit={addInventory} className="flex gap-2 mb-6">
                            <Input
                                placeholder="Item Name"
                                value={invName}
                                onChange={e => setInvName(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Qty"
                                type="number"
                                min="0"
                                value={invQty}
                                onChange={e => setInvQty(e.target.value)}
                                className="w-20 shrink-0"
                            />
                            <Button type="submit" size="icon" variant="secondary" disabled={invSubmitting}>
                                {invSubmitting
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Package className="w-4 h-4" />}
                            </Button>
                        </form>

                        <div className="space-y-2 flex-1 overflow-auto">
                            {inventory.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Inventory is empty.<br />
                                    <span className="text-xs opacity-60">Enter item name & quantity ↑</span>
                                </p>
                            ) : (
                                inventory.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                                        <div>
                                            <p className="font-medium text-sm flex items-center gap-2">
                                                {item.item_name}
                                                {item.quantity_in_stock <= item.reorder_threshold && (
                                                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">
                                                        Low Stock
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Reorder at: {item.reorder_threshold} units
                                            </p>
                                        </div>
                                        <div className="font-bold text-lg">
                                            {item.quantity_in_stock}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
