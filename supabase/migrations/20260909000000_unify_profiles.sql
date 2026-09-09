-- 1. Create a safe UUID generator if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add auth_user_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add profile_id to reservations (NO DESTRUCTIVE)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE RESTRICT;

-- 4. Migrate customers to profiles if they don't exist
INSERT INTO profiles (id, email, first_name, last_name, phone, role, public_token)
SELECT 
  gen_random_uuid(), 
  c.email, 
  c.first_name, 
  c.last_name, 
  c.phone, 
  'CUSTOMER', 
  gen_random_uuid()
FROM customers c
WHERE c.email NOT IN (SELECT email FROM profiles);

-- 5. Update reservations to point to the correct profile_id
UPDATE reservations r
SET profile_id = p.id
FROM customers c
JOIN profiles p ON p.email = c.email
WHERE r.customer_id = c.id;

-- 6. Add invitation fields to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_type TEXT DEFAULT 'SALE' NOT NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invitation_token UUID;
-- We use DO block to add unique constraint safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_invitation_token_key'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_invitation_token_key UNIQUE (invitation_token);
  END IF;
END $$;

-- 7. Update RPC create_reservation to be atomic and use profiles
CREATE OR REPLACE FUNCTION create_reservation(
    p_tasting_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_tickets INTEGER,
    p_total_amount NUMERIC,
    p_reservation_type TEXT DEFAULT 'SALE',
    p_invitation_token UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_reservation_id UUID;
    v_available_capacity INTEGER;
    v_total_capacity INTEGER;
    v_reserved INTEGER;
BEGIN
    IF p_tickets IS NULL OR p_tickets <= 0 THEN
      RAISE EXCEPTION 'Invalid ticket quantity';
    END IF;

    -- Get capacities with FOR UPDATE for atomic row-level lock
    SELECT capacity INTO v_total_capacity FROM tastings WHERE id = p_tasting_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cata no encontrada';
    END IF;

    -- Calculate based on valid statuses
    SELECT COALESCE(SUM(tickets), 0) INTO v_reserved 
    FROM reservations 
    WHERE tasting_id = p_tasting_id AND status IN ('PENDING', 'CONFIRMED', 'COMPLETED');

    v_available_capacity := v_total_capacity - v_reserved;

    IF v_available_capacity < p_tickets THEN
        RAISE EXCEPTION 'No hay suficientes plazas disponibles';
    END IF;

    -- Upsert profile
    SELECT id INTO v_profile_id FROM profiles WHERE email = p_email;
    
    IF v_profile_id IS NULL THEN
        INSERT INTO profiles (email, first_name, last_name, phone, role, public_token)
        VALUES (p_email, p_first_name, p_last_name, p_phone, 'CUSTOMER', gen_random_uuid())
        RETURNING id INTO v_profile_id;
    END IF;

    -- Insert reservation
    INSERT INTO reservations (
        tasting_id,
        profile_id,
        tickets,
        total_amount,
        status,
        reservation_type,
        invitation_token
    ) VALUES (
        p_tasting_id,
        v_profile_id,
        p_tickets,
        p_total_amount,
        'PENDING',
        p_reservation_type,
        p_invitation_token
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NO DROPS DURING PHASE 1
-- DO NOT DROP customers
-- DO NOT DROP reservations.customer_id
-- DO NOT DROP reservations.public_token

