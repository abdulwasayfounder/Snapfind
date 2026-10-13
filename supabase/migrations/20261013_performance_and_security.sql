-- ==============================================================================
-- SnapFind AI — Migration: Performance, Composite Indexes & Security Hardening
-- Date: 2026-10-13
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR SCREENSHOTS
-- Accelerates gallery sorting by recency for the authenticated user
CREATE INDEX IF NOT EXISTS idx_screenshots_user_created 
    ON public.screenshots(user_id, created_at DESC);

-- Accelerates category-filtered gallery views (e.g. Code, Documents, Financial)
CREATE INDEX IF NOT EXISTS idx_screenshots_user_category_created 
    ON public.screenshots(user_id, category, created_at DESC);

-- Partial index for instantaneous Favorites view queries
CREATE INDEX IF NOT EXISTS idx_screenshots_user_favorites 
    ON public.screenshots(user_id, created_at DESC) 
    WHERE is_favorite = TRUE;

-- Add sha256_hash column if not already present for duplicate prevention
ALTER TABLE public.screenshots 
    ADD COLUMN IF NOT EXISTS sha256_hash TEXT;

-- Index for instant duplicate identification per user
CREATE INDEX IF NOT EXISTS idx_screenshots_user_hash 
    ON public.screenshots(user_id, sha256_hash) 
    WHERE sha256_hash IS NOT NULL;

-- 2. COMPOSITE INDEXES FOR SEARCH HISTORY & FEEDBACK
CREATE INDEX IF NOT EXISTS idx_search_history_user_created 
    ON public.search_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created 
    ON public.feedback(user_id, created_at DESC);

-- 3. TIGHTENED ROW LEVEL SECURITY ON SCREENSHOTS
-- Protects user data: private user screenshots are strictly isolated by auth.uid().
DROP POLICY IF EXISTS "Users can select own screenshots" ON public.screenshots;
CREATE POLICY "Users can select own screenshots" 
    ON public.screenshots FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own screenshots" ON public.screenshots;
CREATE POLICY "Users can insert own screenshots" 
    ON public.screenshots FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own screenshots" ON public.screenshots;
CREATE POLICY "Users can update own screenshots" 
    ON public.screenshots FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own screenshots" ON public.screenshots;
CREATE POLICY "Users can delete own screenshots" 
    ON public.screenshots FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. TIGHTENED RLS ON SEARCH HISTORY
DROP POLICY IF EXISTS "Users can select own search history" ON public.search_history;
CREATE POLICY "Users can select own search history" 
    ON public.search_history FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
CREATE POLICY "Users can insert own search history" 
    ON public.search_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can delete own search history" 
    ON public.search_history FOR DELETE 
    USING (auth.uid() = user_id);
