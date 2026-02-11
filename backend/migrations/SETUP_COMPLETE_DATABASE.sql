-- Complete Database Setup for WealthWise
-- Run this script in your Supabase SQL Editor to create all required tables

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  user_id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'User',
  email VARCHAR(255),
  avatar_url TEXT,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

COMMENT ON TABLE public.user_profiles IS 'Stores user profile information and preferences';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Unique identifier from authentication system';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN public.user_profiles.theme IS 'UI theme preference (light, dark, system)';

-- ============================================================================
-- 2. INCOMES TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.incomes CASCADE;

CREATE TABLE public.incomes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  income_type VARCHAR(100) NOT NULL,
  source VARCHAR(255),
  note TEXT,
  received_date DATE NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_month_year ON public.incomes(month, year);
CREATE INDEX IF NOT EXISTS idx_incomes_received_date ON public.incomes(received_date);

COMMENT ON TABLE public.incomes IS 'Stores user income records';

-- ============================================================================
-- 3. TRANSACTIONS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE public.transactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  txn_type VARCHAR(20) NOT NULL CHECK (txn_type IN ('income', 'expense')),
  category VARCHAR(100),
  description TEXT,
  payment_mode VARCHAR(50),
  txn_date DATE NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ocr')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON public.transactions(month, year);
CREATE INDEX IF NOT EXISTS idx_transactions_txn_date ON public.transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_txn_type ON public.transactions(txn_type);

COMMENT ON TABLE public.transactions IS 'Stores all user transactions (income and expenses)';

-- ============================================================================
-- 4. BUDGETS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.budgets CASCADE;

CREATE TABLE public.budgets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  category VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  budget_type VARCHAR(20) DEFAULT 'Monthly' CHECK (budget_type IN ('Monthly', 'Weekly')),
  alert_threshold INT DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category);

COMMENT ON TABLE public.budgets IS 'Stores budget limits and alerts for different categories';

-- ============================================================================
-- 5. GOALS TABLE
-- ============================================================================
DROP TABLE IF EXISTS public.goals CASCADE;

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('emergency', 'travel', 'education', 'gadget', 'home', 'other')),
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

COMMENT ON TABLE public.goals IS 'Stores user financial goals';

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_profiles
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to transactions
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to budgets
DROP TRIGGER IF EXISTS trigger_budgets_updated_at ON public.budgets;
CREATE TRIGGER trigger_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to goals
DROP TRIGGER IF EXISTS trigger_goals_updated_at ON public.goals;
CREATE TRIGGER trigger_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - Uncomment to insert test data)
-- ============================================================================

-- INSERT INTO public.user_profiles (user_id, name, email)
-- VALUES ('test_user_123', 'Demo User', 'demo@wealthwise.com');

-- INSERT INTO public.incomes (user_id, amount, income_type, source, received_date, month, year)
-- VALUES ('test_user_123', 50000, 'Salary', 'Tech Corp', '2026-02-01', 2, 2026);

-- INSERT INTO public.transactions (user_id, amount, txn_type, category, description, payment_mode, txn_date, month, year)
-- VALUES 
--   ('test_user_123', 5000, 'expense', 'groceries', 'Weekly groceries', 'Credit Card', '2026-02-10', 2, 2026),
--   ('test_user_123', 2000, 'expense', 'transportation', 'Fuel', 'Cash', '2026-02-08', 2, 2026);

-- INSERT INTO public.budgets (user_id, category, amount, budget_type, alert_threshold, start_date)
-- VALUES 
--   ('test_user_123', 'groceries', 15000, 'Monthly', 80, '2026-02-01'),
--   ('test_user_123', 'entertainment', 5000, 'Monthly', 75, '2026-02-01');

-- INSERT INTO public.goals (user_id, name, category, target_amount, current_amount, deadline, notes)
-- VALUES 
--   ('test_user_123', 'Emergency Fund', 'emergency', 50000, 30000, '2026-06-15', 'Build 6 months emergency fund'),
--   ('test_user_123', 'Europe Vacation', 'travel', 100000, 40000, '2026-04-01', 'Summer trip');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify your tables are created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- SELECT * FROM public.user_profiles;
-- SELECT * FROM public.incomes;
-- SELECT * FROM public.transactions;
-- SELECT * FROM public.budgets;
-- SELECT * FROM public.goals;
