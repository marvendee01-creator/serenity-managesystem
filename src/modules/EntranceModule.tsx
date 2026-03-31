import { useState, useCallback, useEffect, useRef } from "react";
import { DoorOpen, Sun, Moon } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import { addTransaction } from "@/lib/db";
import { toast } from "sonner";

const TOUR_TYPES = ["Day Tour", "Overnight"] as const;

function getAutoTourType(): "Day Tour" | "Overnight" {
  return new Date().getHours() < 15 ? "Day Tour" : "Overnight";
}

export default function EntranceModule() {
  const [customerName, setCustomerName] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [tourType, setTourType] = useState<string>(getAutoTourType());
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number; name?: string } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const shownAutoDetect = useRef(false);

  useEffect(() => { firstRef.current?.focus(); }, []);

  // Auto-detect tour type on mount and show toast
  useEffect(() => {
    if (!shownAutoDetect.current) {
      shownAutoDetect.current = true;
      const auto = getAutoTourType();
      const hour = new Date().getHours();
      if (auto === "Day Tour") {
        toast.info("AUTO DETECT: Day Tour (Before 3PM)", { icon: <Sun size={18} /> });
      } else {
        toast.info("AUTO DETECT: Overnight (After 3PM)", { icon: <Moon size={18} /> });
      }
    }
  }, []);

  // Time limit check — Day Tour exceeded 10PM
  useEffect(() => {
    if (tourType !== "Day Tour") return;
    const check = () => {
      if (new Date().getHours() >= 22) {
        toast.warning("⚠️ TIME LIMIT: Day Tour exceeded 10PM", { duration: 10000 });
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tourType]);

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
        tour_type: tourType,
        entry_time: now,
      });
      toast.success("Entrance recorded!");
      setTicket({ txNo, date: now, amount: amt, name: customerName || undefined });
      setCustomerName(""); setAdults(""); setChildren(""); setAmount("");
      setTourType(getAutoTourType());
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, a, c, headcount, amount, payment, tourType]);

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
          <label className="text-sm font-medium block mb-2">Tour Type</label>
          <div className="flex gap-2">
            {TOUR_TYPES.map((t) => (
              <button
                key={t}
                className={`toggle-btn flex-1 flex items-center justify-center gap-2 ${tourType === t ? "toggle-btn-active" : ""}`}
                onClick={() => setTourType(t)}
              >
                {t === "Day Tour" ? <Sun size={16} /> : <Moon size={16} />}
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-detected: {getAutoTourType()} ({new Date().getHours() < 15 ? "Before" : "After"} 3PM)
          </p>
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
