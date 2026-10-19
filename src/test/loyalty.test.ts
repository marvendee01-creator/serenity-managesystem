import { describe, expect, it } from "vitest";
import { memberEligible, personalDiscount, entranceEligibleAmount, packageEligibleAmount } from "@/lib/loyalty";
import type { SerenityMember } from "@/lib/db";

const member: SerenityMember = { member_id: "SC-TEST", customer_name: "Test", card_name: "Serenity Privilege", issue_date: "2026-01-01", expiry_date: "2026-12-31", status: "Active", qr_token: "token" };
describe("personal loyalty rules", () => {
  it("deducts exactly 5% of an active member's eligible package only", () => {
    const eligible = packageEligibleAmount("Room accommodation", 1500, 2000);
    expect(personalDiscount(eligible, memberEligible(member, "2026-10-19"))).toBe(75);
    expect(2000 - personalDiscount(eligible, true)).toBe(1925);
  });
  it("rejects non-package charges", () => { expect(packageEligibleAmount("Food", 1000, 1000)).toBe(0); });
  it("rejects expired members", () => { expect(personalDiscount(1000, memberEligible(member, "2027-01-01"))).toBe(0); });
  it("rejects suspended members", () => { expect(personalDiscount(1000, memberEligible({ ...member, status: "Suspended" }, "2026-10-19"))).toBe(0); });
  it("rejects four paying adults", () => { expect(entranceEligibleAmount(4, 0, 100, 50, true)).toBe(0); });
  it("qualifies five paying adults and excludes add-ons", () => { expect(personalDiscount(entranceEligibleAmount(5, 0, 100, 50, true), true)).toBe(27.5); });
  it("excludes seniors and complimentary adults from the minimum", () => { expect(entranceEligibleAmount(6, 2, 100, 500, true)).toBe(0); });
  it("does not qualify children toward the minimum", () => { expect(entranceEligibleAmount(4, 0, 100, 1000, true)).toBe(0); });
  it("does not stack another discount", () => { expect(personalDiscount(1000, true, 10)).toBe(0); });
  it("rejects charge-to-booking entrance", () => { expect(entranceEligibleAmount(5, 0, 100, 50, false)).toBe(0); });
  it("rounds a discount to two decimal places", () => { expect(personalDiscount(100.1, true)).toBe(5.01); });
  it("rejects package charges exceeding the non-add-on ceiling", () => { expect(packageEligibleAmount("Exclusive resort", 2000, 1500)).toBe(0); });
});