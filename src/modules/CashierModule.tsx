import { useState, useCallback, useEffect, useRef } from "react";
import { Banknote, Download, Plus, Trash2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { saveCashierReport } from "@/lib/db";
import { toast } from "sonner";

interface PettyItem {
  date: string;
  particulars: string;
  receipt_no: string;
  amount: string;
}

interface DenomRow {
  label: string;
  value: number | null; // null = coins (manual)
  quantity: string;
  manualAmount: string;
}

const DEFAULT_DENOMS: DenomRow[] = [
  { label: "₱1,000", value: 1000, quantity: "", manualAmount: "" },
  { label: "₱500", value: 500, quantity: "", manualAmount: "" },
  { label: "₱100", value: 100, quantity: "", manualAmount: "" },
  { label: "₱50", value: 50, quantity: "", manualAmount: "" },
  { label: "₱20", value: 20, quantity: "", manualAmount: "" },
  { label: "Coins", value: null, quantity: "", manualAmount: "" },
];

export default function CashierModule() {
  const [beginningCash, setBeginningCash] = useState("");
  const [sales, setSales] = useState("");
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  // B. Petty Cash
  const [pettyItems, setPettyItems] = useState<PettyItem[]>([
    { date: "", particulars: "", receipt_no: "", amount: "" },
  ]);

  // C. Denominations
  const [denoms, setDenoms] = useState<DenomRow[]>(DEFAULT_DENOMS.map(d => ({ ...d })));

  useEffect(() => { firstRef.current?.focus(); }, []);

  // Computed values
  const bc = parseFloat(beginningCash) || 0;
  const s = parseFloat(sales) || 0;
  const totalCashAvailable = bc + s;

  const totalPettyCash = pettyItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const totalActualCash = denoms.reduce((sum, d) => {
    if (d.value === null) return sum + (parseFloat(d.manualAmount) || 0);
    return sum + d.value * (parseInt(d.quantity) || 0);
  }, 0);

  const expected = totalCashAvailable - totalPettyCash;
  const overShort = totalActualCash - expected;

  // Petty cash handlers
  const addPettyRow = () => setPettyItems(prev => [...prev, { date: "", particulars: "", receipt_no: "", amount: "" }]);
  const removePettyRow = (i: number) => setPettyItems(prev => prev.filter((_, idx) => idx !== i));
  const updatePetty = (i: number, field: keyof PettyItem, val: string) =>
    setPettyItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // Denom handlers
  const updateDenom = (i: number, field: "quantity" | "manualAmount", val: string) =>
    setDenoms(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveCashierReport({
        date: new Date().toISOString(),
        beginning_cash: bc, sales: s, petty_cash: totalPettyCash,
        expected_ending_cash: expected, actual_cash: totalActualCash, cash_over_short: overShort,
      });
      toast.success("Cashier report saved!");
      setBeginningCash(""); setSales("");
      setPettyItems([{ date: "", particulars: "", receipt_no: "", amount: "" }]);
      setDenoms(DEFAULT_DENOMS.map(d => ({ ...d })));
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [bc, s, totalPettyCash, expected, totalActualCash, overShort]);

  const exportReport = () => {
    const date = new Date();
    const fmt = `${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getDate().toString().padStart(2,'0')}/${date.getFullYear()}`;
    const rows: string[][] = [
      ["DAILY CASHIER REPORT", fmt],
      [],
      ["A. CASH SUMMARY"],
      ["Beginning Cash", bc.toLocaleString()],
      ["Sales", s.toLocaleString()],
      ["Total Cash Available", totalCashAvailable.toLocaleString()],
      ["Petty Cash", totalPettyCash.toLocaleString()],
      ["Expected Ending Cash", expected.toLocaleString()],
      ["Actual Cash", totalActualCash.toLocaleString()],
      ["Cash Over/Short", overShort.toLocaleString()],
      [],
      ["B. PETTY CASH EXPENSE DETAILS"],
      ["Date", "Particulars", "Receipt No.", "Amount"],
      ...pettyItems.map(p => [p.date, p.particulars, p.receipt_no, (parseFloat(p.amount) || 0).toLocaleString()]),
      ["", "", "Total", totalPettyCash.toLocaleString()],
      [],
      ["C. CASH DENOMINATION"],
      ["Denomination", "Quantity", "Amount"],
      ...denoms.map(d => {
        const amt = d.value === null ? (parseFloat(d.manualAmount) || 0) : d.value * (parseInt(d.quantity) || 0);
        return [d.label, d.value === null ? "-" : (parseInt(d.quantity) || 0).toString(), amt.toLocaleString()];
      }),
      ["", "Total", totalActualCash.toLocaleString()],
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

  const inputClass = "pos-input w-full ring-2 ring-warning/50 bg-warning/5";
  const computedClass = "pos-input w-full bg-muted cursor-not-allowed opacity-80";

  return (
    <ModuleShell title="Daily Cashier Report" icon={<Banknote size={20} />} onSave={handleSave} saveLabel="Generate Daily Report" saving={saving}>
      {/* A. CASH SUMMARY */}
      <div className="pos-card space-y-3">
        <h3 className="text-sm font-bold text-foreground tracking-wide">A. CASH SUMMARY</h3>
        <div>
          <label className="text-sm font-medium block mb-1">Beginning Cash</label>
          <input ref={firstRef} type="number" className={inputClass} value={beginningCash} onChange={e => setBeginningCash(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Sales</label>
          <input type="number" className={inputClass} value={sales} onChange={e => setSales(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Total Cash Available</label>
          <input type="text" className={computedClass} value={`₱${totalCashAvailable.toLocaleString()}`} readOnly tabIndex={-1} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Petty Cash</label>
          <input type="text" className={computedClass} value={`₱${totalPettyCash.toLocaleString()}`} readOnly tabIndex={-1} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Expected Ending Cash</label>
          <input type="text" className={computedClass} value={`₱${expected.toLocaleString()}`} readOnly tabIndex={-1} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Actual Cash</label>
          <input type="text" className={computedClass} value={`₱${totalActualCash.toLocaleString()}`} readOnly tabIndex={-1} />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Cash Over/Short</span>
          <span className={`font-bold tabular-nums text-lg ${overShort < 0 ? "text-destructive" : overShort > 0 ? "text-success" : ""}`}>
            ₱{overShort.toLocaleString()}
          </span>
        </div>
      </div>

      {/* B. PETTY CASH EXPENSE DETAILS */}
      <div className="pos-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground tracking-wide">B. PETTY CASH EXPENSE DETAILS</h3>
          <button onClick={addPettyRow} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {pettyItems.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                {i === 0 && <label className="text-[10px] font-medium text-muted-foreground block mb-1">Date</label>}
                <input type="date" className={`${inputClass} text-sm h-10`} value={item.date} onChange={e => updatePetty(i, "date", e.target.value)} />
              </div>
              <div>
                {i === 0 && <label className="text-[10px] font-medium text-muted-foreground block mb-1">Particulars</label>}
                <input type="text" className={`${inputClass} text-sm h-10`} value={item.particulars} onChange={e => updatePetty(i, "particulars", e.target.value)} placeholder="Item" />
              </div>
              <div>
                {i === 0 && <label className="text-[10px] font-medium text-muted-foreground block mb-1">Receipt #</label>}
                <input type="text" className={`${inputClass} text-sm h-10`} value={item.receipt_no} onChange={e => updatePetty(i, "receipt_no", e.target.value)} placeholder="—" />
              </div>
              <div>
                {i === 0 && <label className="text-[10px] font-medium text-muted-foreground block mb-1">Amount</label>}
                <input type="number" className={`${inputClass} text-sm h-10`} value={item.amount} onChange={e => updatePetty(i, "amount", e.target.value)} placeholder="0.00" />
              </div>
              <button onClick={() => removePettyRow(i)} className="w-8 h-10 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all" disabled={pettyItems.length === 1}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Total Petty Cash</span>
          <span className="font-bold tabular-nums">₱{totalPettyCash.toLocaleString()}</span>
        </div>
      </div>

      {/* C. CASH DENOMINATION */}
      <div className="pos-card space-y-3">
        <h3 className="text-sm font-bold text-foreground tracking-wide">C. CASH DENOMINATION</h3>
        <div className="grid grid-cols-3 gap-2 text-[10px] font-medium text-muted-foreground pb-1">
          <span>Denomination</span><span>Quantity</span><span className="text-right">Amount</span>
        </div>
        {denoms.map((d, i) => {
          const amt = d.value === null ? (parseFloat(d.manualAmount) || 0) : d.value * (parseInt(d.quantity) || 0);
          return (
            <div key={d.label} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium">{d.label}</span>
              {d.value !== null ? (
                <>
                  <input type="number" className={`${inputClass} text-sm h-10`} value={d.quantity} onChange={e => updateDenom(i, "quantity", e.target.value)} placeholder="0" />
                  <span className="text-sm font-medium tabular-nums text-right">₱{amt.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground text-center">—</span>
                  <input type="number" className={`${inputClass} text-sm h-10`} value={d.manualAmount} onChange={e => updateDenom(i, "manualAmount", e.target.value)} placeholder="0.00" />
                </>
              )}
            </div>
          );
        })}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium text-muted-foreground">Total Actual Cash</span>
          <span className="font-bold tabular-nums">₱{totalActualCash.toLocaleString()}</span>
        </div>
      </div>

      {/* Export */}
      <button onClick={exportReport} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
        <Download size={16} /> Export to Excel
      </button>
    </ModuleShell>
  );
}
