import { useState, useCallback, useEffect, useRef } from "react";
import { DoorOpen } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import { addTransaction } from "@/lib/db";
import { toast } from "sonner";

export default function EntranceModule() {
  const [customerName, setCustomerName] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number; name?: string } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const a = parseInt(adults) || 0;
  const c = parseInt(children) || 0;
  const headcount = a + c;

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount) || 0;
    if (headcount === 0 && amt === 0) { toast.error("Please enter guest details"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Entrance",
        customer_name: customerName || undefined,
        adults: a, children: c,
        total_headcount: headcount,
        amount_paid: amt,
        payment_method: payment,
      });
      toast.success("Entrance recorded!");
      setTicket({ txNo, date: now, amount: amt, name: customerName || undefined });
      setCustomerName(""); setAdults(""); setChildren(""); setAmount("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, a, c, headcount, amount, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      <ModuleShell title="Entrance" icon={<DoorOpen size={20} />} onSave={handleSave} saveLabel="Record Entry" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
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
        <div>
          <label className="text-sm font-medium block mb-1">Amount Paid</label>
          <input type="number" className="pos-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
      </ModuleShell>
      {ticket && (
        <BarcodeTicket
          transactionNo={ticket.txNo}
          module="Entrance"
          dateTime={ticket.date}
          amount={ticket.amount}
          customerName={ticket.name}
          onClose={() => setTicket(null)}
        />
      )}
    </>
  );
}
