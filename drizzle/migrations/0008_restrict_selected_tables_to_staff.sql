DROP POLICY IF EXISTS "Public access" ON public.food_sales;
DROP POLICY IF EXISTS "Public access" ON public.settings;
DROP POLICY IF EXISTS "Public access" ON public.serenity_members;
DROP POLICY IF EXISTS "Public access" ON public.booking_cashier_reports;
DROP POLICY IF EXISTS "Public access" ON public.food_inventory;
DROP POLICY IF EXISTS "Public access" ON public.journal_entries;
DROP POLICY IF EXISTS "Public access" ON public.cashier_reports;
DROP POLICY IF EXISTS "Public access" ON public.system_config;
DROP POLICY IF EXISTS "Public access" ON public.transactions;
DROP POLICY IF EXISTS "Public access" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Public access" ON public.booking_payments;
DROP POLICY IF EXISTS "Staff can read discount audits" ON public.serenity_discount_audits;

REVOKE ALL ON TABLE public.food_sales, public.settings, public.serenity_members, public.booking_cashier_reports, public.food_inventory, public.journal_entries, public.cashier_reports, public.system_config, public.transactions, public.chart_of_accounts, public.booking_payments, public.serenity_discount_audits FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.food_sales, public.settings, public.serenity_members, public.booking_cashier_reports, public.food_inventory, public.journal_entries, public.cashier_reports, public.system_config, public.transactions, public.chart_of_accounts, public.booking_payments TO authenticated;
GRANT SELECT ON TABLE public.serenity_discount_audits TO authenticated;
GRANT ALL ON TABLE public.food_sales, public.settings, public.serenity_members, public.booking_cashier_reports, public.food_inventory, public.journal_entries, public.cashier_reports, public.system_config, public.transactions, public.chart_of_accounts, public.booking_payments, public.serenity_discount_audits TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.food_sales_id_seq, public.food_inventory_id_seq, public.booking_cashier_reports_id_seq, public.cashier_reports_id_seq, public.transactions_id_seq, public.booking_payments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.food_sales_id_seq, public.food_inventory_id_seq, public.booking_cashier_reports_id_seq, public.cashier_reports_id_seq, public.transactions_id_seq, public.booking_payments_id_seq TO service_role;

ALTER TABLE public.food_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serenity_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cashier_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serenity_discount_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized Serenity staff can access food sales" ON public.food_sales FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access settings" ON public.settings FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access members" ON public.serenity_members FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access booking cashier reports" ON public.booking_cashier_reports FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access food inventory" ON public.food_inventory FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access journal entries" ON public.journal_entries FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access cashier reports" ON public.cashier_reports FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access system config" ON public.system_config FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access transactions" ON public.transactions FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access chart of accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can access booking payments" ON public.booking_payments FOR ALL TO authenticated USING (public.serenity_is_staff()) WITH CHECK (public.serenity_is_staff());
CREATE POLICY "Authorized Serenity staff can read discount audits" ON public.serenity_discount_audits FOR SELECT TO authenticated USING (public.serenity_is_staff());