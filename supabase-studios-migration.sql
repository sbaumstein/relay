-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. STUDIOS ───────────────────────────────────────────────
CREATE TYPE cancellation_policy AS ENUM ('fixed_fee', 'full_class');
CREATE TYPE payment_type AS ENUM ('prepaid', 'pay_in_person');

CREATE TABLE public.studios (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  cancellation_policy     cancellation_policy NOT NULL,
  cancellation_fee_cents  INT,  -- only set when policy = 'fixed_fee'
  payment_type            payment_type NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studios_public_read" ON public.studios FOR SELECT USING (true);

-- ── 2. SEED STUDIOS ──────────────────────────────────────────
INSERT INTO public.studios (name, cancellation_policy, cancellation_fee_cents, payment_type) VALUES
  ('SoulCycle',          'fixed_fee',  2000, 'prepaid'),
  ('Barry''s',           'fixed_fee',  2000, 'prepaid'),
  ('Equinox',            'fixed_fee',  2000, 'prepaid'),
  ('Pure Barre',         'fixed_fee',  1500, 'prepaid'),
  ('Rumble Boxing',      'fixed_fee',  2000, 'prepaid'),
  ('CorePower Yoga',     'fixed_fee',  1500, 'prepaid'),
  ('305 Fitness',        'fixed_fee',  1500, 'prepaid'),
  ('Modelfit',           'fixed_fee',  2500, 'prepaid'),
  ('The Pilates Class',  'fixed_fee',  2000, 'prepaid'),
  ('Overthrow Boxing',   'fixed_fee',  1500, 'prepaid'),
  ('Y7 Studio',          'full_class', NULL, 'prepaid'),
  ('MNDFL',              'full_class', NULL, 'prepaid'),
  ('Peloton Studios NY', 'full_class', NULL, 'prepaid'),
  ('ClassPass',          'full_class', NULL, 'prepaid'),
  ('Neighborhood Barre', 'fixed_fee',  1000, 'pay_in_person');

-- ── 3. UPDATE LISTINGS ───────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN studio_id UUID REFERENCES public.studios(id),
  ADD COLUMN confirmation_screenshot_url TEXT;

-- ── 4. UPDATE CLAIMS ─────────────────────────────────────────
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'auto_released';

ALTER TABLE public.claims
  ADD COLUMN expires_at         TIMESTAMPTZ,
  ADD COLUMN disputed_at        TIMESTAMPTZ,
  ADD COLUMN dispute_reason     TEXT,
  ADD COLUMN cancellation_fee_cents INT NOT NULL DEFAULT 0;

-- ── 5. REPUTATION VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW public.user_reputation AS
SELECT
  p.id,
  p.full_name,
  p.email,
  COALESCE(SUM(CASE WHEN c.seller_id  = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) AS seller_completions,
  COALESCE(SUM(CASE WHEN c.claimer_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) AS buyer_completions,
  COALESCE(SUM(CASE WHEN c.claimer_id = p.id AND c.status = 'disputed'                    THEN 1 ELSE 0 END), 0) AS disputes_filed,
  CASE
    WHEN COALESCE(SUM(CASE WHEN c.seller_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 25 THEN 'elite'
    WHEN COALESCE(SUM(CASE WHEN c.seller_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 10 THEN 'verified'
    WHEN COALESCE(SUM(CASE WHEN c.seller_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 3  THEN 'trusted'
    ELSE 'new'
  END AS seller_level,
  CASE
    WHEN COALESCE(SUM(CASE WHEN c.claimer_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 25 THEN 'elite'
    WHEN COALESCE(SUM(CASE WHEN c.claimer_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 10 THEN 'verified'
    WHEN COALESCE(SUM(CASE WHEN c.claimer_id = p.id AND c.status IN ('completed','auto_released') THEN 1 ELSE 0 END), 0) >= 3  THEN 'trusted'
    ELSE 'new'
  END AS buyer_level
FROM public.profiles p
LEFT JOIN public.claims c ON c.seller_id = p.id OR c.claimer_id = p.id
GROUP BY p.id, p.full_name, p.email;

-- ── 6. AUTO-RELEASE CRON (enable pg_cron extension first) ────
-- Dashboard > Database > Extensions > enable pg_cron, then run:
-- SELECT cron.schedule(
--   'auto-release-escrow',
--   '0 * * * *',
--   $$
--     UPDATE public.claims
--     SET status = 'auto_released', updated_at = NOW()
--     WHERE status = 'pending_confirmation'
--       AND expires_at < NOW();
--   $$
-- );

-- ── 7. SUPABASE STORAGE BUCKET ───────────────────────────────
-- Dashboard > Storage > New bucket > name: "confirmations" > Public: true
