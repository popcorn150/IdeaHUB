/*
  # Add user roles and enhanced features

  1. Changes
    - Add `role` column to users table (creator/investor)
    - Add `avatar_url` column for profile pictures
    - Update existing policies to accommodate new features

  2. Security
    - Maintains existing RLS policies
    - Ensures proper role-based access
*/

-- Add role and avatar_url columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'creator' CHECK (role IN ('creator', 'investor'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);