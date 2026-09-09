CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    tasting_id UUID REFERENCES tastings(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE commercial_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    action_text TEXT,
    action_url TEXT,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    tasting_id UUID REFERENCES tastings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);
ALTER TABLE commercial_alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE tasting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasting_id UUID REFERENCES tastings(id) ON DELETE CASCADE UNIQUE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE tasting_reports ENABLE ROW LEVEL SECURITY;

-- Policies para analytics_events
-- Bloqueamos el insert desde cliente público (true falso). Solo el Service Role (desde API) puede insertar.
CREATE POLICY "Solo admin lee analytics_events" ON analytics_events FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- Policies para commercial_alerts
CREATE POLICY "Solo admin lee_escribe alertas" ON commercial_alerts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- Policies para tasting_reports
CREATE POLICY "Solo admin lee_escribe reports" ON tasting_reports FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'STAFF')));


-- Idempotencia para pagos: un mismo session_id de Stripe no puede generar múltiples payment_completed
CREATE UNIQUE INDEX idx_analytics_payment_unique ON analytics_events (session_id) WHERE event_name = 'payment_completed';

