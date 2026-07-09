-- ============================================================
-- Step 1: Add skill_level to listings
-- Run this first if you haven't already
-- ============================================================

CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');

ALTER TABLE public.listings
  ADD COLUMN skill_level skill_level NOT NULL DEFAULT 'all_levels';

-- ============================================================
-- Step 2: Seed fake listings
-- Replace the seller_id UUIDs below with a real user ID from
-- your auth.users table (Dashboard > Authentication > Users)
-- ============================================================

DO $$
DECLARE
  fake_seller UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

-- Make sure a profile exists for the fake seller
INSERT INTO public.profiles (id, email, full_name)
VALUES (fake_seller, 'demo@workoutexchange.com', 'Demo User')
ON CONFLICT (id) DO NOTHING;

-- Also insert into auth.users so FK constraint is satisfied
-- (Skip this if you're using a real user's UUID)
INSERT INTO auth.users (id, email)
VALUES (fake_seller, 'demo@workoutexchange.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.listings
  (seller_id, studio_name, class_name, instructor_name, class_type, skill_level,
   description, class_date, class_time, class_datetime, duration_minutes,
   address, neighborhood, price_cents, status)
VALUES
  (fake_seller, 'SoulCycle', 'Power Ride 45', 'Megan T.', 'spinning', 'intermediate',
   'High-energy ride with a killer playlist. Clips required.',
   '2026-06-25', '07:00', '2026-06-25T07:00:00-04:00', 45,
   '609 Greenwich St, New York, NY 10014', 'West Village', 3400, 'available'),

  (fake_seller, 'Barry''s', 'Full Body Burnout', 'Chris L.', 'hiit', 'advanced',
   'Half treadmill, half floor. Bring a towel — you will need it.',
   '2026-06-25', '09:30', '2026-06-25T09:30:00-04:00', 50,
   '275 7th Ave, New York, NY 10001', 'Chelsea', 3800, 'available'),

  (fake_seller, 'Y7 Studio', 'Hip-Hop Yoga Flow', 'Jade R.', 'yoga', 'all_levels',
   'Vinyasa flow set to hip-hop. No experience needed.',
   '2026-06-25', '12:00', '2026-06-25T12:00:00-04:00', 60,
   '168 W 23rd St, New York, NY 10011', 'Chelsea', 3200, 'available'),

  (fake_seller, 'Rumble Boxing', 'Group Rumble', 'Dre M.', 'boxing', 'beginner',
   'Intro to boxing. Gloves provided.',
   '2026-06-26', '08:00', '2026-06-26T08:00:00-04:00', 45,
   '215 Park Ave S, New York, NY 10003', 'Flatiron', 3600, 'available'),

  (fake_seller, 'Pure Barre', 'Pure Barre Classic', 'Lisa K.', 'barre', 'beginner',
   'Low-impact, high-intensity. Grip socks required.',
   '2026-06-26', '10:00', '2026-06-26T10:00:00-04:00', 55,
   '435 E 75th St, New York, NY 10021', 'Upper East Side', 2800, 'available'),

  (fake_seller, 'Equinox', 'Precision Running', 'Tom V.', 'hiit', 'intermediate',
   'Treadmill-based interval training with metrics coaching.',
   '2026-06-26', '18:30', '2026-06-26T18:30:00-04:00', 45,
   '2465 Broadway, New York, NY 10025', 'Upper West Side', 4000, 'available'),

  (fake_seller, 'MNDFL', 'Evening Meditation', 'Sara O.', 'meditation', 'all_levels',
   'Guided seated meditation. Cushions and blankets provided.',
   '2026-06-27', '19:00', '2026-06-27T19:00:00-04:00', 30,
   '401 Lafayette St, New York, NY 10003', 'East Village', 0, 'available'),

  (fake_seller, 'Peloton Studios NY', 'Cycling with Cody', 'Cody R.', 'spinning', 'all_levels',
   'Live studio ride. Shoes provided at the studio.',
   '2026-06-27', '11:00', '2026-06-27T11:00:00-04:00', 45,
   '125 W 25th St, New York, NY 10001', 'Chelsea', 2400, 'available'),

  (fake_seller, 'Modelfit', 'Sculpt & Tone', 'Anna B.', 'strength', 'intermediate',
   'Light weights and resistance bands for a full-body burn.',
   '2026-06-28', '08:30', '2026-06-28T08:30:00-04:00', 50,
   '150 E 52nd St, New York, NY 10022', 'Midtown', 4200, 'available'),

  (fake_seller, '305 Fitness', 'Dance Cardio Party', 'DJ Nia', 'dance', 'beginner',
   'No experience needed — just move! DJ live every class.',
   '2026-06-28', '14:00', '2026-06-28T14:00:00-04:00', 55,
   '260 W 36th St, New York, NY 10018', 'Midtown', 2500, 'available'),

  (fake_seller, 'CorePower Yoga', 'Yoga Sculpt', 'Priya N.', 'yoga', 'intermediate',
   'Yoga meets strength training with weights in a heated room.',
   '2026-06-29', '09:00', '2026-06-29T09:00:00-04:00', 60,
   '54 W 22nd St, New York, NY 10010', 'Flatiron', 3000, 'available'),

  (fake_seller, 'KO Boxing & Fitness', 'Advanced Sparring Prep', 'Marco D.', 'boxing', 'advanced',
   'Pad work and technique drills. Must have prior boxing experience.',
   '2026-06-29', '07:00', '2026-06-29T07:00:00-04:00', 60,
   '37 W 26th St, New York, NY 10010', 'Flatiron', 2000, 'available'),

  (fake_seller, 'The Pilates Class', 'Mat Pilates Fundamentals', 'Emma J.', 'pilates', 'beginner',
   'Perfect intro to classical Pilates mat work.',
   '2026-06-30', '10:30', '2026-06-30T10:30:00-04:00', 50,
   '16 E 17th St, New York, NY 10003', 'Flatiron', 3500, 'available'),

  (fake_seller, 'Overthrow Boxing', 'Boxing Bootcamp', 'Ray T.', 'boxing', 'intermediate',
   'Bag work + bodyweight circuits. Wraps and gloves included.',
   '2026-06-30', '17:00', '2026-06-30T17:00:00-04:00', 60,
   '9 E 2nd St, New York, NY 10003', 'East Village', 3300, 'available'),

  (fake_seller, 'Neighborhood Barre', 'Free Community Barre', 'Kelly M.', 'barre', 'all_levels',
   'Complimentary community class every Monday.',
   '2026-06-30', '08:00', '2026-06-30T08:00:00-04:00', 45,
   '178 N 9th St, Brooklyn, NY 11211', 'Williamsburg', 0, 'available');

END $$;
