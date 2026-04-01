import { useState, useEffect, useCallback } from "react";
import { ClipboardList, CheckCircle, AlertTriangle } from "lucide-react";
import { getTransactions, addTransaction, type Transaction } from "@/lib/db";
import { toast } from "sonner";

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "With Balance" | "Fully Paid">("all");
  const [paymentInputs, setPaymentInputs] = useState<Record<number, string>>({});
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadBookings = useCallback(() => {
    getTransactions({ module: "Booking" }).then(txns => {
      const sorted = txns.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
      setBookings(sorted);
    });
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = filter === "all" ? bookings : filter === "Fully Paid" ? [] : bookings.filter(b => b.payment_status === filter);

  const handleSettlePayment = useCallback(async (booking: Transaction) => {
    const paymentAmount = parseFloat(paymentInputs[booking.id!] || "0");
    if (paymentAmount <= 0) { toast.error("Enter a valid payment amount"); return; }

    const newDeposit = (booking.deposit_amount || 0) + paymentAmount;
    const newBalance = booking.amount_paid - newDeposit;
    const newStatus = newBalance <= 0 ? "Fully Paid" : "With Balance";

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
        deposit_amount: newDeposit,
        balance: Math.max(0, newBalance),
        payment_status: newStatus,
        payment_method: booking.payment_method,
        comments: `Payment of ₱${paymentAmount.toLocaleString()} received. ${newStatus === "Fully Paid" ? "Fully settled." : `Remaining: ₱${Math.max(0, newBalance).toLocaleString()}`}`,
      });
      toast.success(`₱${paymentAmount.toLocaleString()} payment recorded for ${booking.customer_name || "booking"}!`);
      setPaymentInputs(prev => { const n = { ...prev }; delete n[booking.id!]; return n; });
      loadBookings();
    } catch {
      toast.error("Failed to update");
    }
  }, [paymentInputs, loadBookings]);

  const handleFullPayment = useCallback(async (booking: Transaction) => {
    if (confirmId !== booking.id) {
      setConfirmId(booking.id!);
      return;
    }
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
      setConfirmId(null);
      loadBookings();
    } catch {
      toast.error("Failed to update");
    }
  }, [confirmId, loadBookings]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
  };

  const withBalanceCount = bookings.filter(b => b.payment_status === "With Balance").length;

  return (
    <div className="reveal-up max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <ClipboardList size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>Booking Management</h2>
          {withBalanceCount > 0 && (
            <p className="text-xs text-destructive font-medium">{withBalanceCount} booking(s) with balance</p>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "With Balance", "Fully Paid"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="pos-card text-center py-8 text-muted-foreground text-sm">No bookings found</div>
        )}
        {filtered.map(b => (
          <div key={b.id} className={`pos-card ${b.payment_status === "With Balance" ? "border-destructive/20" : "border-success/20"}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-foreground">{b.customer_name || "Walk-in"}</p>
                <p className="text-xs text-muted-foreground">{formatDate(b.date_time)} • {b.booking_type}</p>
                {b.room_type && <p className="text-xs text-muted-foreground">{b.room_type}</p>}
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${b.payment_status === "Fully Paid" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                {b.payment_status === "Fully Paid" ? <CheckCircle size={12} className="inline mr-1" /> : <AlertTriangle size={12} className="inline mr-1" />}
                {b.payment_status || "—"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-bold tabular-nums">₱{b.amount_paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deposit</p>
                <p className="font-bold tabular-nums">₱{(b.deposit_amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance</p>
                <p className={`font-bold tabular-nums ${(b.balance || 0) > 0 ? "text-destructive" : "text-success"}`}>
                  ₱{(b.balance || 0).toLocaleString()}
                </p>
              </div>
            </div>
            {b.payment_status === "With Balance" && (
              <div className="space-y-2">
                {/* Partial Payment Input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="pos-input flex-1 h-10 text-sm"
                    placeholder="Enter payment amount"
                    value={paymentInputs[b.id!] || ""}
                    onChange={e => setPaymentInputs(prev => ({ ...prev, [b.id!]: e.target.value }))}
                    min="0"
                  />
                  <button
                    onClick={() => handleSettlePayment(b)}
                    className="h-10 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-accent active:scale-[0.97] transition-all"
                  >
                    Settle
                  </button>
                </div>
                {/* Full Payment */}
                <button
                  onClick={() => handleFullPayment(b)}
                  className={`w-full h-10 rounded-lg text-sm font-medium active:scale-[0.97] transition-all ${
                    confirmId === b.id
                      ? "bg-success text-success-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {confirmId === b.id ? "Confirm Full Payment" : "Mark as Fully Paid"}
                </button>
              </div>
            )}
            {b.comments && <p className="text-xs text-muted-foreground mt-2 italic">{b.comments}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
