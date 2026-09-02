-- Admin moderation: bans and manual credibility adjustment (issue #18)
-- Run this in the Supabase SQL editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text;

-- Manual nudge to a seller's computed star rating, -5..+5.
-- Applied on top of the rating derived from completion history.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credibility_boost integer NOT NULL DEFAULT 0;

-- Free-form admin notes about a user, visible only in the admin panel.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes text;
