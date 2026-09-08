-- Add includes_alcohol to tastings
ALTER TABLE tastings ADD COLUMN IF NOT EXISTS includes_alcohol BOOLEAN DEFAULT false NOT NULL;
