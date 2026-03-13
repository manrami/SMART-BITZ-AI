-- Feature 2: Compliance Tracking
CREATE TABLE public.user_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    license_type TEXT NOT NULL, -- 'GST', 'MSME', 'FSSAI'
    status TEXT DEFAULT 'Pending',
    form_data JSONB, -- Stores the auto-filled data mapping
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feature 5: Khata / Mini ERP
CREATE TABLE public.khata_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_in_stock NUMERIC DEFAULT 0,
    reorder_threshold NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.khata_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Sale', 'Expense')), 
    amount NUMERIC NOT NULL,
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feature 6: Community & Mentor Connect
CREATE TABLE public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT,
    city TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.user_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Allow users to read/update their own compliance data
CREATE POLICY "Users can manage their own compliance data" ON public.user_compliance
    FOR ALL USING (auth.uid() = user_id);

-- Allow users to read/update their own inventory
CREATE POLICY "Users can manage their own inventory" ON public.khata_inventory
    FOR ALL USING (auth.uid() = user_id);

-- Allow users to read/update their own transactions
CREATE POLICY "Users can manage their own transactions" ON public.khata_transactions
    FOR ALL USING (auth.uid() = user_id);

-- Allow users to read all community posts but only insert/update their own
CREATE POLICY "Anyone can read community posts" ON public.community_posts
    FOR SELECT USING (true);
    
CREATE POLICY "Users can insert their own posts" ON public.community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
