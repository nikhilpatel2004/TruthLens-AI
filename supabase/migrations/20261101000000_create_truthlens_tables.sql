-- ==============================================================================
-- TruthLens AI - Supabase Database Schema Migration
-- ==============================================================================

-- 1. Create verification_records table
CREATE TABLE IF NOT EXISTS public.verification_records (
    id UUID PRIMARY KEY,
    original_input TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK (input_type IN ('TEXT', 'URL')),
    extracted_claim TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('SUPPORTED', 'MISLEADING', 'FALSE', 'UNVERIFIED')),
    explanation TEXT NOT NULL,
    confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence JSONB NOT NULL DEFAULT '{"supporting": [], "contradicting": []}'::jsonb,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create index for fast reverse-chronological history listing
CREATE INDEX IF NOT EXISTS idx_verification_records_created_at
    ON public.verification_records (created_at DESC);

-- 3. Create news_articles table (optional cache table for news feeds)
CREATE TABLE IF NOT EXISTS public.news_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source_name TEXT NOT NULL,
    article_url TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- 5. Policies allowing server-side service role full read/write access
CREATE POLICY "Allow service role full access on verification_records"
    ON public.verification_records
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access on news_articles"
    ON public.news_articles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
