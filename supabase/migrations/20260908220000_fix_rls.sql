-- Fix RLS Policies

-- 1. Reservations
DROP POLICY IF EXISTS "Service role can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Service role can update reservations" ON reservations;
-- Service role bypasses RLS anyway.

-- 2. Ensure anonymous users cannot read subscribers
-- The existing policy is: CREATE POLICY "Admin view subscribers" ON subscribers FOR SELECT USING ... (only admin)
-- But let's just make sure there are no open SELECT policies on subscribers, clients (profiles), etc.

-- Make sure tastings has no open INSERT/UPDATE
DROP POLICY IF EXISTS "Anyone can insert tastings" ON tastings; -- just in case

-- Web can read PUBLISHED tastings
-- Initial schema has: CREATE POLICY "Public tastings are viewable by everyone" ON tastings FOR SELECT USING (status != 'DRAFT');
-- We will change it to ONLY 'PUBLISHED' or 'SOLD_OUT' or 'COMPLETED'
DROP POLICY IF EXISTS "Public tastings are viewable by everyone" ON tastings;
CREATE POLICY "Public tastings are viewable by everyone" ON tastings
    FOR SELECT USING (status IN ('PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED'));

-- Subscribers
-- We keep "Anyone can insert subscriber" because the public form needs to work via anon key, OR we use service role.
-- Wait, in `src/app/actions/subscribe.ts`, I used the standard `supabase` client (which uses Anon key if no service key is provided).
-- So the anon key needs `INSERT` access to `subscribers`.
-- Let's make sure they can only insert, not read.
-- The existing policy is `CREATE POLICY "Anyone can insert subscriber" ON subscribers FOR INSERT WITH CHECK (true);`. This is safe because it's only INSERT.

-- 3. Check-ins
-- Ensure no open policies
