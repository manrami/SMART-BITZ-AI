-- =====================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================
-- This creates the cash_flow table and enables RLS
-- so transactions persist properly.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cash_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT,
  payment_method TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashflow_user_date ON public.cash_flow(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_type ON public.cash_flow(user_id, type);
CREATE INDEX IF NOT EXISTS idx_cashflow_category ON public.cash_flow(user_id, category);

ALTER TABLE public.cash_flow ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own cash flow" ON public.cash_flow;
DROP POLICY IF EXISTS "Users can insert their own cash flow" ON public.cash_flow;
DROP POLICY IF EXISTS "Users can update their own cash flow" ON public.cash_flow;
DROP POLICY IF EXISTS "Users can delete their own cash flow" ON public.cash_flow;

CREATE POLICY "Users can view their own cash flow"
ON public.cash_flow FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flow"
ON public.cash_flow FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow"
ON public.cash_flow FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flow"
ON public.cash_flow FOR DELETE
USING (auth.uid() = user_id);

-- Verify
SELECT 'cash_flow table ready ✅' AS status;
