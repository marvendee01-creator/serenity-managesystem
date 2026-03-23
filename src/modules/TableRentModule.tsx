import { useState, useCallback, useEffect } from "react";
import { Table2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Stepper from "@/components/Stepper";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";

export default function TableRentModule() {
  const [tables, setTables] = useState(0);
  const [rate, setRate] = useState(200);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSettings().then((s) => setRate(s.table_rent_rate)); }, []);

  const total = tables * rate;

  const handleSave = useCallback(async () => {
    if (tables === 0) { toast.error("Add tables"); return; }
    setSaving(true);
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Table Rent",
        number_of_tables: tables,
        adults: 0, children: 0, total_headcount: 0,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Table rent saved!");
      setTables(0);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [tables, total, payment]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <ModuleShell title="Table Rent" icon={<Table2 size={20} />} onSave={handleSave} saveLabel="Record Rent" saving={saving}>
      <Stepper label="Number of Tables" value={tables} onChange={setTables} />
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
