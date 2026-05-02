import { useState, useEffect, useCallback } from "react";
import { ClipboardList, CheckCircle, AlertTriangle, XCircle, Ban, Pencil, Trash2 } from "lucide-react";
import { getTransactions, updateTransaction, deleteTransaction, type Transaction } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type PaymentFilter = "ALL" | "Unpaid" | "Partially Paid" | "Fully Paid";

function getCardStyle(status?: string) {
  switch (status) {
    case "Fully Paid":
      return { backgroundColor: "#d4edda", color: "#155724" };
    case "Partially Paid":
      return { backgroundColor: "#fff3cd", color: "#856404" };
    case "Unpaid":
      return { backgroundColor: "#f8d7da", color: "#721c24" };
    default:
      return {};
  }
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "Fully Paid":
      return { icon: <CheckCircle size={12} className="inline mr-1" />, className: "bg-success/20 text-success" };
    case "Partially Paid":
      return { icon: <AlertTriangle size={12} className="inline mr-1" />, className: "bg-warning/20 text-warning" };
    case "Unpaid":
      return { icon: <XCircle size={12} className="inline mr-1" />, className: "bg-destructive/20 text-destructive" };
    default:
      return { icon: null, className: "bg-muted text-muted-foreground" };
  }
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("ALL");
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

  const loadBookings = useCallback(() => {
    getTransactions({ module: "Booking" }).then(txns => {
      const active = txns.filter(t => t.status !== "Cancelled");
      const sorted = active.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
      setBookings(sorted);
    });
  }, []);

  const handleCancelBooking = useCallback(async (booking: Transaction) => {
    if (!booking.id) return;
    if (!confirm(`Cancel booking for ${booking.customer_name || "this guest"}? This will exclude it from reports and the reservation board.`)) return;
    try {
      await updateTransaction(booking.id, {
        status: "Cancelled",
        comments: `Booking cancelled on ${new Date().toISOString().slice(0, 10)}.`,
      });
      toast.success(`Booking for ${booking.customer_name || "guest"} cancelled`);
      loadBookings();
    } catch {
      toast.error("Failed to cancel booking");
    }
  }, [loadBookings]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = filter === "ALL"
    ? bookings
    : bookings.filter(b => b.payment_status === filter);

  const handleSettlePayment = useCallback(async (booking: Transaction) => {
    if (!booking.id) return;
    const amount = parseFloat(settleAmount) || 0;
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }

    const totalAmount = booking.amount_paid || 0;
    const currentDeposit = booking.deposit_amount || 0;
    const newDeposit = Math.min(totalAmount, currentDeposit + amount);
    const newBalance = Math.max(0, totalAmount - newDeposit);
    const newStatus = newDeposit >= totalAmount ? "Fully Paid" : newDeposit > 0 ? "Partially Paid" : "Unpaid";
    const today = new Date().toISOString().slice(0, 10);

    try {
      await updateTransaction(booking.id, {
        deposit_amount: newDeposit,
        balance: newBalance,
        payment_status: newStatus,
        ...(newStatus === "Fully Paid" ? { date_settled: today } : {}),
        comments: newStatus === "Fully Paid"
          ? `Full payment settled on ${today}. Amount received: ₱${amount.toLocaleString()}`
          : `Partial payment of ₱${amount.toLocaleString()} received. Remaining: ₱${newBalance.toLocaleString()}`,
      });
      toast.success(
        newStatus === "Fully Paid"
          ? `${booking.customer_name || "Booking"} marked as Fully Paid!`
          : `₱${amount.toLocaleString()} payment recorded for ${booking.customer_name || "Booking"}`
      );
      setSettlingId(null);
      setSettleAmount("");
      loadBookings();
    } catch {
      toast.error("Failed to update");
    }
  }, [settleAmount, loadBookings]);

  const handleMarkFullyPaid = useCallback(async (booking: Transaction) => {
    if (!booking.id) return;
    const totalAmount = booking.amount_paid || 0;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await updateTransaction(booking.id, {
        deposit_amount: totalAmount,
        balance: 0,
        payment_status: "Fully Paid",
        date_settled: today,
        comments: `Marked as Fully Paid on ${today}.`,
      });
      toast.success(`${booking.customer_name || "Booking"} marked as Fully Paid!`);
      loadBookings();
    } catch {
      toast.error("Failed to update");
    }
  }, [loadBookings]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
  };

  const unpaidCount = bookings.filter(b => b.payment_status === "Unpaid").length;
  const partialCount = bookings.filter(b => b.payment_status === "Partially Paid").length;
  const pendingCount = unpaidCount + partialCount;

  return (
    <div className="reveal-up max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <ClipboardList size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>Booking Management</h2>
          {pendingCount > 0 && (
            <p className="text-xs text-destructive font-medium">
              {pendingCount} booking(s) pending ({unpaidCount} unpaid, {partialCount} partial)
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-1">
        {(["ALL", "Unpaid", "Partially Paid", "Fully Paid"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 h-10 rounded-t-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {f === "ALL" ? `All (${bookings.length})` : `${f} (${bookings.filter(b => b.payment_status === f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="pos-card text-center py-8 text-muted-foreground text-sm">No bookings found</div>
        )}
        {filtered.map(b => {
          const cardStyle = getCardStyle(b.payment_status);
          const badge = getStatusBadge(b.payment_status);
          const currentBalance = Math.max(0, (b.amount_paid || 0) - (b.deposit_amount || 0));
          const isSettling = settlingId === b.id;
          return (
            <div key={b.id} className="pos-card" style={cardStyle}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold" style={{ color: cardStyle.color || "inherit" }}>{b.customer_name || "Walk-in"}</p>
                  <p className="text-xs opacity-70">{formatDate(b.date_time)} • {b.booking_type}</p>
                  {(b.check_in || b.check_out) && (
                    <p className="text-xs opacity-70">
                      {b.check_in ? new Date(b.check_in).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      {" → "}
                      {b.check_out ? new Date(b.check_out).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                    </p>
                  )}
                  {b.room_type && <p className="text-xs opacity-70">{b.room_type}</p>}
                  {b.date_settled && <p className="text-xs opacity-70">Fully paid: {formatDate(b.date_settled + "T00:00:00")}</p>}
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badge.className}`}>
                  {badge.icon}
                  {b.payment_status || "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="opacity-70">Total</p>
                  <p className="font-bold tabular-nums">₱{(b.amount_paid || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-70">Deposit</p>
                  <p className="font-bold tabular-nums">₱{(b.deposit_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-70">Balance</p>
                  <p className="font-bold tabular-nums">₱{currentBalance.toLocaleString()}</p>
                </div>
              </div>
              {(b.extension_fee != null && b.extension_fee > 0) && (
                <div className="text-xs mb-2 px-2 py-1 rounded bg-warning/10 text-warning font-medium">
                  Room Additional Charges (Extension): ₱{b.extension_fee.toLocaleString()}
                </div>
              )}

              {(b.payment_status === "Unpaid" || b.payment_status === "Partially Paid") && !isSettling && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSettlingId(b.id!); setSettleAmount(currentBalance.toString()); }}
                    className="flex-1 min-w-[120px] h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-accent active:scale-[0.97] transition-all"
                  >
                    Settle Payment
                  </button>
                  <button
                    onClick={() => handleMarkFullyPaid(b)}
                    className="flex-1 min-w-[120px] h-10 rounded-lg text-sm font-medium bg-success/20 text-success hover:bg-success/30 active:scale-[0.97] transition-all"
                  >
                    Mark as Fully Paid
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b)}
                    className="h-10 px-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Cancel booking"
                  >
                    <Ban size={14} /> Cancel
                  </button>
                </div>
              )}

              {b.payment_status === "Fully Paid" && !isSettling && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleCancelBooking(b)}
                    className="h-9 px-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Cancel booking"
                  >
                    <Ban size={12} /> Cancel Booking
                  </button>
                </div>
              )}

              {isSettling && (
                <div className="mt-2 space-y-2">
                  <label className="text-xs font-medium block" style={{ color: cardStyle.color || "inherit" }}>
                    Enter amount to settle (Balance: ₱{currentBalance.toLocaleString()})
                  </label>
                  <input
                    type="number"
                    className="pos-input w-full"
                    value={settleAmount}
                    onChange={e => setSettleAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSettlePayment(b)}
                      className="flex-1 h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-accent active:scale-[0.97] transition-all"
                    >
                      Confirm Payment
                    </button>
                    <button
                      onClick={() => { setSettlingId(null); setSettleAmount(""); }}
                      className="h-10 px-4 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {b.comments && <p className="text-xs opacity-60 mt-2 italic">{b.comments}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
