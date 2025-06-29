/*
  # Fix minted_by column and add foreign key constraint

  1. Changes
    - Convert minted_by column from text to uuid type
    - Add foreign key constraint linking minted_by to users(id)
    - Handle existing data safely during conversion

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity with proper constraint handling
*/

-- First, update any existing text values in minted_by to NULL if they're not valid UUIDs
UPDATE ideas 
SET minted_by = NULL 
WHERE minted_by IS NOT NULL 
AND minted_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Change the column type from text to uuid
ALTER TABLE ideas 
ALTER COLUMN minted_by TYPE uuid USING minted_by::uuid;

-- Add foreign key constraint for minted_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ideas_minted_by_fkey' 
    AND table_name = 'ideas'
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT ideas_minted_by_fkey 
    FOREIGN KEY (minted_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;