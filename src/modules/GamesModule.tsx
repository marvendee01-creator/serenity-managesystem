import { useState, useCallback, useEffect, useRef } from "react";
import { Gamepad2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import { addTransaction } from "@/lib/db";
import { toast } from "sonner";

const GAMES = ["Volleyball", "Dart", "Basketball", "Billiard"] as const;

export default function GamesModule() {
  const [game, setGame] = useState<string>(GAMES[0]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number; name?: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount) || 0;
    if (amt === 0) { toast.error("Enter amount"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = new Date().toISOString();
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
      setTicket({ txNo, date: now, amount: amt, name: name || undefined });
      setName(""); setAmount("");
      nameRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [game, name, amount, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
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
        <div>
          <label className="text-sm font-medium block mb-1">Amount Paid</label>
          <input type="number" className="pos-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
      </ModuleShell>
      {ticket && (
        <BarcodeTicket
          transactionNo={ticket.txNo}
          module={`Games - ${game}`}
          dateTime={ticket.date}
          amount={ticket.amount}
          customerName={ticket.name}
          onClose={() => setTicket(null)}
        />
      )}
    </>
  );
}
