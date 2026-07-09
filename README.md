# Relay

A marketplace for transferring boutique fitness class spots. Sellers list classes they can't attend, buyers claim them — payment is held in escrow and released after the class.

## Getting Started

```bash
npm run dev
```

`npm run dev` automatically pings Supabase on startup to wake it if paused.

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

Supabase keys are in **Supabase Dashboard → Settings → API**.

### Google Maps API key (location autocomplete)
1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable **Places API** and **Maps JavaScript API**
3. Create an API key under **Credentials**
4. Restrict the key to your domain (optional but recommended)
5. Add it as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` and Vercel env vars

Without the key, the address field falls back to a plain text input so the app still works.

## Supabase Setup

### First time
1. Run `supabase-migrations.sql` in Supabase SQL Editor
2. Run Query 1 from `supabase-studios-migration.sql`, then Query 2 (they must be separate due to enum constraints)
3. Create a public Storage bucket named `confirmations`
4. Sign up at `/signup`, then seed mock data:

```bash
curl -X POST http://localhost:3000/api/seed
```

### If the app stops working (ENOTFOUND error)
Supabase pauses free-tier projects after ~1 week of inactivity.

**Fix:** Go to [supabase.com](https://supabase.com) → your project → click **Resume project**. Takes ~30 seconds. Then restart the dev server.

To avoid this on future restarts, `npm run dev` pings Supabase automatically and will warn you if it's unreachable.

### Reset seed data
```bash
curl -X DELETE http://localhost:3000/api/seed
curl -X POST http://localhost:3000/api/seed
```

## Deployment

Deployed on Vercel — pushes to `main` deploy automatically in ~60 seconds.

Add the three Supabase env vars in **Vercel → Project → Settings → Environment Variables**.

After deploying, add your Vercel URL to **Supabase → Authentication → URL Configuration → Allowed Redirect URLs**.
