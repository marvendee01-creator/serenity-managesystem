import { useState, useCallback, useEffect, useRef } from "react";
import { Gamepad2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const GAMES = ["Volleyball", "Dart", "Basketball", "Billiard"] as const;

export default function GamesModule() {
  const [game, setGame] = useState<string>(GAMES[0]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const amt = parseFloat(amount) || 0;
  const received = parseFloat(amountReceived) || 0;
  const change = received - amt;

  const handleSave = useCallback(async () => {
    if (amt === 0) { toast.error("Enter amount"); return; }
    if (received < amt && received > 0) { toast.error("Insufficient amount received"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Games Rental",
        game_type: game,
        customer_name: name || undefined,
        adults: 0, children: 0, total_headcount: 0,
        amount_paid: amt,
        payment_method: payment,
      });
      toast.success(`${game} rental saved!`);

      const rData = {
        transactionNo: txNo, dateTime: now, module: `Games - ${game}`,
        customerName: name || undefined,
        totalAmount: amt, amountReceived: received > 0 ? received : undefined,
        change: received >= amt && received > 0 ? change : undefined,
        paymentMethod: payment,
        details: [{ label: "Game Type", value: game }],
      };

      if (received >= amt && received > 0) {
        setSuccessChange(change);
      }
      setReceiptData(rData);

      setName(""); setAmount(""); setAmountReceived("");
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      nameRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [game, name, amt, payment, received, change]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => setSuccessChange(null)} />}
      {receiptData && !successChange && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      <ModuleShell title="Games Rental" icon={<Gamepad2 size={20} />} onSave={handleSave} saveLabel="Record Rental" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-2">Game Type</label>
          <div className="grid grid-cols-2 gap-2">
            {GAMES.map((g) => (
              <button key={g} className={`toggle-btn ${game === g ? "toggle-btn-active" : ""}`} onClick={() => setGame(g)}>{g}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name</label>
          <input ref={nameRef} type="text" className="pos-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="games-manual-dt" checked={useManualDatetime} onCheckedChange={setUseManualDatetime} />
          <Label htmlFor="games-manual-dt" className="text-sm cursor-pointer">Manual Date/Time Override</Label>
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
          <label className="text-sm font-medium block mb-1">Amount</label>
          <input type="number" step="0.01" className="pos-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Amount Received</label>
          <input type="number" step="0.01" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
        </div>
        {received > 0 && amt > 0 && (
          <div className={`pos-card ${received >= amt ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= amt ? "text-success" : "text-destructive"}`}>
              {formatPeso(change)}
            </p>
          </div>
        )}
      </ModuleShell>
    </>
  );
}
