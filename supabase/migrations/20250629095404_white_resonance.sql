/*
  # Add user roles and avatar URL

  1. New Columns
    - `avatar_url` (text, nullable) - URL for user profile picture
    - `role` (text, default 'creator') - User role with constraint for 'creator' or 'investor'
  
  2. Constraints
    - Check constraint on role column to ensure valid values
  
  3. Indexes
    - Index on role column for efficient role-based queries
  
  4. Data Updates
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

-- Add role column with default and constraint in one operation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    -- Add column with default value and check constraint in single statement
    ALTER TABLE users ADD COLUMN role text DEFAULT 'creator' CHECK (role IN ('creator', 'investor'));
  ELSE
    -- If column exists but constraint doesn't, add the constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'users_role_check' AND table_name = 'users'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('creator', 'investor'));
    END IF;
  END IF;
END $$;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update any existing users without a role to have the default 'creator' role
UPDATE users SET role = 'creator' WHERE role IS NULL;