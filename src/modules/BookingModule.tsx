import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

const TYPES = ["Exclusive", "Non-Exclusive"] as const;
const ROOM_OPTIONS = ["None", "Kubo Room", "Barkada Room"] as const;

export default function BookingModule() {
  const [customerName, setCustomerName] = useState("");
  const [bookingType, setBookingType] = useState<string>(TYPES[0]);
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [addOnRoom, setAddOnRoom] = useState<string>("None");
  const [addOnTables, setAddOnTables] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [exclusiveFee, setExclusiveFee] = useState(5000);
  const [kuboRate, setKuboRate] = useState(1000);
  const [barkadaRate, setBarkadaRate] = useState(1500);
  const [tableRate, setTableRate] = useState(200);
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    getSettings().then((s) => {
      setExclusiveFee(s.exclusive_fee);
      setKuboRate(s.kubo_room_rate);
      setBarkadaRate(s.barkada_room_rate);
      setTableRate(s.table_rent_rate);
    });
  }, []);

  const a = parseInt(adults) || 0;
  const c = parseInt(children) || 0;
  const headcount = a + c;
  const isExclusive = bookingType === "Exclusive";
  const numTables = parseInt(addOnTables) || 0;

  // Compute total
  const roomAddOn = addOnRoom === "Kubo Room" ? kuboRate : addOnRoom === "Barkada Room" ? barkadaRate : 0;
  const tableAddOn = numTables * tableRate;
  const baseAmount = isExclusive ? exclusiveFee : (parseFloat(amount) || 0);
  const total = baseAmount + roomAddOn + tableAddOn;

  const handleSave = useCallback(async () => {
    if (total === 0) { toast.error("Enter amount"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Booking",
        customer_name: customerName || undefined,
        booking_type: bookingType,
        room_type: addOnRoom !== "None" ? addOnRoom : undefined,
        number_of_tables: numTables > 0 ? numTables : undefined,
        adults: a, children: c,
        total_headcount: headcount,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Booking saved!");
      setCustomerName(""); setAdults(""); setChildren(""); setAmount("");
      setBookingType(TYPES[0]); setAddOnRoom("None"); setAddOnTables("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, bookingType, a, c, headcount, amount, total, payment, addOnRoom, numTables]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Booking" icon={<CalendarDays size={20} />} onSave={handleSave} saveLabel="Record Booking" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
        <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Booking Type</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t} className={`toggle-btn flex-1 ${bookingType === t ? "toggle-btn-active" : ""}`} onClick={() => setBookingType(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Adults</label>
        <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Children</label>
        <input type="number" className="pos-input w-full" value={children} onChange={(e) => setChildren(e.target.value)} placeholder="0" min="0" />
      </div>
      <div className="pos-card">
        <p className="text-sm text-muted-foreground mb-1">Total Headcount</p>
        <p className="text-2xl font-bold tabular-nums">{headcount}</p>
      </div>

      {/* Add-on Room */}
      <div>
        <label className="text-sm font-medium block mb-1">Add Room (Optional)</label>
        <select className="pos-input w-full" value={addOnRoom} onChange={(e) => setAddOnRoom(e.target.value)}>
          {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {addOnRoom !== "None" && (
          <p className="text-xs text-muted-foreground mt-1">
            Rate: ₱{(addOnRoom === "Kubo Room" ? kuboRate : barkadaRate).toLocaleString()}
          </p>
        )}
      </div>

      {/* Add-on Tables */}
      <div>
        <label className="text-sm font-medium block mb-1">Tables (Optional)</label>
        <input type="number" className="pos-input w-full" value={addOnTables} onChange={(e) => setAddOnTables(e.target.value)} placeholder="0" min="0" />
        {numTables > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {numTables} × ₱{tableRate.toLocaleString()} = ₱{tableAddOn.toLocaleString()}
          </p>
        )}
      </div>

      {isExclusive && (
        <div className="pos-card border-primary/20">
          <p className="text-sm text-muted-foreground">Exclusive Fee</p>
          <p className="text-xl font-bold text-primary tabular-nums">₱{exclusiveFee.toLocaleString()}</p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium block mb-1">Amount Paid</label>
        <input type="number" className="pos-input w-full" value={isExclusive ? "" : amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={isExclusive} />
      </div>

      {/* Total Breakdown */}
      <div className="pos-card border-primary/30">
        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
        <p className="text-2xl font-bold text-primary tabular-nums">₱{total.toLocaleString()}</p>
        {(roomAddOn > 0 || tableAddOn > 0) && (
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            <p>Base: ₱{baseAmount.toLocaleString()}</p>
            {roomAddOn > 0 && <p>+ {addOnRoom}: ₱{roomAddOn.toLocaleString()}</p>}
            {tableAddOn > 0 && <p>+ {numTables} table(s): ₱{tableAddOn.toLocaleString()}</p>}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>
    </ModuleShell>
  );
}
