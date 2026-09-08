-- Allow null for subscriber name since the simplified form no longer asks for it.
ALTER TABLE public.subscribers ALTER COLUMN name DROP NOT NULL;
