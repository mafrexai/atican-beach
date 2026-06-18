-- ============================================================
-- FIX: Storage Bucket and Policies for Image Uploads
-- Ensures atican-media bucket exists with correct permissions
-- ============================================================

-- Create the atican-media storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'atican-media',
  'atican-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for atican-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to atican-media" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to atican-media" ON storage.objects;

-- Public can view images
CREATE POLICY "Public can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'atican-media');

-- Authenticated users can upload images
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update images
CREATE POLICY "Users can update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete images
CREATE POLICY "Users can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- Service role has full access
CREATE POLICY "Service role full access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'atican-media'
    AND auth.role() = 'service_role'
  )
  WITH CHECK (
    bucket_id = 'atican-media'
    AND auth.role() = 'service_role'
  );