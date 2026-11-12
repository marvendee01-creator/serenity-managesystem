import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso } from "@/lib/format";
import type { SerenityMember } from "@/lib/db";
import {
  adjustSerenityCredit,
  expireSerenityCredits,
  issueSerenityRewards,
  loadSerenityRewards,
  type SerenityCreditLedgerEntry,
  type SerenityCreditRedemption,
  type SerenityRewardIssue,
} from "@/lib/serenity-rewards";
import { useStaffAuth } from "@/hooks/use-staff-auth";
import { toast } from "sonner";

type Data = Awaited<ReturnType<typeof loadSerenityRewards>>;
type AdjustmentKind = "Adjusted" | "Reversed";

const dateText = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—";

export default function SerenityRewardsPanel({ members }: { members: SerenityMember[] }) {
  const { user, isStaff, isAdmin, loading: authLoading } = useStaffAuth();
  const [data, setData] = useState<Data>({ referrals: [], issues: [], ledger: [], redemptions: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [dateField, setDateField] = useState<"entry" | "expiry">("entry");
  const [monthFilter, setMonthFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingIssue, setEditingIssue] = useState<SerenityRewardIssue | null>(null);
  const [adjustmentKind, setAdjustmentKind] = useState<AdjustmentKind>("Adjusted");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    try { setData(await loadSerenityRewards()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load reward records"); }
    finally { setLoading(false); }
  }, [isStaff]);

  useEffect(() => { void refresh(); }, [refresh]);

  const membersById = useMemo(() => new Map(members.map(member => [member.id, member])), [members]);
  const visibleMembers = useMemo(() => members.filter(member => {
    if (memberFilter !== "all" && String(member.id) !== memberFilter) return false;
    return !search || `${member.customer_name} ${member.member_id}`.toLowerCase().includes(search.toLowerCase());
  }), [members, memberFilter, search]);
  const memberSummary = (memberId: number) => {
    const lots = data.issues.filter(issue => issue.member_id === memberId);
    return {
      balance: lots.reduce((sum, lot) => sum + (lot.status === "Active" ? Number(lot.remaining) : 0), 0),
      earned: lots.reduce((sum, lot) => sum + Number(lot.amount), 0),
      referrals: data.referrals.filter(referral => referral.member_id === memberId && referral.completed_date && referral.verified_at).length,
    };
  };

  const withinDateRange = (value?: string | null) => {
    if (!value) return false;
    const date = value.slice(0, 10);
    if (monthFilter && !date.startsWith(monthFilter)) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };
  const visibleIssues = data.issues.filter(issue => {
    if (memberFilter !== "all" && String(issue.member_id) !== memberFilter) return false;
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;
    if (dateField === "expiry") return (!monthFilter && !fromDate && !toDate) || withinDateRange(issue.expires_on);
    return (!monthFilter && !fromDate && !toDate) || withinDateRange(issue.issued_at);
  });
  const visibleLedger = data.ledger.filter(entry => {
    if (memberFilter !== "all" && String(entry.member_id) !== memberFilter) return false;
    if (kindFilter !== "all" && entry.kind !== kindFilter) return false;
    return (!monthFilter && !fromDate && !toDate) || (dateField === "entry" && withinDateRange(entry.created_at));
  });
  const visibleRedemptions = data.redemptions.filter(redemption => {
    if (memberFilter !== "all" && String(redemption.member_id) !== memberFilter) return false;
    return (!monthFilter && !fromDate && !toDate) || (dateField === "entry" && withinDateRange(redemption.created_at));
  });

  const runMemberAction = async (memberId: number, kind: "issue" | "expire") => {
    try {
      const result = kind === "issue" ? await issueSerenityRewards(memberId) : (await expireSerenityCredits(memberId), 0);
      toast.success(kind === "issue" ? (result ? `${result} reward group(s) issued` : "No new group of 10 is ready yet") : "Expired credits updated");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Reward action failed"); }
  };

  const saveAdjustment = async () => {
    if (!editingIssue || !adjustmentReason.trim() || (adjustmentKind === "Adjusted" && !Number(adjustmentAmount))) return;
    setSaving(true);
    try {
      await adjustSerenityCredit({ issueId: editingIssue.id, kind: adjustmentKind, amount: Number(adjustmentAmount) || 0, bookingId: null, reason: adjustmentReason.trim() });
      toast.success(adjustmentKind === "Adjusted" ? "Credit adjustment recorded" : "Reward reversed");
      setEditingIssue(null); setAdjustmentAmount(""); setAdjustmentReason(""); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save adjustment"); }
    finally { setSaving(false); }
  };

  const refundRedemption = async (redemption: SerenityCreditRedemption) => {
    if (!isAdmin || redemption.refunded) return;
    const issue = data.issues.find(row => row.member_id === redemption.member_id);
    if (!issue) { toast.error("No reward record is available for this member"); return; }
    const reason = window.prompt("Required reason for refunding these credits:");
    if (!reason?.trim()) return;
    try {
      await adjustSerenityCredit({ issueId: issue.id, kind: "Refunded", amount: 0, bookingId: redemption.transaction_id, reason: reason.trim() });
      toast.success("Credits refunded and recorded"); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to refund credits"); }
  };

  if (authLoading) return <p className="py-6 text-sm text-muted-foreground">Checking staff access…</p>;
  if (!user || !isStaff) return <p className="py-6 text-sm text-muted-foreground">Sign in with an authorized Serenity Circle staff account to view reward records.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1"><label className="mb-1 block text-xs text-muted-foreground">Search members</label><input className="pos-input w-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or Member ID" /></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">Member</label><select className="pos-input" value={memberFilter} onChange={event => setMemberFilter(event.target.value)}><option value="all">All members</option>{members.map(member => <option key={member.id} value={member.id}>{member.customer_name} · {member.member_id}</option>)}</select></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">Reward status</label><select className="pos-input" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option>Active</option><option>Expired</option><option>Reversed</option></select></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">Filter dates by</label><select className="pos-input" value={dateField} onChange={event => setDateField(event.target.value as "entry" | "expiry")}><option value="entry">Activity date</option><option value="expiry">Expiry date</option></select></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">Month</label><input type="month" className="pos-input" value={monthFilter} onChange={event => { setMonthFilter(event.target.value); if (event.target.value) { setFromDate(""); setToDate(""); } }} /></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">From</label><input type="date" className="pos-input" value={fromDate} onChange={event => { setFromDate(event.target.value); setMonthFilter(""); }} /></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">To</label><input type="date" className="pos-input" value={toDate} onChange={event => { setToDate(event.target.value); setMonthFilter(""); }} /></div>
        <Button variant="outline" onClick={() => { setSearch(""); setMemberFilter("all"); setStatusFilter("all"); setKindFilter("all"); setDateField("entry"); setMonthFilter(""); setFromDate(""); setToDate(""); }}>Clear filters</Button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-semibold">Member credit balances & referrals</h3><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button></div>
        <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Member</th><th>Completed referrals</th><th>Credits earned</th><th>Available</th><th className="text-right">Staff actions</th></tr></thead><tbody>
          {visibleMembers.map(member => { const summary = memberSummary(member.id ?? 0); return <tr key={member.id} className="border-b border-border/60"><td className="py-2"><span className="font-medium">{member.customer_name}</span><span className="ml-2 text-xs text-muted-foreground">{member.member_id}</span></td><td>{summary.referrals} / 10</td><td>{formatPeso(summary.earned)}</td><td className="font-semibold">{formatPeso(summary.balance)}</td><td className="text-right"><div className="inline-flex gap-1"><Button size="sm" variant="outline" onClick={() => void runMemberAction(member.id ?? 0, "issue")}>Issue earned rewards</Button><Button size="sm" variant="ghost" onClick={() => void runMemberAction(member.id ?? 0, "expire")}>Update expiry</Button></div></td></tr>; })}
          {visibleMembers.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No members match these filters.</td></tr>}
        </tbody></table></div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Reward issuances</h3><span className="text-xs text-muted-foreground">10 verified bookings · 10% of net eligible payments</span></div>
        <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Member</th><th>Issued</th><th>Expires</th><th>Earned</th><th>Remaining</th><th>Status</th><th>Admin</th></tr></thead><tbody>
          {visibleIssues.map(issue => { const member = membersById.get(issue.member_id); return <tr key={issue.id} className="border-b border-border/60"><td className="py-2">{member?.customer_name ?? `Member ${issue.member_id}`}</td><td>{dateText(issue.issued_at)}</td><td>{dateText(issue.expires_on)}</td><td>{formatPeso(issue.amount)}</td><td>{formatPeso(issue.remaining)}</td><td>{issue.status}</td><td>{isAdmin && <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setEditingIssue(issue); setAdjustmentKind("Adjusted"); }}>Adjust</Button><Button size="sm" variant="destructive" onClick={() => { setEditingIssue(issue); setAdjustmentKind("Reversed"); }}>Reverse</Button></div>}</td></tr>; })}
          {visibleIssues.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No reward issuances found.</td></tr>}
        </tbody></table></div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Credit ledger</h3><select className="pos-input text-sm" value={kindFilter} onChange={event => setKindFilter(event.target.value)}><option value="all">All activity</option>{["Earned", "Redeemed", "Expired", "Reversed", "Refunded", "Adjusted"].map(kind => <option key={kind}>{kind}</option>)}</select></div>
        <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Date</th><th>Member</th><th>Activity</th><th>Amount</th><th>Booking</th><th>Reason</th><th>Staff</th></tr></thead><tbody>
          {visibleLedger.map((entry: SerenityCreditLedgerEntry) => <tr key={entry.id} className="border-b border-border/60"><td className="py-2">{dateText(entry.created_at)}</td><td>{membersById.get(entry.member_id)?.customer_name ?? `Member ${entry.member_id}`}</td><td>{entry.kind}</td><td className={entry.amount < 0 ? "text-destructive" : "text-success"}>{formatPeso(entry.amount)}</td><td>{entry.transaction_id ?? "—"}</td><td className="max-w-64 truncate" title={entry.reason}>{entry.reason}</td><td>{entry.staff_user ? entry.staff_user.slice(0, 8) : "System"}</td></tr>)}
          {visibleLedger.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No ledger activity found.</td></tr>}
        </tbody></table></div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Credit redemptions</h3>
        <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Date</th><th>Member</th><th>Booking</th><th>Package</th><th>Credits used</th><th>State</th><th>Admin</th></tr></thead><tbody>
          {visibleRedemptions.map(redemption => <tr key={redemption.transaction_id} className="border-b border-border/60"><td className="py-2">{dateText(redemption.created_at)}</td><td>{membersById.get(redemption.member_id)?.customer_name ?? `Member ${redemption.member_id}`}</td><td>{redemption.transaction_id}</td><td>{redemption.package_type}</td><td>{formatPeso(redemption.amount)}</td><td>{redemption.refunded ? "Refunded" : "Applied"}</td><td>{isAdmin && !redemption.refunded && <Button size="sm" variant="outline" onClick={() => void refundRedemption(redemption)}>Refund credits</Button>}</td></tr>)}
          {visibleRedemptions.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No redemptions found.</td></tr>}
        </tbody></table></div>
      </section>

      <Dialog open={!!editingIssue} onOpenChange={open => { if (!open && !saving) setEditingIssue(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{adjustmentKind === "Adjusted" ? "Adjust reward credit" : "Reverse reward issuance"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{editingIssue && `${membersById.get(editingIssue.member_id)?.customer_name ?? "Member"} · Available ${formatPeso(editingIssue.remaining)}`}</p>
          {adjustmentKind === "Adjusted" && <div><label className="mb-1 block text-sm font-medium">Amount (positive adds, negative subtracts)</label><input className="pos-input w-full" type="number" step="0.01" value={adjustmentAmount} onChange={event => setAdjustmentAmount(event.target.value)} /></div>}
          <div><label className="mb-1 block text-sm font-medium">Reason *</label><textarea className="pos-input min-h-20 w-full" value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingIssue(null)}>Cancel</Button><Button variant={adjustmentKind === "Reversed" ? "destructive" : "default"} disabled={saving || !adjustmentReason.trim() || (adjustmentKind === "Adjusted" && !Number(adjustmentAmount))} onClick={() => void saveAdjustment()}>{saving ? "Saving…" : adjustmentKind === "Adjusted" ? "Record adjustment" : "Reverse issuance"}</Button></div>
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">Credit changes require administrator approval and are recorded with the signed-in staff account.</p>
    </div>
  );
}