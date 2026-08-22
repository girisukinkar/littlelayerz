-- Migration: 20260824000000_create_business_assets_bucket.sql
-- Description: Create business-assets storage bucket with public access for logos and UPI QR codes

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 1. Allow public select (read)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public select access to business-assets'
    ) THEN
        CREATE POLICY "Allow public select access to business-assets"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'business-assets' );
    END IF;
END $$;

-- 2. Allow public insert (upload)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public insert access to business-assets'
    ) THEN
        CREATE POLICY "Allow public insert access to business-assets"
        ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'business-assets' );
    END IF;
END $$;

-- 3. Allow public update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public update access to business-assets'
    ) THEN
        CREATE POLICY "Allow public update access to business-assets"
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'business-assets' )
        WITH CHECK ( bucket_id = 'business-assets' );
    END IF;
END $$;

-- 4. Allow public delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public delete access to business-assets'
    ) THEN
        CREATE POLICY "Allow public delete access to business-assets"
        ON storage.objects FOR DELETE
        USING ( bucket_id = 'business-assets' );
    END IF;
END $$;
