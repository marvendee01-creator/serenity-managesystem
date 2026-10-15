import { test, expect } from "vitest";
import { buildEntranceDaily } from "@/modules/ReportsModule";
test("Sep 2 = 2000 deposit + 500 maint", () => {
  const b: any = { id: 1, module: "Booking", booking_type: "Exclusive", status: "ONGOING", date_time: "2026-09-02T02:00:00Z", amount_paid: 9000, deposit_amount: 2000, maintenance_fee: 500 };
  const r = buildEntranceDaily([b], "2026-09", [{ id: 5, transaction_id: 1, payment_date: "2026-09-02", amount: 2000 } as any], new Map([[1, b]]));
  expect(r).toEqual([{ date: "2026-09-02", total: 2500 }]);
});
