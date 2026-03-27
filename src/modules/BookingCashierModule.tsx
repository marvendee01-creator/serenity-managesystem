import { useState, useEffect, useCallback, useRef } from "react";
import { Banknote, Plus, Trash2, Save, Printer, Download, ArrowLeft } from "lucide-react";
import { getTransactions, type Transaction } from "@/lib/db";
import { toast } from "sonner";

interface BookingCashierEntry {
  date: string;
  customerName: string;
  amount: number;
  amountOnHand: number;
  expenses: number;
  comments: string;
}

interface BookingCashierReport {
  id?: number;
  reportDate: string;
  entries: BookingCashierEntry[];
}

const STORAGE_KEY = "serenity_booking_cashier_reports";

function loadReports(): BookingCashierReport[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveReports(reports: BookingCashierReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function buildPrintHTML(report: BookingCashierReport) {
  const totalAmount = report.entries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = report.entries.reduce((s, e) => s + e.expenses, 0);
  return `
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
      h2 { text-align: center; font-size: 14px; margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      td, th { border: 1px solid #999; padding: 4px 8px; font-size: 11px; }
      th { background: #f0f0f0; text-align: left; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
    </style>
    <h2>THE SERENITY BOOKING DAILY CASHIER REPORT</h2>
    <table>
      <tr>
        <th>Date</th><th>Guests Name</th><th class="right">Amount</th>
        <th class="right">Amount on Hand</th><th class="right">Expenses</th><th>Comments</th>
      </tr>
      ${report.entries.map(e => `
        <tr>
          <td>${e.date ? formatDateShort(e.date) : ""}</td>
          <td>${e.customerName}</td>
          <td class="right">${e.amount ? e.amount.toLocaleString() : ""}</td>
          <td class="right">${e.amountOnHand ? e.amountOnHand.toLocaleString() : ""}</td>
          <td class="right">${e.expenses ? e.expenses.toLocaleString() : ""}</td>
          <td>${e.comments}</td>
        </tr>
      `).join("")}
      <tr class="bold">
        <td colspan="2" class="right">Total</td>
        <td class="right">${totalAmount.toLocaleString()}</td>
        <td></td>
        <td class="right">${totalExpenses.toLocaleString()}</td>
        <td></td>
      </tr>
    </table>
  `;
}

interface Props {
  editReport?: BookingCashierReport | null;
  onBack?: () => void;
}

export default function BookingCashierModule({ editReport, onBack }: Props) {
  const [reportDate, setReportDate] = useState(editReport?.reportDate || new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<BookingCashierEntry[]>(
    editReport?.entries?.length ? editReport.entries : [{ date: "", customerName: "", amount: 0, amountOnHand: 0, expenses: 0, comments: "" }]
  );
  const [saving, setSaving] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  // Auto-populate from booking transactions for today
  useEffect(() => {
    if (editReport) return;
    getTransactions({ module: "Booking" }).then(txns => {
      const today = new Date().toISOString().slice(0, 10);
      const todayBookings = txns.filter(t => t.date_time.slice(0, 10) === today);
      if (todayBookings.length > 0) {
        const autoEntries: BookingCashierEntry[] = todayBookings.map(t => ({
          date: t.date_time.slice(0, 10),
          customerName: t.customer_name || "Walk-in",
          amount: t.amount_paid,
          amountOnHand: t.deposit_amount || t.amount_paid,
          expenses: 0,
          comments: t.payment_status === "Fully Paid" ? "Fully Paid" : t.balance ? `Balance: ₱${t.balance.toLocaleString()}` : "",
        }));
        setEntries(prev => prev[0]?.customerName ? prev : autoEntries);
      }
    });
  }, [editReport]);

  const updateEntry = (i: number, field: keyof BookingCashierEntry, val: string | number) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const addRow = () => setEntries(prev => [...prev, { date: "", customerName: "", amount: 0, amountOnHand: 0, expenses: 0, comments: "" }]);
  const removeRow = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = entries.reduce((s, e) => s + (e.expenses || 0), 0);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const reports = loadReports();
    const report: BookingCashierReport = {
      id: editReport?.id || Date.now(),
      reportDate,
      entries,
    };
    if (editReport?.id) {
      const idx = reports.findIndex(r => r.id === editReport.id);
      if (idx >= 0) reports[idx] = report;
      else reports.push(report);
    } else {
      reports.push(report);
    }
    saveReports(reports);
    toast.success("Booking cashier report saved!");
    setSaving(false);
    if (onBack) onBack();
  }, [reportDate, entries, editReport, onBack]);

  const handlePrint = () => {
    const report: BookingCashierReport = { reportDate, entries };
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Booking Cashier Report</title></head><body>${buildPrintHTML(report)}<script>window.print();</script></body></html>`);
    w.document.close();
  };

  const handleExport = () => {
    const headers = ["Date", "Guests Name", "Amount", "Amount on Hand", "Expenses", "Comments"];
    const rows = entries.map(e => [
      e.date ? formatDateShort(e.date) : "",
      e.customerName,
      e.amount || "",
      e.amountOnHand || "",
      e.expenses || "",
      e.comments,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `booking_cashier_${reportDate}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  };

  return (
    <div className="reveal-up max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Banknote size={20} />
        </div>
        <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>
          {editReport ? "Edit" : "Daily Cashier Report"} – BOOKING
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Report Date</label>
          <input ref={firstRef} type="date" className="pos-input w-full" value={reportDate} onChange={e => setReportDate(e.target.value)} />
        </div>

        {/* Entries table */}
        <div className="pos-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground tracking-wide">Entries</h3>
            <button onClick={addRow} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all">
              <Plus size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-2 text-left text-xs font-medium">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Guests Name</th>
                  <th className="px-2 py-2 text-right text-xs font-medium">Amount</th>
                  <th className="px-2 py-2 text-right text-xs font-medium">On Hand</th>
                  <th className="px-2 py-2 text-right text-xs font-medium">Expenses</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">Comments</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-1 py-1">
                      <input type="date" className="pos-input h-9 text-xs w-full" value={e.date} onChange={ev => updateEntry(i, "date", ev.target.value)} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" className="pos-input h-9 text-xs w-full" value={e.customerName} onChange={ev => updateEntry(i, "customerName", ev.target.value)} placeholder="Name" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" className="pos-input h-9 text-xs w-full text-right" value={e.amount || ""} onChange={ev => updateEntry(i, "amount", parseFloat(ev.target.value) || 0)} placeholder="0" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" className="pos-input h-9 text-xs w-full text-right" value={e.amountOnHand || ""} onChange={ev => updateEntry(i, "amountOnHand", parseFloat(ev.target.value) || 0)} placeholder="0" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" className="pos-input h-9 text-xs w-full text-right" value={e.expenses || ""} onChange={ev => updateEntry(i, "expenses", parseFloat(ev.target.value) || 0)} placeholder="0" />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" className="pos-input h-9 text-xs w-full" value={e.comments} onChange={ev => updateEntry(i, "comments", ev.target.value)} placeholder="—" />
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={() => removeRow(i)} className="w-8 h-9 rounded text-destructive/60 hover:text-destructive flex items-center justify-center" disabled={entries.length === 1}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td className="px-2 py-2" colSpan={2}>Total</td>
                  <td className="px-2 py-2 text-right tabular-nums">₱{totalAmount.toLocaleString()}</td>
                  <td></td>
                  <td className="px-2 py-2 text-right tabular-nums">₱{totalExpenses.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all disabled:opacity-50">
            <Save size={18} /> {saving ? "Saving..." : "Save"}
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

export { buildPrintHTML as buildBookingCashierHTML, loadReports as loadBookingCashierReports };
export type { BookingCashierReport };
