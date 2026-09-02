-- Dispute evidence + seller response window
-- Run this in the Supabase SQL editor.

-- New claim statuses used by the full status machine.
-- Without these the app writes fail silently and disputes never leave the queue.
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'claimed';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'dispute_won';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'dispute_lost';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'needs_review';

-- Post-class check-in. These were referenced by the app but never created,
-- so the check-in write failed silently and the prompt kept reappearing.
ALTER TABLE claims ADD COLUMN IF NOT EXISTS checkin_response boolean;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS checkin_responded_at timestamptz;

-- Buyer-side evidence attached when filing
ALTER TABLE claims ADD COLUMN IF NOT EXISTS dispute_notes text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS dispute_evidence_urls text[] DEFAULT '{}';

-- Seller-side rebuttal, due within 24h of the dispute being filed
ALTER TABLE claims ADD COLUMN IF NOT EXISTS seller_response text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS seller_response_urls text[] DEFAULT '{}';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS seller_response_deadline timestamptz;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS seller_responded_at timestamptz;

-- claims had SELECT and INSERT policies but NO UPDATE policy, so every write from
-- a non-service-role connection was silently filtered to zero rows by RLS with no
-- error raised. This is why check-in, confirm and dispute appeared to succeed and
-- then reverted on refresh. The API routes validate the allowed status transitions;
-- these policies only decide which rows a user may touch at all.
DROP POLICY IF EXISTS "claims_claimer_update" ON public.claims;
CREATE POLICY "claims_claimer_update"
  ON public.claims FOR UPDATE TO authenticated
  USING (auth.uid() = claimer_id)
  WITH CHECK (auth.uid() = claimer_id);

DROP POLICY IF EXISTS "claims_seller_update" ON public.claims;
CREATE POLICY "claims_seller_update"
  ON public.claims FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Buyers must be able to flip a listing to 'claimed' when they claim it; the
-- existing listings_seller_update policy only covers the seller.
DROP POLICY IF EXISTS "listings_claimer_update" ON public.listings;
CREATE POLICY "listings_claimer_update"
  ON public.listings FOR UPDATE TO authenticated
  USING (status = 'available')
  WITH CHECK (status IN ('claimed', 'available'));

-- Sellers need to be able to read claims filed against them (for the response UI)
DROP POLICY IF EXISTS "Sellers can view their claims" ON claims;
CREATE POLICY "Sellers can view their claims" ON claims
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());
