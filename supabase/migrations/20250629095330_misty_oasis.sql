/*
  # Add user roles and avatar support

  1. New Columns
    - `role` (text, default 'creator') - User role with constraint for 'creator' or 'investor'
    - `avatar_url` (text, nullable) - URL for user profile avatar

  2. Indexes
    - Add index on role column for efficient role-based queries

  3. Security
    - Maintains existing RLS policies
*/

-- Add avatar_url column first (simpler, no constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add role column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'creator';
  END IF;
END $$;

-- Add check constraint for role column (separate from column creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('creator', 'investor'));
  END IF;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update any existing users without a role to have the default 'creator' role
UPDATE users SET role = 'creator' WHERE role IS NULL;