-- Migration to add account_code, category, subcategory, and description to chart_of_accounts
ALTER TABLE public.chart_of_accounts
ADD COLUMN IF NOT EXISTS account_code TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
