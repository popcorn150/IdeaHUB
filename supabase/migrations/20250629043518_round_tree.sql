/*
  # Create Idea-HUB Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Matches auth.users.id
      - `username` (text, unique)
      - `bio` (text, optional)
      - `email` (text, unique)
      - `avatar` (text, optional)
      - `wallet_address` (text, optional)
      - `created_at` (timestamp)
    
    - `ideas`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `tags` (text array)
      - `image` (text, optional)
      - `is_nft` (boolean, default false)
      - `minted_by` (uuid, optional, references users or wallet)
      - `is_blurred` (boolean, default false)
      - `created_by` (uuid, references users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/write their own data
    - Allow public reading of ideas (with blurred content protection handled in app)

  3. Indexes
    - Add indexes for performance on frequently queried columns
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  bio text,
  email text UNIQUE NOT NULL,
  avatar text,
  wallet_address text,
  created_at timestamptz DEFAULT now()
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  image text,
  is_nft boolean DEFAULT false,
  minted_by text,
  is_blurred boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ideas policies
CREATE POLICY "Anyone can read ideas"
  ON ideas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own ideas"
  ON ideas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own ideas"
  ON ideas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own ideas"
  ON ideas
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideas_created_by ON ideas(created_by);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_is_nft ON ideas(is_nft);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);