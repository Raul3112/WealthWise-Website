-- Migration: Remove timezone column from user_profiles table
-- This column is not needed for India-only application

ALTER TABLE user_profiles DROP COLUMN IF EXISTS timezone;
