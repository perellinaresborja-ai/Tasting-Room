-- Migration: Atomic communications, locking & recipient dispatch
-- The Church Tasting Room
-- Non-destructive: preserves all existing campaigns and data

-- 1. Ensure communications table exists
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  channel TEXT NOT NULL,
  segment TEXT NOT NULL,
  filters_used JSONB,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENDING', 'ACCEPTED', 'PARTIAL', 'FAILED'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMPTZ,
  error_log JSONB,
  message TEXT
);

-- 2. Safely add missing columns to existing communications table
ALTER TABLE communications ADD COLUMN IF NOT EXISTS accepted_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS error_log JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_updated_at ON communications(updated_at DESC);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- 3. Individual recipient audit table (Un destinatario por fila)
CREATE TABLE IF NOT EXISTS communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  recipient_id UUID,
  recipient_type TEXT NOT NULL DEFAULT 'client', -- 'client', 'subscriber', 'lead'
  email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'ACCEPTED', 'FAILED', 'UNCERTAIN'
  provider_message_id TEXT, -- Resend message ID (e.g. re_123456)
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_comm_recipient_email UNIQUE (communication_id, email)
);

CREATE INDEX IF NOT EXISTS idx_comm_recipients_comm_id ON communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_recipients_status ON communication_recipients(status);

ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for communications
DROP POLICY IF EXISTS "Admins can view communications" ON communications;
CREATE POLICY "Admins can view communications" 
ON communications FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can insert communications" ON communications;
CREATE POLICY "Admins can insert communications" 
ON communications FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update communications" ON communications;
CREATE POLICY "Admins can update communications" 
ON communications FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on communications" ON communications;
CREATE POLICY "Service role full access on communications" 
ON communications FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. RLS Policies for communication_recipients
DROP POLICY IF EXISTS "Admins can view communication_recipients" ON communication_recipients;
CREATE POLICY "Admins can view communication_recipients" 
ON communication_recipients FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can insert communication_recipients" ON communication_recipients;
CREATE POLICY "Admins can insert communication_recipients" 
ON communication_recipients FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update communication_recipients" ON communication_recipients;
CREATE POLICY "Admins can update communication_recipients" 
ON communication_recipients FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on communication_recipients" ON communication_recipients;
CREATE POLICY "Service role full access on communication_recipients" 
ON communication_recipients FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 6. RPC: Atomic campaign lock with automatic stale lock recovery
-- Using FOR UPDATE row-level locking to guarantee no two concurrent processes can ever claim the lock
CREATE OR REPLACE FUNCTION claim_campaign_lock(
  p_campaign_id UUID,
  p_admin_id UUID,
  p_stale_seconds INT DEFAULT 180
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comm RECORD;
BEGIN
  -- Lock row in exclusive update mode (blocks concurrent requests until committed)
  SELECT * INTO v_comm
  FROM communications
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Campaña no encontrada.');
  END IF;

  IF v_comm.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_COMPLETED', 'message', 'Esta campaña ya ha sido enviada y aceptada en su totalidad.');
  END IF;

  -- Check if already SENDING
  IF v_comm.status = 'SENDING' THEN
    IF v_comm.updated_at > NOW() - (p_stale_seconds || ' seconds')::INTERVAL THEN
      -- Active execution in progress by another request
      RETURN jsonb_build_object('success', false, 'code', 'IN_PROGRESS', 'message', 'La campaña ya se está procesando actualmente.');
    ELSE
      -- Stale lock: previous execution died/crashed without completing
      -- Safely break stale lock and claim it exclusively
      UPDATE communications
      SET status = 'SENDING', updated_at = NOW()
      WHERE id = p_campaign_id;

      RETURN jsonb_build_object('success', true, 'reclaimed_stale', true);
    END IF;
  END IF;

  -- For PENDING, PARTIAL or FAILED: acquire lock atomically
  UPDATE communications
  SET status = 'SENDING', updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true, 'reclaimed_stale', false);
END;
$$;

-- 7. RPC: Atomic recipient batch claim using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_recipients_for_dispatch(
  p_campaign_id UUID,
  p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  recipient_name TEXT,
  recipient_type TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Claims strictly PENDING or FAILED recipients.
  -- EXCLUDES ACCEPTED, PROCESSING, and UNCERTAIN recipients.
  -- Sets claimed rows to PROCESSING atomically, preventing any concurrent request from claiming the same rows.
  RETURN QUERY
  WITH claimed AS (
    SELECT cr.id
    FROM communication_recipients cr
    WHERE cr.communication_id = p_campaign_id
      AND cr.status IN ('PENDING', 'FAILED')
    ORDER BY cr.created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE communication_recipients cr
  SET 
    status = 'PROCESSING',
    sent_at = NOW()
  FROM claimed
  WHERE cr.id = claimed.id
  RETURNING cr.id, cr.email, cr.recipient_name, cr.recipient_type, cr.status;
END;
$$;

-- 8. RPC: Safe reconciliation of uncertain / interrupted dispatches
-- Stale PROCESSING rows transition to UNCERTAIN (NOT FAILED) so they are NEVER re-sent automatically
CREATE OR REPLACE FUNCTION reconcile_stale_campaign(
  p_campaign_id UUID,
  p_stale_seconds INT DEFAULT 180
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uncertain_count INT := 0;
  v_total INT;
  v_accepted INT;
  v_failed INT;
  v_pending INT;
  v_uncertain INT;
  v_status TEXT;
BEGIN
  -- Any recipient left in PROCESSING for longer than p_stale_seconds represents an interrupted dispatch
  -- Transition strictly to UNCERTAIN to permanently exclude from automatic re-dispatch
  WITH stale_processing AS (
    SELECT id
    FROM communication_recipients
    WHERE communication_id = p_campaign_id
      AND status = 'PROCESSING'
      AND sent_at < NOW() - (p_stale_seconds || ' seconds')::INTERVAL
    FOR UPDATE
  )
  UPDATE communication_recipients cr
  SET 
    status = 'UNCERTAIN',
    error_message = 'Interrupción del servidor durante el envío. Estado incierto en el proveedor: excluido de reintentos para evitar duplicados.'
  FROM stale_processing
  WHERE cr.id = stale_processing.id;

  GET DIAGNOSTICS v_uncertain_count = ROW_COUNT;

  -- Recalculate campaign state
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ACCEPTED'),
    COUNT(*) FILTER (WHERE status = 'FAILED'),
    COUNT(*) FILTER (WHERE status = 'PENDING'),
    COUNT(*) FILTER (WHERE status = 'UNCERTAIN')
  INTO v_total, v_accepted, v_failed, v_pending, v_uncertain
  FROM communication_recipients
  WHERE communication_id = p_campaign_id;

  IF v_pending > 0 OR v_uncertain > 0 OR (v_failed > 0 AND v_accepted > 0) THEN
    v_status := 'PARTIAL';
  ELSIF v_failed > 0 AND v_accepted = 0 THEN
    v_status := 'FAILED';
  ELSIF v_accepted = v_total AND v_total > 0 THEN
    v_status := 'ACCEPTED';
  ELSE
    v_status := 'PARTIAL';
  END IF;

  UPDATE communications
  SET 
    accepted_count = v_accepted,
    failed_count = v_failed,
    status = v_status,
    updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'success', true,
    'uncertain_resolved', v_uncertain_count,
    'status', v_status,
    'total', v_total,
    'accepted', v_accepted,
    'failed', v_failed,
    'uncertain', v_uncertain
  );
END;
$$;
