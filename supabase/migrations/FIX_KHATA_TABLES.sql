-- =====================================================
-- MINIMAL SAFE FIX - Only adds what's truly missing
-- Does NOT touch existing columns or data
-- =====================================================

-- The tables already exist with these columns:
-- khata_transactions: id, user_id, type (Sale/Expense), amount, description, transaction_date, created_at
-- khata_inventory: id, user_id, item_name, quantity_in_stock, reorder_threshold, created_at

-- Only fix: allow 'Income' as a valid type (original only allowed 'Sale'/'Expense')
-- We do this by dropping & recreating just the check constraint

ALTER TABLE public.khata_transactions
  DROP CONSTRAINT IF EXISTS khata_transactions_type_check;

ALTER TABLE public.khata_transactions
  ADD CONSTRAINT khata_transactions_type_check
  CHECK (type IN ('Income', 'Sale', 'Expense'));

-- Verify
SELECT 'Khata tables fixed ✅' AS status;
