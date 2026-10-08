-- Skill level is gone from the app. The column is left in place so existing
-- rows are untouched; run this only once you're sure you don't want it back.
-- Run in the Supabase SQL editor.

ALTER TABLE listings ALTER COLUMN skill_level DROP NOT NULL;

-- Optional, irreversible — drops the stored values too:
-- ALTER TABLE listings DROP COLUMN skill_level;
