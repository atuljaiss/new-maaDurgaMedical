-- 019_storage_bucket.sql
-- Create storage bucket for onboarding documents and set RLS

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding_documents', 'onboarding_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. (Removed) RLS on storage.objects is already enabled by default in Supabase.

-- 3. Policies for onboarding_documents

-- Admin can manage all documents
CREATE POLICY "Admin can manage all onboarding documents"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'onboarding_documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'onboarding_documents' AND public.is_admin());

-- Employee can view their own documents (assuming folder structure is user_id/...)
CREATE POLICY "Employee can view own onboarding documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'onboarding_documents' AND 
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
