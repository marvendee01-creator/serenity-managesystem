import { describe, expect, it } from "vitest";
import { calculateBookingNights, calculateReplacementExclusiveFee, replaceBookingDurationCharges } from "@/lib/booking-management-calculation";

describe("Booking Management stay calculations", () => {
  it("counts calendar nights regardless of check-out time and calculates the configured exclusive daily fee", () => {
    const nights = calculateBookingNights("2026-12-19T18:09:00+08:00", "2026-12-21T11:00:00+08:00");
    expect(nights).toBe(2);
    const total = replaceBookingDurationCharges({
      currentTotal: 6500 + 1200 + 500,
      previousExclusiveFee: 6500,
      nextExclusiveFee: 6500 * (nights ?? 0),
      previousDailyFunctionHall: 0,
      nextDailyFunctionHall: 0,
    });
    expect(total).toBe(14_700);
    expect(total - 6500 * (nights ?? 0)).toBe(1_200 + 500);
  });

  it("keeps non-exclusive per-person, room, and one-time charges unchanged while updating a daily hall charge", () => {
    const total = replaceBookingDurationCharges({
      currentTotal: 3000 + 1200 + 500 + 1500,
      previousExclusiveFee: 0,
      nextExclusiveFee: 0,
      previousDailyFunctionHall: 1500,
      nextDailyFunctionHall: 3000,
    });
    expect(total).toBe(7_200);
    expect(total - 3000 - 1200 - 500).toBe(2_500);
  });

  it("replaces a legacy one-time exclusive charge with the configured nightly fee without double charging other costs", () => {
    const oldNights = calculateBookingNights("2026-12-19T18:09:00+08:00", "2026-12-21T11:00:00+08:00") ?? 0;
    const previousExclusiveFee = calculateReplacementExclusiveFee({
      currentTotal: 6500 + 1200 + 500,
      previousNights: oldNights,
      nextNights: 3,
      exclusiveDailyRate: 6500,
      knownOtherCharges: 1200 + 500,
    });
    expect(previousExclusiveFee).toBe(6500);
    expect(replaceBookingDurationCharges({
      currentTotal: 6500 + 1200 + 500,
      previousExclusiveFee,
      nextExclusiveFee: 6500 * 3,
      previousDailyFunctionHall: 0,
      nextDailyFunctionHall: 0,
    })).toBe(21_700);
  });

  it("rejects missing, invalid, or reversed check-in/check-out times", () => {
    expect(calculateBookingNights("2026-12-19T10:00:00+08:00", "2026-12-19T09:00:00+08:00")).toBeNull();
    expect(calculateBookingNights("invalid", "2026-12-21T11:00:00+08:00")).toBeNull();
    expect(calculateBookingNights(undefined, "2026-12-21T11:00:00+08:00")).toBeNull();
  });
});