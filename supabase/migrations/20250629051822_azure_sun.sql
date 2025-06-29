/*
  # Community Interaction System

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `idea_id` (uuid, foreign key to ideas)
      - `user_id` (uuid, foreign key to users)
      - `comment_text` (text)
      - `created_at` (timestamp)
    - `upvotes`
      - `idea_id` (uuid, foreign key to ideas)
      - `user_id` (uuid, foreign key to users)
      - Primary key on (idea_id, user_id) to prevent duplicate votes
    - Update `ideas` table to add `remix_of_id` column

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to interact with content
    - Users can read all comments and upvotes
    - Users can only create/update/delete their own comments
    - Users can upvote/downvote ideas (one vote per user per idea)

  3. Indexes
    - Add indexes for performance on foreign keys and common queries
*/

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create upvotes table with composite primary key
CREATE TABLE IF NOT EXISTS upvotes (
  idea_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

-- Add remix_of_id column to ideas table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'remix_of_id'
  ) THEN
    ALTER TABLE ideas ADD COLUMN remix_of_id uuid;
  END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE comments 
ADD CONSTRAINT comments_idea_id_fkey 
FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE;

ALTER TABLE comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE upvotes 
ADD CONSTRAINT upvotes_idea_id_fkey 
FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE;

ALTER TABLE upvotes 
ADD CONSTRAINT upvotes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key for remix functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ideas_remix_of_id_fkey' 
    AND table_name = 'ideas'
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT ideas_remix_of_id_fkey 
    FOREIGN KEY (remix_of_id) REFERENCES ideas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_idea_id ON comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upvotes_idea_id ON upvotes(idea_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user_id ON upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_remix_of_id ON ideas(remix_of_id);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Upvotes policies
CREATE POLICY "Anyone can read upvotes"
  ON upvotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their upvotes"
  ON upvotes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);