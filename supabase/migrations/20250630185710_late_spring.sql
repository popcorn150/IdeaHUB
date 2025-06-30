/*
  # Partnership Requests System

  1. New Tables
    - `partnership_requests` - Store partnership collaboration requests
    
  2. Security
    - Enable RLS on partnership_requests table
    - Add policies for creators and investors to manage requests
    
  3. Features
    - Track NDA agreements
    - Store collaboration request details
    - Link to ideas and users
*/

-- Create partnership requests table
CREATE TABLE IF NOT EXISTS partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_email text NOT NULL,
  message text NOT NULL,
  agreed_nda boolean DEFAULT true NOT NULL,
  nda_signature text NOT NULL,
  payment_amount_cents bigint DEFAULT 500 NOT NULL, -- $5.00 default
  payment_completed boolean DEFAULT false NOT NULL,
  stripe_payment_intent_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_partnership_requests_idea_id ON partnership_requests(idea_id);
CREATE INDEX idx_partnership_requests_creator_id ON partnership_requests(creator_id);
CREATE INDEX idx_partnership_requests_investor_id ON partnership_requests(investor_id);
CREATE INDEX idx_partnership_requests_status ON partnership_requests(status);
CREATE INDEX idx_partnership_requests_created_at ON partnership_requests(created_at DESC);

-- Enable RLS
ALTER TABLE partnership_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can view partnership requests for their ideas"
  ON partnership_requests
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Investors can view their own partnership requests"
  ON partnership_requests
  FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

CREATE POLICY "Investors can create partnership requests"
  ON partnership_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (investor_id = auth.uid());

CREATE POLICY "Creators can update partnership requests for their ideas"
  ON partnership_requests
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Investors can update their own partnership requests"
  ON partnership_requests
  FOR UPDATE
  TO authenticated
  USING (investor_id = auth.uid());