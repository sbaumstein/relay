-- Either side can now raise a dispute, so record which one did.
-- Run this in the Supabase SQL editor.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS disputed_by text
  CHECK (disputed_by IN ('buyer', 'seller'));

-- Existing disputes were all filed by the buyer, since that was the only path.
UPDATE claims SET disputed_by = 'buyer'
WHERE status = 'disputed' AND disputed_by IS NULL;
