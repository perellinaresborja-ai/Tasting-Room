-- Reservations
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasting_id UUID REFERENCES tastings ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
    places INTEGER NOT NULL CHECK (places > 0),
    total_amount NUMERIC(10, 2) NOT NULL,
    status reservation_status DEFAULT 'PENDING'::reservation_status NOT NULL,
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Waitlist
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasting_id UUID REFERENCES tastings ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-ins
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations ON DELETE CASCADE NOT NULL,
    tasting_id UUID REFERENCES tastings ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
    staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subscribers
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    language TEXT DEFAULT 'es' NOT NULL,
    interests TEXT[] DEFAULT '{}'::TEXT[],
    marketing_email_consent BOOLEAN DEFAULT false NOT NULL,
    marketing_whatsapp_consent BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tasting_id UUID REFERENCES tastings ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    best_part TEXT,
    improvement TEXT,
    future_interests TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tasting_id, profile_id)
);

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policies for reservations
CREATE POLICY "Users can view own reservations" ON reservations FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Admin/staff view all reservations" ON reservations FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
);
CREATE POLICY "Service role can insert reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update reservations" ON reservations FOR UPDATE USING (true);

-- Check-ins policies
CREATE POLICY "Staff can manage check-ins" ON check_ins FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
);
CREATE POLICY "Users can view own check-ins" ON check_ins FOR SELECT USING (auth.uid() = profile_id);

-- Feedback policies
CREATE POLICY "Users can insert own feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Admin/staff view all feedback" ON feedback FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
);

-- Waitlist
CREATE POLICY "Users manage own waitlist" ON waitlist FOR ALL USING (auth.uid() = profile_id);

-- Subscribers
CREATE POLICY "Anyone can insert subscriber" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin view subscribers" ON subscribers FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
