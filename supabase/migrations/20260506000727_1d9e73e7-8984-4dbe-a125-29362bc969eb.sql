ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS drinks_corkage_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquor_corkage_fee numeric DEFAULT 0;