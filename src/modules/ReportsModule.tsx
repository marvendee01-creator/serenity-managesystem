import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { getTransactions, type Transaction } from "@/lib/db";

const MODULES = ["All", "Entrance", "Room", "Booking", "Games Rental", "Table Rent"];

export default function ReportsModule() {
  const [data, setData] = useState<Transaction[]>([]);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gameFilter, setGameFilter] = useState("");

  useEffect(() => {
    getTransactions({
      module: moduleFilter === "All" ? undefined : moduleFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      game_type: gameFilter || undefined,
    }).then(setData);
  }, [moduleFilter, dateFrom, dateTo, gameFilter]);

  const totalAmount = data.reduce((s, t) => s + t.amount_paid, 0);
  const totalAdults = data.reduce((s, t) => s + t.adults, 0);
  const totalChildren = data.reduce((s, t) => s + t.children, 0);

  const exportCSV = () => {
    const headers = ["Transaction No", "Date/Time", "Module", "Customer Name", "Game Type", "Adults", "Children", "Headcount", "Amount", "Payment"];
    const rows = data.map((t) => [
      t.transaction_no, t.date_time, t.module, t.customer_name || "", t.game_type || "", t.adults, t.children, t.total_headcount, t.amount_paid, t.payment_method,
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

  return (
    <div className="reveal-up max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <FileText size={20} />
        </div>
        <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>Reports</h2>
      </div>

      {/* Filters */}
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

      {/* Summary */}
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

      {/* Export */}
      <button onClick={exportCSV} className="mb-4 flex items-center gap-2 px-4 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground active:scale-[0.97] transition-all">
        <Download size={16} /> Export CSV
      </button>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium">Txn No</th>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Module</th>
              <th className="text-left px-3 py-2 font-medium">Customer</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No transactions found</td></tr>
            )}
            {data.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-3 py-2 tabular-nums text-xs">{t.transaction_no.slice(-8)}</td>
                <td className="px-3 py-2 text-xs">{new Date(t.date_time).toLocaleDateString()}</td>
                <td className="px-3 py-2">{t.module}{t.game_type ? ` - ${t.game_type}` : ""}</td>
                <td className="px-3 py-2">{t.customer_name || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">₱{t.amount_paid.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
