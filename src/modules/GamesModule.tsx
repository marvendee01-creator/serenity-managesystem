import { useState, useCallback, useEffect, useRef } from "react";
import { Gamepad2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const GAME_TYPES = ["Billiard", "Videoke", "Other"] as const;

export default function GamesModule() {
  const [gameType, setGameType] = useState<string>(GAME_TYPES[0]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [defaultHours, setDefaultHours] = useState("2");
  const [amountReceived, setAmountReceived] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [billiardRate, setBilliardRate] = useState(100);
  const [videokeRate, setVideokeRate] = useState(200);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    getSettings().then((s) => {
      setBilliardRate(s.billiard_rate ?? 100);
      setVideokeRate(s.videoke_rate ?? 200);
      // Auto-prefill rate for default selection
      setRate(String(s.billiard_rate ?? 100));
    });
  }, []);

  // Auto-prefill rate when game type changes
  useEffect(() => {
    if (gameType === "Billiard") setRate(String(billiardRate));
    else if (gameType === "Videoke") setRate(String(videokeRate));
    else setRate("");
  }, [gameType, billiardRate, videokeRate]);

  const amt = parseFloat(rate) || 0;
  const received = parseFloat(amountReceived) || 0;
  const change = received - amt;
  const hours = parseFloat(defaultHours) || 2;

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error("Enter customer name"); return; }
    if (amt === 0) { toast.error("Enter rate/amount"); return; }
    if (received < amt && received > 0) { toast.error("Insufficient amount received"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    
    const startTime = now;
    const endTime = new Date(new Date(startTime).getTime() + hours * 60 * 60 * 1000).toISOString();

    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Games Rental",
        game_type: gameType,
        customer_name: name || undefined,
        adults: 0, children: 0, total_headcount: 0,
        amount_paid: amt,
        payment_method: payment,
        start_time: startTime,
        end_time: endTime,
        default_hours: hours,
        extend_hours: 0,
        extend_amount: 0,
        status: "ONGOING",
        rate: amt,
      });
      toast.success(`${gameType} session started for ${name}!`);

      const rData = {
        transactionNo: txNo, dateTime: now, module: `Games - ${gameType}`,
        customerName: name || undefined,
        totalAmount: amt, amountReceived: received > 0 ? received : undefined,
        change: received >= amt && received > 0 ? change : undefined,
        paymentMethod: payment,
        details: [
          { label: "Game Type", value: gameType },
          { label: "Duration", value: `${hours} hour(s)` },
          { label: "End Time", value: new Date(endTime).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) },
        ],
      };

      if (received >= amt && received > 0) {
        setSuccessChange(change);
      }
      setReceiptData(rData);

      setName(""); setAmountReceived("");
      setDefaultHours("2");
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      // Re-prefill rate
      if (gameType === "Billiard") setRate(String(billiardRate));
      else if (gameType === "Videoke") setRate(String(videokeRate));
      else setRate("");
      nameRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [gameType, name, amt, payment, received, change, useManualDatetime, customDate, customTime, hours, billiardRate, videokeRate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => setSuccessChange(null)} />}
      {receiptData && !successChange && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      <ModuleShell title="Games Rental" icon={<Gamepad2 size={20} />} onSave={handleSave} saveLabel="Start Session" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-2">Game Type</label>
          <div className="grid grid-cols-3 gap-2">
            {GAME_TYPES.map((g) => (
              <button key={g} className={`toggle-btn ${gameType === g ? "toggle-btn-active" : ""}`} onClick={() => setGameType(g)}>{g}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name <span className="text-destructive">*</span></label>
          <input ref={nameRef} type="text" className="pos-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Required" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Rate (₱)</label>
            <input type="number" step="0.01" className="pos-input w-full" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Hours</label>
            <input type="number" step="0.5" min="0.5" className="pos-input w-full" value={defaultHours} onChange={(e) => setDefaultHours(e.target.value)} placeholder="2" />
          </div>
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
