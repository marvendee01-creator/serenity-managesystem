CREATE FUNCTION public.serenity_claim_first_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign-in required'; END IF;
 LOCK TABLE public.serenity_reward_staff IN EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.serenity_reward_staff WHERE role='admin') THEN RETURN false; END IF;
 INSERT INTO public.serenity_reward_staff(user_id,role) VALUES(auth.uid(),'admin') ON CONFLICT(user_id) DO UPDATE SET role='admin';
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.serenity_claim_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_claim_first_admin() TO authenticated;

CREATE FUNCTION public.serenity_admin_exists() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.serenity_reward_staff WHERE role='admin') $$;
REVOKE ALL ON FUNCTION public.serenity_admin_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_admin_exists() TO anon,authenticated;

CREATE FUNCTION public.serenity_list_staff() RETURNS TABLE(user_id uuid,email text,role text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.serenity_is_staff(true) THEN RAISE EXCEPTION 'Authorized administrator required'; END IF;
 RETURN QUERY SELECT u.id,u.email::text,COALESCE(s.role,'none') FROM auth.users u LEFT JOIN public.serenity_reward_staff s ON s.user_id=u.id ORDER BY u.email;
END $$;
REVOKE ALL ON FUNCTION public.serenity_list_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_list_staff() TO authenticated;

CREATE FUNCTION public.serenity_set_staff_role(p_user uuid,p_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.serenity_is_staff(true) THEN RAISE EXCEPTION 'Authorized administrator required'; END IF;
 IF p_role NOT IN ('staff','admin','none') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 IF p_user=auth.uid() AND p_role<>'admin' THEN RAISE EXCEPTION 'You cannot remove your own administrator role'; END IF;
 IF p_role='none' THEN DELETE FROM public.serenity_reward_staff WHERE user_id=p_user;
 ELSE INSERT INTO public.serenity_reward_staff(user_id,role) VALUES(p_user,p_role) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role; END IF;
END $$;
REVOKE ALL ON FUNCTION public.serenity_set_staff_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serenity_set_staff_role(uuid,text) TO authenticated;