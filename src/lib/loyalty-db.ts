import { supabase } from "@/integrations/supabase/client";
import type { SerenityMember, Transaction } from "@/lib/db";

export async function verifyMember(identifier: string): Promise<SerenityMember> {
  const input = identifier.trim();
  const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
  const { data, error } = await supabase.from("serenity_members").select("*")
    .eq(isToken ? "qr_token" : "member_id", isToken ? input : input.toUpperCase()).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Membership not found");
  return data as SerenityMember;
}

export async function saveLoyaltyEntrance(transaction: Omit<Transaction, "id">, member: SerenityMember, excludedAdults: number, otherDiscount: number): Promise<number> {
  const { data, error } = await supabase.rpc("record_loyalty_entrance", {
    p_transaction: JSON.parse(JSON.stringify(transaction)), p_token: member.qr_token,
    p_excluded_adults: excludedAdults, p_other_discount: otherDiscount,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

export async function applyBookingLoyalty(id: number, member: SerenityMember, packageType: string, eligibleAmount: number, expectedTotal: number): Promise<void> {
  const { error } = await supabase.rpc("apply_booking_loyalty", {
    p_id: id, p_token: member.qr_token, p_package_type: packageType,
    p_eligible: eligibleAmount, p_expected_total: expectedTotal,
  });
  if (error) throw new Error(error.message);
}