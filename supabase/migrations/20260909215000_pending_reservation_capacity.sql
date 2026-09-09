-- 1. Redefine the view to only count CONFIRMED or PENDING (< 15 mins)
CREATE OR REPLACE VIEW public_tasting_capacity AS
SELECT
  t.id AS tasting_id,
  t.capacity,
  COALESCE(SUM(r.tickets), 0) AS reserved_spots,
  t.capacity - COALESCE(SUM(r.tickets), 0) AS available_spots
FROM tastings t
LEFT JOIN reservations r 
  ON r.tasting_id = t.id 
  AND (
    r.status = 'CONFIRMED' 
    OR 
    (r.status = 'PENDING' AND r.created_at >= NOW() - INTERVAL '15 minutes')
  )
GROUP BY t.id, t.capacity;

-- 2. Redefine create_reservation to check capacity using the same logic
CREATE OR REPLACE FUNCTION create_reservation(
    p_tasting_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_tickets INTEGER,
    p_total_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_available_spots INTEGER;
    v_reservation_id UUID;
BEGIN
    -- Get available spots directly from the view we just updated
    SELECT available_spots INTO v_available_spots
    FROM public_tasting_capacity
    WHERE tasting_id = p_tasting_id;

    -- Check capacity
    IF v_available_spots < p_tickets THEN
        RAISE EXCEPTION 'Not enough capacity';
    END IF;

    -- Upsert profile (we never delete profiles as per requirements)
    SELECT id INTO v_profile_id FROM profiles WHERE email = p_email;
    IF v_profile_id IS NULL THEN
        INSERT INTO profiles (email, first_name, last_name, phone, role)
        VALUES (p_email, p_first_name, p_last_name, p_phone, 'CLIENT')
        RETURNING id INTO v_profile_id;
    ELSE
        IF p_phone IS NOT NULL THEN
            UPDATE profiles SET phone = p_phone, first_name = p_first_name, last_name = p_last_name WHERE id = v_profile_id;
        END IF;
    END IF;

    -- Create reservation as PENDING (will lock spots for 15 mins via the view)
    INSERT INTO reservations (
        tasting_id,
        profile_id,
        tickets,
        total_amount,
        status,
        payment_status,
        reservation_type
    ) VALUES (
        p_tasting_id,
        v_profile_id,
        p_tickets,
        p_total_amount,
        'PENDING',
        'PENDING',
        'SALE'
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
