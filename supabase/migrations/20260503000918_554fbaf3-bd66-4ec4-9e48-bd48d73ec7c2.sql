ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS day_tour_rate numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS overnight_rate numeric NOT NULL DEFAULT 350;