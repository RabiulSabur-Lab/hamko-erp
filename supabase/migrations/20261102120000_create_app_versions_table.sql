-- Migration: Create app_versions table for in-app mobile update checker
CREATE TABLE IF NOT EXISTS app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'android', -- 'android', 'ios', 'all'
  version text NOT NULL,                   -- e.g. '1.0.1'
  version_code integer NOT NULL DEFAULT 1, -- Android versionCode
  min_supported_version text,              -- Minimum version required before forcing update
  force_update boolean NOT NULL DEFAULT false, -- If true, user cannot dismiss update modal
  apk_url text NOT NULL,                   -- Direct download link to APK
  release_notes text,                      -- Markdown or plain text release notes
  released_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Realtime replication & RLS policies
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all users (even unauthenticated) so update checker works on startup
DROP POLICY IF EXISTS "Allow public read access to app_versions" ON app_versions;
CREATE POLICY "Allow public read access to app_versions"
  ON app_versions FOR SELECT
  USING (true);

-- Allow authenticated admins to insert/update app versions
DROP POLICY IF EXISTS "Allow admins to manage app_versions" ON app_versions;
CREATE POLICY "Allow admins to manage app_versions"
  ON app_versions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed initial version metadata if table is empty
INSERT INTO app_versions (platform, version, version_code, min_supported_version, force_update, apk_url, release_notes)
SELECT 'android', '1.0.1', 2, '1.0.0', false, 'https://raw.githubusercontent.com/hamko-erp/releases/main/hamko-erp-latest.apk', '• Real-time cross-device sync optimization
• Offline cache persistence enhancements
• Performance and UI improvements'
WHERE NOT EXISTS (SELECT 1 FROM app_versions WHERE platform = 'android');

-- Add to supabase_realtime publication if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_versions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

