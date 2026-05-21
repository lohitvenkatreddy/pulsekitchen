-- Supabase Storage buckets for production file uploads.
-- Run this in the Supabase SQL Editor after database/schema.sql.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'restaurant-menu-images',
    'restaurant-menu-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'verification-documents',
    'verification-documents',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'support-attachments',
    'support-attachments',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for restaurant menu images.
DROP POLICY IF EXISTS "Public menu image reads" ON storage.objects;

CREATE POLICY "Public menu image reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'restaurant-menu-images');
