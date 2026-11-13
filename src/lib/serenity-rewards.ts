import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SerenityReferral = Database["public"]["Tables"]["serenity_referrals"]["Row"];
export type SerenityRewardIssue = Database["public"]["Tables"]["serenity_reward_issues"]["Row"];
export type SerenityCreditLedgerEntry = Database["public"]["Tables"]["serenity_credit_ledger"]["Row"];
export type SerenityCreditRedemption = Database["public"]["Tables"]["serenity_credit_redemptions"]["Row"];
export type SerenityRewardBooking = Database["public"]["Tables"]["serenity_reward_bookings"]["Row"];

export async function loadSerenityRewards() {
  const [referrals, issues, ledger, redemptions, rewardedBookings] = await Promise.all([
    supabase.from("serenity_referrals").select("*").order("created_at", { ascending: false }),
    supabase.from("serenity_reward_issues").select("*").order("issued_at", { ascending: false }),
    supabase.from("serenity_credit_ledger").select("*").order("created_at", { ascending: false }),
    supabase.from("serenity_credit_redemptions").select("*").order("created_at", { ascending: false }),
    supabase.from("serenity_reward_bookings").select("transaction_id,issue_id,net_eligible"),
  ]);
  const failure = referrals.error ?? issues.error ?? ledger.error ?? redemptions.error ?? rewardedBookings.error;
  if (failure) throw new Error(failure.message);
  return {
    referrals: (referrals.data ?? []) as SerenityReferral[],
    issues: (issues.data ?? []) as SerenityRewardIssue[],
    ledger: (ledger.data ?? []) as SerenityCreditLedgerEntry[],
    redemptions: (redemptions.data ?? []) as SerenityCreditRedemption[],
    rewardedBookings: (rewardedBookings.data ?? []) as SerenityRewardBooking[],
  };
}

export async function getSerenityPackageCeiling(bookingId: number, packageType: string) {
  const { data, error } = await supabase.rpc("serenity_package_ceiling", { p_id: bookingId, p_package: packageType });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function saveSerenityReferral(input: {
  bookingId: number;
  memberToken: string;
  packageType: string;
  netEligible: number;
  completedDate: string | null;
  reason: string;
}) {
  const { error } = await supabase.rpc("serenity_save_referral", {
    p_booking: input.bookingId,
    p_token: input.memberToken,
    p_package: input.packageType,
    p_net: input.netEligible,
    p_completed: input.completedDate,
    p_reason: input.reason,
  });
  if (error) throw new Error(error.message);
}

export async function issueSerenityRewards(memberId: number) {
  const { data, error } = await supabase.rpc("serenity_issue_rewards", { p_member: memberId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function redeemSerenityCredits(input: {
  bookingId: number;
  memberToken: string;
  packageType: string;
  amount: number;
}) {
  const { error } = await supabase.rpc("serenity_redeem", {
    p_booking: input.bookingId,
    p_token: input.memberToken,
    p_package: input.packageType,
    p_amount: input.amount,
    p_request: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function adjustSerenityCredit(input: {
  issueId: string;
  kind: "Adjusted" | "Reversed" | "Refunded";
  amount: number;
  bookingId: number | null;
  reason: string;
}) {
  const { error } = await supabase.rpc("serenity_adjust_credit", {
    p_issue: input.issueId,
    p_kind: input.kind,
    p_amount: input.amount,
    p_booking: input.bookingId,
    p_reason: input.reason,
    p_request: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}

export async function expireSerenityCredits(memberId: number) {
  const { error } = await supabase.rpc("serenity_expire_credits", { p_member: memberId });
  if (error) throw new Error(error.message);
}