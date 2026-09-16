-- Real studio pricing and cancellation windows (issue #25)
-- Run this in the Supabase SQL editor.

-- Typical drop-in price range, shown as guidance when pricing a listing.
ALTER TABLE studios ADD COLUMN IF NOT EXISTS price_min_cents integer;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS price_max_cents integer;

-- How long before class the studio stops allowing a free cancellation.
-- Null where the cutoff isn't a fixed number of hours (e.g. "5PM the day before").
ALTER TABLE studios ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours integer;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS cancellation_cutoff_label text;

-- What the studio actually charges when you miss that window.
ALTER TABLE studios ADD COLUMN IF NOT EXISTS cancellation_notes text;

-- Needed for the upsert below.
CREATE UNIQUE INDEX IF NOT EXISTS studios_name_key ON studios (name);

INSERT INTO studios (
  name, cancellation_policy, cancellation_fee_cents, payment_type,
  price_min_cents, price_max_cents,
  cancellation_cutoff_hours, cancellation_cutoff_label, cancellation_notes
) VALUES
  ('SoulCycle', 'full_class', NULL, 'prepaid',
   3500, 4000, NULL, '5PM the day before',
   'Cancel after 5PM the day before and the class is charged or the credit is lost.'),

  ('Barry''s', 'full_class', NULL, 'prepaid',
   4000, 4300, 12, '12 hours before',
   'Cancel inside 12 hours and the class is forfeited from your package. Very late cancellations may add a location-specific fee.'),

  ('SLT', 'full_class', NULL, 'prepaid',
   3800, 4400, 12, '12 hours before',
   'Cancel inside 12 hours and the class is forfeited, or $30 on Unlimited. No-show is $15 standard, $45 on Unlimited.'),

  ('solidcore', 'full_class', NULL, 'prepaid',
   3000, 4000, 10, '10 hours before',
   'Cancel inside 10 hours and the class is forfeited, or $35 on Unlimited.'),

  ('CorePower Yoga', 'fixed_fee', 1500, 'prepaid',
   3500, 4000, 2, '2 hours before',
   '$15 fee for a late cancellation or a no-show.'),

  ('Orangetheory', 'full_class', NULL, 'prepaid',
   3000, 3500, 8, '8 hours before',
   'Cancel inside 8 hours and late fees apply, depending on the studio and your membership.')

ON CONFLICT (name) DO UPDATE SET
  cancellation_policy       = EXCLUDED.cancellation_policy,
  cancellation_fee_cents    = EXCLUDED.cancellation_fee_cents,
  payment_type              = EXCLUDED.payment_type,
  price_min_cents           = EXCLUDED.price_min_cents,
  price_max_cents           = EXCLUDED.price_max_cents,
  cancellation_cutoff_hours = EXCLUDED.cancellation_cutoff_hours,
  cancellation_cutoff_label = EXCLUDED.cancellation_cutoff_label,
  cancellation_notes        = EXCLUDED.cancellation_notes,
  is_active                 = true;
