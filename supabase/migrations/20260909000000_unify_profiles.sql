-- 1. Create a safe UUID generator if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add profile_id to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Migrate customers to profiles if they don't exist
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

-- 4. Update reservations to point to the correct profile_id
UPDATE reservations r
SET profile_id = p.id
FROM customers c
JOIN profiles p ON p.email = c.email
WHERE r.customer_id = c.id;

-- 5. Force constraints and drop customer_id
ALTER TABLE reservations ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE reservations DROP COLUMN IF EXISTS customer_id;

-- 6. Drop public_token from reservations (QR belongs to profile)
ALTER TABLE reservations DROP COLUMN IF EXISTS public_token;

-- 7. Update RPC create_reservation to use profiles instead of customers
CREATE OR REPLACE FUNCTION create_reservation(
    p_tasting_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_tickets INTEGER,
    p_total_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_reservation_id UUID;
    v_available_capacity INTEGER;
    v_total_capacity INTEGER;
    v_reserved INTEGER;
BEGIN
    -- Get capacities
    SELECT capacity INTO v_total_capacity FROM tastings WHERE id = p_tasting_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cata no encontrada';
    END IF;

    SELECT COALESCE(SUM(tickets), 0) INTO v_reserved 
    FROM reservations 
    WHERE tasting_id = p_tasting_id AND status != 'CANCELLED';

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
        status
    ) VALUES (
        p_tasting_id,
        v_profile_id,
        p_tickets,
        p_total_amount,
        'PENDING'
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7b. Add type and token to reservations for invitations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_type TEXT DEFAULT 'SALE' NOT NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS invitation_token UUID;
ALTER TABLE reservations ADD UNIQUE (invitation_token);

-- 8. Safely drop customers table (all dependencies moved)
DROP TABLE IF EXISTS customers CASCADE;
