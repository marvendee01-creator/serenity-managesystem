import { useState, useCallback, useEffect, useRef } from "react";
import { DoorOpen } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Stepper from "@/components/Stepper";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction } from "@/lib/db";
import { toast } from "sonner";

export default function EntranceModule() {
  const [customerName, setCustomerName] = useState("");
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const headcount = adults + children;

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount) || 0;
    if (headcount === 0 && amt === 0) { toast.error("Please enter guest details"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Entrance",
        adults, children,
        total_headcount: headcount,
        amount_paid: amt,
        payment_method: payment,
      });
      toast.success("Entrance recorded!");
      setAdults(0); setChildren(0); setAmount("");
      amountRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [adults, children, headcount, amount, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Entrance" icon={<DoorOpen size={20} />} onSave={handleSave} saveLabel="Record Entry" saving={saving}>
      <Stepper label="Adults" value={adults} onChange={setAdults} />
      <Stepper label="Children" value={children} onChange={setChildren} />
      <div className="pos-card">
        <p className="text-sm text-muted-foreground mb-1">Total Headcount</p>
        <p className="text-2xl font-bold tabular-nums">{headcount}</p>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Amount Paid</label>
        <input
          ref={amountRef}
          type="number"
          className="pos-input w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>
    </ModuleShell>
  );
}
