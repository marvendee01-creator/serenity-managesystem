import { useState, useCallback, useEffect, useRef } from "react";
import { Banknote } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { saveCashierReport } from "@/lib/db";
import { toast } from "sonner";

export default function CashierModule() {
  const [beginningCash, setBeginningCash] = useState("");
  const [sales, setSales] = useState("");
  const [pettyCash, setPettyCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const bc = parseFloat(beginningCash) || 0;
  const s = parseFloat(sales) || 0;
  const pc = parseFloat(pettyCash) || 0;
  const ac = parseFloat(actualCash) || 0;
  const expected = bc + s - pc;
  const overShort = ac - expected;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveCashierReport({
        date: new Date().toISOString(),
        beginning_cash: bc, sales: s, petty_cash: pc,
        expected_ending_cash: expected, actual_cash: ac, cash_over_short: overShort,
      });
      toast.success("Cashier report saved!");
      setBeginningCash(""); setSales(""); setPettyCash(""); setActualCash("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [bc, s, pc, ac, expected, overShort]);

  const fields = [
    { label: "Beginning Cash", value: beginningCash, set: setBeginningCash, ref: firstRef },
    { label: "Sales", value: sales, set: setSales },
    { label: "Petty Cash", value: pettyCash, set: setPettyCash },
    { label: "Actual Cash", value: actualCash, set: setActualCash },
  ];

  return (
    <ModuleShell title="Daily Cashier Report" icon={<Banknote size={20} />} onSave={handleSave} saveLabel="Save Report" saving={saving}>
      {fields.map((f, i) => (
        <div key={f.label}>
          <label className="text-sm font-medium block mb-1">{f.label}</label>
          <input
            ref={i === 0 ? firstRef : undefined}
            type="number"
            className="pos-input w-full"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder="0.00"
          />
        </div>
      ))}
      <div className="pos-card space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Expected Ending Cash</span>
          <span className="font-semibold tabular-nums">₱{expected.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Cash Over/Short</span>
          <span className={`font-bold tabular-nums ${overShort < 0 ? "text-destructive" : overShort > 0 ? "text-success" : ""}`}>
            ₱{overShort.toLocaleString()}
          </span>
        </div>
      </div>
    </ModuleShell>
  );
}
