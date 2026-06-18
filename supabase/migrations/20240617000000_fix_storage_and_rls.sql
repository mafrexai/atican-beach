-- Create the atican-media storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'atican-media',
  'atican-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read from atican-media bucket
CREATE POLICY "Public read access for atican-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'atican-media');

-- Allow authenticated users to upload to atican-media bucket
CREATE POLICY "Authenticated upload to atican-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'atican-media' AND auth.role() = 'authenticated');

-- Allow service role to do everything on atican-media bucket
CREATE POLICY "Service role full access to atican-media"
ON storage.objects FOR ALL
USING (bucket_id = 'atican-media' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'atican-media' AND auth.role() = 'service_role');

-- Fix profiles table RLS: allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow service role to read all profiles
CREATE POLICY "Service role can read all profiles"
ON profiles FOR SELECT
USING (auth.role() = 'service_role');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles
CREATE POLICY "Service role can manage all profiles"
ON profiles FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');