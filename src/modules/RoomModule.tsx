import { useState, useCallback, useEffect, useRef } from "react";
import { BedDouble } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Stepper from "@/components/Stepper";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

const ROOM_TYPES = ["Barkada Room", "Kubo Room"] as const;

export default function RoomModule() {
  const [customerName, setCustomerName] = useState("");
  const [roomType, setRoomType] = useState<string>(ROOM_TYPES[0]);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [roomRate, setRoomRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setRoomRate(roomType === "Barkada Room" ? s.barkada_room_rate : s.kubo_room_rate);
    });
  }, [roomType]);

  const headcount = adults + children;

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount) || 0;
    if (amt === 0) { toast.error("Enter amount paid"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Room",
        customer_name: customerName || undefined,
        room_type: roomType,
        adults, children,
        total_headcount: headcount,
        amount_paid: amt,
        payment_method: payment,
      });
      toast.success("Room transaction saved!");
      setCustomerName(""); setAdults(0); setChildren(0); setAmount("");
      amountRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [roomType, adults, children, headcount, amount, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Room" icon={<BedDouble size={20} />} onSave={handleSave} saveLabel="Record Room" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-2">Room Type</label>
        <div className="flex gap-2">
          {ROOM_TYPES.map((rt) => (
            <button key={rt} className={`toggle-btn flex-1 ${roomType === rt ? "toggle-btn-active" : ""}`} onClick={() => setRoomType(rt)}>{rt}</button>
          ))}
        </div>
      </div>
      <div className="pos-card">
        <p className="text-sm text-muted-foreground">Rate: ₱{roomRate.toLocaleString()}</p>
      </div>
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
