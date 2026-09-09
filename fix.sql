CREATE OR REPLACE FUNCTION public.create_reservation(
    p_tasting_id uuid,
    p_email text,
    p_first_name text,
    p_last_name text,
    p_phone text,
    p_tickets integer,
    p_total_amount numeric,
    p_reservation_type text DEFAULT 'SALE'::text,
    p_invitation_token uuid DEFAULT NULL::uuid)
    RETURNS uuid
    LANGUAGE 'plpgsql'
    SECURITY DEFINER
AS $BODY$
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

    SELECT capacity INTO v_total_capacity FROM tastings WHERE id = p_tasting_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cata no encontrada';
    END IF;

    SELECT COALESCE(SUM(tickets), 0) INTO v_reserved 
    FROM reservations 
    WHERE tasting_id = p_tasting_id AND status IN ('PENDING', 'CONFIRMED', 'COMPLETED');

    v_available_capacity := v_total_capacity - v_reserved;

    IF v_available_capacity < p_tickets THEN
        RAISE EXCEPTION 'No hay suficientes plazas disponibles';
    END IF;

    SELECT id INTO v_profile_id FROM profiles WHERE email = p_email;
    
    IF v_profile_id IS NULL THEN
        INSERT INTO profiles (id, email, first_name, last_name, phone, role, public_token)
        VALUES (gen_random_uuid(), p_email, p_first_name, p_last_name, p_phone, 'CUSTOMER', gen_random_uuid())
        RETURNING id INTO v_profile_id;
    END IF;

    INSERT INTO reservations (
        tasting_id, profile_id, tickets, total_amount, status, reservation_type, invitation_token
    ) VALUES (
        p_tasting_id, v_profile_id, p_tickets, p_total_amount, 'PENDING', p_reservation_type, p_invitation_token
    ) RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$BODY$;
