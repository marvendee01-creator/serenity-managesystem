import { useState, useEffect, useCallback, useRef } from "react";
import { Banknote, Plus, Trash2, Save, Printer, Download, ArrowLeft } from "lucide-react";
import { getTransactions, getBookingCashierReports, saveBookingCashierReport, getSystemConfig, setSystemConfig, type BookingCashierReportDB } from "@/lib/db";
import { toast } from "sonner";

interface PettyItem {
  date: string;
  particulars: string;
  receipt_no: string;
  amount: string;
  is_budoy?: boolean;
}

const PETTY_PRESETS = ["Others", "Budoy Share (20%)"];

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

export type BookingCashierReport = BookingCashierReportDB & {
  reportDate: string;
  beginningCash: number;
  entranceSales: number;
  pettyItems: { date: string; particulars: string; receipt_no: string; amount: number }[];
  actualCash: number;
};

export async function loadBookingCashierReports(): Promise<BookingCashierReport[]> {
  const reports = await getBookingCashierReports();
  return reports.map(r => ({
    ...r,
    reportDate: r.report_date,
    beginningCash: r.beginning_cash,
    entranceSales: r.entrance_sales,
    pettyItems: r.petty_items || [],
    actualCash: r.actual_cash,
  }));
}

export function buildBookingCashierHTML(report: BookingCashierReport) {
  const totalPetty = report.pettyItems.reduce((s, p) => s + p.amount, 0);
  const totalCashAvailable = report.beginningCash + report.entranceSales;
  const expected = totalCashAvailable - totalPetty;
  const overShort = report.actualCash - expected;

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
    <h2>DAILY CASHIER REPORT – BOOKING</h2>
    <p style="text-align:center">${report.reportDate}</p>
    <h3>A. CASH SUMMARY</h3>
    <table>
      <tr><td>Beginning Cash</td><td class="right">₱${report.beginningCash.toLocaleString()}</td></tr>
      <tr><td>Entrance / Booking Sales</td><td class="right">₱${report.entranceSales.toLocaleString()}</td></tr>
      <tr class="bold"><td>Total Cash Available</td><td class="right">₱${totalCashAvailable.toLocaleString()}</td></tr>
      <tr><td>Petty Cash</td><td class="right">₱${totalPetty.toLocaleString()}</td></tr>
      <tr class="bold"><td>Expected Ending Cash</td><td class="right">₱${expected.toLocaleString()}</td></tr>
      <tr><td>Actual Cash</td><td class="right">₱${report.actualCash.toLocaleString()}</td></tr>
      <tr class="bold"><td>Cash Over/Short</td><td class="right ${overShort < 0 ? 'negative' : ''}">₱${overShort.toLocaleString()}</td></tr>
    </table>
    <h3>B. PETTY CASH EXPENSE DETAILS</h3>
    <table>
      <tr><th>Date</th><th>Particulars</th><th>Receipt No.</th><th class="right">Amount</th></tr>
      ${report.pettyItems.map(p => `<tr><td>${p.date}</td><td>${p.particulars}</td><td>${p.receipt_no}</td><td class="right">₱${p.amount.toLocaleString()}</td></tr>`).join('')}
      <tr class="bold"><td colspan="3" class="right">Total</td><td class="right">₱${totalPetty.toLocaleString()}</td></tr>
    </table>
    <h3>C. CASH DENOMINATION</h3>
    <table>
      <tr><th>Denomination</th><th class="right">Quantity</th><th class="right">Amount</th></tr>
      ${report.denoms.map(d => `<tr><td>${d.label}</td><td class="right">${d.quantity}</td><td class="right">₱${(d.value * d.quantity).toLocaleString()}</td></tr>`).join('')}
      <tr class="bold"><td colspan="2" class="right">Total</td><td class="right">₱${report.actualCash.toLocaleString()}</td></tr>
    </table>
  `;
}

interface Props {
  editReport?: BookingCashierReport | null;
  onBack?: () => void;
}

export default function BookingCashierModule({ editReport, onBack }: Props) {
  const [reportDate, setReportDate] = useState(editReport?.reportDate || new Date().toISOString().slice(0, 10));
  const [beginningCash, setBeginningCash] = useState(editReport ? editReport.beginningCash.toString() : "");
  const [entranceSales, setEntranceSales] = useState(editReport ? editReport.entranceSales.toString() : "");
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  const [pettyItems, setPettyItems] = useState<PettyItem[]>(
    editReport?.pettyItems?.length
      ? editReport.pettyItems.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: p.amount.toString(), is_budoy: p.particulars === "Budoy Share (20%)" }))
      : [{ date: "", particulars: "", receipt_no: "", amount: "", is_budoy: false }]
  );

  // Auto-fill Budoy Share amounts from Table Rent transactions for the report date
  const [budoyTotal, setBudoyTotal] = useState(0);
  useEffect(() => {
    getTransactions({ module: "Table Rent" }).then(tables => {
      const matchDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
      };
      const dayTables = tables.filter(t => matchDate(t.date_time) === reportDate);
      const total = dayTables.reduce((s, t) => s + t.amount_paid * 0.20, 0);
      setBudoyTotal(total);
      // Auto-update any budoy petty items
      setPettyItems(prev => prev.map(item => item.is_budoy ? { ...item, amount: total.toFixed(2) } : item));
    });
  }, [reportDate]);

  const [denoms, setDenoms] = useState<DenomRow[]>(
    editReport?.denoms?.length
      ? editReport.denoms.map(d => ({ label: d.label, value: d.value, quantity: d.quantity ? d.quantity.toString() : "" }))
      : DEFAULT_DENOMS.map(d => ({ ...d }))
  );

  useEffect(() => { firstRef.current?.focus(); }, []);

  // Auto-fill beginning cash from cloud config
  useEffect(() => {
    if (editReport) return;
    getSystemConfig("prev_ending_cash_booking").then(val => {
      if (val && !beginningCash) setBeginningCash(val);
    });
  }, []);

  // Auto-populate sales from today's entrance + booking deposits
  useEffect(() => {
    if (editReport) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      getTransactions({ module: "Entrance" }),
      getTransactions({ module: "Booking" }),
    ]).then(([entranceTxns, bookingTxns]) => {
      const entranceToday = entranceTxns.filter(t => t.date_time.slice(0, 10) === today);
      const bookingToday = bookingTxns.filter(t => t.date_time.slice(0, 10) === today);
      const entranceTotal = entranceToday.reduce((s, t) => s + t.amount_paid, 0);
      const bookingTotal = bookingToday.reduce((s, t) => s + (t.deposit_amount || 0), 0);
      const totalSales = entranceTotal + bookingTotal;
      if (totalSales > 0) setEntranceSales(totalSales.toString());
    });
  }, [editReport]);

  const bc = parseFloat(beginningCash) || 0;
  const sales = parseFloat(entranceSales) || 0;
  const totalCashAvailable = bc + sales;
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveBookingCashierReport({
        id: editReport?.id,
        report_date: reportDate,
        beginning_cash: bc,
        entrance_sales: sales,
        petty_items: pettyItems.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: parseFloat(p.amount) || 0 })),
        denoms: denoms.map(d => ({ label: d.label, value: d.value, quantity: parseFloat(d.quantity) || 0 })),
        actual_cash: totalActualCash,
      });
      toast.success("Booking cashier report saved!");
      if (onBack) onBack();
    } catch {
      toast.error("Failed to save report");
    }
    setSaving(false);
  }, [reportDate, bc, sales, pettyItems, denoms, totalActualCash, editReport, onBack]);

  const handleCloseDay = async () => {
    await setSystemConfig("prev_ending_cash_booking", expected.toString());
    toast.success("Day closed! Beginning cash set for next day: ₱" + expected.toLocaleString());
  };

  const handlePrint = () => {
    const report: BookingCashierReport = {
      id: editReport?.id,
      report_date: reportDate,
      reportDate,
      beginning_cash: bc,
      beginningCash: bc,
      entrance_sales: sales,
      entranceSales: sales,
      petty_items: pettyItems.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: parseFloat(p.amount) || 0 })),
      pettyItems: pettyItems.map(p => ({ date: p.date, particulars: p.particulars, receipt_no: p.receipt_no, amount: parseFloat(p.amount) || 0 })),
      denoms: denoms.map(d => ({ label: d.label, value: d.value, quantity: parseFloat(d.quantity) || 0 })),
      actual_cash: totalActualCash,
      actualCash: totalActualCash,
    };
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(`<html><head><title>Booking Cashier Report</title></head><body>${buildBookingCashierHTML(report)}<script>window.print();</script></body></html>`);
    w.document.close();
  };

  const handleExport = () => {
    const rows: string[][] = [
      ["DAILY CASHIER REPORT – BOOKING", reportDate],
      [],
      ["A. CASH SUMMARY"],
      ["Beginning Cash", bc.toLocaleString()],
      ["Entrance / Booking Sales", sales.toLocaleString()],
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
    a.href = url; a.download = `booking_cashier_${reportDate}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
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
          {editReport ? "Edit" : "Daily Cashier Report"} – BOOKING
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Report Date</label>
          <input ref={firstRef} type="date" className="pos-input w-full ring-2 ring-warning/50 bg-warning/5" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        </div>

        {/* A. CASH SUMMARY */}
        <div className="pos-card space-y-3">
          <h3 className="text-sm font-bold text-foreground tracking-wide">A. CASH SUMMARY</h3>
          <div>
            <label className="text-sm font-medium block mb-1">Beginning Cash</label>
            <input type="number" className={inputClass} value={beginningCash} onChange={e => setBeginningCash(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Entrance / Booking Sales</label>
            <input type="number" className={inputClass} value={entranceSales} onChange={e => setEntranceSales(e.target.value)} placeholder="0.00" />
            <p className="text-[10px] text-muted-foreground mt-1">Auto-populated from today's entrance + booking deposits</p>
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
          <button onClick={handleCloseDay} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-success/10 text-success font-semibold text-sm hover:bg-success/20 active:scale-[0.97] transition-all border border-success/30">
            ✅ Close Day
          </button>
          <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-accent active:scale-[0.97] transition-all">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-secondary text-secondary-foreground font-medium text-sm hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
            <Download size={16} /> Export to Excel
          </button>
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
