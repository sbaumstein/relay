-- Studio logos for the browse cards.
-- Until a logo_url is set, the card falls back to a wordmark of the studio
-- name, so this can be filled in gradually.
-- Run in the Supabase SQL editor.

ALTER TABLE studios ADD COLUMN IF NOT EXISTS logo_url text;

-- Example once you have assets hosted:
-- UPDATE studios SET logo_url = 'https://…/soulcycle.svg' WHERE name = 'SoulCycle';
