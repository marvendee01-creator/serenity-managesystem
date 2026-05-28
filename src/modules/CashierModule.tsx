import { useState, useCallback, useEffect, useRef } from "react";
import { Banknote, Download, Plus, Trash2, Printer, Save, ArrowLeft } from "lucide-react";
import { saveCashierReport, deleteCashierReport, getCashierReports, getSystemConfig, setSystemConfig, type CashierReport, getChartOfAccounts, type ChartOfAccount } from "@/lib/db";
import { toast } from "sonner";

interface PettyItem {
  date: string;
  particulars: string;
  receipt_no: string;
  amount: string;
}

interface DenomRow {
  label: string;
  value: number;
  quantity: string;
}

const DEFAULT_DENOMS: DenomRow[] = [
  { label: "₱1,000", value: 1000, quantity: "" },
  { label: "₱500", value: 500, quantity: "" },
  { label: "₱100", value: 100, quantity: "" },
  { label: "₱50", value: 50, quantity: "" },
  { label: "₱20", value: 20, quantity: "" },
  { label: "₱10", value: 10, quantity: "" },
  { label: "₱5", value: 5, quantity: "" },
  { label: "₱1", value: 1, quantity: "" },
  { label: "₱0.25", value: 0.25, quantity: "" },
  { label: "GCASH", value: 1, quantity: "" },
];

interface CashierModuleProps {
  editReport?: CashierReport | null;
  onBack?: () => void;
}

export function buildCashierReportHTML(report: {
  date: string;
  beginning_cash: number;
  sales: number;
  petty_cash: number;
  expected_ending_cash: number;
  actual_cash: number;
  cash_over_short: number;
  petty_items?: { date: string; particulars: string; receipt_no: string; amount: number }[];
  denoms?: { label: string; value: number; quantity: number }[];
}) {
  const d = new Date(report.date);
  const dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
  const totalCashAvailable = report.beginning_cash + report.sales;
  const pettyItems = report.petty_items || [];
  const denomItems = report.denoms || [];

  return `
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
      h2 { text-align: center; font-size: 14px; margin: 4px 0; }
      h3 { font-size: 12px; margin: 12px 0 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      td, th { border: 1px solid #999; padding: 3px 6px; font-size: 11px; }
      th { background: #f0f0f0; text-align: left; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .negative { color: red; }
    </style>
    <h2>SERENITY INLAND RESORT</h2>
    <h2>DAILY CASHIER REPORT</h2>
    <p style="text-align:center">${dateStr}</p>
    <h3>A. CASH SUMMARY</h3>
    <table>
      <tr><td>Beginning Cash</td><td class="right">₱${report.beginning_cash.toLocaleString()}</td></tr>
      <tr><td>Sales</td><td class="right">₱${report.sales.toLocaleString()}</td></tr>
      <tr class="bold"><td>Total Cash Available</td><td class="right">₱${totalCashAvailable.toLocaleString()}</td></tr>
      <tr><td>Petty Cash</td><td class="right">₱${report.petty_cash.toLocaleString()}</td></tr>
      <tr class="bold"><td>Expected Ending Cash</td><td class="right">₱${report.expected_ending_cash.toLocaleString()}</td></tr>
      <tr><td>Actual Cash</td><td class="right">₱${report.actual_cash.toLocaleString()}</td></tr>
      <tr class="bold"><td>Cash Over/Short</td><td class="right ${report.cash_over_short < 0 ? 'negative' : ''}">₱${report.cash_over_short.toLocaleString()}</td></tr>
    </table>
    <h3>B. PETTY CASH EXPENSE DETAILS</h3>
    <table>
      <tr><th>Date</th><th>Particulars</th><th>Receipt No.</th><th class="right">Amount</th></tr>
      ${pettyItems.map(p => `<tr><td>${p.date}</td><td>${p.particulars}</td><td>${p.receipt_no}</td><td class="right">₱${p.amount.toLocaleString()}</td></tr>`).join('')}
      <tr class="bold"><td colspan="3" class="right">Total</td><td class="right">₱${report.petty_cash.toLocaleString()}</td></tr>
    </table>
    <h3>C. CASH DENOMINATION</h3>
    <table>
      <tr><th>Denomination</th><th class="right">Quantity</th><th class="right">Amount</th></tr>
      ${denomItems.map(d => `<tr><td>${d.label}</td><td class="right">${d.quantity}</td><td class="right">₱${(d.value * d.quantity).toLocaleString()}</td></tr>`).join('')}
      <tr class="bold"><td colspan="2" class="right">Total</td><td class="right">₱${report.actual_cash.toLocaleString()}</td></tr>
    </table>
  `;
}

export function printCashierReport(report: Parameters<typeof buildCashierReportHTML>[0]) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(`<html><head><title>Cashier Report</title></head><body>${buildCashierReportHTML(report)}<script>window.print();</script></body></html>`);
  w.document.close();
}

const PREV_ENDING_CASH_KEY = "serenity_prev_ending_cash";

export default function CashierModule({ editReport, onBack }: CashierModuleProps) {
  const [reportDate, setReportDate] = useState(editReport ? new Date(editReport.date).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'));
  const [beginningCash, setBeginningCash] = useState(editReport ? editReport.beginning_cash.toString() : "");
  const [sales, setSales] = useState(editReport ? editReport.sales.toString() : "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  const [pettyItems, setPettyItems] = useState<PettyItem[]>(
    editReport?.petty_items?.length
      ? editReport.petty_items.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: p.amount.toString() }))
      : [{ date: "", particulars: "", receipt_no: "", amount: "" }]
  );

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  
  const [denoms, setDenoms] = useState<DenomRow[]>(
    editReport?.denoms?.length
      ? editReport.denoms.map(d => ({ label: d.label, value: d.value, quantity: d.quantity ? d.quantity.toString() : "" }))
      : DEFAULT_DENOMS.map(d => ({ ...d }))
  );

  useEffect(() => { 
    firstRef.current?.focus(); 
    getChartOfAccounts().then(setAccounts);
  }, []);

  // Auto-fill beginning cash from the most recent cashier report BEFORE the selected report date.
  // Re-runs whenever the user changes Report Date so each day carries forward correctly
  // instead of inheriting a stale global value.
  useEffect(() => {
    if (editReport) return;
    if (!reportDate) return;
    let cancelled = false;
    getCashierReports().then(all => {
      if (cancelled) return;
      const target = reportDate; // YYYY-MM-DD
      const earlier = all
        .filter(r => r.date.slice(0, 10) < target)
        .sort((a, b) => b.date.localeCompare(a.date));
      const prev = earlier[0];
      if (prev) {
        setBeginningCash(String(prev.expected_ending_cash ?? 0));
      } else {
        // Fallback to last manually-closed value only when no prior report exists
        getSystemConfig("prev_ending_cash").then(val => {
          if (cancelled) return;
          if (val) setBeginningCash(val);
        });
      }
    });
    return () => { cancelled = true; };
  }, [reportDate, editReport]);

  const bc = parseFloat(beginningCash) || 0;
  const s = parseFloat(sales) || 0;
  const totalCashAvailable = bc + s;
  const totalPettyCash = pettyItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalActualCash = denoms.reduce((sum, d) => sum + d.value * (parseFloat(d.quantity) || 0), 0);
  const expected = totalCashAvailable - totalPettyCash;
  const overShort = totalActualCash - expected;

  const addPettyRow = () => setPettyItems(prev => [...prev, { date: "", particulars: "", receipt_no: "", amount: "" }]);
  const removePettyRow = (i: number) => setPettyItems(prev => prev.filter((_, idx) => idx !== i));
  const updatePetty = (i: number, field: keyof PettyItem, val: string) =>
    setPettyItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const updateDenom = (i: number, val: string) =>
    setDenoms(prev => prev.map((d, idx) => idx === i ? { ...d, quantity: val } : d));

  const buildReportData = () => ({
    date: reportDate ? (reportDate + "T00:00:00Z") : (editReport?.date || new Date().toISOString()),
    beginning_cash: bc,
    sales: s,
    petty_cash: totalPettyCash,
    expected_ending_cash: expected,
    actual_cash: totalActualCash,
    cash_over_short: overShort,
    petty_items: pettyItems.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: parseFloat(p.amount) || 0 })),
    denoms: denoms.map(d => ({ label: d.label, value: d.value, quantity: parseFloat(d.quantity) || 0 })),
  });

  const handleSave = useCallback(async () => {
    // Block future-month entries
    if (reportDate) {
      const d = new Date(reportDate + "T00:00:00");
      const now = new Date();
      const inputYM = d.getFullYear() * 12 + d.getMonth();
      const curYM = now.getFullYear() * 12 + now.getMonth();
      if (inputYM > curYM) {
        toast.error("Invalid Date: Cannot record future month transactions.");
        return;
      }
    }
    setSaving(true);
    try {
      // Deduplicate: prevent saving multiple reports for the same date
      if (!editReport) {
        const existing = await getCashierReports();
        if (existing.some(r => r.date.slice(0, 10) === reportDate)) {
          toast.error("A cashier report for this date already exists. Edit the existing one instead.");
          setSaving(false);
          return;
        }
      }
      await saveCashierReport(buildReportData());
      toast.success("Cashier report saved!");
      if (!editReport) {
        setBeginningCash(""); setSales("");
        setPettyItems([{ date: "", particulars: "", receipt_no: "", amount: "" }]);
        setDenoms(DEFAULT_DENOMS.map(d => ({ ...d })));
        firstRef.current?.focus();
      }
      if (onBack) onBack();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [bc, s, totalPettyCash, expected, totalActualCash, overShort, editReport, onBack, reportDate]);

  const handleDelete = useCallback(async () => {
    if (!editReport?.id) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteCashierReport(editReport.id);
      toast.success("Report deleted");
      if (onBack) onBack();
    } catch { toast.error("Failed to delete"); }
  }, [editReport, confirmDelete, onBack]);

  const handlePrint = () => printCashierReport(buildReportData());

  const exportReport = () => {
    const data = buildReportData();
    const d = new Date(data.date);
    const fmt = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
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
      ...denoms.map(dd => {
        const qty = parseFloat(dd.quantity) || 0;
        return [dd.label, qty.toString(), (dd.value * qty).toLocaleString()];
      }),
      ["", "Total", totalActualCash.toLocaleString()],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashier_report_${d.toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported!");
  };

  const inputClass = "pos-input w-full ring-2 ring-warning/50 bg-warning/5";
  const computedClass = "pos-input w-full bg-muted cursor-not-allowed opacity-80";

  return (
    <div className="reveal-up max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Banknote size={20} />
        </div>
        <h2 className="text-xl font-bold text-foreground" style={{ lineHeight: "1.2" }}>
          {editReport ? "Edit Cashier Report" : "Daily Cashier Report"}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Report Date */}
        <div>
          <label className="text-sm font-medium block mb-1">Report Date</label>
          <input type="date" className="pos-input w-full ring-2 ring-warning/50 bg-warning/5" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        </div>

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

        {/* B. PETTY CASH */}
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
                <div className="relative">
                  {i === 0 && <label className="text-[10px] font-medium text-muted-foreground block mb-1">Category</label>}
                  <input
                    type="text"
                    className={`${inputClass} text-sm h-10`}
                    value={item.particulars}
                    onChange={e => updatePetty(i, "particulars", e.target.value)}
                    onFocus={() => setActiveDropdownIdx(i)}
                    onBlur={() => setTimeout(() => setActiveDropdownIdx(null), 200)}
                    placeholder="Particulars"
                    autoComplete="off"
                  />
                  {activeDropdownIdx === i && (
                    <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50">
                      {accounts
                        .filter(a => a.account_name.toLowerCase().includes(item.particulars.toLowerCase()))
                        .map(a => (
                          <button
                            key={a.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                            onMouseDown={() => {
                              updatePetty(i, "particulars", a.account_name);
                              setActiveDropdownIdx(null);
                            }}
                          >
                            {a.account_name}
                          </button>
                        ))}
                      {accounts.filter(a => a.account_name.toLowerCase().includes(item.particulars.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground italic">No matching accounts</div>
                      )}
                    </div>
                  )}
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
            const qty = parseFloat(d.quantity) || 0;
            const amt = d.value * qty;
            return (
              <div key={d.label} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-sm font-medium">{d.label}</span>
                <input type="number" className={`${inputClass} text-sm h-10`} value={d.quantity} onChange={e => updateDenom(i, e.target.value)} placeholder="0" />
                <span className="text-sm font-medium tabular-nums text-right">₱{amt.toLocaleString()}</span>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Total Actual Cash</span>
            <span className="font-bold tabular-nums">₱{totalActualCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all disabled:opacity-50">
            <Save size={18} /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={async () => { await setSystemConfig("prev_ending_cash", expected.toString()); toast.success("Day closed! Beginning cash set for next day: ₱" + expected.toLocaleString()); }} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-success/10 text-success font-semibold text-sm hover:bg-success/20 active:scale-[0.97] transition-all border border-success/30">
            ✅ Close Day
          </button>
          <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-accent active:scale-[0.97] transition-all">
            <Printer size={16} /> Print
          </button>
          <button onClick={exportReport} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
            <Download size={16} /> Export to Excel
          </button>
          {editReport?.id && (
            <>
              <button onClick={handleDelete} className={`w-full flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm active:scale-[0.97] transition-all ${confirmDelete ? "bg-destructive text-destructive-foreground" : "bg-secondary text-destructive hover:bg-destructive/10"}`}>
                <Trash2 size={16} /> {confirmDelete ? "Confirm Delete" : "Delete"}
              </button>
              {confirmDelete && (
                <button onClick={() => setConfirmDelete(false)} className="w-full h-9 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              )}
            </>
          )}
          {onBack && (
            <button onClick={onBack} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-accent active:scale-[0.97] transition-all">
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
