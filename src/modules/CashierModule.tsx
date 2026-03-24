import { useState, useCallback, useEffect, useRef } from "react";
import { Banknote, Download } from "lucide-react";
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
  const totalCashAvailable = bc + s;
  const expected = totalCashAvailable - pc;
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

  const exportReport = () => {
    const date = new Date();
    const formatted = `${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')}/${date.getFullYear()}`;
    const rows = [
      ["Daily Cashier Report", formatted],
      [],
      ["Beginning Cash", bc.toLocaleString()],
      ["Sales", s.toLocaleString()],
      ["Total Cash Available", totalCashAvailable.toLocaleString()],
      ["Petty Cash", pc.toLocaleString()],
      ["Expected Ending Cash", expected.toLocaleString()],
      ["Actual Cash", ac.toLocaleString()],
      ["Cash Over/Short", overShort.toLocaleString()],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashier_report_${date.toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  const highlightClass = "pos-input w-full ring-2 ring-warning/50 bg-warning/5";
  const computedClass = "pos-input w-full bg-muted cursor-not-allowed opacity-80";

  const fields = [
    { label: "Beginning Cash", value: beginningCash, set: setBeginningCash, ref: firstRef, editable: true },
    { label: "Sales", value: sales, set: setSales, editable: true },
    { label: "Total Cash Available", value: totalCashAvailable.toLocaleString(), editable: false },
    { label: "Petty Cash", value: pettyCash, set: setPettyCash, editable: true },
    { label: "Expected Ending Cash", value: expected.toLocaleString(), editable: false },
    { label: "Actual Cash", value: actualCash, set: setActualCash, editable: true },
  ];

  return (
    <ModuleShell title="Daily Cashier Report" icon={<Banknote size={20} />} onSave={handleSave} saveLabel="Generate Daily Report" saving={saving}>
      {fields.map((f, i) => (
        <div key={f.label}>
          <label className="text-sm font-medium block mb-1">{f.label}</label>
          {f.editable ? (
            <input
              ref={i === 0 ? firstRef : undefined}
              type="number"
              className={highlightClass}
              value={f.value as string}
              onChange={(e) => f.set!(e.target.value)}
              placeholder="0.00"
            />
          ) : (
            <input
              type="text"
              className={computedClass}
              value={`₱${f.value}`}
              readOnly
              tabIndex={-1}
            />
          )}
        </div>
      ))}
      <div className="pos-card space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Cash Over/Short</span>
          <span className={`font-bold tabular-nums text-lg ${overShort < 0 ? "text-destructive" : overShort > 0 ? "text-success" : ""}`}>
            ₱{overShort.toLocaleString()}
          </span>
        </div>
      </div>
      <button
        onClick={exportReport}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all"
      >
        <Download size={16} /> Export to Excel
      </button>
    </ModuleShell>
  );
}
