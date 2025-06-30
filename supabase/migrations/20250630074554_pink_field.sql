/*
  # Add Ownership Modes and Collaboration System

  1. New Tables
    - Add ownership_mode enum to ideas table
    - Create collab_requests table for partnership requests
    - Add stripe_payout_accounts for creator payouts

  2. Enums
    - ownership_mode: forsale, partnership, showcase

  3. Security
    - Enable RLS on collab_requests table
    - Add policies for collaboration requests
*/

-- Create ownership mode enum
CREATE TYPE ownership_mode AS ENUM ('forsale', 'partnership', 'showcase');

-- Add ownership_mode column to ideas table
ALTER TABLE ideas ADD COLUMN ownership_mode ownership_mode DEFAULT 'showcase';

-- Create collaboration requests table
CREATE TABLE IF NOT EXISTS collab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  linkedin_url text,
  message text NOT NULL,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe payout accounts table for creators
CREATE TABLE IF NOT EXISTS stripe_payout_accounts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id text,
  account_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_collab_requests_idea_id ON collab_requests(idea_id);
CREATE INDEX idx_collab_requests_investor_id ON collab_requests(investor_id);
CREATE INDEX idx_collab_requests_created_at ON collab_requests(created_at DESC);
CREATE INDEX idx_stripe_payout_accounts_user_id ON stripe_payout_accounts(user_id);

-- Enable RLS
ALTER TABLE collab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collab_requests
CREATE POLICY "Users can view collaboration requests for their ideas"
  ON collab_requests
  FOR SELECT
  TO authenticated
  USING (
    idea_id IN (
      SELECT id FROM ideas WHERE created_by = auth.uid()
    ) OR investor_id = auth.uid()
  );

CREATE POLICY "Investors can create collaboration requests"
  ON collab_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Idea creators can update collaboration requests"
  ON collab_requests
  FOR UPDATE
  TO authenticated
  USING (
    idea_id IN (
      SELECT id FROM ideas WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for stripe_payout_accounts
CREATE POLICY "Users can view their own payout accounts"
  ON stripe_payout_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own payout accounts"
  ON stripe_payout_accounts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());