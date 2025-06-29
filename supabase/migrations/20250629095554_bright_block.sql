/*
  # Add user role and avatar_url columns

  1. New Columns
    - `avatar_url` (text, nullable) - URL for user profile picture
    - `role` (text, default 'creator') - User role: 'creator' or 'investor'
  
  2. Security
    - Add check constraint for role values
    - Create index for role-based queries
  
  3. Data Migration
    - Set default role for existing users
*/

-- Perform all operations in a single transaction block
DO $$
BEGIN
  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role text DEFAULT 'creator';
  END IF;

  -- Update any existing users without a role to have the default 'creator' role
  -- This needs to be inside the same transaction block
  UPDATE users SET role = 'creator' WHERE role IS NULL;

  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('creator', 'investor'));
  END IF;
END $$;

-- Create index for role-based queries (outside the block since CREATE INDEX IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);