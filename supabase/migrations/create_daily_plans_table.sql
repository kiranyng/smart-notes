/*
  # Create daily_plans table

  1. New Tables
    - `daily_plans`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `user_id` (uuid, foreign key to auth.users)
      - `plan_date` (date, unique with user_id)
      - `plan_content` (text, default '')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `daily_plans` table
    - Add policies for authenticated users to perform CRUD operations on their own plans.
  3. Changes
    - Added unique constraint on `user_id` and `plan_date` to ensure only one plan per user per day.
*/

CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan_date date NOT NULL,
  plan_content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (user_id, plan_date)
);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own daily plans"
  ON daily_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own daily plans"
  ON daily_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own daily plans"
  ON daily_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own daily plans"
  ON daily_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Optional: Add an index for faster lookups by user and date
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans (user_id, plan_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the update_updated_at_column function on updates
CREATE OR REPLACE TRIGGER update_daily_plans_updated_at
BEFORE UPDATE ON daily_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
