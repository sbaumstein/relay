-- Optional last-minute price drop.
-- Run this in the Supabase SQL editor.

-- When set, the listing sells for this amount once the class is within
-- DISCOUNT_WINDOW_HOURS of starting. Null means no automatic drop.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS discount_price_cents integer;
