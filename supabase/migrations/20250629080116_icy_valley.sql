/*
  # Add premium status to users table

  1. Changes
    - Add `is_premium` boolean column to users table
    - Set default value to false
    - Add index for performance

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Add is_premium column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE users ADD COLUMN is_premium boolean DEFAULT false;
  END IF;
END $$;

-- Add index for premium status queries
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);