
-- Create transactions table
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_no TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  module TEXT NOT NULL,
  game_type TEXT,
  room_type TEXT,
  booking_type TEXT,
  adults INTEGER NOT NULL DEFAULT 0,
  children INTEGER NOT NULL DEFAULT 0,
  total_headcount INTEGER NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  customer_name TEXT,
  number_of_tables INTEGER,
  check_in TEXT,
  check_out TEXT,
  tour_type TEXT,
  corkage_fee NUMERIC DEFAULT 0,
  function_hall_fee NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_status TEXT,
  comments TEXT,
  entry_time TEXT,
  checkout_time TEXT,
  pax INTEGER,
  extension_fee NUMERIC DEFAULT 0,
  kids_8_above INTEGER DEFAULT 0,
  kids_5_7 INTEGER DEFAULT 0,
  kids_4_below INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  adult_rate_day NUMERIC NOT NULL DEFAULT 100,
  child_rate_day NUMERIC NOT NULL DEFAULT 50,
  adult_rate_night NUMERIC NOT NULL DEFAULT 150,
  child_rate_night NUMERIC NOT NULL DEFAULT 75,
  kids_8_above_rate_day NUMERIC DEFAULT 50,
  kids_5_7_rate_day NUMERIC DEFAULT 30,
  kids_8_above_rate_night NUMERIC DEFAULT 75,
  kids_5_7_rate_night NUMERIC DEFAULT 50,
  exclusive_fee NUMERIC NOT NULL DEFAULT 5000,
  barkada_room_rate NUMERIC NOT NULL DEFAULT 1500,
  kubo_room_rate NUMERIC NOT NULL DEFAULT 1000,
  table_rent_rate NUMERIC NOT NULL DEFAULT 200,
  company_name TEXT DEFAULT 'SERENITY INLAND RESORT',
  company_address TEXT DEFAULT '',
  contact_number TEXT DEFAULT '',
  tin_number TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cashier_reports table
CREATE TABLE public.cashier_reports (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  beginning_cash NUMERIC NOT NULL DEFAULT 0,
  sales NUMERIC NOT NULL DEFAULT 0,
  petty_cash NUMERIC NOT NULL DEFAULT 0,
  expected_ending_cash NUMERIC NOT NULL DEFAULT 0,
  actual_cash NUMERIC NOT NULL DEFAULT 0,
  cash_over_short NUMERIC NOT NULL DEFAULT 0,
  petty_items JSONB DEFAULT '[]',
  denoms JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create booking_cashier_reports table
CREATE TABLE public.booking_cashier_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date TEXT NOT NULL,
  beginning_cash NUMERIC NOT NULL DEFAULT 0,
  entrance_sales NUMERIC NOT NULL DEFAULT 0,
  petty_items JSONB DEFAULT '[]',
  denoms JSONB DEFAULT '[]',
  actual_cash NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system_config table
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cashier_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal POS system)
CREATE POLICY "Public access" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.cashier_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.booking_cashier_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO public.settings (id) VALUES ('default');

-- Create indexes
CREATE INDEX idx_transactions_module ON public.transactions (module);
CREATE INDEX idx_transactions_date ON public.transactions (date_time);
CREATE INDEX idx_transactions_payment_status ON public.transactions (payment_status);
