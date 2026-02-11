-- Migration: Add source column to transactions table
-- This column tracks whether a transaction was entered manually or via OCR

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';

-- Add constraint to ensure valid source values
ALTER TABLE transactions 
ADD CONSTRAINT valid_source CHECK (source IN ('manual', 'ocr'));

-- Create index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'source';
