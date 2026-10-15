ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deposit_date date;
CREATE OR REPLACE FUNCTION public.log_booking_payment()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE diff numeric; d date;
BEGIN
  IF NEW.module <> 'Booking' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.deposit_amount,0) > 0 THEN
      INSERT INTO booking_payments(transaction_id, payment_date, amount, kind)
      VALUES (NEW.id, COALESCE(NEW.deposit_date, (NEW.date_time AT TIME ZONE 'Asia/Manila')::date), NEW.deposit_amount, 'Deposit');
    END IF;
  ELSE
    diff := COALESCE(NEW.deposit_amount,0) - COALESCE(OLD.deposit_amount,0);
    IF diff <> 0 THEN
      d := CASE
        WHEN NEW.last_payment_date IS NOT NULL AND NEW.last_payment_date IS DISTINCT FROM OLD.last_payment_date THEN NEW.last_payment_date
        WHEN NEW.date_settled IS DISTINCT FROM OLD.date_settled AND NEW.date_settled IS NOT NULL THEN NEW.date_settled::date
        WHEN NEW.deposit_date IS NOT NULL AND (NEW.deposit_date IS DISTINCT FROM OLD.deposit_date OR COALESCE(OLD.deposit_amount,0) = 0) THEN NEW.deposit_date
        ELSE (now() AT TIME ZONE 'Asia/Manila')::date END;
      INSERT INTO booking_payments(transaction_id, payment_date, amount, kind)
      VALUES (NEW.id, d, diff, CASE WHEN COALESCE(OLD.deposit_amount,0) = 0 THEN 'Deposit' WHEN diff > 0 THEN 'Settlement' ELSE 'Adjustment' END);
    ELSIF NEW.deposit_date IS NOT NULL AND NEW.deposit_date IS DISTINCT FROM OLD.deposit_date THEN
      UPDATE booking_payments SET payment_date = NEW.deposit_date WHERE transaction_id = NEW.id AND kind = 'Deposit';
    END IF;
  END IF;
  RETURN NEW;
END $function$;