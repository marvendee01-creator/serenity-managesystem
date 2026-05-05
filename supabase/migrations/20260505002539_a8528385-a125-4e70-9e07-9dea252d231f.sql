-- Add function hall rate setting
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS function_hall_rate_per_day numeric NOT NULL DEFAULT 1500;

-- Add fields for booking function hall (additional to existing function_hall_fee)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS with_function_hall boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS function_hall_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS function_hall_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS function_hall_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_adult_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_fee numeric DEFAULT 0;

-- Food POS Inventory
CREATE TABLE IF NOT EXISTS public.food_inventory (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_description TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.food_inventory FOR ALL USING (true) WITH CHECK (true);

-- Food Sales (transactions)
CREATE TABLE IF NOT EXISTS public.food_sales (
  id BIGSERIAL PRIMARY KEY,
  sale_date DATE NOT NULL DEFAULT (now()::date),
  date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT,
  item_id BIGINT REFERENCES public.food_inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  cash_received NUMERIC NOT NULL DEFAULT 0,
  change_amount NUMERIC NOT NULL DEFAULT 0,
  capital NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  commission_share NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.food_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.food_sales FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_food_sales_date ON public.food_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_food_inventory_name ON public.food_inventory(item_name);