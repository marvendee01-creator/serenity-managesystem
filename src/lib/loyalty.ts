import type { SerenityMember } from "@/lib/db";

export const LOYALTY_RATE = 0.05;
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function memberEligible(member: SerenityMember | null, today: string): boolean {
  return !!member && member.status === "Active" && member.issue_date <= today && member.expiry_date >= today;
}

export function personalDiscount(eligibleAmount: number, validMember: boolean, otherDiscount = 0): number {
  return validMember && otherDiscount === 0 && eligibleAmount > 0 ? roundMoney(eligibleAmount * LOYALTY_RATE) : 0;
}

export function entranceEligibleAmount(adults: number, excludedAdults: number, adultRate: number, childrenAmount: number, walkIn: boolean): number {
  const paying = Math.max(0, adults - excludedAdults);
  return walkIn && paying >= 5 && adultRate > 0 ? roundMoney(paying * adultRate + Math.max(0, childrenAmount)) : 0;
}

export function packageEligibleAmount(packageType: string, charges: number, maximum: number): number {
  return ["Room accommodation", "Function hall", "Exclusive resort"].includes(packageType)
    && charges > 0 && charges <= maximum ? roundMoney(charges) : 0;
}