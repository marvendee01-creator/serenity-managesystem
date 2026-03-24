import { useState, useCallback, useEffect, useRef } from "react";
import { Table2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

export default function TableRentModule() {
  const [tables, setTables] = useState("");
  const [rate, setRate] = useState(200);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { getSettings().then((s) => setRate(s.table_rent_rate)); }, []);

  const numTables = parseInt(tables) || 0;
  const total = numTables * rate;

  const handleSave = useCallback(async () => {
    if (numTables === 0) { toast.error("Enter number of tables"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Table Rent",
        number_of_tables: numTables,
        adults: 0, children: 0, total_headcount: 0,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Table rent saved!");
      setTables("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [numTables, total, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Table Rent" icon={<Table2 size={20} />} onSave={handleSave} saveLabel="Record Rent" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-1">Number of Tables</label>
        <input ref={firstRef} type="number" className="pos-input w-full" value={tables} onChange={(e) => setTables(e.target.value)} placeholder="0" min="0" />
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
  );
}
