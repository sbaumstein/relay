import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
let url = process.env.NEXT_PUBLIC_SUPABASE_URL

try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, val] = line.split('=')
    if (key?.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
      url = val?.trim()
      break
    }
  }
} catch {}

if (!url) {
  console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL not set, skipping wake-up ping')
  process.exit(0)
}

const healthUrl = `${url}/rest/v1/`
process.stdout.write('🔌 Waking Supabase... ')

try {
  const res = await fetch(healthUrl, { signal: AbortSignal.timeout(15000) })
  if (res.ok || res.status === 401) {
    console.log('✅ Connected')
  } else {
    console.log(`⚠️  Unexpected status ${res.status} — project may be paused`)
  }
} catch (e) {
  console.log(`❌ Could not reach Supabase (${e.message})`)
  console.log('   → Visit https://supabase.com and resume your project if it is paused')
}
