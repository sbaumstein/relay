-- ============================================================
-- Workout Exchange — Reporting a conversation
-- Run this in your Supabase SQL Editor. Safe to re-run.
-- ============================================================
--
-- Messaging is scoped to claims (see supabase-messages-migration.sql): a claim
-- pairs exactly one buyer with one seller, so the claim IS the thread. A report
-- therefore points at a claim_id, not at an individual message — what gets
-- escalated is a conversation, and the admin reads the whole thread when
-- adjudicating.
--
-- Reports are never deleted or edited by the reporter: they are an abuse audit
-- trail. Only the service role (admin panel) moves a report's status.

-- ── 0. DEPENDENCY ───────────────────────────────────────────
-- Shared membership predicate, identical to the one in the messages migration.
-- Re-declared with CREATE OR REPLACE so this file can be pasted on its own and
-- the RLS policies below never silently fall back to a missing function.
-- SECURITY DEFINER so the check does not depend on the caller's RLS view of
-- claims (claims has split per-side SELECT policies).
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

-- ── 1. MESSAGE REPORTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The thread being reported.
  claim_id     UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  -- profiles.id is itself auth.users(id), so this is the reporting auth user.
  reporter_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Optional: reporting with no explanation at all is still better than
  -- having nowhere to go, so this is deliberately nullable.
  reason       TEXT CHECK (reason IS NULL OR length(btrim(reason)) > 0),
  -- Admin workflow state. Kept as a CHECKed text column rather than an enum so
  -- adding a state later does not need ALTER TYPE in a transaction.
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set when an admin moves the report out of 'open'.
  handled_at   TIMESTAMPTZ,
  handled_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- One person reporting the same thread twice adds nothing; the admin queue
-- should show one row per (reporter, thread) and keep the first reason.
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reports_reporter_claim
  ON public.message_reports(reporter_id, claim_id);

-- The admin panel reads "open reports, oldest first".
CREATE INDEX IF NOT EXISTS idx_message_reports_status_created
  ON public.message_reports(status, created_at);

-- ── 2. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: you may only report as yourself, only a thread you are actually a
-- party to, and only in the 'open' state — a reporter must not be able to file
-- a report pre-marked as resolved, nor to backfill handled_at/handled_by.
DROP POLICY IF EXISTS "message_reports_party_insert" ON public.message_reports;
CREATE POLICY "message_reports_party_insert"
  ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND public.is_claim_party(claim_id, auth.uid())
    AND status = 'open'
    AND handled_at IS NULL
    AND handled_by IS NULL
  );

-- SELECT: you can see the reports you filed, and nothing else. In particular a
-- user must not be able to see that the OTHER party reported them.
DROP POLICY IF EXISTS "message_reports_own_read" ON public.message_reports;
CREATE POLICY "message_reports_own_read"
  ON public.message_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- No UPDATE or DELETE policy for authenticated: with RLS enabled and no policy
-- for a verb, that verb matches zero rows. Supabase also grants table-wide
-- UPDATE/DELETE to authenticated by default, so revoke those too — belt and
-- braces, so that adding a permissive policy later is a deliberate act.
REVOKE UPDATE, DELETE ON public.message_reports FROM authenticated, anon;

-- Admins read everything and change status via the SERVICE ROLE, which bypasses
-- RLS entirely (see lib/admin/auth.ts + createServiceClient()). There is
-- intentionally no "admin" predicate in SQL: admin identity lives in the app,
-- and no policy here should ever expose another user's report to a session key.
