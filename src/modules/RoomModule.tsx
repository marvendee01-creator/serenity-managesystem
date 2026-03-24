import { useState, useCallback, useEffect, useRef } from "react";
import { BedDouble } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

const ROOM_TYPES = ["Kubo Room", "Barkada Room"] as const;

export default function RoomModule() {
  const [customerName, setCustomerName] = useState("");
  const [roomType, setRoomType] = useState<string>(ROOM_TYPES[0]);
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [roomRate, setRoomRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    getSettings().then((s) => {
      const rate = roomType === "Barkada Room" ? s.barkada_room_rate : s.kubo_room_rate;
      setRoomRate(rate);
      setAmount(rate.toString());
    });
  }, [roomType]);

  const a = parseInt(adults) || 0;
  const c = parseInt(children) || 0;
  const headcount = a + c;

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
        adults: a, children: c,
        total_headcount: headcount,
        amount_paid: amt,
        payment_method: payment,
      });
      toast.success("Room transaction saved!");
      setCustomerName(""); setAdults(""); setChildren(""); setAmount("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, roomType, a, c, headcount, amount, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Room" icon={<BedDouble size={20} />} onSave={handleSave} saveLabel="Record Room" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
        <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Room Type</label>
        <div className="flex gap-2">
          {ROOM_TYPES.map((rt) => (
            <button key={rt} className={`toggle-btn flex-1 ${roomType === rt ? "toggle-btn-active" : ""}`} onClick={() => setRoomType(rt)}>{rt}</button>
          ))}
        </div>
      </div>
      <div className="pos-card">
        <p className="text-sm text-muted-foreground">Room Rate: ₱{roomRate.toLocaleString()}</p>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Amount Paid</label>
        <input type="number" className="pos-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Adults</label>
        <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Children</label>
        <input type="number" className="pos-input w-full" value={children} onChange={(e) => setChildren(e.target.value)} placeholder="0" min="0" />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>
    </ModuleShell>
  );
}
