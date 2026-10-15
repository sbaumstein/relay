-- ============================================================
-- Workout Exchange — In-app messaging (buyer <-> seller)
-- Run this in your Supabase SQL Editor.
-- ============================================================
--
-- A claims row already pairs exactly one buyer (claimer_id) with one seller
-- (seller_id). That pair IS the thread, so messages hang off claim_id and there
-- is no conversations/participants table and no free-form DM: you can only talk
-- to a counterparty you have a real claim with.

-- ── 1. MESSAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  -- profiles.id is itself auth.users(id), so this is the sending auth user.
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set once by the recipient when the thread is opened. Null = unread.
  read_at     TIMESTAMPTZ
);

-- Thread reads are always "this claim, oldest first", and the unread badge
-- counts rows per claim, so this is the only index the feature needs.
CREATE INDEX IF NOT EXISTS idx_messages_claim_created
  ON public.messages(claim_id, created_at);

-- ── 2. ROW LEVEL SECURITY ───────────────────────────────────
-- These policies are the only thing standing between two strangers' private
-- conversation and the rest of the internet, so they are written to be checked
-- line by line. The API routes also validate membership; this is the backstop.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Shared membership predicate: auth.uid() is one of the two parties on the
-- claim this message belongs to. SECURITY DEFINER so the check does not itself
-- depend on the caller's RLS view of claims (claims has split per-side SELECT
-- policies; a definer function keeps this predicate from drifting with them).
CREATE OR REPLACE FUNCTION public.is_claim_party(p_claim_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.id = p_claim_id
      AND (c.claimer_id = p_user_id OR c.seller_id = p_user_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.is_claim_party(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_claim_party(UUID, UUID) TO authenticated;

-- SELECT: only the two parties on the claim can read the thread.
DROP POLICY IF EXISTS "messages_party_read" ON public.messages;
CREATE POLICY "messages_party_read"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_claim_party(claim_id, auth.uid()));

-- INSERT: must be a party to the claim AND must send as yourself — a member
-- must not be able to forge a message attributed to the other party.
-- read_at is forced null so a sender can't pre-mark their own message read.
DROP POLICY IF EXISTS "messages_party_insert" ON public.messages;
CREATE POLICY "messages_party_insert"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_claim_party(claim_id, auth.uid())
    AND read_at IS NULL
  );

-- UPDATE: marking a message read, by the RECIPIENT only.
--   USING      — row must be on your claim and NOT sent by you.
--   WITH CHECK — the same after the write, so the row can't be moved to
--                another claim or re-attributed to someone else.
-- RLS cannot by itself limit WHICH columns change, so the column-level grant
-- below is what actually confines this to read_at. Supabase grants table-wide
-- UPDATE to authenticated by default, so that grant must be revoked first.
DROP POLICY IF EXISTS "messages_recipient_mark_read" ON public.messages;
CREATE POLICY "messages_recipient_mark_read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND public.is_claim_party(claim_id, auth.uid())
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND public.is_claim_party(claim_id, auth.uid())
  );

REVOKE UPDATE ON public.messages FROM authenticated, anon;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

-- Belt and braces: even with only read_at writable, don't let an already-read
-- message be flipped back to unread or have its timestamp rewritten.
CREATE OR REPLACE FUNCTION public.messages_guard_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_id   IS DISTINCT FROM OLD.claim_id
  OR NEW.sender_id  IS DISTINCT FROM OLD.sender_id
  OR NEW.body       IS DISTINCT FROM OLD.body
  OR NEW.created_at IS DISTINCT FROM OLD.created_at
  OR NEW.id         IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'messages: only read_at may be updated';
  END IF;

  -- read_at is write-once.
  IF OLD.read_at IS NOT NULL THEN
    NEW.read_at := OLD.read_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_guard_update ON public.messages;
CREATE TRIGGER messages_guard_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_guard_update();

-- No DELETE policy: messages are an audit trail for disputes, so neither party
-- can remove one. (The service role bypasses RLS if admin cleanup is ever
-- needed, and rows cascade away with the claim.)
