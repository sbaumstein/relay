import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'


const DEMO_USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const DEMO_EMAIL = 'demo@workoutexchange.dev'

const listings = [
  {
    studio_name: 'SoulCycle',
    class_name: 'Power Ride 45',
    instructor_name: 'Megan T.',
    class_type: 'spinning',
    skill_level: 'intermediate',
    description: 'High-energy ride with a killer playlist. Clips required.',
    class_date: '2026-06-28',
    class_time: '07:00',
    class_datetime: '2026-06-28T07:00:00-04:00',
    duration_minutes: 45,
    address: '609 Greenwich St, New York, NY 10014',
    neighborhood: 'West Village',
    price_cents: 3400,
  },
  {
    studio_name: "Barry's",
    class_name: 'Full Body Burnout',
    instructor_name: 'Chris L.',
    class_type: 'hiit',
    skill_level: 'advanced',
    description: 'Half treadmill, half floor. Bring a towel — you will need it.',
    class_date: '2026-06-28',
    class_time: '09:30',
    class_datetime: '2026-06-28T09:30:00-04:00',
    duration_minutes: 50,
    address: '275 7th Ave, New York, NY 10001',
    neighborhood: 'Chelsea',
    price_cents: 3800,
  },
  {
    studio_name: 'Y7 Studio',
    class_name: 'Hip-Hop Yoga Flow',
    instructor_name: 'Jade R.',
    class_type: 'yoga',
    skill_level: 'all_levels',
    description: 'Vinyasa flow set to hip-hop. No experience needed.',
    class_date: '2026-06-28',
    class_time: '12:00',
    class_datetime: '2026-06-28T12:00:00-04:00',
    duration_minutes: 60,
    address: '168 W 23rd St, New York, NY 10011',
    neighborhood: 'Chelsea',
    price_cents: 3200,
  },
  {
    studio_name: 'Rumble Boxing',
    class_name: 'Group Rumble',
    instructor_name: 'Dre M.',
    class_type: 'boxing',
    skill_level: 'beginner',
    description: 'Intro to boxing. Gloves provided.',
    class_date: '2026-06-29',
    class_time: '08:00',
    class_datetime: '2026-06-29T08:00:00-04:00',
    duration_minutes: 45,
    address: '215 Park Ave S, New York, NY 10003',
    neighborhood: 'Flatiron',
    price_cents: 3600,
  },
  {
    studio_name: 'Pure Barre',
    class_name: 'Pure Barre Classic',
    instructor_name: 'Lisa K.',
    class_type: 'barre',
    skill_level: 'beginner',
    description: 'Low-impact, high-intensity. Grip socks required.',
    class_date: '2026-06-29',
    class_time: '10:00',
    class_datetime: '2026-06-29T10:00:00-04:00',
    duration_minutes: 55,
    address: '435 E 75th St, New York, NY 10021',
    neighborhood: 'Upper East Side',
    price_cents: 2800,
  },
  {
    studio_name: 'Equinox',
    class_name: 'Precision Running',
    instructor_name: 'Tom V.',
    class_type: 'hiit',
    skill_level: 'intermediate',
    description: 'Treadmill-based interval training with metrics coaching.',
    class_date: '2026-06-29',
    class_time: '18:30',
    class_datetime: '2026-06-29T18:30:00-04:00',
    duration_minutes: 45,
    address: '2465 Broadway, New York, NY 10025',
    neighborhood: 'Upper West Side',
    price_cents: 4000,
  },
  {
    studio_name: 'MNDFL',
    class_name: 'Evening Meditation',
    instructor_name: 'Sara O.',
    class_type: 'meditation',
    skill_level: 'all_levels',
    description: 'Guided seated meditation. Cushions and blankets provided.',
    class_date: '2026-06-30',
    class_time: '19:00',
    class_datetime: '2026-06-30T19:00:00-04:00',
    duration_minutes: 30,
    address: '401 Lafayette St, New York, NY 10003',
    neighborhood: 'East Village',
    price_cents: 0,
  },
  {
    studio_name: 'Peloton Studios NY',
    class_name: 'Cycling with Cody',
    instructor_name: 'Cody R.',
    class_type: 'spinning',
    skill_level: 'all_levels',
    description: 'Live studio ride. Shoes provided at the studio.',
    class_date: '2026-06-30',
    class_time: '11:00',
    class_datetime: '2026-06-30T11:00:00-04:00',
    duration_minutes: 45,
    address: '125 W 25th St, New York, NY 10001',
    neighborhood: 'Chelsea',
    price_cents: 2400,
  },
  {
    studio_name: 'Modelfit',
    class_name: 'Sculpt & Tone',
    instructor_name: 'Anna B.',
    class_type: 'strength',
    skill_level: 'intermediate',
    description: 'Light weights and resistance bands for a full-body burn.',
    class_date: '2026-07-01',
    class_time: '08:30',
    class_datetime: '2026-07-01T08:30:00-04:00',
    duration_minutes: 50,
    address: '150 E 52nd St, New York, NY 10022',
    neighborhood: 'Midtown',
    price_cents: 4200,
  },
  {
    studio_name: '305 Fitness',
    class_name: 'Dance Cardio Party',
    instructor_name: 'DJ Nia',
    class_type: 'dance',
    skill_level: 'beginner',
    description: 'No experience needed — just move! DJ live every class.',
    class_date: '2026-07-01',
    class_time: '14:00',
    class_datetime: '2026-07-01T14:00:00-04:00',
    duration_minutes: 55,
    address: '260 W 36th St, New York, NY 10018',
    neighborhood: 'Midtown',
    price_cents: 2500,
  },
  {
    studio_name: 'CorePower Yoga',
    class_name: 'Yoga Sculpt',
    instructor_name: 'Priya N.',
    class_type: 'yoga',
    skill_level: 'intermediate',
    description: 'Yoga meets strength training with weights in a heated room.',
    class_date: '2026-07-02',
    class_time: '09:00',
    class_datetime: '2026-07-02T09:00:00-04:00',
    duration_minutes: 60,
    address: '54 W 22nd St, New York, NY 10010',
    neighborhood: 'Flatiron',
    price_cents: 3000,
  },
  {
    studio_name: 'KO Boxing & Fitness',
    class_name: 'Advanced Sparring Prep',
    instructor_name: 'Marco D.',
    class_type: 'boxing',
    skill_level: 'advanced',
    description: 'Pad work and technique drills. Must have prior boxing experience.',
    class_date: '2026-07-02',
    class_time: '07:00',
    class_datetime: '2026-07-02T07:00:00-04:00',
    duration_minutes: 60,
    address: '37 W 26th St, New York, NY 10010',
    neighborhood: 'Flatiron',
    price_cents: 2000,
  },
  {
    studio_name: 'The Pilates Class',
    class_name: 'Mat Pilates Fundamentals',
    instructor_name: 'Emma J.',
    class_type: 'pilates',
    skill_level: 'beginner',
    description: 'Perfect intro to classical Pilates mat work.',
    class_date: '2026-07-03',
    class_time: '10:30',
    class_datetime: '2026-07-03T10:30:00-04:00',
    duration_minutes: 50,
    address: '16 E 17th St, New York, NY 10003',
    neighborhood: 'Flatiron',
    price_cents: 3500,
  },
  {
    studio_name: 'Overthrow Boxing',
    class_name: 'Boxing Bootcamp',
    instructor_name: 'Ray T.',
    class_type: 'boxing',
    skill_level: 'intermediate',
    description: 'Bag work + bodyweight circuits. Wraps and gloves included.',
    class_date: '2026-07-03',
    class_time: '17:00',
    class_datetime: '2026-07-03T17:00:00-04:00',
    duration_minutes: 60,
    address: '9 E 2nd St, New York, NY 10003',
    neighborhood: 'East Village',
    price_cents: 3300,
  },
  {
    studio_name: 'Neighborhood Barre',
    class_name: 'Free Community Barre',
    instructor_name: 'Kelly M.',
    class_type: 'barre',
    skill_level: 'all_levels',
    description: 'Complimentary community class. All welcome.',
    class_date: '2026-07-04',
    class_time: '08:00',
    class_datetime: '2026-07-04T08:00:00-04:00',
    duration_minutes: 45,
    address: '178 N 9th St, Brooklyn, NY 11211',
    neighborhood: 'Williamsburg',
    price_cents: 0,
  },
]

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  const supabase = await createServiceClient()

  // Use the first real auth user so FK constraint on profiles is satisfied
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1 })
  if (usersError || !users?.users?.length) {
    return NextResponse.json(
      { error: 'No users found. Sign up for an account first, then re-run the seed.' },
      { status: 400 }
    )
  }

  const seedUserId = users.users[0].id
  const seedEmail = users.users[0].email ?? DEMO_EMAIL

  // Ensure profile row exists
  await supabase
    .from('profiles')
    .upsert({ id: seedUserId, email: seedEmail, full_name: 'Demo User' })

  const rows = listings.map((l) => ({ ...l, seller_id: seedUserId, status: 'available' }))

  const { error } = await supabase.from('listings').insert(rows)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ seeded: rows.length })
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  const supabase = await createServiceClient()
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 })
  const seedUserId = users?.users?.[0]?.id
  if (!seedUserId) return NextResponse.json({ error: 'No users found' }, { status: 400 })

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('seller_id', seedUserId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cleared: true })
}
