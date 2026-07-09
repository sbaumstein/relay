# Relay — External Services

All third-party services used by this project.

## Supabase — Database & Auth
- **URL:** https://supabase.com
- **Account:** sambaumstein@gmail.com
- **What it does:** PostgreSQL database, user authentication, file storage (booking confirmation screenshots)
- **Dashboard:** https://supabase.com/dashboard/project/gdqzrxlhhuzbbjfheihf
- **Keys:** Project URL + anon key + service role key → stored in `.env.local` and Vercel env vars

## Vercel — Hosting & Deployment
- **URL:** https://vercel.com
- **Account:** sambaumstein@gmail.com
- **What it does:** Hosts the app, auto-deploys on every push to `main`
- **Keys:** None — connected via GitHub OAuth

## Resend — Email
- **URL:** https://resend.com
- **Account:** sambaumstein@gmail.com
- **What it does:** Sends transactional emails (listing posted, spot claimed, password reset via Supabase SMTP)
- **Keys:** `RESEND_API_KEY` → stored in `.env.local` and Vercel env vars
- **Note:** `onboarding@resend.dev` sender only delivers to verified Resend account email. Verify a domain to send to anyone.

## GitHub — Code Repository
- **URL:** https://github.com/sbaumstein/relay
- **Account:** sbaumstein
- **What it does:** Source control, issue tracking

## Stripe — Payments (not yet active)
- **URL:** https://stripe.com
- **Account:** not yet created
- **What it does:** Will handle escrow payments when activated
- **Keys:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` → placeholders in `.env.local`

## Linear — Project Management
- **URL:** https://linear.app
- **Account:** sambaumstein@gmail.com
- **What it does:** Issue tracking and task management
