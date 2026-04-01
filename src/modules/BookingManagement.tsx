import { useState, useEffect, useCallback } from "react";
import { ClipboardList, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { getTransactions, addTransaction, type Transaction } from "@/lib/db";
import { toast } from "sonner";

type PaymentFilter = "all" | "Unpaid" | "Partially Paid" | "Fully Paid";

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
  const [filter, setFilter] = useState<PaymentFilter>("all");

  const loadBookings = useCallback(() => {
    getTransactions({ module: "Booking" }).then(txns => {
      const sorted = txns.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
      setBookings(sorted);
    });
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = filter === "all"
    ? bookings
    : bookings.filter(b => b.payment_status === filter);

  const handleSettlePayment = useCallback(async (booking: Transaction) => {
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: new Date().toISOString(),
        module: "Booking",
        customer_name: booking.customer_name,
        booking_type: booking.booking_type,
        check_in: booking.check_in,
        check_out: booking.check_out,
        corkage_fee: booking.corkage_fee,
        function_hall_fee: booking.function_hall_fee,
        room_type: booking.room_type,
        number_of_tables: booking.number_of_tables,
        adults: booking.adults,
        children: booking.children,
        total_headcount: booking.total_headcount,
        amount_paid: booking.amount_paid,
        deposit_amount: booking.amount_paid,
        balance: 0,
        payment_status: "Fully Paid",
        payment_method: booking.payment_method,
        comments: `Full payment settled. Previous balance: ₱${(booking.balance || 0).toLocaleString()}`,
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

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "Unpaid", "Partially Paid", "Fully Paid"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 h-10 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {f === "all" ? "All" : f}
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
          return (
            <div key={b.id} className="pos-card" style={cardStyle}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold" style={{ color: cardStyle.color || "inherit" }}>{b.customer_name || "Walk-in"}</p>
                  <p className="text-xs opacity-70">{formatDate(b.date_time)} • {b.booking_type}</p>
                  {b.room_type && <p className="text-xs opacity-70">{b.room_type}</p>}
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badge.className}`}>
                  {badge.icon}
                  {b.payment_status || "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="opacity-70">Total</p>
                  <p className="font-bold tabular-nums">₱{b.amount_paid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-70">Deposit</p>
                  <p className="font-bold tabular-nums">₱{(b.deposit_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-70">Balance</p>
                  <p className="font-bold tabular-nums">
                    ₱{(b.balance || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              {(b.payment_status === "Unpaid" || b.payment_status === "Partially Paid" || b.payment_status === "With Balance") && (
                <button
                  onClick={() => handleSettlePayment(b)}
                  className="w-full h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-accent active:scale-[0.97] transition-all"
                >
                  Settle Payment (Mark Fully Paid)
                </button>
              )}
              {b.comments && <p className="text-xs opacity-60 mt-2 italic">{b.comments}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
