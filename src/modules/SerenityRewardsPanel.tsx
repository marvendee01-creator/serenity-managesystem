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
import { getSerenityPackageCeiling, redeemSerenityCredits } from "@/lib/serenity-rewards";
import MemberVerification from "@/components/MemberVerification";
import type { Transaction } from "@/lib/db";
import { useStaffAuth } from "@/hooks/use-staff-auth";
import { toast } from "sonner";

type Data = Awaited<ReturnType<typeof loadSerenityRewards>>;
type AdjustmentKind = "Adjusted" | "Reversed";

const dateText = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—";

export default function SerenityRewardsPanel({ members }: { members: SerenityMember[] }) {
  const { user, isStaff, isAdmin, loading: authLoading } = useStaffAuth();
  const [data, setData] = useState<Data>({ referrals: [], issues: [], ledger: [], redemptions: [], rewardedBookings: [] });
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
  const [candidateBookings, setCandidateBookings] = useState<Transaction[]>([]);
  const [redemptionBookingId, setRedemptionBookingId] = useState("");
  const [redemptionMember, setRedemptionMember] = useState<SerenityMember | null>(null);
  const [redemptionPackage, setRedemptionPackage] = useState("Room accommodation");
  const [redemptionAmount, setRedemptionAmount] = useState("");
  const [redemptionCeiling, setRedemptionCeiling] = useState(0);
  const [redemptionSaving, setRedemptionSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    try { setData(await loadSerenityRewards()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load reward records"); }
    finally { setLoading(false); }
  }, [isStaff]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!isStaff) return;
    void supabase.from("transactions").select("*").eq("module", "Booking").order("date_time", { ascending: false })
      .then(({ data: rows, error }) => {
        if (error) { toast.error(error.message); return; }
        setCandidateBookings((rows ?? []).map(row => ({
          ...row,
          payment_method: row.payment_method as Transaction["payment_method"],
          amount_paid: Number(row.amount_paid),
          deposit_amount: Number(row.deposit_amount ?? 0),
          balance: Number(row.balance ?? 0),
          maintenance_fee: Number(row.maintenance_fee ?? 0),
          drinks_corkage_fee: Number(row.drinks_corkage_fee ?? 0),
          liquor_corkage_fee: Number(row.liquor_corkage_fee ?? 0),
          discount_amount: Number(row.discount_amount ?? 0),
          adults: Number(row.adults),
          children: Number(row.children),
          total_headcount: Number(row.total_headcount),
        })));
      });
  }, [isStaff]);

  useEffect(() => {
    const booking = candidateBookings.find(row => String(row.id) === redemptionBookingId);
    if (!booking?.id) { setRedemptionCeiling(0); return; }
    void getSerenityPackageCeiling(booking.id, redemptionPackage).then(setRedemptionCeiling)
      .catch(error => { setRedemptionCeiling(0); toast.error(error instanceof Error ? error.message : "Unable to check package limit"); });
  }, [candidateBookings, redemptionBookingId, redemptionPackage]);

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
  const rewardedBookingIds = useMemo(() => new Set(data.rewardedBookings.map(row => row.transaction_id)), [data.rewardedBookings]);
  const untaggedBookings = candidateBookings.filter(booking => booking.id && booking.status !== "Cancelled" && !rewardedBookingIds.has(booking.id) && !data.referrals.some(referral => referral.transaction_id === booking.id));

  const saveRedemption = async () => {
    const booking = candidateBookings.find(row => String(row.id) === redemptionBookingId);
    const amount = Number(redemptionAmount);
    if (!booking?.id || !redemptionMember || !amount || amount > redemptionCeiling) return;
    setRedemptionSaving(true);
    try {
      await redeemSerenityCredits({ bookingId: booking.id, memberToken: redemptionMember.qr_token, packageType: redemptionPackage, amount });
      toast.success("Reward credits applied to the booking");
      setRedemptionBookingId(""); setRedemptionMember(null); setRedemptionAmount(""); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to redeem credits"); }
    finally { setRedemptionSaving(false); }
  };

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
        <h3 className="mb-2 font-semibold">Redeem credits for an eligible future booking</h3>
        <div className="space-y-3 border-y border-border py-3">
          <div><label className="mb-1 block text-sm font-medium">Booking</label><select className="pos-input w-full" value={redemptionBookingId} onChange={event => { setRedemptionBookingId(event.target.value); setRedemptionAmount(""); }}><option value="">Select a booking</option>{candidateBookings.filter(booking => booking.id && booking.status !== "Cancelled").map(booking => <option key={booking.id} value={booking.id}>{booking.customer_name || "Guest"} · {booking.transaction_no} · {booking.payment_status || "Unpaid"}</option>)}</select></div>
          <MemberVerification member={redemptionMember} onChange={setRedemptionMember} />
          <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-sm font-medium">Eligible package</label><select className="pos-input w-full" value={redemptionPackage} onChange={event => setRedemptionPackage(event.target.value)}><option>Room accommodation</option><option>Function hall</option><option>Exclusive resort</option></select></div><div><label className="mb-1 block text-sm font-medium">Credits to apply</label><input className="pos-input w-full" type="number" min="0" step="0.01" value={redemptionAmount} onChange={event => setRedemptionAmount(event.target.value)} /></div></div>
          <p className="text-xs text-muted-foreground">Eligible unpaid package charges: {formatPeso(redemptionCeiling)} · Must belong to this member and be booked at least 14 days before check-in.</p>
          <Button disabled={redemptionSaving || !redemptionMember || !redemptionBookingId || !Number(redemptionAmount) || Number(redemptionAmount) > redemptionCeiling} onClick={() => void saveRedemption()}>{redemptionSaving ? "Applying…" : "Apply credits"}</Button>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Referral attribution & verification</h3><span className="text-xs text-muted-foreground">Unique bookings only; self-referrals are blocked</span></div>
        <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2">Booking</th><th>Guest</th><th>Referrer</th><th>Completed</th><th>Eligible net payment</th><th>Verification</th></tr></thead><tbody>
          {untaggedBookings.map(booking => <ReferralBookingRow key={booking.id} booking={booking} members={members} onSaved={async () => { await refresh(); }} />)}
          {untaggedBookings.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No untagged bookings available.</td></tr>}
          {data.referrals.map(referral => { const booking = candidateBookings.find(row => row.id === referral.transaction_id); const member = membersById.get(referral.member_id); return <tr key={referral.transaction_id} className="border-b border-border/60"><td className="py-2">{booking?.transaction_no ?? referral.transaction_id}</td><td>{booking?.customer_name ?? "—"}</td><td>{member?.customer_name ?? `Member ${referral.member_id}`}</td><td>{referral.completed_date ? dateText(referral.completed_date) : "Awaiting completion"}</td><td>{formatPeso(referral.net_eligible)}</td><td>{referral.verified_at ? "Verified" : "Attributed"}</td></tr>; })}
        </tbody></table></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{members.map(member => { const summary = memberSummary(member.id ?? 0); return <div key={member.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"><span>{member.customer_name} · {summary.referrals} verified booking(s)</span><Button size="sm" variant="outline" onClick={() => void runMemberAction(member.id ?? 0, "issue")}>Issue groups of 10</Button></div>; })}</div>
      </section>

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

function ReferralBookingRow({ booking, members, onSaved }: { booking: Transaction; members: SerenityMember[]; onSaved: () => Promise<void> }) {
  const [member, setMember] = useState<SerenityMember | null>(null);
  const [packageType, setPackageType] = useState("Room accommodation");
  const [completedDate, setCompletedDate] = useState("");
  const [netAmount, setNetAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [ceiling, setCeiling] = useState(0);
  useEffect(() => {
    if (!booking.id) return;
    void getSerenityPackageCeiling(booking.id, packageType).then(setCeiling).catch(() => setCeiling(0));
  }, [booking.id, packageType]);

  const save = async () => {
    if (!booking.id || !member || !reason.trim()) return;
    const net = Number(netAmount) || 0;
    if (completedDate && (!net || net > ceiling)) { toast.error("Verified eligible payments must be above zero and within the package limit"); return; }
    setSaving(true);
    try {
      await supabase.rpc("serenity_save_referral", {
        p_booking: booking.id,
        p_token: member.qr_token,
        p_package: packageType,
        p_net: net,
        p_completed: completedDate || null,
        p_reason: reason.trim(),
      }).then(({ error }) => { if (error) throw new Error(error.message); });
      toast.success(completedDate ? "Referral verified and recorded" : "Referrer attribution saved");
      await onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save referral"); }
    finally { setSaving(false); }
  };

  return <tr className="border-b border-border/60 align-top"><td className="py-2">{booking.transaction_no}</td><td>{booking.customer_name || "—"}</td><td className="min-w-56"><MemberVerification member={member} onChange={setMember} /></td><td className="min-w-36"><input type="date" className="pos-input w-full" value={completedDate} onChange={event => setCompletedDate(event.target.value)} aria-label={`Completion date for ${booking.transaction_no}`} /></td><td className="min-w-40"><select className="pos-input mb-1 w-full" value={packageType} onChange={event => setPackageType(event.target.value)}><option>Room accommodation</option><option>Function hall</option><option>Exclusive resort</option></select><input type="number" min="0" max={ceiling} step="0.01" className="pos-input w-full" placeholder={`Limit ${formatPeso(ceiling)}`} value={netAmount} onChange={event => setNetAmount(event.target.value)} aria-label={`Eligible net payment for ${booking.transaction_no}`} /></td><td className="min-w-52"><textarea className="pos-input mb-1 w-full" placeholder="Required resort verification reason" value={reason} onChange={event => setReason(event.target.value)} /><Button size="sm" disabled={saving || !member || !reason.trim() || (!!completedDate && !Number(netAmount))} onClick={() => void save()}>{saving ? "Saving…" : completedDate ? "Verify completed booking" : "Save referral"}</Button></td></tr>;
}