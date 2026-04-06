import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarDays, AlertTriangle, XCircle } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getTransactions, getSettings } from "@/lib/db";
import { toast } from "sonner";

const TYPES = ["Exclusive", "Non-Exclusive"] as const;
const ROOM_OPTIONS = ["None", "Kubo Room", "Barkada Room"] as const;

function BalanceWarningDialog({ balance, onClose }: { balance: number; onClose: () => void }) {
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "square"; gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.frequency.value = 660; }, 200);
      setTimeout(() => { osc.frequency.value = 880; }, 400);
      setTimeout(() => { osc.stop(); ctx.close(); }, 600);
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-warning" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">⚠️ PARTIAL PAYMENT</h3>
        <p className="text-3xl font-bold text-destructive tabular-nums mb-3">₱{balance.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground mb-6">
          Customer has remaining balance: ₱{balance.toLocaleString()}. Please settle in <strong>Booking Management</strong>.
        </p>
        <button onClick={onClose} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all">
          OK, Got It
        </button>
      </div>
    </div>
  );
}

function DateConflictDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} className="text-destructive" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">❌ BOOKING NOT ALLOWED</h3>
        <p className="text-sm text-muted-foreground mb-6">Selected date is already booked. Please choose another date.</p>
        <button onClick={onClose} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all">OK</button>
      </div>
    </div>
  );
}

export default function BookingModule() {
  const [customerName, setCustomerName] = useState("");
  const [bookingType, setBookingType] = useState<string>(TYPES[0]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [addOnRoom, setAddOnRoom] = useState<string>("None");
  const [functionHallFee, setFunctionHallFee] = useState("");
  const [addOnTables, setAddOnTables] = useState("");
  const [corkageFee, setCorkageFee] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [depositAmount, setDepositAmount] = useState("");
  const [amountReceived, setAmountReceived] = useState("");

  const [exclusiveFee, setExclusiveFee] = useState(5000);
  const [adultRate, setAdultRate] = useState(100);
  const [childRate, setChildRate] = useState(50);
  const [kuboRate, setKuboRate] = useState(1000);
  const [barkadaRate, setBarkadaRate] = useState(1500);
  const [tableRate, setTableRate] = useState(200);

  const [saving, setSaving] = useState(false);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [savedBalance, setSavedBalance] = useState(0);
  const [showDateConflict, setShowDateConflict] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ check_in?: string; check_out?: string }[]>([]);
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    getSettings().then((s) => {
      setExclusiveFee(s.exclusive_fee); setAdultRate(s.adult_rate_day); setChildRate(s.child_rate_day);
      setKuboRate(s.kubo_room_rate); setBarkadaRate(s.barkada_room_rate); setTableRate(s.table_rent_rate);
    });
    getTransactions({ module: "Booking" }).then(setExistingBookings);
  }, []);

  const a = parseInt(adults) || 0;
  const c = parseInt(children) || 0;
  const headcount = a + c;
  const isExclusive = bookingType === "Exclusive";
  const numTables = parseInt(addOnTables) || 0;
  const corkage = parseFloat(corkageFee) || 0;
  const funcHall = parseFloat(functionHallFee) || 0;
  const deposit = parseFloat(depositAmount) || 0;
  const received = parseFloat(amountReceived) || 0;

  const personFee = a * adultRate + c * childRate;
  const roomFee = addOnRoom === "Kubo Room" ? kuboRate : addOnRoom === "Barkada Room" ? barkadaRate : 0;
  const tableFee = numTables * tableRate;
  const total = isExclusive ? (exclusiveFee + roomFee + tableFee + funcHall + corkage) : (personFee + roomFee + tableFee + funcHall + corkage);
  const balance = total - deposit;
  const paymentStatus = deposit === 0 ? "Unpaid" : deposit < total ? "Partially Paid" : "Fully Paid";
  const depositChange = received - deposit;

  const hasDateConflict = useCallback(() => {
    if (!checkIn || !checkOut) return false;
    const newIn = new Date(checkIn).getTime();
    const newOut = new Date(checkOut).getTime();
    return existingBookings.some(b => {
      if (!b.check_in || !b.check_out) return false;
      return newIn < new Date(b.check_out).getTime() && newOut > new Date(b.check_in).getTime();
    });
  }, [checkIn, checkOut, existingBookings]);

  const handleSave = useCallback(async () => {
    if (total === 0) { toast.error("Enter amount"); return; }
    if (hasDateConflict()) { setShowDateConflict(true); return; }
    if (received > 0 && received < deposit) { toast.error("Insufficient amount received for deposit"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo, date_time: now, module: "Booking",
        customer_name: customerName || undefined, booking_type: bookingType,
        check_in: checkIn || undefined, check_out: checkOut || undefined,
        corkage_fee: corkage > 0 ? corkage : undefined,
        function_hall_fee: funcHall > 0 ? funcHall : undefined,
        room_type: addOnRoom !== "None" ? addOnRoom : undefined,
        number_of_tables: numTables > 0 ? numTables : undefined,
        adults: a, children: c, total_headcount: headcount,
        amount_paid: total, deposit_amount: deposit,
        balance: balance > 0 ? balance : 0, payment_status: paymentStatus,
        payment_method: payment,
      });
      toast.success("Booking saved!");

      const rData = {
        transactionNo: txNo, dateTime: now, module: `Booking - ${bookingType}`,
        customerName: customerName || undefined,
        adults: a, children: c, headcount,
        totalAmount: total,
        amountReceived: received > 0 ? received : undefined,
        change: received >= deposit && received > 0 ? depositChange : undefined,
        paymentMethod: payment, paymentStatus,
        details: [
          ...(isExclusive ? [{ label: "Exclusive Fee", value: `₱${exclusiveFee.toLocaleString()}` }] : []),
          ...(roomFee > 0 ? [{ label: "Room", value: `${addOnRoom} ₱${roomFee.toLocaleString()}` }] : []),
          { label: "Deposit", value: `₱${deposit.toLocaleString()}` },
          { label: "Balance", value: `₱${Math.max(0, balance).toLocaleString()}` },
        ],
      };

      if (received >= deposit && received > 0 && deposit > 0) {
        setSuccessChange(depositChange);
      }

      if (paymentStatus !== "Fully Paid" && balance > 0) {
        setSavedBalance(balance);
        setShowBalanceWarning(true);
      } else {
        setReceiptData(rData);
      }

      setCustomerName(""); setAdults(""); setChildren(""); setDepositAmount(""); setAmountReceived("");
      setBookingType(TYPES[0]); setAddOnRoom("None"); setAddOnTables("");
      setCheckIn(""); setCheckOut(""); setCorkageFee(""); setFunctionHallFee("");
      getTransactions({ module: "Booking" }).then(setExistingBookings);
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, bookingType, checkIn, checkOut, corkage, funcHall, a, c, headcount, total, deposit, balance, paymentStatus, payment, addOnRoom, numTables, hasDateConflict, received, depositChange, isExclusive, exclusiveFee, roomFee]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => { setSuccessChange(null); }} />}
      {showBalanceWarning && <BalanceWarningDialog balance={savedBalance} onClose={() => setShowBalanceWarning(false)} />}
      {showDateConflict && <DateConflictDialog onClose={() => setShowDateConflict(false)} />}
      {receiptData && !successChange && !showBalanceWarning && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      <ModuleShell title="Booking" icon={<CalendarDays size={20} />} onSave={handleSave} saveLabel="Record Booking" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Booking Type</label>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button key={t} className={`toggle-btn flex-1 ${bookingType === t ? "toggle-btn-active" : ""}`} onClick={() => setBookingType(t)}>{t}</button>
            ))}
          </div>
          {isExclusive && <p className="text-xs text-muted-foreground mt-1">Exclusive Fee: ₱{exclusiveFee.toLocaleString()}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Check-in</label>
            <input type="date" className="pos-input w-full" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Check-out</label>
            <input type="date" className="pos-input w-full" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Adults</label>
            <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
            {a > 0 && <p className="text-xs text-muted-foreground mt-1">{a} × ₱{adultRate.toLocaleString()} = ₱{(a * adultRate).toLocaleString()}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Children</label>
            <input type="number" className="pos-input w-full" value={children} onChange={(e) => setChildren(e.target.value)} placeholder="0" min="0" />
            {c > 0 && <p className="text-xs text-muted-foreground mt-1">{c} × ₱{childRate.toLocaleString()} = ₱{(c * childRate).toLocaleString()}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Add Room (Optional)</label>
          <select className="pos-input w-full" value={addOnRoom} onChange={(e) => setAddOnRoom(e.target.value)}>
            {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {addOnRoom !== "None" && <p className="text-xs text-muted-foreground mt-1">Rate: ₱{roomFee.toLocaleString()}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Function Hall Fee (Optional)</label>
          <input type="number" className="pos-input w-full" value={functionHallFee} onChange={(e) => setFunctionHallFee(e.target.value)} placeholder="0.00" min="0" />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tables (Optional)</label>
          <input type="number" className="pos-input w-full" value={addOnTables} onChange={(e) => setAddOnTables(e.target.value)} placeholder="0" min="0" />
          {numTables > 0 && <p className="text-xs text-muted-foreground mt-1">{numTables} × ₱{tableRate.toLocaleString()} = ₱{tableFee.toLocaleString()}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Corkage Fee (Optional)</label>
          <input type="number" className="pos-input w-full" value={corkageFee} onChange={(e) => setCorkageFee(e.target.value)} placeholder="0.00" min="0" />
        </div>

        <div className="pos-card border-primary/30">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-primary tabular-nums">₱{total.toLocaleString()}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            {isExclusive && <p>Exclusive Fee: ₱{exclusiveFee.toLocaleString()}</p>}
            {!isExclusive && personFee > 0 && <p>Entrance ({a} adult + {c} child): ₱{personFee.toLocaleString()}</p>}
            {roomFee > 0 && <p>+ {addOnRoom}: ₱{roomFee.toLocaleString()}</p>}
            {funcHall > 0 && <p>+ Function Hall: ₱{funcHall.toLocaleString()}</p>}
            {tableFee > 0 && <p>+ {numTables} table(s): ₱{tableFee.toLocaleString()}</p>}
            {corkage > 0 && <p>+ Corkage: ₱{corkage.toLocaleString()}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Deposit Amount</label>
          <input type="number" className="pos-input w-full" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" min="0" />
        </div>

        <div className={`pos-card ${paymentStatus === "Fully Paid" ? "border-success/30 bg-success/5" : paymentStatus === "Partially Paid" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold tabular-nums ${paymentStatus === "Fully Paid" ? "text-success" : paymentStatus === "Partially Paid" ? "text-warning" : "text-destructive"}`}>
                ₱{Math.max(0, balance).toLocaleString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${paymentStatus === "Fully Paid" ? "bg-success/20 text-success" : paymentStatus === "Partially Paid" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive"}`}>
              {paymentStatus}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Amount Received</label>
          <input type="number" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
          {deposit > 0 && <p className="text-xs text-muted-foreground mt-1">Change computed against deposit amount (₱{deposit.toLocaleString()})</p>}
        </div>

        {received > 0 && deposit > 0 && (
          <div className={`pos-card ${received >= deposit ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= deposit ? "text-success" : "text-destructive"}`}>
              ₱{depositChange.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </ModuleShell>
    </>
  );
}
