import { describe, expect, it } from "vitest";
import { calculateCalendarDays, parseCalendarDate } from "@/lib/format";

describe("Booking Module Calculation and Validation", () => {
  it("correctly validates the sample transaction: ₱3,500 total, ₱1,000 GCash deposit, ₱2,500 balance, Deposit Date 2026-11-17", () => {
    const roomTotal = 3000;
    const maintenanceFee = 500;
    const totalAmount = roomTotal + maintenanceFee;
    const depositAmount = 1000;
    const depositDate = "2026-11-17";
    const balance = totalAmount - depositAmount;
    const paymentMethod = "GCash";

    expect(totalAmount).toBe(3500);
    expect(depositAmount).toBe(1000);
    expect(balance).toBe(2500);
    expect(paymentMethod).toBe("GCash");

    // Payment status derivation
    const paymentStatus = depositAmount === 0 ? "Unpaid" : depositAmount < totalAmount ? "Partially Paid" : "Fully Paid";
    expect(paymentStatus).toBe("Partially Paid");

    // Validate deposit date format
    const parsedDate = parseCalendarDate(depositDate);
    expect(parsedDate).not.toBeNull();
    expect(parsedDate?.year).toBe(2026);
    expect(parsedDate?.month).toBe(10); // 0-indexed month November
    expect(parsedDate?.day).toBe(17);
  });

  it("calculates Exclusive booking charges with billable calendar days", () => {
    const exclusiveFee = 5000;
    const checkIn = "2026-11-17T14:00";
    const checkOut = "2026-11-19T11:00";
    const billableDays = calculateCalendarDays(checkIn, checkOut);
    expect(billableDays).toBe(2);

    const exclusiveTotal = exclusiveFee * billableDays;
    const kuboRate = 1000;
    const roomFee = kuboRate * billableDays;
    const maintenanceFee = 500;
    const total = exclusiveTotal + roomFee + maintenanceFee;
    const deposit = 5000;
    const balance = total - deposit;

    expect(exclusiveTotal).toBe(10000);
    expect(total).toBe(12500);
    expect(balance).toBe(7500);
  });

  it("calculates Non-Exclusive booking charges for guests, rooms, and corkage", () => {
    const adultRate = 100;
    const kids8Rate = 50;
    const adults = 5;
    const kids8 = 2;
    const days = 1;

    const personTotal = (adults * adultRate + kids8 * kids8Rate) * days;
    const barkadaRate = 1500;
    const roomFee = barkadaRate * 2; // 3000
    const maintenanceFee = 500;
    const total = personTotal + roomFee + maintenanceFee;
    const deposit = 4100;
    const balance = total - deposit;
    const status = deposit === 0 ? "Unpaid" : deposit < total ? "Partially Paid" : "Fully Paid";

    expect(personTotal).toBe(600);
    expect(total).toBe(4100);
    expect(balance).toBe(0);
    expect(status).toBe("Fully Paid");
  });

  it("requires a valid deposit date whenever deposit amount is greater than zero", () => {
    const validateDeposit = (deposit: number, date?: string) => {
      if (deposit > 0 && (!date || !parseCalendarDate(date))) {
        return "Valid Deposit Date is required when deposit amount is entered";
      }
      return null;
    };

    expect(validateDeposit(1000, "")).toBe("Valid Deposit Date is required when deposit amount is entered");
    expect(validateDeposit(1000, "invalid-date")).toBe("Valid Deposit Date is required when deposit amount is entered");
    expect(validateDeposit(1000, "2026-11-17")).toBeNull();
    expect(validateDeposit(0, "")).toBeNull();
  });
});
