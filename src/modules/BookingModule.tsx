import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Stepper from "@/components/Stepper";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

const TYPES = ["Exclusive", "Non-Exclusive"] as const;

export default function BookingModule() {
  const [customerName, setCustomerName] = useState("");
  const [bookingType, setBookingType] = useState<string>(TYPES[0]);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [exclusiveFee, setExclusiveFee] = useState(5000);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getSettings().then((s) => setExclusiveFee(s.exclusive_fee)); }, []);

  // Auto-fill amount when Exclusive is selected
  useEffect(() => {
    if (bookingType === "Exclusive") {
      setAmount(exclusiveFee.toString());
    } else {
      setAmount("");
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  }, [bookingType, exclusiveFee]);

  const headcount = adults + children;
  const isExclusive = bookingType === "Exclusive";
  const total = isExclusive ? exclusiveFee : parseFloat(amount) || 0;

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
        adults, children,
        total_headcount: headcount,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Booking saved!");
      setCustomerName(""); setAdults(0); setChildren(0); setAmount("");
      setBookingType(TYPES[0]);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, bookingType, adults, children, headcount, amount, total, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Booking" icon={<CalendarDays size={20} />} onSave={handleSave} saveLabel="Record Booking" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
        <input type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Booking Type</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t} className={`toggle-btn flex-1 ${bookingType === t ? "toggle-btn-active" : ""}`} onClick={() => setBookingType(t)}>{t}</button>
          ))}
        </div>
      </div>
      <Stepper label="Adults" value={adults} onChange={setAdults} />
      <Stepper label="Children" value={children} onChange={setChildren} />
      <div className="pos-card">
        <p className="text-sm text-muted-foreground mb-1">Total Headcount</p>
        <p className="text-2xl font-bold tabular-nums">{headcount}</p>
      </div>
      {isExclusive && (
        <div className="pos-card border-primary/20">
          <p className="text-sm text-muted-foreground">Exclusive Fee</p>
          <p className="text-xl font-bold text-primary tabular-nums">₱{exclusiveFee.toLocaleString()}</p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium block mb-1">Amount Paid</label>
        <input
          ref={amountRef}
          type="number"
          className="pos-input w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={isExclusive}
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>
    </ModuleShell>
  );
}
