-- Enums
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');
CREATE TYPE tasting_status AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED');

-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'CUSTOMER'::user_role NOT NULL,
    preferred_language TEXT DEFAULT 'es' NOT NULL,
    public_token TEXT UNIQUE NOT NULL,
    marketing_email_consent BOOLEAN DEFAULT false NOT NULL,
    marketing_whatsapp_consent BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tastings table
CREATE TABLE tastings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    subtitle_es TEXT,
    subtitle_en TEXT,
    description_es TEXT NOT NULL,
    description_en TEXT NOT NULL,
    cover_image TEXT,
    category TEXT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    capacity INTEGER NOT NULL,
    status tasting_status DEFAULT 'DRAFT'::tasting_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tastings ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by admin/staff" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Trigger for role protection
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $prevent_role_escalation$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
            RAISE EXCEPTION 'Only administrators can change roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$prevent_role_escalation$ language 'plpgsql';

CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE prevent_role_escalation();


-- Policies for tastings
CREATE POLICY "Public tastings are viewable by everyone" ON tastings
    FOR SELECT USING (status != 'DRAFT');

CREATE POLICY "All tastings are viewable by admin/staff" ON tastings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Admin can manage tastings" ON tastings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $update_updated_at_column$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$update_updated_at_column$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tastings_updated_at
    BEFORE UPDATE ON tastings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

