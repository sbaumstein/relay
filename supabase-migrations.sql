-- ============================================================
-- Workout Exchange — Supabase SQL Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                       TEXT NOT NULL,
  full_name                   TEXT,
  avatar_url                  TEXT,
  stripe_account_id           TEXT UNIQUE,
  stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. ENUMS ────────────────────────────────────────────────
CREATE TYPE class_type AS ENUM (
  'yoga', 'pilates', 'spinning', 'barre', 'hiit',
  'boxing', 'strength', 'dance', 'meditation', 'other'
);

CREATE TYPE listing_status AS ENUM (
  'available', 'claimed', 'expired', 'cancelled'
);

CREATE TYPE claim_status AS ENUM (
  'pending_payment', 'completed', 'failed', 'refunded'
);

-- ── 3. LISTINGS ─────────────────────────────────────────────
CREATE TABLE public.listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  studio_name      TEXT NOT NULL,
  class_name       TEXT NOT NULL,
  instructor_name  TEXT,
  class_type       class_type NOT NULL,
  description      TEXT,
  class_date       DATE NOT NULL,
  class_time       TIME NOT NULL,
  class_datetime   TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  address          TEXT NOT NULL,
  neighborhood     TEXT,
  price_cents      INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  is_free          BOOLEAN GENERATED ALWAYS AS (price_cents = 0) STORED,
  status           listing_status NOT NULL DEFAULT 'available',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_class_datetime ON public.listings(class_datetime);
CREATE INDEX idx_listings_class_type ON public.listings(class_type);
CREATE INDEX idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX idx_listings_is_free ON public.listings(is_free);
CREATE INDEX idx_listings_neighborhood ON public.listings(neighborhood);
CREATE INDEX idx_listings_browse ON public.listings(status, class_datetime, class_type);

-- ── 4. CLAIMS ───────────────────────────────────────────────
CREATE TABLE public.claims (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  claimer_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_cents              INT NOT NULL DEFAULT 0,
  platform_fee_cents        INT NOT NULL DEFAULT 0,
  seller_payout_cents       INT NOT NULL DEFAULT 0,
  stripe_payment_intent_id  TEXT UNIQUE,
  stripe_transfer_id        TEXT,
  stripe_charge_id          TEXT,
  status                    claim_status NOT NULL DEFAULT 'pending_payment',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one completed claim per listing
CREATE UNIQUE INDEX idx_one_completed_claim_per_listing
  ON public.claims(listing_id)
  WHERE status = 'completed';

CREATE INDEX idx_claims_claimer_id ON public.claims(claimer_id);
CREATE INDEX idx_claims_seller_id ON public.claims(seller_id);
CREATE INDEX idx_claims_listing_id ON public.claims(listing_id);
CREATE INDEX idx_claims_stripe_payment_intent ON public.claims(stripe_payment_intent_id);

-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_public_read"
  ON public.listings FOR SELECT USING (true);

CREATE POLICY "listings_authenticated_insert"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listings_seller_update"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listings_seller_delete"
  ON public.listings FOR DELETE TO authenticated
  USING (auth.uid() = seller_id AND status = 'available');

-- claims
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims_claimer_read"
  ON public.claims FOR SELECT TO authenticated
  USING (auth.uid() = claimer_id);

CREATE POLICY "claims_seller_read"
  ON public.claims FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "claims_authenticated_insert"
  ON public.claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = claimer_id);

-- ── 6. SCHEDULED EXPIRY (via pg_cron) ──────────────────────
-- Enable pg_cron in Supabase Dashboard > Database > Extensions first
-- Then uncomment and run:

-- SELECT cron.schedule(
--   'expire-past-listings',
--   '0 * * * *',
--   $$
--     UPDATE public.listings
--     SET status = 'expired', updated_at = NOW()
--     WHERE status = 'available'
--       AND class_datetime < NOW();
--   $$
-- );
