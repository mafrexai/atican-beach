-- ============================================
-- Add image columns to rooms table
-- ============================================
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT,
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- ============================================
-- Add image columns to tents table
-- ============================================
ALTER TABLE tents 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT,
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- ============================================
-- Add image columns to experiences table
-- ============================================
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_alt TEXT,
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- ============================================
-- Room Features Table
-- ============================================
CREATE TABLE IF NOT EXISTS room_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  feature_value TEXT,
  feature_icon VARCHAR(50) DEFAULT 'Check',
  display_order INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_features_room_id ON room_features(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_image_url ON rooms(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tents_image_url ON tents(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_experiences_image_url ON experiences(image_url) WHERE image_url IS NOT NULL;

-- ============================================
-- Supabase Storage: Create bucket
-- ============================================
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

-- ============================================
-- Storage Policies
-- ============================================

-- Allow public viewing of images
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'atican-media');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated can upload images" ON storage.objects;
CREATE POLICY "Authenticated can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated can update images" ON storage.objects;
CREATE POLICY "Authenticated can update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete
DROP POLICY IF EXISTS "Authenticated can delete images" ON storage.objects;
CREATE POLICY "Authenticated can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'atican-media'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- Grant access
-- ============================================
GRANT SELECT ON room_features TO anon, authenticated;
GRANT ALL ON room_features TO authenticated;