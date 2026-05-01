import { useState, useCallback, useEffect, useRef } from "react";
import { TentTree } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TentModule() {
  const [customerName, setCustomerName] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [rate, setRate] = useState(300);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { getSettings().then((s) => setRate(s.tent_rate ?? 300)); }, []);

  const hc = parseInt(headcount) || 0;
  const total = rate;
  const received = parseFloat(amountReceived) || 0;
  const change = received - total;

  const handleSave = useCallback(async () => {
    if (total <= 0) { toast.error("Tent rate not set"); return; }
    if (received > 0 && received < total) { toast.error("Insufficient amount received"); return; }
    setSaving(true);
    const txNo = `TN-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Tent",
        customer_name: customerName || undefined,
        adults: hc,
        children: 0,
        total_headcount: hc,
        amount_paid: total,
        payment_method: payment,
        rate,
      });
      toast.success("Tent recorded!");
      setTicket({ txNo, date: now, amount: total });
      setCustomerName(""); setHeadcount(""); setAmountReceived("");
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, hc, total, payment, rate, received, useManualDatetime, customDate, customTime]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      <ModuleShell title="Tent" icon={<TentTree size={20} />} onSave={handleSave} saveLabel="Record Tent" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>

        <div className="flex items-center gap-3">
          <Switch id="tent-manual-dt" checked={useManualDatetime} onCheckedChange={setUseManualDatetime} />
          <Label htmlFor="tent-manual-dt" className="text-sm cursor-pointer">Manual Date/Time Override</Label>
        </div>
        {useManualDatetime && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" className="pos-input w-full" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Time</label>
              <input type="time" className="pos-input w-full" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-1">Headcount</label>
          <input type="number" className="pos-input w-full" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="0" min="0" />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tent Rate</label>
          <input type="number" step="0.01" className="pos-input w-full" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} min="0" />
          <p className="text-xs text-muted-foreground mt-1">Auto-filled from Settings → Tent Settings</p>
        </div>

        <div className="pos-card border-primary/30">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-primary tabular-nums">{formatPeso(total)}</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Amount Received</label>
          <input type="number" step="0.01" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
        </div>

        {received > 0 && total > 0 && (
          <div className={`pos-card ${received >= total ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= total ? "text-success" : "text-destructive"}`}>
              {formatPeso(change)}
            </p>
          </div>
        )}
      </ModuleShell>
      {ticket && (
        <BarcodeTicket
          transactionNo={ticket.txNo}
          module="Tent"
          dateTime={ticket.date}
          amount={ticket.amount}
          customerName={customerName}
          onClose={() => setTicket(null)}
        />
      )}
    </>
  );
}
