-- Migration: Scanner Partial Check-ins and Check-in History
-- The Church Tasting Room

-- 1. Add checked_in_tickets column to reservations if it does not exist
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS checked_in_tickets INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill existing check-ins safely: if check_in_time is already set, checked_in_tickets = tickets
UPDATE reservations 
SET checked_in_tickets = tickets 
WHERE check_in_time IS NOT NULL AND (checked_in_tickets IS NULL OR checked_in_tickets = 0);

-- 3. Create reservation_checkins table to log every validation event
CREATE TABLE IF NOT EXISTS reservation_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  tasting_id UUID NOT NULL REFERENCES tastings(id) ON DELETE CASCADE,
  tickets INTEGER NOT NULL CHECK (tickets > 0),
  staff_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reservation_checkins_res ON reservation_checkins(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_checkins_tasting ON reservation_checkins(tasting_id);

-- Enable Row Level Security
ALTER TABLE reservation_checkins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Admins can view check-ins" 
ON reservation_checkins 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access on check-ins" 
ON reservation_checkins 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Atomic stored procedure with row-level locking (FOR UPDATE)
-- Guarantees race-condition prevention across simultaneous scanners
-- Single transaction: Updates reservation and inserts into reservation_checkins together
CREATE OR REPLACE FUNCTION record_partial_checkin(
  p_reservation_id UUID,
  p_tickets INTEGER,
  p_staff_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_res RECORD;
  v_current_used INTEGER;
  v_new_used INTEGER;
  v_checkin_id UUID;
  v_staff_role TEXT;
BEGIN
  -- 1. Validate employee permissions inside the database
  IF p_staff_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPLEADO_NO_IDENTIFICADO');
  END IF;

  SELECT role INTO v_staff_role FROM profiles WHERE id = p_staff_profile_id;
  IF v_staff_role IS NULL OR v_staff_role NOT IN ('ADMIN', 'STAFF') THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPLEADO_NO_AUTORIZADO');
  END IF;

  -- 2. Strict ticket input check
  IF p_tickets IS NULL OR p_tickets <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANTIDAD_INVALIDA');
  END IF;

  -- 3. Lock reservation row for atomic update (prevents concurrent race conditions)
  SELECT 
    id, 
    tasting_id, 
    tickets, 
    COALESCE(checked_in_tickets, CASE WHEN check_in_time IS NOT NULL THEN tickets ELSE 0 END) AS used, 
    status, 
    payment_status,
    reservation_type,
    check_in_time
  INTO v_res
  FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESERVA_NO_ENCONTRADA');
  END IF;

  -- 4. Server-side validation of reservation status
  IF v_res.status != 'CONFIRMED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESERVA_NO_CONFIRMADA');
  END IF;

  -- 5. Server-side validation of payment
  IF v_res.reservation_type != 'INVITATION' AND v_res.payment_status NOT IN ('PAID', 'NOT_REQUIRED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PAGO_PENDIENTE');
  END IF;

  v_current_used := v_res.used;

  -- 6. Reject if validation would exceed total purchased tickets
  IF (v_current_used + p_tickets) > v_res.tickets THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EXCEDE_PLAZAS',
      'tickets_comprados', v_res.tickets,
      'tickets_usados', v_current_used,
      'tickets_disponibles', (v_res.tickets - v_current_used)
    );
  END IF;

  v_new_used := v_current_used + p_tickets;

  -- 7. Update reservation (all inside this single transaction)
  UPDATE reservations
  SET 
    checked_in_tickets = v_new_used,
    check_in_time = COALESCE(check_in_time, NOW()),
    updated_at = NOW()
  WHERE id = p_reservation_id;

  -- 8. Insert immutable check-in log entry
  INSERT INTO reservation_checkins (
    reservation_id, 
    tasting_id, 
    tickets, 
    staff_profile_id, 
    created_at
  )
  VALUES (
    p_reservation_id, 
    v_res.tasting_id, 
    p_tickets, 
    p_staff_profile_id, 
    NOW()
  )
  RETURNING id INTO v_checkin_id;

  -- 9. Return structured success payload
  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'tasting_id', v_res.tasting_id,
    'tickets_validados', p_tickets,
    'tickets_comprados', v_res.tickets,
    'total_usados', v_new_used,
    'restantes', (v_res.tickets - v_new_used)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Security: Revoke public and anon execution, allow only service_role and authenticated
REVOKE ALL ON FUNCTION record_partial_checkin(UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_partial_checkin(UUID, INTEGER, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION record_partial_checkin(UUID, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION record_partial_checkin(UUID, INTEGER, UUID) TO authenticated;
