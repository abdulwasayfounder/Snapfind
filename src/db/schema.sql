-- ==============================================================================
-- SnapFind AI — Supabase / PostgreSQL Database Architecture & Schema definition
-- ==============================================================================

-- 1. PROFILES TABLE
-- Extends auth.users with application specific metadata, avatars, and storage quotas.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    storage_limit_mb INTEGER NOT NULL DEFAULT 5000,
    is_pro BOOLEAN NOT NULL DEFAULT TRUE
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com');

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Prevent unauthorized client-side tampering of is_pro or storage limits in profiles table
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
    IF (auth.jwt() ->> 'email') IS DISTINCT FROM 'ash.mary.2006@gmail.com' 
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'service_role' 
       AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
        NEW.is_pro := OLD.is_pro;
        NEW.storage_limit_mb := OLD.storage_limit_mb;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- 2. SCREENSHOTS TABLE
-- Stores OCR indexed screenshots, extracted entity metadata, tags, and category labels.
CREATE TABLE IF NOT EXISTS public.screenshots (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    ocr_snippet TEXT,
    full_ocr_text TEXT,
    key_entities JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    file_size_mb NUMERIC(5,2) NOT NULL DEFAULT 0.50,
    content_hash TEXT,
    sha256_hash TEXT,
    privacy_level TEXT NOT NULL DEFAULT 'normal' CHECK (privacy_level IN ('normal', 'private', 'highly_sensitive')),
    sensitive_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
    is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    masked_ocr_text TEXT,
    website_name TEXT,
    website_domain TEXT,
    detected_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
    has_qr_code BOOLEAN NOT NULL DEFAULT FALSE,
    qr_code_type TEXT,
    qr_code_data TEXT,
    qr_url TEXT
);

-- Indexes for lightning-fast search performance and absolute duplicate prevention
CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON public.screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_category ON public.screenshots(category);
CREATE INDEX IF NOT EXISTS idx_screenshots_created_at ON public.screenshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_privacy_level ON public.screenshots(privacy_level);
CREATE INDEX IF NOT EXISTS idx_screenshots_full_ocr_fts ON public.screenshots USING gin (to_tsvector('english', COALESCE(full_ocr_text, '')));

-- Enforce Absolute Duplicate Prevention at the database level:
-- Exactly one screenshot per user per unique content_hash.
CREATE UNIQUE INDEX IF NOT EXISTS idx_screenshots_user_content_hash 
    ON public.screenshots(user_id, content_hash) 
    WHERE content_hash IS NOT NULL AND user_id IS NOT NULL;

-- Enable RLS on screenshots
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own screenshots" 
    ON public.screenshots FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own screenshots" 
    ON public.screenshots FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own screenshots" 
    ON public.screenshots FOR UPDATE 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own screenshots" 
    ON public.screenshots FOR DELETE 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. SEARCH_HISTORY TABLE
-- Logs past natural language search queries for rapid re-execution.
CREATE TABLE IF NOT EXISTS public.search_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    category_filter TEXT NOT NULL DEFAULT 'All',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on search history user_id and timestamp
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history(created_at DESC);

-- Enable RLS on search history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own search history" 
    ON public.search_history FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own search history" 
    ON public.search_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own search history" 
    ON public.search_history FOR DELETE 
    USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. SETTINGS TABLE
-- User preference settings, theme modes, and OCR vision model configurations.
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'dark',
    ocr_accuracy TEXT NOT NULL DEFAULT 'accurate',
    auto_tagging BOOLEAN NOT NULL DEFAULT TRUE,
    cloud_sync BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own settings" 
    ON public.settings FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own settings" 
    ON public.settings FOR UPDATE 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own settings" 
    ON public.settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 5. AUTOMATIC USER CREATION TRIGGER & FUNCTION
-- Automatically creates profile and settings records when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    );

    INSERT INTO public.settings (user_id)
    VALUES (NEW.id);

    INSERT INTO public.user_entitlements (user_id, plan, tier, is_pro, is_founder, max_screenshots)
    VALUES (NEW.id, 'free', 'Free', FALSE, FALSE, 100)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. PAYMENT_REQUESTS TABLE (Manual Payment Processing)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    plan TEXT NOT NULL DEFAULT 'lifetime',
    amount NUMERIC NOT NULL DEFAULT 7999,
    currency TEXT NOT NULL DEFAULT 'PKR',
    payment_method TEXT NOT NULL, -- 'Easypaisa' | 'Bank Transfer' | etc.
    transaction_id TEXT NOT NULL UNIQUE,
    receipt_url TEXT,
    sender_account TEXT,
    sender_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_tx_id ON public.payment_requests(transaction_id);

-- Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Normal users can view their own payment requests
CREATE POLICY "Users can view own payment requests"
    ON public.payment_requests FOR SELECT
    USING (
        auth.uid()::text = user_id 
        OR (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Normal users can submit a pending payment request
CREATE POLICY "Users can insert own pending payment requests"
    ON public.payment_requests FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id
        AND status = 'pending'
    );

-- ONLY authorized admins can update payment request status (Approve / Reject)
CREATE POLICY "Only admins can update payment requests"
    ON public.payment_requests FOR UPDATE
    USING (
        (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- ==============================================================================
-- 7. USER_ENTITLEMENTS TABLE (Authoritative Tier & Screenshot Quotas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_entitlements (
    user_id TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'lifetime' | 'founder' | 'pro'
    tier TEXT NOT NULL DEFAULT 'Free',
    is_pro BOOLEAN NOT NULL DEFAULT FALSE,
    is_founder BOOLEAN NOT NULL DEFAULT FALSE,
    founder_number INTEGER,
    founder_granted_at TIMESTAMPTZ,
    founder_expires_at TIMESTAMPTZ,
    max_screenshots INTEGER NOT NULL DEFAULT 100, -- Free: 100, Pro/Lifetime/Founder: unlimited
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ, -- null for Lifetime Pro / Founder
    active_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlement"
    ON public.user_entitlements FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Only admins / service role can modify user entitlements
CREATE POLICY "Only admins can insert or update user entitlements"
    ON public.user_entitlements FOR ALL
    USING (
        (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- ==============================================================================
-- 8. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid()::text = user_id);

-- ==============================================================================
-- 9. SUBSCRIPTIONS TABLE (Paddle Automated Payment Transactions & Subscriptions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL, -- 'monthly' | 'yearly' | 'lifetime' | 'founder'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled' | 'expired' | 'trialing'
    provider TEXT NOT NULL DEFAULT 'paddle', -- 'paddle' | 'manual'
    provider_customer_id TEXT,
    provider_transaction_id TEXT,
    provider_subscription_id TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_tx ON public.subscriptions(provider_transaction_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        auth.uid()::text = user_id
        OR (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

CREATE POLICY "Only admins or service role can modify subscriptions"
    ON public.subscriptions FOR ALL
    USING (
        (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- ==============================================================================
-- 10. FOUNDER_CLAIMS TABLE (Atomic & Permanent Founder 50 Seats Allocation)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.founder_claims (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE,
    founder_rank INTEGER NOT NULL UNIQUE CHECK (founder_rank >= 1 AND founder_rank <= 50),
    payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'claimed', -- 'claimed' | 'revoked'
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_claims_user_id ON public.founder_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_claims_rank ON public.founder_claims(founder_rank);

ALTER TABLE public.founder_claims ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view founder claims for real-time seat availability calculation
CREATE POLICY "Anyone can view founder claims for seat calculation"
    ON public.founder_claims FOR SELECT
    USING (TRUE);

-- Only service role / admin can insert or update founder claims
CREATE POLICY "Only admins or service role can modify founder claims"
    ON public.founder_claims FOR ALL
    USING (
        (auth.jwt() ->> 'email') = 'ash.mary.2006@gmail.com'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- ==============================================================================
-- 11. ATOMIC FOUNDER SEAT ALLOCATION STORED PROCEDURE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.claim_founder_seat_atomic(
    p_user_id TEXT,
    p_payment_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    founder_rank INTEGER,
    message TEXT
) AS $$
DECLARE
    v_existing_rank INTEGER;
    v_next_rank INTEGER;
BEGIN
    -- 1. Check if user already claimed a founder seat
    SELECT fc.founder_rank INTO v_existing_rank
    FROM public.founder_claims fc
    WHERE fc.user_id = p_user_id
    LIMIT 1;

    IF v_existing_rank IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, v_existing_rank, 'User is already verified Founder #' || v_existing_rank::TEXT;
        RETURN;
    END IF;

    -- 2. Lock table to prevent race conditions during concurrent claiming
    LOCK TABLE public.founder_claims IN EXCLUSIVE MODE;

    -- 3. Find the lowest unused rank between 1 and 50 (ranks are permanent and never reused)
    SELECT COALESCE(MAX(fc.founder_rank), 0) + 1 INTO v_next_rank
    FROM public.founder_claims fc;

    -- 4. Enforce strict hard ceiling of 50 seats
    IF v_next_rank > 50 THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'All 50 Founder seats have been claimed.';
        RETURN;
    END IF;

    -- 5. Insert atomic claim
    INSERT INTO public.founder_claims (id, user_id, founder_rank, payment_id, status, claimed_at)
    VALUES (gen_random_uuid()::text, p_user_id, v_next_rank, p_payment_id, 'claimed', NOW());

    -- 6. Update user_entitlements
    INSERT INTO public.user_entitlements (
        user_id, plan, tier, is_pro, is_founder, founder_number, founder_granted_at, max_screenshots, status, updated_at
    ) VALUES (
        p_user_id, 'founder', 'Founder', TRUE, TRUE, v_next_rank, NOW(), 999999, 'active', NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan = 'founder',
        tier = 'Founder',
        is_pro = TRUE,
        is_founder = TRUE,
        founder_number = v_next_rank,
        founder_granted_at = NOW(),
        max_screenshots = 999999,
        status = 'active',
        updated_at = NOW();

    RETURN QUERY SELECT TRUE, v_next_rank, 'Founder #' || v_next_rank::TEXT || ' successfully claimed!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

