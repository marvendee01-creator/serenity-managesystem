import { test, expect } from "vitest";
import { buildEntranceDaily, getEntranceGrandTotal } from "@/modules/ReportsModule";

test("November 11 validation example: 2000 booking deposit + 1100 entrance grand total = 3100", () => {
  const booking: any = {
    id: 101,
    transaction_no: "BK-101",
    module: "Booking",
    booking_type: "Exclusive",
    status: "ONGOING",
    date_time: "2026-11-11T09:00:00Z",
    amount_paid: 13000,
    deposit_amount: 2000,
    deposit_date: "2026-11-11",
    balance: 11000,
  };

  const walkInEntrance: any = {
    id: 102,
    transaction_no: "ENT-102",
    module: "Entrance",
    date_time: "2026-11-11T14:30:00Z",
    entrance_amount: 1000,
    maintenance_fee: 100,
    grand_total: 1100,
    amount_paid: 1000,
  };

  const result = buildEntranceDaily([booking, walkInEntrance], "2026-11");
  expect(result).toEqual([{ date: "2026-11-11", total: 3100 }]);
});

test("Ensures booking maintenance fee is not added to entrance sales and Maint Fee is not duplicated", () => {
  const booking: any = {
    id: 201,
    transaction_no: "BK-201",
    module: "Booking",
    booking_type: "Non-Exclusive",
    date_time: "2026-11-11T10:00:00Z",
    amount_paid: 8000,
    deposit_amount: 2000,
    deposit_date: "2026-11-11",
    maintenance_fee: 500, // Should NOT be added to entrance sales
  };

  const entrance: any = {
    id: 202,
    transaction_no: "ENT-202",
    module: "Entrance",
    date_time: "2026-11-11T11:00:00Z",
    amount_paid: 1000,
    maintenance_fee: 100,
  };

  const result = buildEntranceDaily([booking, entrance], "2026-11");
  // 2000 deposit + 1100 entrance = 3100
  expect(result).toEqual([{ date: "2026-11-11", total: 3100 }]);
});

test("Excludes unrelated modules (Room, Tent, Games, Table Rent, Food)", () => {
  const room: any = { id: 301, module: "Room", date_time: "2026-11-11T10:00:00Z", amount_paid: 1500 };
  const tent: any = { id: 302, module: "Tent", date_time: "2026-11-11T10:00:00Z", amount_paid: 500 };
  const tableRent: any = { id: 303, module: "Table Rent", date_time: "2026-11-11T10:00:00Z", amount_paid: 300 };
  const games: any = { id: 304, module: "Games Rental", date_time: "2026-11-11T10:00:00Z", amount_paid: 200 };

  const entrance: any = {
    id: 305,
    module: "Entrance",
    date_time: "2026-11-11T12:00:00Z",
    amount_paid: 1000,
    maintenance_fee: 100,
  };

  const result = buildEntranceDaily([room, tent, tableRent, games, entrance], "2026-11");
  expect(result).toEqual([{ date: "2026-11-11", total: 1100 }]);
});

test("Logged booking payment replaces deposit fallback without duplicate counting", () => {
  const booking: any = {
    id: 401,
    transaction_no: "BK-401",
    module: "Booking",
    booking_type: "Exclusive",
    amount_paid: 10000,
    deposit_amount: 2000,
    deposit_date: "2026-11-11",
  };

  const paymentLog = [
    { id: 99, transaction_id: 401, payment_date: "2026-11-11", amount: 2000 },
  ];

  const result = buildEntranceDaily(
    [booking],
    "2026-11",
    paymentLog as any,
    new Map([[401, booking]])
  );

  expect(result).toEqual([{ date: "2026-11-11", total: 2000 }]);
});
