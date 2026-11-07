import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/hooks/use-staff-auth";
import { useToast } from "@/hooks/use-toast";

type StaffRow = { user_id: string; email: string; role: string };

export default function StaffAccessPanel() {
  const { user, role, isAdmin, loading, refreshRole } = useStaffAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [rows, setRows] = useState<StaffRow[]>([]);

  useEffect(() => { supabase.rpc("serenity_admin_exists").then(({ data }) => setAdminExists(!!data)); }, [role]);

  const loadRows = async () => {
    const { data, error } = await supabase.rpc("serenity_list_staff");
    if (!error) setRows((data as StaffRow[]) || []);
  };
  useEffect(() => { if (isAdmin) loadRows(); }, [isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast({ title: "Check your email", description: "Confirm your address, then sign in. An administrator must grant you a role." });
        setMode("signin");
      }
      setPassword("");
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const claim = async () => {
    const { data, error } = await supabase.rpc("serenity_claim_first_admin");
    if (error || !data) toast({ title: "Not allowed", description: error?.message || "An administrator already exists.", variant: "destructive" });
    else { toast({ title: "You are now the administrator" }); refreshRole(); }
  };

  const setRole = async (id: string, r: string) => {
    const { error } = await supabase.rpc("serenity_set_staff_role", { p_user: id, p_role: r });
    if (error) toast({ title: "Role not changed", description: error.message, variant: "destructive" });
    else { toast({ title: "Role updated" }); loadRows(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!user) return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground">Staff {mode === "signin" ? "Sign In" : "Account Request"}</h3>
      <input type="email" required autoFocus placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <input type="password" required minLength={8} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <button disabled={busy} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{mode === "signin" ? "Sign In" : "Create Account"}</button>
      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-xs text-muted-foreground hover:text-foreground">
        {mode === "signin" ? "New staff? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">Role: {role === "admin" ? "Administrator" : role === "staff" ? "Staff" : "No reward access yet"}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="rounded-md border border-border px-3 py-1.5 text-sm">Sign Out</button>
      </div>

      {!role && !adminExists && (
        <button onClick={claim} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Set me as first administrator</button>
      )}
      {!role && adminExists && <p className="text-sm text-muted-foreground">Ask an administrator to grant you Staff access.</p>}

      {isAdmin && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold text-foreground">Authorized Staff & Roles</h3>
          <p className="mb-3 text-xs text-muted-foreground">Staff: approve referrals, issue rewards, redeem credits. Administrator: also adjust, reverse and refund credits, and manage roles.</p>
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{r.email}</span>
                <select value={r.role} disabled={r.user_id === user.id} onChange={e => setRole(r.user_id, e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="none">No access</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
