/*
  # Fix Creator Wallet Creation

  1. Ensure all existing creators have wallets
  2. Fix the trigger function to handle edge cases
  3. Add better error handling for wallet creation

  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity
*/

-- First, create wallets for any existing creators who don't have them
INSERT INTO creator_wallets (user_id)
SELECT id 
FROM users 
WHERE role = 'creator' 
AND id NOT IN (SELECT user_id FROM creator_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION create_creator_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create wallet for creators
  IF NEW.role = 'creator' THEN
    -- Use INSERT with ON CONFLICT to avoid errors if wallet already exists
    INSERT INTO creator_wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create wallet for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS create_wallet_for_creator ON users;
CREATE TRIGGER create_wallet_for_creator
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_creator_wallet();

-- Add a function to manually create wallet if needed
CREATE OR REPLACE FUNCTION ensure_creator_wallet(user_uuid uuid)
RETURNS uuid AS $$
DECLARE
  wallet_id uuid;
BEGIN
  -- Check if wallet exists
  SELECT id INTO wallet_id
  FROM creator_wallets
  WHERE user_id = user_uuid;
  
  -- If no wallet exists, create one
  IF wallet_id IS NULL THEN
    INSERT INTO creator_wallets (user_id)
    VALUES (user_uuid)
    RETURNING id INTO wallet_id;
  END IF;
  
  RETURN wallet_id;
END;
$$ LANGUAGE plpgsql;