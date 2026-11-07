import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "staff" | "admin" | null;

/** Resolves the signed-in user and their Serenity reward role (server-checked table, never client storage). */
export function useStaffAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<StaffRole>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback(async (u: User | null) => {
    if (!u) { setRole(null); setLoading(false); return; }
    const { data } = await supabase.from("serenity_reward_staff").select("role").eq("user_id", u.id).maybeSingle();
    setRole((data?.role as StaffRole) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setTimeout(() => loadRole(u), 0);
    });
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); loadRole(data.user); });
    return () => sub.subscription.unsubscribe();
  }, [loadRole]);

  return { user, role, loading, isStaff: role === "staff" || role === "admin", isAdmin: role === "admin", refreshRole: () => loadRole(user) };
}
