import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Stepper from "@/components/Stepper";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

const TYPES = ["Exclusive", "Non-Exclusive"] as const;

export default function BookingModule() {
  const [bookingType, setBookingType] = useState<string>(TYPES[0]);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [exclusiveFee, setExclusiveFee] = useState(5000);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getSettings().then((s) => setExclusiveFee(s.exclusive_fee)); }, []);

  const headcount = adults + children;
  const total = bookingType === "Exclusive" ? exclusiveFee : parseFloat(amount) || 0;

  const handleSave = useCallback(async () => {
    if (total === 0) { toast.error("Enter amount"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Booking",
        booking_type: bookingType,
        adults, children,
        total_headcount: headcount,
        amount_paid: parseFloat(amount) || total,
        payment_method: payment,
      });
      toast.success("Booking saved!");
      setAdults(0); setChildren(0); setAmount("");
      amountRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [bookingType, adults, children, headcount, amount, total, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Booking" icon={<CalendarDays size={20} />} onSave={handleSave} saveLabel="Record Booking" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-2">Booking Type</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button key={t} className={`toggle-btn flex-1 ${bookingType === t ? "toggle-btn-active" : ""}`} onClick={() => setBookingType(t)}>{t}</button>
          ))}
        </div>
      </div>
      {bookingType === "Exclusive" && (
        <div className="pos-card">
          <p className="text-sm text-muted-foreground">Exclusive Fee: ₱{exclusiveFee.toLocaleString()}</p>
        </div>
      )}
      <Stepper label="Adults" value={adults} onChange={setAdults} />
      <Stepper label="Children" value={children} onChange={setChildren} />
      <div>
        <label className="text-sm font-medium block mb-1">Amount Paid</label>
        <input ref={amountRef} type="number" className="pos-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>
    </ModuleShell>
  );
}
