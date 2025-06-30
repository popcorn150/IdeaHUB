/*
  # Add user role and avatar columns

  1. New Columns
    - `avatar_url` (text) - URL for user profile picture
    - `role` (text) - User role: 'creator' or 'investor'
  
  2. Security
    - Add check constraint for role values
    - Create index for role-based queries
    
  3. Data Migration
    - Set default role for existing users
*/

-- Add avatar_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add role column with default value (without constraint first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'creator';
  END IF;
END $$;

-- Update any existing users without a role to have the default 'creator' role
UPDATE users SET role = 'creator' WHERE role IS NULL;

-- Now add the check constraint (after ensuring column exists and has data)
DO $$
BEGIN
  -- Only add constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%role%' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('creator', 'investor'));
  END IF;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);