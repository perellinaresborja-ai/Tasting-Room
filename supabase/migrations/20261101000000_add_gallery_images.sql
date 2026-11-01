-- Add gallery_images to tastings table
ALTER TABLE tastings ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}'::TEXT[];
