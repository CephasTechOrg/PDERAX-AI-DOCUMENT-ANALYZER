-- Migration: 001_update_users_table
-- Description: Add new columns to users table for enhanced profile support
-- Date: February 26, 2026

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) DEFAULT 'email' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Update existing users to have created_via set
UPDATE users SET created_via = 'email' WHERE created_via IS NULL;

-- For users who signed up via OAuth, update their created_via
UPDATE users u 
SET created_via = 'google' 
FROM oauth_accounts oa 
WHERE oa.user_id = u.id AND oa.provider = 'google' AND u.password_hash IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_created_via ON users(created_via);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Verify migration
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users';
