-- Migration: Remove recipe moderation fields
-- Run this in your Supabase SQL Editor

-- Drop columns related to moderation from recipes table
ALTER TABLE recipes 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS is_approved,
  DROP COLUMN IF EXISTS rejected_reason;

-- Create audit_logs table (optional - for admin action tracking)
-- Note: auth.users.id is UUID, so admin_id must be UUID too
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Add is_favorite column to recipes if not exists (for saved recipes feature)
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT TRUE;

-- Add user_id index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);

-- Add is_hidden column to reviews table (for moderation)
ALTER TABLE reviews 
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Add index for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_public ON reviews(is_public) WHERE is_public = TRUE;
