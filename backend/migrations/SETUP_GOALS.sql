-- Goals Table Setup for WealthWise
-- Run this script in Supabase SQL Editor

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('emergency', 'travel', 'education', 'gadget', 'home', 'other')),
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast queries by user_id
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS trigger_goals_updated_at ON goals;
CREATE TRIGGER trigger_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION update_goals_updated_at();

-- Insert sample data (optional - for testing)
-- INSERT INTO goals (user_id, name, category, target_amount, current_amount, deadline, notes)
-- VALUES 
--   ('user123', 'Emergency Fund', 'emergency', 50000, 30000, '2026-06-15', 'Build 6 months emergency fund'),
--   ('user123', 'Vacation', 'travel', 100000, 40000, '2026-04-01', 'Summer trip to Europe');
