import { useState, useCallback, useEffect, useRef } from "react";
import { Table2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TableRentModule() {
  const [customerName, setCustomerName] = useState("");
  const [tables, setTables] = useState("");
  const [rate, setRate] = useState(200);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { getSettings().then((s) => setRate(s.table_rent_rate)); }, []);

  const numTables = parseInt(tables) || 0;
  const total = numTables * rate;

  const handleSave = useCallback(async () => {
    if (numTables === 0) { toast.error("Enter number of tables"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Table Rent",
        customer_name: customerName || undefined,
        number_of_tables: numTables,
        adults: 0, children: 0, total_headcount: 0,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Table rent saved!");
      setTicket({ txNo, date: now, amount: total });
      setCustomerName(""); setTables("");
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, numTables, total, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      <ModuleShell title="Table Rent" icon={<Table2 size={20} />} onSave={handleSave} saveLabel="Record Rent" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="table-manual-dt" checked={useManualDatetime} onCheckedChange={setUseManualDatetime} />
          <Label htmlFor="table-manual-dt" className="text-sm cursor-pointer">Manual Date/Time Override</Label>
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
        )
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Number of Tables</label>
          <input type="number" className="pos-input w-full" value={tables} onChange={(e) => setTables(e.target.value)} placeholder="0" min="0" />
        </div>
        <div className="pos-card">
          <p className="text-sm text-muted-foreground">Rate per table: ₱{rate.toLocaleString()}</p>
          <p className="text-2xl font-bold tabular-nums mt-1">₱{total.toLocaleString()}</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
      </ModuleShell>
      {ticket && (
        <BarcodeTicket
          transactionNo={ticket.txNo}
          module="Table Rent"
          dateTime={ticket.date}
          amount={ticket.amount}
          customerName={customerName}
          onClose={() => setTicket(null)}
        />
      )}
    </>
  );
}
