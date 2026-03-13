-- =====================================================
-- CREATE SUPPLIER INQUIRIES TABLE
-- Tracks when a user clicks "Contact Supplier"
-- =====================================================

CREATE TABLE IF NOT EXISTS public.supplier_inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id    TEXT NOT NULL,          -- marketplace listing id (or gov- prefixed id)
  listing_title TEXT NOT NULL,          -- name of the supplier/listing
  contact_info  TEXT,                   -- phone/email shown to user
  location      TEXT,                   -- supplier location
  is_gov_verified BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.supplier_inquiries ENABLE ROW LEVEL SECURITY;

-- Logged-in users can insert their own inquiries
CREATE POLICY "Users can insert their own inquiries"
ON public.supplier_inquiries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only view their own inquiries
CREATE POLICY "Users can view their own inquiries"
ON public.supplier_inquiries
FOR SELECT
USING (auth.uid() = user_id);

-- =====================================================
-- DONE! Run this in your Supabase SQL Editor.
-- =====================================================
