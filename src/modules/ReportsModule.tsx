import { useState, useEffect } from "react";
import { FileText, Download, Printer, Banknote, Eye, CalendarDays } from "lucide-react";
import { getTransactions, getCashierReports, type Transaction, type CashierReport } from "@/lib/db";
import CashierModule, { buildCashierReportHTML, printCashierReport } from "@/modules/CashierModule";
import BookingCashierModule, { buildBookingCashierHTML, loadBookingCashierReports, type BookingCashierReport } from "@/modules/BookingCashierModule";
import ReservationBoard from "@/modules/ReservationBoard";

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

type Tab = "transactions" | "cashier" | "cashier-booking" | "reservation";

export default function ReportsModule() {
  const [tab, setTab] = useState<Tab>("transactions");
  const [data, setData] = useState<Transaction[]>([]);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gameFilter, setGameFilter] = useState("");

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
    getTransactions({
      module: moduleFilter === "All" ? undefined : moduleFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      game_type: gameFilter || undefined,
    }).then(txns => {
      // Only show Fully Paid transactions in reports
      setData(txns.filter(t => t.payment_status === "Fully Paid" || !t.payment_status));
    });
  }, [moduleFilter, dateFrom, dateTo, gameFilter]);

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
    const headers = ["Transaction No", "Date/Time", "Module", "Customer Name", "Adults", "Children", "Headcount", "Amount", "Payment"];
    const rows = data.map((t) => [
      t.transaction_no, formatDateTime(t.date_time), t.module, t.customer_name || "", t.adults, t.children, t.total_headcount, t.amount_paid, t.payment_method,
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

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {([
          { key: "transactions" as Tab, label: "Transactions", icon: null as React.ReactNode },
          { key: "cashier" as Tab, label: "Cashier Store", icon: <Banknote size={14} /> as React.ReactNode },
          { key: "cashier-booking" as Tab, label: "Cashier Booking", icon: <Banknote size={14} /> as React.ReactNode },
          { key: "reservation" as Tab, label: "Reservations", icon: <CalendarDays size={14} /> as React.ReactNode },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 h-10 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 whitespace-nowrap px-2 ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <select className="pos-input text-sm" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="date" className="pos-input text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <input type="date" className="pos-input text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            {moduleFilter === "Games Rental" && (
              <select className="pos-input text-sm" value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
                <option value="">All Games</option>
                {["Volleyball", "Dart", "Basketball", "Billiard"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-lg font-bold tabular-nums">{data.length}</p>
            </div>
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Total Guests</p>
              <p className="text-lg font-bold tabular-nums">{totalAdults + totalChildren}</p>
              <p className="text-xs text-muted-foreground">{totalAdults}A / {totalChildren}C</p>
            </div>
            <div className="pos-card text-center">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold tabular-nums">₱{totalAmount.toLocaleString()}</p>
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
                  <th className="text-right px-3 py-2 font-medium">Children</th>
                  <th className="text-right px-3 py-2 font-medium">Headcount</th>
                  <th className="text-right px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
                )}
                {data.map((t) => {
                  const statusColor = t.payment_status === "Fully Paid" ? "green" : t.payment_status === "Partially Paid" ? "orange" : t.payment_status === "Unpaid" ? "red" : undefined;
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-2 tabular-nums text-xs">{t.transaction_no.slice(-8)}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTime(t.date_time)}</td>
                      <td className="px-3 py-2">{t.module}{t.game_type ? ` - ${t.game_type}` : ""}</td>
                      <td className="px-3 py-2">{t.customer_name || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.adults}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.children}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.total_headcount}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">₱{t.amount_paid.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold text-xs" style={{ color: statusColor }}>{t.payment_status || "—"}</td>
                      <td className="px-3 py-2">{t.payment_method}</td>
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
    </div>
  );
}
