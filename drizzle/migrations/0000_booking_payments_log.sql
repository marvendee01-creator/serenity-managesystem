CREATE TABLE public.booking_payments (
  id bigserial PRIMARY KEY,
  transaction_id bigint NOT NULL,
  payment_date date NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_payments TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.booking_payments_id_seq TO anon, authenticated;
GRANT ALL ON public.booking_payments TO service_role;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON public.booking_payments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX ON public.booking_payments(transaction_id);
CREATE INDEX ON public.booking_payments(payment_date);

CREATE OR REPLACE FUNCTION public.log_booking_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE diff numeric; d date;
BEGIN
  IF NEW.module <> 'Booking' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.deposit_amount,0) > 0 THEN
      INSERT INTO booking_payments(transaction_id, payment_date, amount, kind)
      VALUES (NEW.id, (NEW.date_time AT TIME ZONE 'Asia/Manila')::date, NEW.deposit_amount, 'Deposit');
    END IF;
  ELSE
    diff := COALESCE(NEW.deposit_amount,0) - COALESCE(OLD.deposit_amount,0);
    IF diff <> 0 THEN
      d := CASE WHEN NEW.date_settled IS DISTINCT FROM OLD.date_settled AND NEW.date_settled IS NOT NULL
                THEN NEW.date_settled::date ELSE (now() AT TIME ZONE 'Asia/Manila')::date END;
      INSERT INTO booking_payments(transaction_id, payment_date, amount, kind)
      VALUES (NEW.id, d, diff, CASE WHEN diff > 0 THEN 'Settlement' ELSE 'Adjustment' END);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_booking_payment AFTER INSERT OR UPDATE OF deposit_amount ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_booking_payment();

CREATE OR REPLACE FUNCTION public.delete_booking_payments() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM booking_payments WHERE transaction_id = OLD.id; RETURN OLD; END $$;
CREATE TRIGGER trg_delete_booking_payments AFTER DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.delete_booking_payments();