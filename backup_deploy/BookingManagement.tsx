import { useState, useEffect, useCallback } from "react";
import { ClipboardList, CheckCircle, AlertTriangle, XCircle, Ban, Pencil, Trash2 } from "lucide-react";
import { getTransactions, updateTransaction, deleteTransaction, getFoodSales, updateFoodSale, type Transaction, type FoodSale } from "@/lib/db";
import { formatPeso } from "@/lib/format";
import { Receipt, CreditCard, Wallet, CheckCircle2 } from "lucide-react";
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
  const [editingBooking, setEditingBooking] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [editSaving, setEditSaving] = useState(false);
  
  const [folioBooking, setFolioBooking] = useState<Transaction | null>(null);
  const [folioTransactions, setFolioTransactions] = useState<Transaction[]>([]);
  const [folioFoodSales, setFolioFoodSales] = useState<FoodSale[]>([]);
  const [otherCharges, setOtherCharges] = useState("0");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isProcessingFolio, setIsProcessingFolio] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [lastChange, setLastChange] = useState(0);

  const handleDeleteBooking = useCallback(async (booking: Transaction) => {
    if (!booking.id) return;
    if (!confirm(`PERMANENTLY DELETE booking for ${booking.customer_name || "this guest"}? This cannot be undone.`)) return;
    try {
      await deleteTransaction(booking.id);
      toast.success("Booking deleted");
      getTransactions({ module: "Booking" }).then(txns => {
        const active = txns.filter(t => t.status !== "Cancelled");
        setBookings(active.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()));
      });
    } catch { toast.error("Failed to delete"); }
  }, []);

  const openEdit = useCallback((b: Transaction) => {
    setEditingBooking(b);
    setEditForm({
      check_in: b.check_in,
      check_out: b.check_out,
      adults: b.adults,
      kids_8_above: b.kids_8_above ?? 0,
      kids_5_7: b.kids_5_7 ?? 0,
      kids_4_below: b.kids_4_below ?? 0,
      function_hall_fee: b.function_hall_fee ?? 0,
      number_of_tables: b.number_of_tables ?? 0,
      corkage_fee: b.corkage_fee ?? 0,
    });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingBooking?.id) return;
    setEditSaving(true);
    try {
      const a = editForm.adults ?? 0;
      const k8 = editForm.kids_8_above ?? 0;
      const k5 = editForm.kids_5_7 ?? 0;
      const k4 = editForm.kids_4_below ?? 0;
      await updateTransaction(editingBooking.id, {
        check_in: editForm.check_in || undefined,
        check_out: editForm.check_out || undefined,
        adults: a,
        kids_8_above: k8,
        kids_5_7: k5,
        kids_4_below: k4,
        children: k8 + k5 + k4,
        total_headcount: a + k8 + k5 + k4,
        function_hall_fee: editForm.function_hall_fee ?? 0,
        number_of_tables: editForm.number_of_tables ?? 0,
        corkage_fee: editForm.corkage_fee ?? 0,
      });
      toast.success("Booking updated!");
      setEditingBooking(null);
      getTransactions({ module: "Booking" }).then(txns => {
        const active = txns.filter(t => t.status !== "Cancelled");
        setBookings(active.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()));
      });
    } catch { toast.error("Failed to update"); }
    setEditSaving(false);
  }, [editingBooking, editForm]);

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

  const handleOpenFolio = useCallback(async (booking: Transaction) => {
    if (!booking.id || !booking.customer_name) {
      toast.error("Customer name is required for centralized billing");
      return;
    }
    setFolioBooking(booking);
    setReceivedAmount("");
    setOtherCharges("0");
    
    try {
      const name = booking.customer_name.trim();
      // Fetch all unpaid/partially paid transactions for this customer
      const [allTxns, allFood] = await Promise.all([
        getTransactions(),
        getFoodSales()
      ]);
      
      const relatedTxns = allTxns.filter(t => 
        t.id !== booking.id && // Don't include the current booking transaction as a "related" one
        t.customer_name?.trim() === name && 
        t.status !== "Cancelled" && 
        t.payment_status !== "Fully Paid"
      );
      
      const relatedFood = allFood.filter(f => 
        f.customer_name?.trim() === name && 
        f.payment_status !== "Fully Paid"
      );
      
      setFolioTransactions(relatedTxns);
      setFolioFoodSales(relatedFood);
    } catch {
      toast.error("Failed to load folio details");
    }
  }, []);

  const folioGrandTotal = (folioBooking ? Math.max(0, (folioBooking.amount_paid || 0) - (folioBooking.deposit_amount || 0)) : 0) +
    folioTransactions.reduce((acc, t) => acc + Math.max(0, (t.amount_paid || 0) - (t.deposit_amount || 0)), 0) +
    folioFoodSales.reduce((acc, f) => acc + (f.total_sales - f.cash_received), 0) +
    (parseFloat(otherCharges) || 0);

  const folioChange = (parseFloat(receivedAmount) || 0) - folioGrandTotal;

  const handleSettleFolio = useCallback(async () => {
    if (!folioBooking?.id) return;
    if (folioGrandTotal > 0 && (parseFloat(receivedAmount) || 0) < folioGrandTotal) {
      toast.error("Insufficient amount received");
      return;
    }
    
    setIsProcessingFolio(true);
    const today = new Date().toISOString().slice(0, 10);
    const amountReceived = parseFloat(receivedAmount) || 0;
    
    try {
      // 1. Settle main booking
      await updateTransaction(folioBooking.id, {
        deposit_amount: folioBooking.amount_paid,
        balance: 0,
        payment_status: "Fully Paid",
        date_settled: today,
        comments: `Settled via Folio. Amount received: ₱${amountReceived.toLocaleString()}`,
      });
      
      // 2. Settle related transactions
      await Promise.all(folioTransactions.map(t => 
        updateTransaction(t.id!, {
          deposit_amount: t.amount_paid,
          balance: 0,
          payment_status: "Fully Paid",
          date_settled: today,
          comments: `Settled via Folio linked to ${folioBooking.transaction_no}`,
        })
      ));
      
      // 3. Settle food sales
      await Promise.all(folioFoodSales.map(f => 
        updateFoodSale(f.id!, {
          cash_received: f.total_sales,
          payment_status: "Fully Paid",
        })
      ));
      
      setLastChange(folioChange);
      setFolioBooking(null);
      setShowThankYou(true);
      loadBookings();
    } catch {
      toast.error("Failed to settle folio");
    } finally {
      setIsProcessingFolio(false);
    }
  }, [folioBooking, folioTransactions, folioFoodSales, folioGrandTotal, receivedAmount, folioChange, loadBookings]);

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
                    onClick={() => handleOpenFolio(b)}
                    className="flex-1 min-w-[120px] h-10 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-accent active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                  >
                    <Receipt size={16} /> Settle Folio
                  </button>
                  <button
                    onClick={() => handleMarkFullyPaid(b)}
                    className="flex-1 min-w-[120px] h-10 rounded-lg text-sm font-medium bg-success/20 text-success hover:bg-success/30 active:scale-[0.97] transition-all"
                  >
                    Mark as Fully Paid
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="h-10 px-3 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Edit booking"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b)}
                    className="h-10 px-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Cancel booking"
                  >
                    <Ban size={14} /> Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteBooking(b)}
                    className="h-10 px-3 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Delete booking permanently"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}

              {b.payment_status === "Fully Paid" && !isSettling && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEdit(b)}
                    className="h-9 px-3 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Edit booking"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b)}
                    className="h-9 px-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Cancel booking"
                  >
                    <Ban size={12} /> Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteBooking(b)}
                    className="h-9 px-3 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80 active:scale-[0.97] transition-all flex items-center gap-1"
                    title="Delete booking permanently"
                  >
                    <Trash2 size={12} /> Delete
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

      <Dialog open={!!folioBooking} onOpenChange={(o) => { if (!o) setFolioBooking(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="text-primary" /> Billing Statement & Checkout
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Customer</p>
                <p className="font-bold text-lg">{folioBooking?.customer_name}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Transaction No</p>
                <p className="font-bold text-lg">{folioBooking?.transaction_no}</p>
              </div>
            </div>

            {/* Bill Details */}
            <div className="space-y-2">
              <p className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" /> Bill Summary
              </p>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Original</th>
                      <th className="text-right p-3 font-medium">Deposit</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Main Booking */}
                    {folioBooking && (
                      <tr>
                        <td className="p-3 font-medium">Booking: {folioBooking.booking_type} {folioBooking.room_type ? `(${folioBooking.room_type})` : ""}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(folioBooking.amount_paid || 0)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(folioBooking.deposit_amount || 0)}</td>
                        <td className="p-3 text-right tabular-nums font-bold text-destructive">
                          {formatPeso(Math.max(0, (folioBooking.amount_paid || 0) - (folioBooking.deposit_amount || 0)))}
                        </td>
                      </tr>
                    )}
                    
                    {/* Sub Transactions */}
                    {folioTransactions.map(t => (
                      <tr key={t.id}>
                        <td className="p-3 font-medium">{t.module} {t.game_type ? `(${t.game_type})` : ""}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(t.amount_paid || 0)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(t.deposit_amount || 0)}</td>
                        <td className="p-3 text-right tabular-nums font-bold text-destructive">
                          {formatPeso(Math.max(0, (t.amount_paid || 0) - (t.deposit_amount || 0)))}
                        </td>
                      </tr>
                    ))}

                    {/* Food Sales */}
                    {folioFoodSales.map(f => (
                      <tr key={f.id}>
                        <td className="p-3 font-medium">Food: {f.item_name} (x{f.qty})</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(f.total_sales)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(f.cash_received)}</td>
                        <td className="p-3 text-right tabular-nums font-bold text-destructive">
                          {formatPeso(f.total_sales - f.cash_received)}
                        </td>
                      </tr>
                    ))}

                    {/* Other Charges Input */}
                    <tr className="bg-primary/5">
                      <td className="p-3 font-bold flex items-center gap-2">
                        Other Charges
                      </td>
                      <td colSpan={2} className="p-3 text-right italic text-muted-foreground text-xs">
                        (Manual entry for misc fees)
                      </td>
                      <td className="p-3 text-right">
                        <input 
                          type="number"
                          className="w-24 bg-transparent border-b border-primary/50 text-right font-bold text-primary focus:outline-none"
                          value={otherCharges}
                          onChange={(e) => setOtherCharges(e.target.value)}
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <th colSpan={3} className="text-right p-4 text-base font-bold">TOTAL BALANCE DUE</th>
                      <th className="text-right p-4 text-xl font-black text-destructive tabular-nums underline decoration-double">
                        {formatPeso(folioGrandTotal)}
                      </th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Input */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-primary">Amount Received (₱)</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input 
                    type="number"
                    className="pos-input w-full pl-10 text-xl font-bold bg-primary/5 border-primary/20"
                    placeholder="Enter amount paid"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              
              <div className={`p-4 rounded-xl border ${folioChange >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Change</p>
                <p className={`text-3xl font-black tabular-nums ${folioChange >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatPeso(folioChange)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-muted/30 border-t border-border flex gap-3">
            <button 
              onClick={() => setFolioBooking(null)}
              className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={isProcessingFolio || (folioGrandTotal > 0 && folioChange < 0)}
              onClick={handleSettleFolio}
              className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isProcessingFolio ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard size={20} /> Complete Settle & Checkout
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(o) => { if (!o) setEditingBooking(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium block mb-1">Check-in</label>
                <input type="datetime-local" className="pos-input w-full text-sm"
                  value={editForm.check_in ? editForm.check_in.slice(0, 16) : ""}
                  onChange={e => setEditForm(f => ({ ...f, check_in: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Check-out</label>
                <input type="datetime-local" className="pos-input w-full text-sm"
                  value={editForm.check_out ? editForm.check_out.slice(0, 16) : ""}
                  onChange={e => setEditForm(f => ({ ...f, check_out: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium block mb-1">Adults</label>
                <input type="number" min="0" className="pos-input w-full" value={editForm.adults ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, adults: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium block mb-1">Kids 8+</label>
                <input type="number" min="0" className="pos-input w-full" value={editForm.kids_8_above ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, kids_8_above: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium block mb-1">Kids 5-7</label>
                <input type="number" min="0" className="pos-input w-full" value={editForm.kids_5_7 ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, kids_5_7: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium block mb-1">Kids 4↓</label>
                <input type="number" min="0" className="pos-input w-full" value={editForm.kids_4_below ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, kids_4_below: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs font-medium block mb-1">Function Hall Fee</label>
                <input type="number" step="0.01" min="0" className="pos-input w-full" value={editForm.function_hall_fee ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, function_hall_fee: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium block mb-1">Tables</label>
                <input type="number" min="0" className="pos-input w-full" value={editForm.number_of_tables ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, number_of_tables: parseInt(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium block mb-1">Maintenance Fee</label>
                <input type="number" step="0.01" min="0" className="pos-input w-full" value={editForm.corkage_fee ?? 0}
                  onChange={e => setEditForm(f => ({ ...f, corkage_fee: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingBooking(null)} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-all">Cancel</button>
              <button disabled={editSaving} onClick={saveEdit} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50">{editSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thank You Message Dialog */}
      <Dialog open={showThankYou} onOpenChange={setShowThankYou}>
        <DialogContent className="max-w-sm text-center py-10">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-success">SUCCESS!</h2>
          <p className="text-muted-foreground mt-2">All payments have been settled.</p>
          <div className="my-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Change Given</p>
            <p className="text-3xl font-black">{formatPeso(lastChange)}</p>
          </div>
          <p className="text-lg font-bold text-primary italic">"Thank you! Come again!"</p>
          <button 
            onClick={() => setShowThankYou(false)}
            className="w-full mt-6 h-12 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
