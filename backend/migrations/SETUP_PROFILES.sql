-- Setup user profiles table for WealthWise

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  user_id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'User',
  email VARCHAR(255),
  avatar_url TEXT,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Add some comments
COMMENT ON TABLE public.user_profiles IS 'Stores user profile information and preferences';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Unique identifier from authentication system';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN public.user_profiles.theme IS 'UI theme preference (light, dark, system)';

-- Example data (uncomment to insert sample data)
-- INSERT INTO public.user_profiles (user_id, name, email)
-- VALUES 
--   ('test_user_123', 'Demo User', 'demo@wealthwise.com');
