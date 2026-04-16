
-- Add game session tracking columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS default_hours numeric DEFAULT 2;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS extend_hours numeric DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS extend_amount numeric DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'ONGOING';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0;

-- Add game rates to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS billiard_rate numeric DEFAULT 100;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS videoke_rate numeric DEFAULT 200;
