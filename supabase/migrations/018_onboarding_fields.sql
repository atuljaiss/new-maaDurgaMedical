-- 018_onboarding_fields.sql
-- Add onboarding fields to profiles table

ALTER TABLE profiles
  ADD COLUMN mobile_number VARCHAR(20),
  ADD COLUMN aadhar_card_url TEXT,
  ADD COLUMN other_documents JSONB DEFAULT '[]'::jsonb;
