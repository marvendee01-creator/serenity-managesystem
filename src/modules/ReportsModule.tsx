import { useState, useEffect } from "react";
import { FileText, Download, Printer, Banknote, Eye, CalendarDays, ClipboardList, Pencil, Trash2, BarChart3, TrendingUp, Trophy } from "lucide-react";
import { getTransactions, getCashierReports, getBookingCashierReports, updateTransaction, deleteCashierReport, deleteBookingCashierReport, getFoodSales, type Transaction, type CashierReport, type FoodSale } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CashierModule, { buildCashierReportHTML, printCashierReport } from "@/modules/CashierModule";
import BookingCashierModule, { buildBookingCashierHTML, loadBookingCashierReports, type BookingCashierReport } from "@/modules/BookingCashierModule";
import ReservationBoard from "@/modules/ReservationBoard";
import { formatPeso } from "@/lib/format";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
const MODULES = ["All", "Entrance", "Room", "Booking", "Games Rental", "Table Rent"];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const min = d.getMinutes().toString().padStart(2, "0");
  const sec = d.getSeconds().toString().padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${h.toString().padStart(2, "0")}:${min}:${sec} ${ampm}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
}

type Tab = "transactions" | "cashier" | "cashier-booking" | "store-sales" | "entrance-sales" | "expenses-store" | "expenses-entrance" | "reservation" | "petty-monitoring" | "analytics" | "food-sales" | "room-stay" | "cash-monitoring" | "daily-summary";

function EntranceSalesSummary() {
  const [reports, setReports] = useState<BookingCashierReport[]>([]);
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadBookingCashierReports().then(all => {
      const filtered = all.filter(r => {
        const d = new Date(r.report_date);
        const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        return ym === monthFilter;
      });
      filtered.sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
      setReports(filtered);
    });
  }, [monthFilter]);

  const total = reports.reduce((s, r) => s + (Number(r.entrance_sales) || 0), 0);
  const monthLabel = new Date(monthFilter + "-01T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" });

  const exportCSV = () => {
    const headers = ["Date", "Module", "Daily Total Entrance Sales"];
    const rows = reports.map(r => [formatDate(r.report_date), "Entrance / Booking", (Number(r.entrance_sales) || 0).toFixed(2)]);
    rows.push(["", "TOTAL", total.toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entrance_sales_summary_${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Month</label>
          <input type="month" className="pos-input text-sm" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>
        <div className="md:col-start-3 self-end">
          <button onClick={exportCSV} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="pos-card text-center mb-4">
        <p className="text-xs text-muted-foreground">Total Entrance Sales for {monthLabel}</p>
        <p className="text-2xl font-bold tabular-nums text-primary">{formatPeso(total)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Module</th>
              <th className="text-right px-3 py-2 font-medium">Daily Total Entrance Sales</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No entrance sales for this month</td></tr>
            )}
            {reports.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(r.report_date)}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Entrance / Booking</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatPeso(Number(r.entrance_sales) || 0)}</td>
              </tr>
            ))}
            {reports.length > 0 && (
              <tr className="border-t-2 border-border bg-accent/30 font-bold">
                <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPeso(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StoreSalesSummary() {
  const [reports, setReports] = useState<CashierReport[]>([]);
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    getCashierReports().then(all => {
      const filtered = all.filter(r => {
        // r.date may be ISO timestamp or YYYY-MM-DD; derive local YYYY-MM
        const d = new Date(r.date);
        const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        return ym === monthFilter;
      });
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setReports(filtered);
    });
  }, [monthFilter]);

  const total = reports.reduce((s, r) => s + (Number(r.sales) || 0), 0);
  const monthLabel = new Date(monthFilter + "-01T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" });

  const exportCSV = () => {
    const headers = ["Date", "Module", "Daily Total Store Sales"];
    const rows = reports.map(r => [formatDate(r.date), "Store", (Number(r.sales) || 0).toFixed(2)]);
    rows.push(["", "TOTAL", total.toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store_sales_summary_${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Month</label>
          <input type="month" className="pos-input text-sm" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>
        <div className="md:col-start-3 self-end">
          <button onClick={exportCSV} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="pos-card text-center mb-4">
        <p className="text-xs text-muted-foreground">Total Store Sales for {monthLabel}</p>
        <p className="text-2xl font-bold tabular-nums text-primary">{formatPeso(total)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Module</th>
              <th className="text-right px-3 py-2 font-medium">Daily Total Store Sales</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No store sales for this month</td></tr>
            )}
            {reports.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Store</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatPeso(Number(r.sales) || 0)}</td>
              </tr>
            ))}
            {reports.length > 0 && (
              <tr className="border-t-2 border-border bg-accent/30 font-bold">
                <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPeso(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesSummary({ source, title }: { source: "store" | "entrance"; title: string }) {
  const [rows, setRows] = useState<{ date: string; amount: number; reportIds: number[] }[]>([]);
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const load = async () => {
      const map = new Map<string, { amount: number; reportIds: Set<number> }>();
      const ymOf = (s: string) => {
        const d = new Date(s);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      };
      const dayKey = (s: string) => formatDate(s);
      if (source === "store") {
        const all = await getCashierReports();
        for (const r of all) {
          for (const item of (r.petty_items || [])) {
            const itemDate = item.date || r.date;
            if (ymOf(itemDate) !== monthFilter) continue;
            const k = dayKey(itemDate);
            const cur = map.get(k) || { amount: 0, reportIds: new Set<number>() };
            cur.amount += (Number(item.amount) || 0);
            if (r.id) cur.reportIds.add(r.id);
            map.set(k, cur);
          }
        }
      } else {
        const all = await getBookingCashierReports();
        for (const r of all) {
          for (const item of (r.petty_items || [])) {
            const itemDate = item.date || r.report_date;
            if (ymOf(itemDate) !== monthFilter) continue;
            const k = dayKey(itemDate);
            const cur = map.get(k) || { amount: 0, reportIds: new Set<number>() };
            cur.amount += (Number(item.amount) || 0);
            if (r.id) cur.reportIds.add(r.id);
            map.set(k, cur);
          }
        }
      }
      const out = Array.from(map.entries())
        .map(([date, v]) => ({ date, amount: v.amount, reportIds: Array.from(v.reportIds) }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setRows(out);
    };
    load();
  }, [source, monthFilter, refresh]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const monthLabel = new Date(monthFilter + "-01T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" });

  const buildHTML = () => `
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}h2{text-align:center;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #999;padding:6px 8px;font-size:11px}th{background:#f0f0f0;text-align:left}.right{text-align:right}.bold{font-weight:bold}</style>
    <h2>SERENITY INLAND RESORT</h2>
    <h2>${title} — ${monthLabel}</h2>
    <table>
      <tr><th>Date</th><th class="right">Daily Total Expenses</th></tr>
      ${rows.map(r => `<tr><td>${r.date}</td><td class="right">₱${r.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`).join("")}
      <tr class="bold"><td>TOTAL</td><td class="right">₱${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>
    </table>`;

  const exportExcel = () => {
    const headers = ["Date", "Daily Total Expenses"];
    const data = rows.map(r => [r.date, r.amount.toFixed(2)]);
    data.push(["TOTAL", total.toFixed(2)]);
    const csv = [headers, ...data].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses_summary_${source}_${monthFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exported");
  };

  const exportPDF = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title></head><body>${buildHTML()}<script>window.print();</script></body></html>`);
    w.document.close();
    toast.success("PDF print dialog opened");
  };

  const printPreview = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>${title} — Preview</title></head><body>${buildHTML()}</body></html>`);
    w.document.close();
  };

  const deleteRow = async (row: { date: string; reportIds: number[] }) => {
    if (!confirm(`Delete all ${source === "store" ? "store cashier" : "booking cashier"} reports that contain expenses for ${row.date}? This will remove the parent reports entirely.`)) return;
    try {
      for (const id of row.reportIds) {
        if (source === "store") await deleteCashierReport(id);
        else await deleteBookingCashierReport(id);
      }
      toast.success("Records deleted");
      setRefresh(k => k + 1);
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="md:col-span-1">
          <label className="text-[10px] text-muted-foreground block mb-0.5">Month</label>
          <input type="month" className="pos-input text-sm" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>
        <button onClick={exportExcel} className="self-end h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all flex items-center justify-center gap-2">
          <Download size={14} /> Export Excel
        </button>
        <button onClick={exportPDF} className="self-end h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all flex items-center justify-center gap-2">
          <Download size={14} /> Export PDF
        </button>
        <button onClick={printPreview} className="self-end h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all flex items-center justify-center gap-2">
          <Eye size={14} /> Print Preview
        </button>
        <div className="self-end" />
      </div>

      <div className="pos-card text-center mb-4">
        <p className="text-xs text-muted-foreground">Total {title} for {monthLabel}</p>
        <p className="text-2xl font-bold tabular-nums text-destructive">{formatPeso(total)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-right px-3 py-2 font-medium">Daily Total Expenses</th>
              <th className="text-center px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No expenses for this month</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.date} className="border-t border-border hover:bg-muted/50">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-destructive">{formatPeso(r.amount)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => deleteRow(r)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center mx-auto active:scale-95 transition-all" title="Delete parent reports">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-border bg-accent/30 font-bold">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPeso(total)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [storeReports, setStoreReports] = useState<CashierReport[]>([]);
  const [bookingReports, setBookingReports] = useState<BookingCashierReport[]>([]);
  const [foodSales, setFoodSales] = useState<FoodSale[]>([]);
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    getTransactions({}).then(setTxns);
    getCashierReports().then(setStoreReports);
    loadBookingCashierReports().then(setBookingReports);
    getFoodSales({}).then(setFoodSales);
  }, []);

  const toDateKey = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
  };
  const toMonthKey = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
  };

  // Daily headcount for selected month
  const monthTxns = txns.filter(t => t.date_time.slice(0, 7) === monthFilter);
  const dailyMap = new Map<string, { headcount: number; sales: number }>();
  for (const t of monthTxns) {
    const key = toDateKey(t.date_time);
    const prev = dailyMap.get(key) || { headcount: 0, sales: 0 };
    prev.headcount += t.adults + (t.kids_8_above ?? 0) + (t.kids_5_7 ?? 0) + (t.kids_4_below ?? 0);
    prev.sales += t.amount_paid;
    dailyMap.set(key, prev);
  }
  const dailyData = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

  // Monthly aggregates
  const monthlyMap = new Map<string, { headcount: number; sales: number }>();
  for (const t of txns) {
    const key = toMonthKey(t.date_time);
    const prev = monthlyMap.get(key) || { headcount: 0, sales: 0 };
    prev.headcount += t.adults + (t.kids_8_above ?? 0) + (t.kids_5_7 ?? 0) + (t.kids_4_below ?? 0);
    prev.sales += t.amount_paid;
    monthlyMap.set(key, prev);
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));

  // Peak & low day
  const peakDay = dailyData.reduce((best, d) => d.headcount > (best?.headcount ?? 0) ? d : best, dailyData[0]);
  const lowDay = dailyData.reduce((best, d) => d.headcount < (best?.headcount ?? Infinity) ? d : best, dailyData[0]);

  return (
    <div className="space-y-6">
      {/* Peak / Low insights */}
      {dailyData.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="pos-card text-center">
            <p className="text-xs text-muted-foreground">Peak Day</p>
            <p className="text-lg font-bold tabular-nums text-success">{peakDay?.headcount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{peakDay?.date}</p>
          </div>
          <div className="pos-card text-center">
            <p className="text-xs text-muted-foreground">Low Day</p>
            <p className="text-lg font-bold tabular-nums text-destructive">{lowDay?.headcount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{lowDay?.date}</p>
          </div>
        </div>
      )}

      {/* Daily Headcount Chart */}
      <div className="pos-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 size={16} /> Daily Headcount</h3>
          <input type="month" className="pos-input text-sm w-auto" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        </div>
        {dailyData.length > 0 ? (() => {
          const counts = dailyData.map(d => d.headcount);
          const maxV = Math.max(...counts);
          const minV = Math.min(...counts);
          const sorted = [...counts].sort((a, b) => a - b);
          const mid = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          const colorFor = (v: number) => {
            if (v === maxV && maxV !== minV) return "#4CAF50";
            if (v === minV && maxV !== minV) return "#F44336";
            if (v === mid) return "#9E9E9E";
            return "#81D4FA";
          };
          return (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [value, "Headcount"]} />
                <Bar dataKey="headcount" radius={[4, 4, 0, 0]}>
                  {dailyData.map((d, i) => <Cell key={i} fill={colorFor(d.headcount)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        })() : <p className="text-center text-sm text-muted-foreground py-8">No data for this month</p>}
      </div>

      {/* Daily Store vs Entrance Sales */}
      {(() => {
        const ymOf = (s: string) => {
          const d = new Date(s);
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        };
        const dayKey = (s: string) => {
          const d = new Date(s);
          return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
        };
        const map = new Map<string, { date: string; store: number; entrance: number }>();
        for (const r of storeReports) {
          if (ymOf(r.date) !== monthFilter) continue;
          const k = dayKey(r.date);
          const prev = map.get(k) || { date: k, store: 0, entrance: 0 };
          prev.store += Number(r.sales) || 0;
          map.set(k, prev);
        }
        for (const r of bookingReports) {
          if (ymOf(r.report_date) !== monthFilter) continue;
          const k = dayKey(r.report_date);
          const prev = map.get(k) || { date: k, store: 0, entrance: 0 };
          prev.entrance += Number(r.entrance_sales) || 0;
          map.set(k, prev);
        }
        const data = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
        return (
          <div className="pos-card">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><TrendingUp size={16} /> Daily Store Sales vs Entrance Sales</h3>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [formatPeso(value), name]} />
                  <Legend />
                  <Line type="monotone" dataKey="store" name="Store Sales" stroke="#4CAF50" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="entrance" name="Entrance Sales" stroke="#F44336" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-muted-foreground py-8">No data for this month</p>}
          </div>
        );
      })()}

      {/* Income vs Expense Pie Charts */}
      {(() => {
        const ymOf = (s: string) => {
          const d = new Date(s);
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        };
        // Store: income = sales, expenses = sum of petty_items in store cashier reports for the month
        let storeIncome = 0;
        let storeExpense = 0;
        for (const r of storeReports) {
          if (ymOf(r.date) !== monthFilter) continue;
          storeIncome += Number(r.sales) || 0;
          for (const item of (r.petty_items || [])) {
            storeExpense += Number(item.amount) || 0;
          }
        }
        // Entrance: income = entrance_sales, expenses = sum of petty_items in booking cashier reports
        let entranceIncome = 0;
        let entranceExpense = 0;
        for (const r of bookingReports) {
          if (ymOf(r.report_date) !== monthFilter) continue;
          entranceIncome += Number(r.entrance_sales) || 0;
          for (const item of (r.petty_items || [])) {
            entranceExpense += Number(item.amount) || 0;
          }
        }
        // Food POS: income = total_sales, expenses = capital
        let foodIncome = 0;
        let foodExpense = 0;
        for (const s of foodSales) {
          if (ymOf(s.sale_date) !== monthFilter) continue;
          foodIncome += Number(s.total_sales) || 0;
          foodExpense += Number(s.capital) || 0;
        }
        const storeData = [
          { name: "Income", value: storeIncome, fill: "#4CAF50" },
          { name: "Expenses", value: storeExpense, fill: "#F44336" },
        ];
        const entranceData = [
          { name: "Income", value: entranceIncome, fill: "#4CAF50" },
          { name: "Expenses", value: entranceExpense, fill: "#F44336" },
        ];
        const foodData = [
          { name: "Income", value: foodIncome, fill: "#4CAF50" },
          { name: "Expenses", value: foodExpense, fill: "#F44336" },
        ];
        const renderPie = (title: string, data: typeof storeData, income: number, expense: number) => {
          const hasData = income + expense > 0;
          const net = income - expense;
          return (
            <div className="pos-card">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><BarChart3 size={16} /> {title}</h3>
              {hasData ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={(props: { name?: string; value?: number }) => `${props.name ?? ""}: ${formatPeso(Number(props.value) || 0)}`}
                      >
                        {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPeso(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Income</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: "#4CAF50" }}>{formatPeso(income)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expenses</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: "#F44336" }}>{formatPeso(expense)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net</p>
                      <p className={`text-sm font-bold tabular-nums ${net >= 0 ? "text-success" : "text-destructive"}`}>{formatPeso(net)}</p>
                    </div>
                  </div>
                </>
              ) : <p className="text-center text-sm text-muted-foreground py-8">No data for this month</p>}
            </div>
          );
        };
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {renderPie("Income vs Expense — Store", storeData, storeIncome, storeExpense)}
            {renderPie("Income vs Expense — Entrance", entranceData, entranceIncome, entranceExpense)}
            {renderPie("Income vs Expense — Food POS", foodData, foodIncome, foodExpense)}
          </div>
        );
      })()}
    </div>
  );
}
interface PettyMonitorRow {
  date: string;
  customer: string;
  sourceModule: string;
  amount: number;
  expenses: number;
  cashOnHand: number;
  runningBalance: number;
}

function PettyCashMonitoring() {
  const [rows, setRows] = useState<PettyMonitorRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([
      getTransactions({ module: "Entrance" }),
      getTransactions({ module: "Room" }),
      getTransactions({ module: "Games Rental" }),
      getTransactions({ module: "Table Rent" }),
      getTransactions({ module: "Booking" }),
      getBookingCashierReports(),
    ]).then(([entrances, rooms, games, tables, bookings, bcReports]) => {
      const allIncome: { date: string; customer: string; sourceModule: string; amount: number; expenses: number }[] = [];

      for (const t of entrances) {
        if (t.amount_paid > 0) allIncome.push({ date: t.date_time, customer: t.customer_name || "Entrance Guest", sourceModule: "Entrance", amount: t.amount_paid, expenses: 0 });
      }
      for (const t of rooms) {
        if (t.amount_paid > 0) allIncome.push({ date: t.date_time, customer: t.customer_name || "Room Guest", sourceModule: "Room", amount: t.amount_paid, expenses: 0 });
      }
      for (const t of games) {
        if (t.amount_paid > 0) allIncome.push({ date: t.date_time, customer: t.customer_name || "Games Guest", sourceModule: "Games", amount: t.amount_paid, expenses: 0 });
      }
      for (const t of tables) {
        if (t.amount_paid > 0) {
          allIncome.push({ date: t.date_time, customer: t.customer_name || "Table Guest", sourceModule: "Table", amount: t.amount_paid, expenses: 0 });
        }
      }
      for (const t of bookings) {
        if (t.status === "Cancelled") continue;
        const dep = t.deposit_amount ?? 0;
        if (dep > 0) allIncome.push({ date: t.date_time, customer: t.customer_name || "Booking Guest", sourceModule: "Booking", amount: dep, expenses: 0 });
      }
      for (const report of bcReports) {
        for (const item of report.petty_items || []) {
          if (item.amount > 0) {
            allIncome.push({ date: item.date || report.report_date, customer: item.particulars || "Petty Cash Expense", sourceModule: "Expense", amount: 0, expenses: item.amount });
          }
        }
      }

      allIncome.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Strict single-date filter
      const matchDate = (iso: string) => formatDate(iso) === formatDate(selectedDate + "T00:00:00");

      const filtered = selectedDate ? allIncome.filter(r => matchDate(r.date)) : allIncome;

      // Beginning balance = last running balance from any date before selected date
      // We compute a full running balance of ALL prior records, then take the final value
      let beginningBalance = 0;
      if (selectedDate) {
        const prior = allIncome.filter(r => !matchDate(r.date) && new Date(r.date).getTime() < new Date(selectedDate + "T00:00:00").getTime());
        beginningBalance = prior.reduce((sum, r) => sum + (r.amount - r.expenses), 0);
      }

      // Build rows with beginning balance row prepended
      const result: PettyMonitorRow[] = [];

      // Prepend beginning balance row
      result.push({
        date: selectedDate ? selectedDate + "T00:00:00" : "",
        customer: "Beginning Bal.",
        sourceModule: "",
        amount: 0,
        expenses: 0,
        cashOnHand: 0,
        runningBalance: beginningBalance,
      });

      let balance = beginningBalance;
      for (const r of filtered) {
        const cashOnHand = r.amount - r.expenses;
        balance += cashOnHand;
        result.push({ date: r.date, customer: r.customer, sourceModule: r.sourceModule, amount: r.amount, expenses: r.expenses, cashOnHand, runningBalance: balance });
      }

      setRows(result);
    });
  }, [selectedDate]);

  const exportExcel = () => {
    const headers = ["Date", "Customer", "Source", "Amount", "Expense", "Cash on Hand", "Running Balance"];
    const csvRows = rows.map(r => [
      r.customer === "Beginning Bal." ? formatDate(r.date) : formatDateTime(r.date), r.customer, r.sourceModule, r.amount || "", r.expenses || "", r.cashOnHand || "", r.runningBalance
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petty_cash_monitoring_${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Booking Petty Cash Monitoring</title>
      <style>body{font-family:Arial;font-size:11px;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:4px 6px;font-size:11px}th{background:#f0f0f0}.right{text-align:right}.beg{background:#f9f9e0;font-weight:bold}</style>
    </head><body>
      <h2>BOOKING PETTY CASH MONITORING</h2>
      <p style="text-align:center;font-size:12px">Date: ${selectedDate ? formatDate(selectedDate + "T00:00:00") : "All"}</p>
      <table>
        <tr><th>Date</th><th>Customer</th><th>Source</th><th class="right">Amount</th><th class="right">Expense</th><th class="right">Cash on Hand</th><th class="right">Running Balance</th></tr>
        ${rows.map(r => `<tr${r.customer === "Beginning Bal." ? ' class="beg"' : ''}>
          <td>${r.customer === "Beginning Bal." ? formatDate(r.date) : formatDateTime(r.date)}</td>
          <td>${r.customer}</td><td>${r.sourceModule}</td>
          <td class="right">${r.amount > 0 ? formatPeso(r.amount) : "—"}</td>
          <td class="right">${r.expenses > 0 ? formatPeso(r.expenses) : "—"}</td>
          <td class="right">${r.customer === "Beginning Bal." ? "—" : formatPeso(r.cashOnHand)}</td>
          <td class="right">${formatPeso(r.runningBalance)}</td></tr>`).join("")}
      </table>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const dataRows = rows.filter(r => r.customer !== "Beginning Bal.");
  const totalAmount = dataRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = dataRows.reduce((s, r) => s + r.expenses, 0);
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].runningBalance : 0;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <input type="date" className="pos-input text-sm" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        <div />
        <button onClick={exportExcel} className="flex items-center justify-center gap-2 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
          <Download size={16} /> Export CSV
        </button>
        <button onClick={handlePrint} className="flex items-center justify-center gap-2 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="pos-card text-center">
          <p className="text-xs text-muted-foreground">Total Income</p>
          <p className="text-lg font-bold tabular-nums text-success">{formatPeso(totalAmount)}</p>
        </div>
        <div className="pos-card text-center">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-lg font-bold tabular-nums text-destructive">{formatPeso(totalExpenses)}</p>
        </div>
        <div className="pos-card text-center">
          <p className="text-xs text-muted-foreground">Running Balance</p>
          <p className="text-lg font-bold tabular-nums">{formatPeso(finalBalance)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Customer</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
              <th className="text-right px-3 py-2 font-medium">Expense</th>
              <th className="text-right px-3 py-2 font-medium">Cash on Hand</th>
              <th className="text-right px-3 py-2 font-medium">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length <= 1 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No data found for this date</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-border ${r.customer === "Beginning Bal." ? "bg-accent/50 font-semibold" : "hover:bg-muted/50"}`}>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{r.customer === "Beginning Bal." ? formatDate(r.date) : formatDateTime(r.date)}</td>
                <td className="px-3 py-2">{r.customer}</td>
                <td className="px-3 py-2">
                  {r.sourceModule ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.sourceModule === "Expense" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{r.sourceModule}</span>
                  ) : ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-success font-medium">{r.amount > 0 ? formatPeso(r.amount) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-destructive font-medium">{r.expenses > 0 ? formatPeso(r.expenses) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{r.customer === "Beginning Bal." ? "—" : formatPeso(r.cashOnHand)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{formatPeso(r.runningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FoodSalesReport() {
  const [sales, setSales] = useState<FoodSale[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    getFoodSales({ dateFrom: from || undefined, dateTo: to || undefined }).then(setSales);
  }, [from, to]);
  const totalSales = sales.reduce((s, r) => s + r.total_sales, 0);
  const totalCapital = sales.reduce((s, r) => s + r.capital, 0);
  const totalProfit = sales.reduce((s, r) => s + r.profit, 0);
  const totalCommission = sales.reduce((s, r) => s + r.commission_share, 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date From</label>
          <input type="date" className="pos-input text-sm w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date To</label>
          <input type="date" className="pos-input text-sm w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Total Sales</p><p className="text-base font-bold tabular-nums">{formatPeso(totalSales)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Capital (÷1.6)</p><p className="text-base font-bold tabular-nums">{formatPeso(totalCapital)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Profit</p><p className="text-base font-bold tabular-nums">{formatPeso(totalProfit)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Commission</p><p className="text-base font-bold tabular-nums text-primary">{formatPeso(totalCommission)}</p></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Customer</th>
              <th className="text-left p-2">Item</th>
              <th className="text-right p-2">Qty</th>
              <th className="text-right p-2">Total</th>
              <th className="text-right p-2">Commission</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No food sales for this range.</td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-2">{formatDateTime(s.date_time)}</td>
                <td className="p-2">{s.customer_name || "—"}</td>
                <td className="p-2">{s.item_name}</td>
                <td className="p-2 text-right tabular-nums">{s.qty}</td>
                <td className="p-2 text-right tabular-nums">{formatPeso(s.total_sales)}</td>
                <td className="p-2 text-right tabular-nums">{formatPeso(s.commission_share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoomStayReport() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    getTransactions({ dateFrom: from || undefined, dateTo: to || undefined }).then(data => {
      setTxns(data.filter(t => (t.module === "Room" || t.module === "Booking") && t.room_type && t.status !== "Cancelled" && (!t.payment_status || t.payment_status === "Fully Paid")));
    });
  }, [from, to]);
  const totalAmount = txns.reduce((s, t) => s + t.amount_paid, 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date From</label>
          <input type="date" className="pos-input text-sm w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date To</label>
          <input type="date" className="pos-input text-sm w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="pos-card text-center mb-4"><p className="text-[10px] text-muted-foreground">Total Room Stay Revenue</p><p className="text-base font-bold tabular-nums">{formatPeso(totalAmount)}</p></div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Check In</th>
              <th className="text-left p-2">Check Out</th>
              <th className="text-left p-2">Customer Name</th>
              <th className="text-left p-2">Room Type</th>
              <th className="text-left p-2">Paid Status</th>
              <th className="text-right p-2">No. of Days</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(t => {
              const inDate = new Date(t.check_in || t.date_time);
              inDate.setHours(0, 0, 0, 0);
              const outDate = new Date(t.check_out || t.check_in || t.date_time);
              outDate.setHours(0, 0, 0, 0);
              const days = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
              return (
              <tr key={t.id} className="border-t border-border">
                <td className="p-2">{t.check_in ? formatDateTime(t.check_in) : formatDateTime(t.date_time)}</td>
                <td className="p-2">{t.check_out ? formatDateTime(t.check_out) : "—"}</td>
                <td className="p-2">{t.customer_name || "—"}</td>
                <td className="p-2">{t.room_type}</td>
                <td className="p-2">{t.payment_status || "Fully Paid"}</td>
                <td className="p-2 text-right">{days}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyTransactionSummaryReport() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    // Use the same date for from and to to get exact day matching
    Promise.all([
      getTransactions({ dateFrom: selectedDate, dateTo: selectedDate }),
      getFoodSales({ dateFrom: selectedDate, dateTo: selectedDate }),
      getCashierReports(),
    ]).then(([txns, food, storeCashier]) => {
      const records: any[] = [];
      const pushRecord = (name: string, pType: string, amt: number) => {
        if (amt > 0) records.push({ date: selectedDate, name, paymentType: pType, amount: amt, id: Math.random().toString() });
      };

      // 1. SALES STORE (CASH)
      const storeSales = storeCashier
        .filter(s => s.date.slice(0, 10) === selectedDate)
        .reduce((sum, s) => sum + (Number(s.sales) || 0), 0);
      if (storeSales > 0) pushRecord("SALES STORE", "CASH", storeSales);

      // 2. BOOKING SALES (CASH/GCash)
      let depositReceived = 0;
      let fullyPaidAmount = 0;
      let bookingSalesOthers = 0;
      let maintenanceFees = 0;

      // EXPLICIT MANUAL FILTER for exact date matching
      const filteredTxns = txns.filter(t => t.date_time.slice(0, 10) === selectedDate);

      for (const t of filteredTxns) {
        if (t.status === "Cancelled") continue;
        
        // Sum maintenance fees separately from all modules
        if (t.maintenance_fee) maintenanceFees += t.maintenance_fee;

        if (t.module === "Booking") {
          // Deposit Amount Received (Partial payments)
          if (t.payment_status === "Partially Paid" || (t.deposit_amount && t.balance && t.balance > 0)) {
            depositReceived += t.deposit_amount || 0;
          }
          // Fully Paid (Zero balance)
          if (t.payment_status === "Fully Paid" || (t.balance === 0)) {
            fullyPaidAmount += t.deposit_amount || t.amount_paid;
          }
        } else if (t.module === "Entrance" || t.module === "Room" || t.module === "Tent") {
          bookingSalesOthers += (t.amount_paid - (t.maintenance_fee || 0));
        }
      }

      if (depositReceived > 0) pushRecord("BOOKING SALES (Deposit Received)", "CASH", depositReceived);
      if (fullyPaidAmount > 0) pushRecord("BOOKING SALES (Fully Paid)", "CASH", fullyPaidAmount);
      if (bookingSalesOthers > 0) pushRecord("BOOKING SALES (Entrance/Room/Tent)", "CASH", bookingSalesOthers);

      // 3. FOOD SALES (CASH)
      // EXPLICIT MANUAL FILTER for food sales date
      const foodCash = food
        .filter(f => f.sale_date === selectedDate && f.payment_status === "Fully Paid")
        .reduce((sum, f) => sum + (f.cash_received || f.total_sales), 0);
      if (foodCash > 0) pushRecord("FOOD SALES", "CASH", foodCash);

      // 4. MAINTENANCE FEE (CASH)
      if (maintenanceFees > 0) pushRecord("MAINTENANCE FEE", "CASH", maintenanceFees);

      setData(records);
      setLoading(false);
    });
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = data.reduce((s, r) => s + r.amount, 0);

  const exportExcel = () => {
    const headers = ["Date", "Name", "Payment Type", "Amount"];
    const rows = data.map(r => [r.date, r.name, r.paymentType, r.amount.toFixed(2)]);
    rows.push(["", "GRAND TOTAL", "", total.toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Daily_Summary_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `
      <html>
        <head>
          <title>Daily Transaction Summary - ${selectedDate}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .header { text-align: center; margin-bottom: 30px; }
            .footer { margin-top: 30px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Transaction Summary</h1>
            <p>Report Date: ${selectedDate}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Payment Type</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(r => `
                <tr>
                  <td>${r.date}</td>
                  <td>${r.name}</td>
                  <td>${r.paymentType}</td>
                  <td class="text-right">₱${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr class="footer">
                <td colspan="3">GRAND TOTAL</td>
                <td class="text-right">₱${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Selected Date</label>
          <input 
            type="date" 
            className="pos-input w-full" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
        <div className="flex gap-2">
          <button onClick={printReport} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all flex items-center justify-center gap-2">
            <Printer size={16} /> Print / PDF
          </button>
          <button onClick={exportExcel} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all flex items-center justify-center gap-2">
            <Download size={16} /> Excel
          </button>
        </div>
        <button onClick={loadData} className="h-10 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 active:scale-[0.97] transition-all">
          Refresh Report
        </button>
      </div>

      <div className="pos-card bg-primary/5 border-primary/20 flex items-center justify-between py-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Grand Total Amount</p>
          <p className="text-3xl font-black text-primary tabular-nums">{formatPeso(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{selectedDate}</p>
          <p className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full mt-1">Unified Sales Summary</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Transaction Source / Name</th>
              <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Payment</th>
              <th className="text-right px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground italic">Updating report data...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No transactions recorded for this date.</td></tr>
            ) : (
              data.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 tabular-nums text-xs">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{r.paymentType}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">{formatPeso(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && data.length > 0 && (
            <tfoot className="bg-muted/30 font-black">
              <tr>
                <td colSpan={3} className="px-4 py-4 text-right uppercase">Total Summary Amount</td>
                <td className="px-4 py-4 text-right text-lg text-primary">{formatPeso(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function CashMonitoringReport() {
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState({ store: 0, entrance: 0, room: 0, tent: 0, booking: 0, foodPOS: 0 });

  useEffect(() => {
    Promise.all([
      getTransactions({ dateFrom: from || undefined, dateTo: to || undefined }),
      getFoodSales({ dateFrom: from || undefined, dateTo: to || undefined }),
      getCashierReports(),
      loadBookingCashierReports()
    ]).then(([txns, food, storeCashier, bookingCashier]) => {
      // Filter out invalid txns
      const validTxns = txns.filter(t => t.status !== "Cancelled" && (!t.payment_status || t.payment_status === "Fully Paid"));
      
      const roomAmt = validTxns.filter(t => t.module === "Room").reduce((s, t) => s + t.amount_paid, 0);
      const tentAmt = validTxns.filter(t => t.module === "Tent").reduce((s, t) => s + t.amount_paid, 0);
      const bookingAmt = validTxns.filter(t => t.module === "Booking").reduce((s, t) => s + t.amount_paid, 0);
      
      const entranceAmt = bookingCashier.filter(r => r.reportDate >= from && r.reportDate <= to).reduce((s, r) => s + (r.entranceSales || 0), 0);
      const storeAmt = storeCashier.filter(r => r.date.slice(0, 10) >= from && r.date.slice(0, 10) <= to).reduce((s, r) => s + (r.sales || 0), 0);
      
      const foodAmt = food.filter(f => !f.payment_status || f.payment_status === "Fully Paid").reduce((s, r) => s + r.total_sales, 0);
      
      setData({ store: storeAmt, entrance: entranceAmt, room: roomAmt, tent: tentAmt, booking: bookingAmt, foodPOS: foodAmt });
    });
  }, [from, to]);

  const total = data.store + data.entrance + data.room + data.tent + data.booking + data.foodPOS;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date From</label>
          <input type="date" className="pos-input text-sm w-full" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Date To</label>
          <input type="date" className="pos-input text-sm w-full" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Store Cashier</p><p className="text-base font-bold tabular-nums">{formatPeso(data.store)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Entrance Cashier</p><p className="text-base font-bold tabular-nums">{formatPeso(data.entrance)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Room</p><p className="text-base font-bold tabular-nums">{formatPeso(data.room)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Tent</p><p className="text-base font-bold tabular-nums">{formatPeso(data.tent)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Booking</p><p className="text-base font-bold tabular-nums">{formatPeso(data.booking)}</p></div>
        <div className="pos-card text-center"><p className="text-[10px] text-muted-foreground">Food POS</p><p className="text-base font-bold tabular-nums">{formatPeso(data.foodPOS)}</p></div>
      </div>
      <div className="pos-card text-center bg-primary/10 border-primary/20">
        <p className="text-[10px] text-primary block mb-0.5">Total Combined Sales</p>
        <p className="text-2xl font-bold tabular-nums text-primary">{formatPeso(total)}</p>
      </div>
    </div>
  );
}

export default function ReportsModule() {
  const [tab, setTab] = useState<Tab>("transactions");
  const [data, setData] = useState<Transaction[]>([]);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [txnDateFrom, setTxnDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [txnDateTo, setTxnDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [gameFilter, setGameFilter] = useState("");
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [cashierReports, setCashierReports] = useState<CashierReport[]>([]);
  const [cashierFilter, setCashierFilter] = useState<"Daily" | "Monthly">("Daily");
  const [cashierDate, setCashierDate] = useState("");
  const [editingReport, setEditingReport] = useState<CashierReport | null>(null);
  const [previewReport, setPreviewReport] = useState<CashierReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Booking cashier reports
  const [bookingCashierReports, setBookingCashierReports] = useState<BookingCashierReport[]>([]);
  const [bcFilter, setBcFilter] = useState<"Daily" | "Monthly">("Daily");
  const [bcDate, setBcDate] = useState("");
  const [editingBcReport, setEditingBcReport] = useState<BookingCashierReport | null>(null);
  const [previewBcReport, setPreviewBcReport] = useState<BookingCashierReport | null>(null);

  useEffect(() => {
    // Fetch with date range filtering
    getTransactions({
      module: moduleFilter === "All" ? undefined : moduleFilter,
      dateFrom: txnDateFrom || undefined,
      dateTo: txnDateTo || undefined,
      game_type: gameFilter || undefined,
    }).then(txns => {
      const fromMs = txnDateFrom ? new Date(txnDateFrom + "T00:00:00").getTime() : -Infinity;
      const toMs = txnDateTo ? new Date(txnDateTo + "T23:59:59").getTime() : Infinity;
      const filtered = txns.filter(t => {
        // Exclude cancelled bookings from reports
        if (t.status === "Cancelled") return false;
        if (t.payment_status && t.payment_status !== "Fully Paid") return false;
        const ts = new Date(t.date_time).getTime();
        return ts >= fromMs && ts <= toMs;
      });
      setData(filtered);
    });
  }, [moduleFilter, txnDateFrom, txnDateTo, gameFilter]);

  useEffect(() => {
    getCashierReports().then(reports => {
      let filtered = reports;
      if (cashierDate) {
        if (cashierFilter === "Daily") {
          filtered = reports.filter(r => r.date.slice(0, 10) === cashierDate);
        } else {
          const ym = cashierDate.slice(0, 7);
          filtered = reports.filter(r => r.date.slice(0, 7) === ym);
        }
      }
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCashierReports(filtered);
    });
  }, [tab, cashierFilter, cashierDate, refreshKey]);

  useEffect(() => {
    loadBookingCashierReports().then(reports => {
      let filtered = reports;
      if (bcDate) {
        if (bcFilter === "Daily") {
          filtered = reports.filter(r => r.reportDate === bcDate);
        } else {
          const ym = bcDate.slice(0, 7);
          filtered = reports.filter(r => r.reportDate.slice(0, 7) === ym);
        }
      }
      filtered.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
      setBookingCashierReports(filtered);
    });
  }, [tab, bcFilter, bcDate, refreshKey]);

  const totalAmount = data.reduce((s, t) => s + t.amount_paid, 0);
  const totalAdults = data.reduce((s, t) => s + t.adults, 0);
  const totalChildren = data.reduce((s, t) => s + t.children, 0);

  const exportCSV = () => {
    const headers = ["Transaction No", "Date/Time", "Module", "Customer Name", "Adults", "Kids (8+)", "Kids (5-7)", "Kids (4 & Below)", "Headcount", "Amount", "Payment"];
    const rows = data.map((t) => [
      t.transaction_no, formatDateTime(t.date_time), t.module, t.customer_name || "", t.adults, t.kids_8_above ?? 0, t.kids_5_7 ?? 0, t.kids_4_below ?? 0, t.adults + (t.kids_8_above ?? 0) + (t.kids_5_7 ?? 0) + (t.kids_4_below ?? 0), t.amount_paid, t.payment_method,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (editingReport) {
    return (
      <CashierModule
        editReport={editingReport}
        onBack={() => { setEditingReport(null); setRefreshKey(k => k + 1); }}
      />
    );
  }

  if (editingBcReport) {
    return (
      <BookingCashierModule
        editReport={editingBcReport}
        onBack={() => { setEditingBcReport(null); setRefreshKey(k => k + 1); }}
      />
    );
  }

  const printBcReport = (report: BookingCashierReport) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Booking Cashier Report</title></head><body>${buildBookingCashierHTML(report)}<script>window.print();</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="reveal-up max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <FileText size={20} />
        </div>
        <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>Reports</h2>
      </div>

      {/* Menu navigation (replaces tab layout) */}
      {(() => {
        const items: { key: Tab; label: string }[] = [
          { key: "transactions", label: "Transactions" },
          { key: "cashier", label: "Cashier Store" },
          { key: "cashier-booking", label: "Cashier Booking" },
          { key: "store-sales", label: "Store Sales Summary" },
          { key: "entrance-sales", label: "Entrance Sales Summary" },
          { key: "expenses-store", label: "Expenses Summary - Store" },
          { key: "expenses-entrance", label: "Expenses Summary - Entrance" },
          { key: "petty-monitoring", label: "Petty Cash Monitor" },
          { key: "reservation", label: "Reservations" },
          { key: "room-stay", label: "Room Stay Report" },
          { key: "cash-monitoring", label: "Cash Monitoring Report" },
          { key: "daily-summary", label: "Daily Transaction Summary" },
          { key: "food-sales", label: "Food Sales (Commission)" },
          { key: "analytics", label: "Analytics" },
        ];
        return (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Report Menu</label>
            <select
              className="pos-input w-full text-sm font-medium"
              value={tab}
              onChange={(e) => setTab(e.target.value as Tab)}
            >
              {items.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </div>
        );
      })()}
      {tab === "transactions" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <select className="pos-input text-sm" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Date From</label>
              <input type="date" className="pos-input text-sm" value={txnDateFrom} onChange={(e) => setTxnDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Date To</label>
              <input type="date" className="pos-input text-sm" value={txnDateTo} onChange={(e) => setTxnDateTo(e.target.value)} />
            </div>
            {moduleFilter === "Games Rental" ? (
              <select className="pos-input text-sm self-end" value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
                <option value="">All Games</option>
                {["Volleyball", "Dart", "Basketball", "Billiard"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            ) : <div />}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-bold tabular-nums">{data.length}</p>
            </div>
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Total Guests</p>
              <p className="text-lg font-bold tabular-nums">{totalAdults + totalChildren}</p>
              
            </div>
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold tabular-nums">{formatPeso(totalAmount)}</p>
            </div>
          </div>

          <button onClick={exportCSV} className="mb-4 flex items-center gap-2 px-4 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
            <Download size={16} /> Export CSV
          </button>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2 font-medium">Txn No</th>
                  <th className="text-left px-3 py-2 font-medium">Date/Time</th>
                  <th className="text-left px-3 py-2 font-medium">Module</th>
                  <th className="text-left px-3 py-2 font-medium">Customer</th>
                  <th className="text-right px-3 py-2 font-medium">Adults</th>
                  <th className="text-right px-3 py-2 font-medium">Kids (8+)</th>
                  <th className="text-right px-3 py-2 font-medium">Kids (5-7)</th>
                  <th className="text-right px-3 py-2 font-medium text-xs">Kids (4↓ FREE)</th>
                  <th className="text-right px-3 py-2 font-medium">Headcount</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Payment</th>
                  <th className="text-center px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
                )}
                {data.map((t) => {
                  const computedHeadcount = t.adults + (t.kids_8_above ?? 0) + (t.kids_5_7 ?? 0) + (t.kids_4_below ?? 0);
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-2 tabular-nums text-xs">{t.transaction_no.slice(-8)}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTime(t.date_time)}</td>
                      <td className="px-3 py-2">{t.module}{t.game_type ? ` - ${t.game_type}` : ""}</td>
                      <td className="px-3 py-2">{t.customer_name || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.adults}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.kids_8_above ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.kids_5_7 ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.kids_4_below ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{computedHeadcount}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatPeso(t.amount_paid)}</td>
                      <td className="px-3 py-2">{t.payment_method}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => { setEditingTxn(t); setEditForm({ ...t }); }}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all mx-auto"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "cashier" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <select className="pos-input text-sm" value={cashierFilter} onChange={e => setCashierFilter(e.target.value as "Daily" | "Monthly")}>
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
            </select>
            <input
              type={cashierFilter === "Monthly" ? "month" : "date"}
              className="pos-input text-sm"
              value={cashierDate}
              onChange={e => setCashierDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {cashierReports.length === 0 && (
              <div className="pos-card text-center py-8 text-muted-foreground text-sm">No cashier reports found</div>
            )}
            {cashierReports.map(report => (
              <div key={report.id} className="pos-card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold">{formatDate(report.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      Sales: ₱{report.sales.toLocaleString()} | Over/Short: <span className={report.cash_over_short < 0 ? "text-destructive" : ""}>{report.cash_over_short < 0 ? "-" : ""}₱{Math.abs(report.cash_over_short).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setPreviewReport(report)} className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-accent active:scale-95 transition-all" title="Preview">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => printCashierReport(report)} className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-accent active:scale-95 transition-all" title="Print">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => setEditingReport(report)} className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all">
                      Edit
                    </button>
                    <button onClick={async () => {
                      if (!confirm("Delete this cashier report?")) return;
                      try {
                        await deleteCashierReport(report.id!);
                        toast.success("Report deleted");
                        setRefreshKey(k => k + 1);
                      } catch { toast.error("Failed to delete"); }
                    }} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 active:scale-95 transition-all" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Beginning</p>
                    <p className="font-medium tabular-nums">₱{report.beginning_cash.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Sales</p>
                    <p className="font-medium tabular-nums">₱{report.sales.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Expected</p>
                    <p className="font-medium tabular-nums">₱{report.expected_ending_cash.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-medium tabular-nums">₱{report.actual_cash.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {previewReport && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewReport(null)}>
              <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div dangerouslySetInnerHTML={{ __html: buildCashierReportHTML(previewReport) }} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => printCashierReport(previewReport)} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all">
                    Print
                  </button>
                  <button onClick={() => setPreviewReport(null)} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 active:scale-95 transition-all">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "cashier-booking" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <select className="pos-input text-sm" value={bcFilter} onChange={e => setBcFilter(e.target.value as "Daily" | "Monthly")}>
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
            </select>
            <input
              type={bcFilter === "Monthly" ? "month" : "date"}
              className="pos-input text-sm"
              value={bcDate}
              onChange={e => setBcDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {bookingCashierReports.length === 0 && (
              <div className="pos-card text-center py-8 text-muted-foreground text-sm">No booking cashier reports found</div>
            )}
            {bookingCashierReports.map(report => {
              const totalPetty = report.pettyItems?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
              const totalCashAvail = (report.beginningCash || 0) + (report.entranceSales || 0);
              const expectedCash = totalCashAvail - totalPetty;
              const overShort = (report.actualCash || 0) - expectedCash;
              return (
                <div key={report.id} className="pos-card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold">{formatDate(report.reportDate + "T00:00:00")}</p>
                      <p className="text-xs text-muted-foreground">
                        Sales: ₱{(report.entranceSales || 0).toLocaleString()} | Over/Short: ₱{overShort.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewBcReport(report)} className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-accent active:scale-95 transition-all" title="Preview">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => printBcReport(report)} className="w-9 h-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-accent active:scale-95 transition-all" title="Print">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => setEditingBcReport(report)} className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all">
                        Edit
                      </button>
                      <button onClick={async () => {
                        if (!confirm("Delete this booking cashier report?")) return;
                        try {
                          await deleteBookingCashierReport(report.id!);
                          toast.success("Report deleted");
                          setRefreshKey(k => k + 1);
                        } catch { toast.error("Failed to delete"); }
                      }} className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 active:scale-95 transition-all" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {previewBcReport && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewBcReport(null)}>
              <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div dangerouslySetInnerHTML={{ __html: buildBookingCashierHTML(previewBcReport) }} />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => printBcReport(previewBcReport)} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all">
                    Print
                  </button>
                  <button onClick={() => setPreviewBcReport(null)} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 active:scale-95 transition-all">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "reservation" && <ReservationBoard />}

      {tab === "store-sales" && <StoreSalesSummary />}

      {tab === "entrance-sales" && <EntranceSalesSummary />}

      {tab === "expenses-store" && <ExpensesSummary source="store" title="Store Expenses" />}

      {tab === "expenses-entrance" && <ExpensesSummary source="entrance" title="Entrance Expenses" />}

      {tab === "petty-monitoring" && <PettyCashMonitoring />}

      {tab === "analytics" && <AnalyticsDashboard />}

      {tab === "room-stay" && <RoomStayReport />}

      {tab === "cash-monitoring" && <CashMonitoringReport />}

      {tab === "daily-summary" && <DailyTransactionSummaryReport />}

      {tab === "food-sales" && <FoodSalesReport />}

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTxn} onOpenChange={(open) => { if (!open) setEditingTxn(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Transaction No</label>
                <input className="pos-input w-full bg-muted" value={editForm.transaction_no || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Customer Name</label>
                <input className="pos-input w-full" value={editForm.customer_name || ""} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Module</label>
                <input className="pos-input w-full bg-muted" value={editForm.module || ""} disabled />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium block mb-1">Adults</label>
                  <input type="number" className="pos-input w-full" value={editForm.adults ?? 0} onChange={e => setEditForm(f => ({ ...f, adults: parseInt(e.target.value) || 0 }))} min="0" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Kids (8+)</label>
                  <input type="number" className="pos-input w-full" value={editForm.kids_8_above ?? 0} onChange={e => setEditForm(f => ({ ...f, kids_8_above: parseInt(e.target.value) || 0 }))} min="0" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Kids (5-7)</label>
                  <input type="number" className="pos-input w-full" value={editForm.kids_5_7 ?? 0} onChange={e => setEditForm(f => ({ ...f, kids_5_7: parseInt(e.target.value) || 0 }))} min="0" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Kids (4 & Below)</label>
                  <input type="number" className="pos-input w-full" value={editForm.kids_4_below ?? 0} onChange={e => setEditForm(f => ({ ...f, kids_4_below: parseInt(e.target.value) || 0 }))} min="0" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Amount Paid</label>
                <input type="number" step="0.01" className="pos-input w-full" value={editForm.amount_paid ?? 0} onChange={e => setEditForm(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))} min="0" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {(["Cash", "GCash"] as const).map(m => (
                    <button key={m} className={`toggle-btn flex-1 ${editForm.payment_method === m ? "toggle-btn-active" : ""}`} onClick={() => setEditForm(f => ({ ...f, payment_method: m }))}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingTxn(null)}
                  className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={editSaving}
                  onClick={async () => {
                    if (!editingTxn?.id) return;
                    setEditSaving(true);
                    try {
                      const totalHc = (editForm.adults ?? 0) + (editForm.kids_8_above ?? 0) + (editForm.kids_5_7 ?? 0) + (editForm.kids_4_below ?? 0);
                      await updateTransaction(editingTxn.id, {
                        customer_name: editForm.customer_name || undefined,
                        adults: editForm.adults,
                        kids_8_above: editForm.kids_8_above,
                        kids_5_7: editForm.kids_5_7,
                        kids_4_below: editForm.kids_4_below,
                        children: (editForm.kids_8_above ?? 0) + (editForm.kids_5_7 ?? 0) + (editForm.kids_4_below ?? 0),
                        total_headcount: totalHc,
                        amount_paid: editForm.amount_paid,
                        payment_method: editForm.payment_method,
                      });
                      toast.success("Transaction updated!");
                      setEditingTxn(null);
                      // Refresh data
                      const txns = await getTransactions({
                        module: moduleFilter === "All" ? undefined : moduleFilter,
                        dateFrom: txnDateFrom || undefined,
                        dateTo: txnDateTo || undefined,
                        game_type: gameFilter || undefined,
                      });
                      const fromMs = txnDateFrom ? new Date(txnDateFrom + "T00:00:00").getTime() : -Infinity;
                      const toMs = txnDateTo ? new Date(txnDateTo + "T23:59:59").getTime() : Infinity;
                      const filtered = txns.filter(t => {
                        if (t.status === "Cancelled") return false;
                        if (t.payment_status && t.payment_status !== "Fully Paid") return false;
                        const ts = new Date(t.date_time).getTime();
                        return ts >= fromMs && ts <= toMs;
                      });
                      setData(filtered);
                    } catch { toast.error("Failed to update"); }
                    setEditSaving(false);
                  }}
                  className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
