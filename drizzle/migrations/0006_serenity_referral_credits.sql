CREATE TABLE public.serenity_reward_staff (user_id uuid PRIMARY KEY, role text NOT NULL CHECK(role IN ('staff','admin')));
GRANT SELECT ON public.serenity_reward_staff TO authenticated;
GRANT ALL ON public.serenity_reward_staff TO service_role;
ALTER TABLE public.serenity_reward_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own staff authorization" ON public.serenity_reward_staff FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.serenity_is_staff(p_admin boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.serenity_reward_staff WHERE user_id=auth.uid() AND (NOT p_admin OR role='admin')) $$;
REVOKE ALL ON FUNCTION public.serenity_is_staff(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_is_staff(boolean) TO authenticated,service_role;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit_redeemed numeric NOT NULL DEFAULT 0;
CREATE TABLE public.serenity_referrals (
 transaction_id bigint PRIMARY KEY REFERENCES public.transactions(id), member_id bigint NOT NULL REFERENCES public.serenity_members(id),
 package_type text NOT NULL CHECK(package_type IN ('Room accommodation','Function hall','Exclusive resort')),
 net_eligible numeric NOT NULL DEFAULT 0 CHECK(net_eligible>=0), completed_date date, verified_by uuid, verified_at timestamptz,
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.serenity_referrals TO authenticated;
GRANT ALL ON public.serenity_referrals TO service_role;
ALTER TABLE public.serenity_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads referrals" ON public.serenity_referrals FOR SELECT TO authenticated USING(public.serenity_is_staff());
CREATE TABLE public.serenity_reward_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id bigint NOT NULL REFERENCES public.serenity_members(id),
 net_eligible numeric NOT NULL CHECK(net_eligible>0), amount numeric NOT NULL CHECK(amount>0), remaining numeric NOT NULL CHECK(remaining>=0 AND remaining<=amount),
 issued_at timestamptz NOT NULL DEFAULT now(), expires_on date NOT NULL, status text NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Expired','Reversed')), staff_user uuid NOT NULL, reason text NOT NULL
);
GRANT SELECT ON public.serenity_reward_issues TO authenticated;
GRANT ALL ON public.serenity_reward_issues TO service_role;
ALTER TABLE public.serenity_reward_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads issues" ON public.serenity_reward_issues FOR SELECT TO authenticated USING(public.serenity_is_staff());
CREATE TABLE public.serenity_reward_bookings (
 transaction_id bigint PRIMARY KEY REFERENCES public.serenity_referrals(transaction_id), issue_id uuid NOT NULL REFERENCES public.serenity_reward_issues(id), net_eligible numeric NOT NULL CHECK(net_eligible>0)
);
GRANT SELECT ON public.serenity_reward_bookings TO authenticated;
GRANT ALL ON public.serenity_reward_bookings TO service_role;
ALTER TABLE public.serenity_reward_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads reward bookings" ON public.serenity_reward_bookings FOR SELECT TO authenticated USING(public.serenity_is_staff());
CREATE TABLE public.serenity_credit_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, member_id bigint NOT NULL REFERENCES public.serenity_members(id), issue_id uuid NOT NULL REFERENCES public.serenity_reward_issues(id),
 transaction_id bigint REFERENCES public.transactions(id), kind text NOT NULL CHECK(kind IN ('Earned','Redeemed','Expired','Reversed','Refunded','Adjusted')),
 amount numeric NOT NULL CHECK(amount<>0), staff_user uuid, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), request_id uuid NOT NULL DEFAULT gen_random_uuid(), UNIQUE(request_id,issue_id,kind)
);
GRANT SELECT ON public.serenity_credit_ledger TO authenticated;
GRANT ALL ON public.serenity_credit_ledger TO service_role;
ALTER TABLE public.serenity_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads credit ledger" ON public.serenity_credit_ledger FOR SELECT TO authenticated USING(public.serenity_is_staff());
CREATE TABLE public.serenity_credit_redemptions (
 transaction_id bigint PRIMARY KEY REFERENCES public.transactions(id), member_id bigint NOT NULL REFERENCES public.serenity_members(id), amount numeric NOT NULL CHECK(amount>0), package_type text NOT NULL, refunded boolean NOT NULL DEFAULT false, staff_user uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.serenity_credit_redemptions TO authenticated;
GRANT ALL ON public.serenity_credit_redemptions TO service_role;
ALTER TABLE public.serenity_credit_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff reads redemptions" ON public.serenity_credit_redemptions FOR SELECT TO authenticated USING(public.serenity_is_staff());
CREATE FUNCTION public.serenity_package_ceiling(p_id bigint,p_package text) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.transactions; s public.settings; days numeric; charge numeric;
BEGIN
 SELECT * INTO t FROM public.transactions WHERE id=p_id;
 IF NOT FOUND OR t.module<>'Booking' OR COALESCE(t.status,'') IN ('Cancelled','Refunded') THEN RETURN 0; END IF;
 SELECT * INTO s FROM public.settings WHERE id='default';
 days:=GREATEST(1,ceil(EXTRACT(epoch FROM (NULLIF(t.check_out,'')::timestamptz-NULLIF(t.check_in,'')::timestamptz))/86400));
 charge:=CASE p_package WHEN 'Room accommodation' THEN ((CASE WHEN t.room_type LIKE '%Kubo Room%' THEN COALESCE(s.kubo_room_rate,1000) ELSE 0 END)+(CASE WHEN t.room_type LIKE '%Barkada Room%' THEN COALESCE(s.barkada_room_rate,1500) ELSE 0 END))*days WHEN 'Function hall' THEN COALESCE(t.function_hall_fee,0)+COALESCE(t.function_hall_total,0) WHEN 'Exclusive resort' THEN CASE WHEN t.booking_type='Exclusive' THEN COALESCE(s.exclusive_fee,5000) ELSE 0 END ELSE 0 END;
 RETURN GREATEST(0,LEAST(charge-COALESCE(t.discount_amount,0)-COALESCE(t.credit_redeemed,0),t.amount_paid-COALESCE(t.maintenance_fee,0)-COALESCE(t.drinks_corkage_fee,0)-COALESCE(t.liquor_corkage_fee,0)-COALESCE(t.extension_fee,0)-COALESCE(t.number_of_tables,0)*COALESCE(s.table_rent_rate,200)));
END $$;
REVOKE ALL ON FUNCTION public.serenity_package_ceiling(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_package_ceiling(bigint,text) TO authenticated,service_role;
CREATE FUNCTION public.serenity_expire_credits(p_member bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lot public.serenity_reward_issues; today date:=(now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
 IF NOT public.serenity_is_staff() AND current_user<>'postgres' AND auth.role()<>'service_role' THEN RAISE EXCEPTION 'Authorized staff sign-in required'; END IF;
 PERFORM 1 FROM public.serenity_members WHERE id=p_member FOR UPDATE;
 FOR lot IN SELECT * FROM public.serenity_reward_issues WHERE member_id=p_member AND status='Active' AND expires_on<=today ORDER BY id FOR UPDATE LOOP
  IF lot.remaining>0 THEN INSERT INTO public.serenity_credit_ledger(member_id,issue_id,kind,amount,staff_user,reason) VALUES(p_member,lot.id,'Expired',-lot.remaining,auth.uid(),'One-year credit expiry'); END IF;
  UPDATE public.serenity_reward_issues SET remaining=0,status='Expired' WHERE id=lot.id;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.serenity_expire_credits(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_expire_credits(bigint) TO authenticated,service_role;
CREATE FUNCTION public.serenity_save_referral(p_booking bigint,p_token text,p_package text,p_net numeric,p_completed date,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.transactions; m public.serenity_members; paid numeric; today date:=(now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
 IF NOT public.serenity_is_staff() THEN RAISE EXCEPTION 'Authorized staff sign-in required'; END IF;
 SELECT * INTO m FROM public.serenity_members WHERE qr_token=p_token FOR UPDATE;
 IF NOT FOUND OR m.status<>'Active' OR m.issue_date>today OR m.expiry_date<today THEN RAISE EXCEPTION 'Active referrer required'; END IF;
 SELECT * INTO t FROM public.transactions WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR t.module<>'Booking' OR COALESCE(t.status,'') IN ('Cancelled','Refunded') OR public.serenity_package_ceiling(p_booking,p_package)<=0 THEN RAISE EXCEPTION 'Eligible active package booking required'; END IF;
 IF NULLIF(lower(btrim(t.customer_name)),'') IS NULL OR lower(btrim(t.customer_name))=lower(btrim(m.customer_name)) OR EXISTS(SELECT 1 FROM public.serenity_discount_audits WHERE transaction_id=p_booking AND membership_id=m.member_id) THEN RAISE EXCEPTION 'Self-referrals are not allowed'; END IF;
 IF EXISTS(SELECT 1 FROM public.serenity_reward_bookings WHERE transaction_id=p_booking) THEN RAISE EXCEPTION 'This booking has already earned a reward'; END IF;
 IF NULLIF(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Verification reason required'; END IF;
 IF p_completed IS NOT NULL THEN
  SELECT COALESCE(sum(amount),0) INTO paid FROM public.booking_payments WHERE transaction_id=p_booking;
  IF t.payment_status<>'Fully Paid' OR COALESCE(t.balance,0)<>0 OR paid<t.amount_paid OR t.amount_paid<=0 OR NULLIF(t.check_out,'') IS NULL OR NULLIF(t.check_in,'') IS NULL OR NULLIF(t.check_out,'')::timestamptz>now() OR p_completed<NULLIF(t.check_out,'')::timestamptz::date OR p_completed>today THEN RAISE EXCEPTION 'Booking must be completed, fully paid and supported by actual payment records'; END IF;
  IF p_net IS NULL OR p_net<=0 OR p_net>public.serenity_package_ceiling(p_booking,p_package) OR p_net>paid THEN RAISE EXCEPTION 'Net eligible payments exceed recorded eligible package charges'; END IF;
 END IF;
 INSERT INTO public.serenity_referrals(transaction_id,member_id,package_type,net_eligible,completed_date,verified_by,verified_at,reason) VALUES(p_booking,m.id,p_package,CASE WHEN p_completed IS NULL THEN 0 ELSE round(p_net,2) END,p_completed,auth.uid(),CASE WHEN p_completed IS NULL THEN NULL ELSE now() END,p_reason)
 ON CONFLICT(transaction_id) DO UPDATE SET member_id=EXCLUDED.member_id,package_type=EXCLUDED.package_type,net_eligible=EXCLUDED.net_eligible,completed_date=EXCLUDED.completed_date,verified_by=EXCLUDED.verified_by,verified_at=EXCLUDED.verified_at,reason=EXCLUDED.reason;
END $$;
REVOKE ALL ON FUNCTION public.serenity_save_referral(bigint,text,text,numeric,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_save_referral(bigint,text,text,numeric,date,text) TO authenticated;
CREATE FUNCTION public.serenity_issue_rewards(p_member bigint) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ids bigint[]; total numeric; reward numeric; issuance uuid; count_issued integer:=0; today date:=(now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
 IF NOT public.serenity_is_staff() THEN RAISE EXCEPTION 'Authorized staff sign-in required'; END IF;
 PERFORM 1 FROM public.serenity_members WHERE id=p_member AND status='Active' AND issue_date<=today AND expiry_date>=today FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active member required'; END IF;
 PERFORM public.serenity_expire_credits(p_member);
 LOOP
  SELECT array_agg(transaction_id),sum(net_eligible) INTO ids,total FROM (
   SELECT r.transaction_id,r.net_eligible FROM public.serenity_referrals r JOIN public.transactions t ON t.id=r.transaction_id
   WHERE r.member_id=p_member AND r.completed_date IS NOT NULL AND r.verified_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.serenity_reward_bookings b WHERE b.transaction_id=r.transaction_id)
   AND COALESCE(t.status,'') NOT IN ('Cancelled','Refunded') AND t.payment_status='Fully Paid' AND COALESCE(t.balance,0)=0 AND NULLIF(t.check_out,'')::timestamptz<=now()
   AND r.net_eligible>0 AND r.net_eligible<=public.serenity_package_ceiling(t.id,r.package_type) AND (SELECT COALESCE(sum(amount),0) FROM public.booking_payments WHERE transaction_id=t.id)>=t.amount_paid
   AND lower(btrim(t.customer_name))<>(SELECT lower(btrim(customer_name)) FROM public.serenity_members WHERE id=p_member)
   ORDER BY r.verified_at,r.transaction_id LIMIT 10 FOR UPDATE OF r,t
  ) q;
  EXIT WHEN COALESCE(array_length(ids,1),0)<10;
  reward:=round(total*0.10,2);
  INSERT INTO public.serenity_reward_issues(member_id,net_eligible,amount,remaining,expires_on,staff_user,reason) VALUES(p_member,total,reward,reward,(today+interval '1 year')::date,auth.uid(),'10 qualifying referral bookings') RETURNING id INTO issuance;
  INSERT INTO public.serenity_reward_bookings(transaction_id,issue_id,net_eligible) SELECT transaction_id,issuance,net_eligible FROM public.serenity_referrals WHERE transaction_id=ANY(ids);
  INSERT INTO public.serenity_credit_ledger(member_id,issue_id,kind,amount,staff_user,reason) VALUES(p_member,issuance,'Earned',reward,auth.uid(),'10% of net eligible actual payments for 10 unique completed bookings');
  count_issued:=count_issued+1;
 END LOOP;
 RETURN count_issued;
END $$;
REVOKE ALL ON FUNCTION public.serenity_issue_rewards(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_issue_rewards(bigint) TO authenticated;
CREATE FUNCTION public.serenity_redeem(p_booking bigint,p_token text,p_package text,p_amount numeric,p_request uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.serenity_members; t public.transactions; lot public.serenity_reward_issues; available numeric; due numeric; take numeric; left_amount numeric; today date:=(now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
 IF NOT public.serenity_is_staff() THEN RAISE EXCEPTION 'Authorized staff sign-in required'; END IF;
 SELECT * INTO m FROM public.serenity_members WHERE qr_token=p_token FOR UPDATE;
 IF NOT FOUND OR m.status<>'Active' OR m.issue_date>today OR m.expiry_date<today THEN RAISE EXCEPTION 'Active member required'; END IF;
 SELECT * INTO t FROM public.transactions WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR t.module<>'Booking' OR COALESCE(t.status,'') IN ('Cancelled','Refunded') OR lower(btrim(t.customer_name)) IS DISTINCT FROM lower(btrim(m.customer_name)) THEN RAISE EXCEPTION 'Credits are non-transferable; booking must belong to this member'; END IF;
 IF NULLIF(t.check_in,'') IS NULL OR (NULLIF(t.check_in,'')::timestamptz AT TIME ZONE 'Asia/Manila')::date<today OR ((NULLIF(t.check_in,'')::timestamptz AT TIME ZONE 'Asia/Manila')::date-(t.date_time AT TIME ZONE 'Asia/Manila')::date)<14 THEN RAISE EXCEPTION 'Future package must be booked at least 14 days before check-in or event'; END IF;
 IF COALESCE(t.discount_amount,0)>0 OR EXISTS(SELECT 1 FROM public.serenity_discount_audits WHERE transaction_id=p_booking) THEN RAISE EXCEPTION 'Personal discounts and credits cannot be combined'; END IF;
 IF EXISTS(SELECT 1 FROM public.serenity_credit_redemptions WHERE transaction_id=p_booking) THEN RAISE EXCEPTION 'Credits have already been redeemed against this booking'; END IF;
 PERFORM public.serenity_expire_credits(m.id);
 SELECT COALESCE(sum(remaining),0) INTO available FROM public.serenity_reward_issues WHERE member_id=m.id AND status='Active' AND expires_on>today;
 due:=t.amount_paid-COALESCE(t.deposit_amount,0);
 IF p_amount IS NULL OR p_amount<>round(p_amount,2) OR p_amount<=0 OR p_amount>available OR p_amount>due OR p_amount>public.serenity_package_ceiling(p_booking,p_package) THEN RAISE EXCEPTION 'Insufficient unexpired credits or eligible unpaid package charges'; END IF;
 left_amount:=p_amount;
 INSERT INTO public.serenity_credit_redemptions(transaction_id,member_id,amount,package_type,staff_user) VALUES(p_booking,m.id,p_amount,p_package,auth.uid());
 FOR lot IN SELECT * FROM public.serenity_reward_issues WHERE member_id=m.id AND status='Active' AND expires_on>today AND remaining>0 ORDER BY expires_on,issued_at,id FOR UPDATE LOOP
  EXIT WHEN left_amount=0;
  take:=LEAST(left_amount,lot.remaining);
  UPDATE public.serenity_reward_issues SET remaining=remaining-take WHERE id=lot.id;
  INSERT INTO public.serenity_credit_ledger(member_id,issue_id,transaction_id,kind,amount,staff_user,reason,request_id) VALUES(m.id,lot.id,p_booking,'Redeemed',-take,auth.uid(),'Eligible future '||p_package||' package',p_request);
  left_amount:=left_amount-take;
 END LOOP;
 UPDATE public.transactions SET amount_paid=amount_paid-p_amount,credit_redeemed=p_amount,balance=GREATEST(0,due-p_amount),payment_status=CASE WHEN due=p_amount THEN 'Fully Paid' WHEN COALESCE(deposit_amount,0)>0 THEN 'Partially Paid' ELSE 'Unpaid' END,date_settled=CASE WHEN due=p_amount THEN today::text ELSE date_settled END WHERE id=p_booking;
END $$;
REVOKE ALL ON FUNCTION public.serenity_redeem(bigint,text,text,numeric,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_redeem(bigint,text,text,numeric,uuid) TO authenticated;
CREATE FUNCTION public.serenity_adjust_credit(p_issue uuid,p_kind text,p_amount numeric,p_booking bigint,p_reason text,p_request uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lot public.serenity_reward_issues; redemption public.serenity_credit_redemptions; row_entry public.serenity_credit_ledger; t public.transactions; today date:=(now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
 IF NOT public.serenity_is_staff(true) THEN RAISE EXCEPTION 'Authorized administrator required'; END IF;
 IF NULLIF(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Adjustment reason required'; END IF;
 SELECT * INTO lot FROM public.serenity_reward_issues WHERE id=p_issue;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reward issuance not found'; END IF;
 PERFORM 1 FROM public.serenity_members WHERE id=lot.member_id FOR UPDATE;
 PERFORM public.serenity_expire_credits(lot.member_id);
 SELECT * INTO lot FROM public.serenity_reward_issues WHERE id=p_issue FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.serenity_credit_ledger WHERE request_id=p_request) THEN RAISE EXCEPTION 'Adjustment already recorded'; END IF;
 IF p_kind='Refunded' THEN
  SELECT * INTO redemption FROM public.serenity_credit_redemptions WHERE transaction_id=p_booking AND member_id=lot.member_id FOR UPDATE;
  IF NOT FOUND OR redemption.refunded THEN RAISE EXCEPTION 'Unrefunded member redemption required'; END IF;
  SELECT * INTO t FROM public.transactions WHERE id=p_booking FOR UPDATE;
  FOR row_entry IN SELECT * FROM public.serenity_credit_ledger WHERE transaction_id=p_booking AND kind='Redeemed' LOOP
   UPDATE public.serenity_reward_issues SET remaining=remaining-row_entry.amount WHERE id=row_entry.issue_id AND status='Active' AND expires_on>today;
   INSERT INTO public.serenity_credit_ledger(member_id,issue_id,transaction_id,kind,amount,staff_user,reason,request_id) VALUES(lot.member_id,row_entry.issue_id,p_booking,'Refunded',-row_entry.amount,auth.uid(),p_reason,p_request);
   IF NOT EXISTS(SELECT 1 FROM public.serenity_reward_issues WHERE id=row_entry.issue_id AND status='Active' AND expires_on>today) THEN INSERT INTO public.serenity_credit_ledger(member_id,issue_id,transaction_id,kind,amount,staff_user,reason,request_id) VALUES(lot.member_id,row_entry.issue_id,p_booking,'Expired',row_entry.amount,auth.uid(),'Restored credits retain original expiry',p_request); END IF;
  END LOOP;
  UPDATE public.serenity_credit_redemptions SET refunded=true WHERE transaction_id=p_booking;
  UPDATE public.transactions SET amount_paid=amount_paid+redemption.amount,credit_redeemed=0,balance=GREATEST(0,amount_paid+redemption.amount-COALESCE(deposit_amount,0)),payment_status=CASE WHEN amount_paid+redemption.amount<=COALESCE(deposit_amount,0) THEN 'Fully Paid' WHEN COALESCE(deposit_amount,0)>0 THEN 'Partially Paid' ELSE 'Unpaid' END,date_settled=NULL WHERE id=p_booking;
 ELSIF p_kind='Reversed' THEN
  IF lot.status<>'Active' OR lot.remaining<>lot.amount THEN RAISE EXCEPTION 'Restore spent credits first; reversal cannot create a negative balance'; END IF;
  UPDATE public.serenity_reward_issues SET remaining=0,status='Reversed' WHERE id=p_issue;
  INSERT INTO public.serenity_credit_ledger(member_id,issue_id,kind,amount,staff_user,reason,request_id) VALUES(lot.member_id,p_issue,'Reversed',-lot.remaining,auth.uid(),p_reason,p_request);
 ELSIF p_kind='Adjusted' THEN
  IF p_amount IS NULL OR p_amount=0 OR p_amount<>round(p_amount,2) OR lot.status<>'Active' OR lot.expires_on<=today OR lot.remaining+p_amount<0 OR lot.remaining+p_amount>lot.amount THEN RAISE EXCEPTION 'Adjustment exceeds the available original credit'; END IF;
  UPDATE public.serenity_reward_issues SET remaining=remaining+p_amount WHERE id=p_issue;
  INSERT INTO public.serenity_credit_ledger(member_id,issue_id,transaction_id,kind,amount,staff_user,reason,request_id) VALUES(lot.member_id,p_issue,p_booking,'Adjusted',p_amount,auth.uid(),p_reason,p_request);
 ELSE RAISE EXCEPTION 'Invalid adjustment type'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.serenity_adjust_credit(uuid,text,numeric,bigint,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_adjust_credit(uuid,text,numeric,bigint,text,uuid) TO authenticated;
CREATE FUNCTION public.serenity_guard_reward_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.serenity_reward_bookings b JOIN public.serenity_reward_issues i ON i.id=b.issue_id WHERE b.transaction_id=OLD.id AND i.status<>'Reversed') AND (NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount OR NEW.balance IS DISTINCT FROM OLD.balance OR NEW.payment_status IS DISTINCT FROM OLD.payment_status OR NEW.status IS DISTINCT FROM OLD.status OR NEW.customer_name IS DISTINCT FROM OLD.customer_name OR NEW.room_type IS DISTINCT FROM OLD.room_type OR NEW.function_hall_total IS DISTINCT FROM OLD.function_hall_total OR NEW.function_hall_fee IS DISTINCT FROM OLD.function_hall_fee OR NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.check_out IS DISTINCT FROM OLD.check_out) THEN RAISE EXCEPTION 'Reverse the issued referral reward before changing this qualifying booking'; END IF;
 IF COALESCE(OLD.credit_redeemed,0)>0 AND NEW.credit_redeemed=OLD.credit_redeemed AND (NEW.amount_paid IS DISTINCT FROM OLD.amount_paid OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount OR NEW.customer_name IS DISTINCT FROM OLD.customer_name OR NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.room_type IS DISTINCT FROM OLD.room_type OR NEW.function_hall_fee IS DISTINCT FROM OLD.function_hall_fee OR NEW.function_hall_total IS DISTINCT FROM OLD.function_hall_total) THEN RAISE EXCEPTION 'Restore redeemed credits before changing package charges, ownership or eligibility'; END IF;
 IF NEW.credit_redeemed IS DISTINCT FROM OLD.credit_redeemed AND NOT public.serenity_is_staff() THEN RAISE EXCEPTION 'Only authorized staff can apply or restore credits'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER serenity_guard_reward_booking BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.serenity_guard_reward_booking();
CREATE FUNCTION public.serenity_guard_payment_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.serenity_reward_bookings b JOIN public.serenity_reward_issues i ON i.id=b.issue_id WHERE b.transaction_id=OLD.transaction_id AND i.status<>'Reversed') THEN RAISE EXCEPTION 'Reverse the referral reward before changing qualifying payment history'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER serenity_guard_payment_history BEFORE UPDATE OR DELETE ON public.booking_payments FOR EACH ROW EXECUTE FUNCTION public.serenity_guard_payment_history();