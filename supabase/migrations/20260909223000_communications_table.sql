CREATE TYPE communication_channel AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    channel communication_channel NOT NULL,
    segment TEXT NOT NULL,
    filters_used JSONB,
    recipients_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    sent_at TIMESTAMPTZ
);
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
