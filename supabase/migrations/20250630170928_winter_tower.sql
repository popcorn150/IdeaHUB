/*
  # Creator Wallet System

  1. New Tables
    - `creator_wallets` - Track creator balances
    - `wallet_transactions` - Record all wallet activity
    - `withdrawal_requests` - Handle payout requests

  2. Security
    - Enable RLS on all wallet tables
    - Creators can only see their own wallet data
    - Proper audit trail for all transactions

  3. Features
    - Real-time balance tracking
    - Transaction history
    - Withdrawal management
*/

-- Create creator wallets table
CREATE TABLE IF NOT EXISTS creator_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_cents bigint DEFAULT 0 NOT NULL,
  total_earned_cents bigint DEFAULT 0 NOT NULL,
  total_withdrawn_cents bigint DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES creator_wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'withdrawal', 'refund')),
  amount_cents bigint NOT NULL,
  description text NOT NULL,
  idea_id uuid REFERENCES ideas(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  created_at timestamptz DEFAULT now()
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES creator_wallets(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_account_id text,
  stripe_transfer_id text,
  bank_details jsonb,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  notes text
);

-- Add indexes for performance
CREATE INDEX idx_creator_wallets_user_id ON creator_wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_withdrawal_requests_wallet_id ON withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Enable RLS
ALTER TABLE creator_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_wallets
CREATE POLICY "Creators can view their own wallet"
  ON creator_wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Creators can update their own wallet"
  ON creator_wallets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for wallet_transactions
CREATE POLICY "Creators can view their wallet transactions"
  ON wallet_transactions
  FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM creator_wallets WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for withdrawal_requests
CREATE POLICY "Creators can view their withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM creator_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can create withdrawal requests"
  ON withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM creator_wallets WHERE user_id = auth.uid()
    )
  );

-- Function to create wallet for new creators
CREATE OR REPLACE FUNCTION create_creator_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create wallet for creators
  IF NEW.role = 'creator' THEN
    INSERT INTO creator_wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create wallets for creators
CREATE TRIGGER create_wallet_for_creator
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_creator_wallet();

-- Create wallets for existing creators
INSERT INTO creator_wallets (user_id)
SELECT id FROM users WHERE role = 'creator'
ON CONFLICT (user_id) DO NOTHING;