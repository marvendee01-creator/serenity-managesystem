import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarDays, AlertTriangle, XCircle } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import CustomerSelect from "@/components/CustomerSelect";
import PaymentToggle from "@/components/PaymentToggle";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getTransactions, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";

const TYPES = ["Exclusive", "Non-Exclusive"] as const;
const ROOM_OPTIONS = ["Kubo Room", "Barkada Room"] as const;

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
        <p className="text-3xl font-bold text-destructive tabular-nums mb-3">{formatPeso(balance)}</p>
        <p className="text-sm text-muted-foreground mb-6">
          Customer has remaining balance: {formatPeso(balance)}. Please settle in <strong>Booking Management</strong>.
        </p>
        <button onClick={onClose} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all">
          OK, Got It
        </button>
      </div>
    </div>
  );
}

function BookingConflictDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-warning" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">⚠️ Booking Conflict Detected!</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="flex-1 h-12 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base hover:bg-accent transition-all">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-12 rounded-lg bg-warning text-warning-foreground font-semibold text-base hover:bg-warning/90 transition-all">Proceed Anyway</button>
        </div>
      </div>
    </div>
  );
}

export default function BookingModule() {
  const [customerName, setCustomerName] = useState("");
  const [bookingType, setBookingType] = useState<string>(TYPES[0]);
  const [stayType, setStayType] = useState<"Day Tour" | "Overnight">("Day Tour");
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
  const [adults, setAdults] = useState("");
  const [kids8Above, setKids8Above] = useState("");
  const [kids5to7, setKids5to7] = useState("");
  const [kids4Below, setKids4Below] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [noOfDays, setNoOfDays] = useState("1");
  const [functionHallFee, setFunctionHallFee] = useState("");
  const [withFunctionHall, setWithFunctionHall] = useState(false);
  const [functionHallDays, setFunctionHallDays] = useState("");
  const [functionHallRate, setFunctionHallRate] = useState("");
  const [addOnTables, setAddOnTables] = useState("");
  const [maintenanceFee, setMaintenanceFee] = useState("");
  const [drinksCorkage, setDrinksCorkage] = useState("");
  const [liquorCorkage, setLiquorCorkage] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [depositAmount, setDepositAmount] = useState("");

  const [exclusiveFee, setExclusiveFee] = useState(5000);
  const [dayAdultRate, setDayAdultRate] = useState(100);
  const [dayKids8Rate, setDayKids8Rate] = useState(50);
  const [dayKids5Rate, setDayKids5Rate] = useState(30);
  const [nightAdultRate, setNightAdultRate] = useState(150);
  const [nightKids8Rate, setNightKids8Rate] = useState(75);
  const [nightKids5Rate, setNightKids5Rate] = useState(50);
  const [kuboRate, setKuboRate] = useState(1000);
  const [barkadaRate, setBarkadaRate] = useState(1500);
  const [tableRate, setTableRate] = useState(200);
  const [funcHallSettingRate, setFuncHallSettingRate] = useState(1500);

  const [saving, setSaving] = useState(false);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [savedBalance, setSavedBalance] = useState(0);
  const [showDateConflict, setShowDateConflict] = useState(false);
  const [dateConflictMessage, setDateConflictMessage] = useState("");
  const [show8amWarning, setShow8amWarning] = useState(false);
  const [pending8amProceed, setPending8amProceed] = useState(false);
  const [existingBookings, setExistingBookings] = useState<{ check_in?: string; check_out?: string; booking_type?: string; room_type?: string }[]>([]);
  
  const [receiptData, setReceiptData] = useState<any>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    if (checkIn && noOfDays) {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + Math.max(1, parseInt(noOfDays) || 1));
      setCheckOut(d.toISOString().slice(0, 10));
    }
  }, [checkIn, noOfDays]);
  useEffect(() => {
    getSettings().then((s) => {
      setExclusiveFee(s.exclusive_fee);
      setDayAdultRate(s.adult_rate_day);
      setDayKids8Rate(s.kids_8_above_rate_day ?? 50);
      setDayKids5Rate(s.kids_5_7_rate_day ?? 30);
      setNightAdultRate(s.adult_rate_night);
      setNightKids8Rate(s.kids_8_above_rate_night ?? 75);
      setNightKids5Rate(s.kids_5_7_rate_night ?? 50);
      setKuboRate(s.kubo_room_rate); setBarkadaRate(s.barkada_room_rate); setTableRate(s.table_rent_rate);
      setFuncHallSettingRate(s.function_hall_rate_per_day ?? 1500);
      setFunctionHallRate((s.function_hall_rate_per_day ?? 1500).toString());
    });
    getTransactions({ module: "Booking" }).then(setExistingBookings);
  }, []);

  // Auto-derive function hall days from check-in/out span (rounded up, min 1)
  useEffect(() => {
    if (!withFunctionHall) return;
    if (!checkIn || !checkOut) return;
    const inMs = new Date(checkIn).getTime();
    const outMs = new Date(checkOut).getTime();
    if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return;
    const days = Math.max(1, Math.ceil((outMs - inMs) / (1000 * 60 * 60 * 24)));
    setFunctionHallDays(days.toString());
  }, [withFunctionHall, checkIn, checkOut]);

  const a = parseInt(adults) || 0;
  const k8 = parseInt(kids8Above) || 0;
  const k5 = parseInt(kids5to7) || 0;
  const k4 = parseInt(kids4Below) || 0;
  const headcount = a + k8 + k5 + k4;
  const isExclusive = bookingType === "Exclusive";
  const numTables = parseInt(addOnTables) || 0;
  const corkage = parseFloat(maintenanceFee) || 0;
  const drinksCork = parseFloat(drinksCorkage) || 0;
  const liquorCork = parseFloat(liquorCorkage) || 0;
  const funcHall = parseFloat(functionHallFee) || 0;
  const deposit = parseFloat(depositAmount) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const fhDays = Math.max(0, parseFloat(functionHallDays) || 0);
  const fhRate = Math.max(0, parseFloat(functionHallRate) || 0);
  const functionHallTotal = withFunctionHall ? fhDays * fhRate : 0;

  const isDayTour = stayType === "Day Tour";
  const adultRate = isDayTour ? dayAdultRate : nightAdultRate;
  const kids8Rate = isDayTour ? dayKids8Rate : nightKids8Rate;
  const kids5Rate = isDayTour ? dayKids5Rate : nightKids5Rate;

  const adultFee = a * adultRate;
  const childrenTotalFee = isExclusive ? 0 : (k8 * kids8Rate + k5 * kids5Rate);
  const personFee = adultFee + childrenTotalFee;
  
  const days = Math.max(1, parseFloat(noOfDays) || 1);
  const baseRoomFee = selectedRooms.reduce((sum, r) => sum + (r === "Kubo Room" ? kuboRate : r === "Barkada Room" ? barkadaRate : 0), 0);
  const roomFee = baseRoomFee * days;
  
  const tableFee = numTables * tableRate;
  const baseAmount = isExclusive
    ? (exclusiveFee + roomFee + tableFee + funcHall + functionHallTotal + corkage + drinksCork + liquorCork)
    : (personFee + roomFee + tableFee + funcHall + functionHallTotal + corkage + drinksCork + liquorCork);
  const total = Math.max(0, baseAmount - discount);
  const balance = total - deposit;
  const paymentStatus = deposit === 0 ? "Unpaid" : deposit < total ? "Partially Paid" : "Fully Paid";

  // Detect 8 AM active conflict: existing booking ends after 08:00 on the same day as new check-in
  const has8amActiveConflict = useCallback(() => {
    if (!checkIn) return false;
    const newIn = new Date(checkIn);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    return existingBookings.some(b => {
      if (!b.check_out) return false;
      const co = new Date(b.check_out);
      return sameDay(co, newIn) && (co.getHours() > 8 || (co.getHours() === 8 && co.getMinutes() > 0));
    });
  }, [checkIn, existingBookings]);

  const hasDateConflict = useCallback(() => {
    if (!checkIn || !checkOut) return { conflict: false, message: "" };
    const newIn = new Date(checkIn).getTime();
    const newOut = new Date(checkOut).getTime();
    const overlaps = (b: { check_in?: string; check_out?: string }) => {
      if (!b.check_in || !b.check_out) return false;
      return newIn < new Date(b.check_out).getTime() && newOut > new Date(b.check_in).getTime();
    };
    // Exclusive blocks against any other booking on the same dates
    if (isExclusive) {
      if (existingBookings.some(b => overlaps(b))) {
        return { conflict: true, message: "Exclusive booking conflicts with an existing reservation on these dates." };
      }
    } else {
      // Non-exclusive: blocked by any existing Exclusive on overlapping dates
      if (existingBookings.some(b => b.booking_type === "Exclusive" && overlaps(b))) {
        return { conflict: true, message: "Selected dates are reserved as Exclusive. Please choose another date." };
      }
    }
    // Per-room conflict: block when ANY of the selected rooms overlap
    if (selectedRooms.includes("Kubo Room") && existingBookings.some(b => b.room_type?.includes("Kubo Room") && overlaps(b))) {
      return { conflict: true, message: "Kubo Room already booked on selected dates!" };
    }
    if (selectedRooms.includes("Barkada Room") && existingBookings.some(b => b.room_type?.includes("Barkada Room") && overlaps(b))) {
      return { conflict: true, message: "Barkada Room already booked on selected dates!" };
    }
    return { conflict: false, message: "" };
  }, [checkIn, checkOut, existingBookings, isExclusive, selectedRooms]);

  const handleSave = useCallback(async (proceedConflict = false) => {
    if (total === 0) { toast.error("Enter amount"); return; }
    if (!proceedConflict) {
      const conflict = hasDateConflict();
      if (conflict.conflict) { setDateConflictMessage(conflict.message); setShowDateConflict(true); return; }
      if (!pending8amProceed && has8amActiveConflict()) { setShow8amWarning(true); return; }
    }
    
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo, date_time: now, module: "Booking",
        customer_name: customerName || undefined, booking_type: bookingType,
        check_in: checkIn || undefined, check_out: checkOut || undefined,
        corkage_fee: corkage > 0 ? corkage : undefined,
        maintenance_fee: corkage > 0 ? corkage : 0,
        drinks_corkage_fee: drinksCork,
        liquor_corkage_fee: liquorCork,
        function_hall_fee: funcHall > 0 ? funcHall : undefined,
        with_function_hall: withFunctionHall,
        function_hall_days: withFunctionHall ? fhDays : 0,
        function_hall_rate: withFunctionHall ? fhRate : 0,
        function_hall_total: functionHallTotal,
        room_type: selectedRooms.length > 0 ? selectedRooms.join(", ") : undefined,
        number_of_tables: numTables > 0 ? numTables : undefined,
        adults: a, children: k8 + k5 + k4,
        kids_8_above: k8, kids_5_7: k5, kids_4_below: k4,
        total_headcount: headcount,
        amount_paid: total, deposit_amount: deposit,
        balance: balance > 0 ? balance : 0, payment_status: paymentStatus,
        payment_method: payment,
      });
      toast.success("Booking saved!");

      const rData = {
        transactionNo: txNo, dateTime: now, module: `Booking - ${bookingType}`,
        customerName: customerName || undefined,
        adults: a, children: k8 + k5 + k4, headcount,
        totalAmount: total,
        paymentMethod: payment, paymentStatus,
        details: [
          ...(isExclusive ? [{ label: "Exclusive Fee", value: `₱${exclusiveFee.toLocaleString()}` }] : []),
          ...(!isExclusive && adultFee > 0 ? [{ label: `Adults (${a})`, value: `₱${adultFee.toLocaleString()}` }] : []),
          ...(!isExclusive && k8 > 0 ? [{ label: `Kids 8+ (${k8})`, value: `₱${(k8 * kids8Rate).toLocaleString()}` }] : []),
          ...(!isExclusive && k5 > 0 ? [{ label: `Kids 5-7 (${k5})`, value: `₱${(k5 * kids5Rate).toLocaleString()}` }] : []),
          ...(k4 > 0 ? [{ label: `Kids 4↓ FREE (${k4})`, value: "₱0" }] : []),
          ...(roomFee > 0 ? [{ label: `Rooms (${selectedRooms.join(", ")})`, value: `₱${roomFee.toLocaleString()} (${days} day${days > 1 ? "s" : ""})` }] : []),
          ...(functionHallTotal > 0 ? [{ label: `Function Hall (${fhDays} day${fhDays > 1 ? "s" : ""} × ₱${fhRate.toLocaleString()})`, value: `₱${functionHallTotal.toLocaleString()}` }] : []),
          { label: "Deposit", value: `₱${deposit.toLocaleString()}` },
          { label: "Balance", value: `₱${Math.max(0, balance).toLocaleString()}` },
        ],
      };

      if (paymentStatus !== "Fully Paid" && balance > 0) {
        setSavedBalance(balance);
        setShowBalanceWarning(true);
      } else {
        setReceiptData(rData);
      }

      setCustomerName(""); setAdults(""); setKids8Above(""); setKids5to7(""); setKids4Below("");
      setDepositAmount(""); setBookingType(TYPES[0]); setSelectedRooms([]); setAddOnTables("");
      setNoOfDays("1");
      setCheckIn(""); setCheckOut(""); setMaintenanceFee(""); setDrinksCorkage(""); setLiquorCorkage(""); setFunctionHallFee(""); setDiscountAmount("");
      setWithFunctionHall(false); setFunctionHallDays("");
      setFunctionHallRate(funcHallSettingRate.toString());
      getTransactions({ module: "Booking" }).then(setExistingBookings);
      setPending8amProceed(false);
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, bookingType, stayType, checkIn, checkOut, corkage, funcHall, a, k8, k5, k4, headcount, total, deposit, balance, paymentStatus, payment, selectedRooms, numTables, hasDateConflict, has8amActiveConflict, pending8amProceed, isExclusive, exclusiveFee, roomFee, adultFee, kids8Rate, kids5Rate, withFunctionHall, fhDays, fhRate, functionHallTotal, funcHallSettingRate, drinksCork, liquorCork, discount, days]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      {showBalanceWarning && <BalanceWarningDialog balance={savedBalance} onClose={() => setShowBalanceWarning(false)} />}
      {showDateConflict && <BookingConflictDialog message={dateConflictMessage} onCancel={() => setShowDateConflict(false)} onConfirm={() => { setShowDateConflict(false); handleSave(true); }} />}
      {show8amWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShow8amWarning(false)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">⚠️ Booking Conflict</h3>
            <p className="text-base text-muted-foreground mb-6">Existing booking active until 8:00 AM on this date. Proceed anyway?</p>
            <div className="flex gap-3">
              <button onClick={() => setShow8amWarning(false)} className="flex-1 h-12 rounded-lg bg-secondary text-secondary-foreground font-semibold">Cancel</button>
              <button onClick={() => { setShow8amWarning(false); setPending8amProceed(true); setTimeout(() => handleSave(), 0); }} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold">Proceed</button>
              <button onClick={() => { setShow8amWarning(false); setPending8amProceed(true); setTimeout(() => handleSave(true), 0); }} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold">Proceed</button>
            </div>
          </div>
        </div>
      )}
      {receiptData && !showBalanceWarning && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      <ModuleShell title="Booking" icon={<CalendarDays size={20} />} onSave={() => handleSave(false)} saveLabel="Save Booking" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name <span className="text-destructive">*</span></label>
          <CustomerSelect className="pos-input w-full" value={customerName} onChange={setCustomerName} placeholder="Required" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Booking Type</label>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button key={t} className={`toggle-btn flex-1 ${bookingType === t ? "toggle-btn-active" : ""}`} onClick={() => setBookingType(t)}>{t}</button>
            ))}
          </div>
          {isExclusive && <p className="text-xs text-muted-foreground mt-1">Exclusive Fee: {formatPeso(exclusiveFee)}</p>}
        </div>

        {!isExclusive && (
          <div>
            <label className="text-sm font-medium block mb-2">Stay Type</label>
            <div className="flex gap-2">
              {(["Day Tour", "Overnight"] as const).map((t) => (
                <button key={t} className={`toggle-btn flex-1 ${stayType === t ? "toggle-btn-active" : ""}`} onClick={() => setStayType(t)}>{t}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Using {stayType} rates from Entrance settings</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Check-in Date & Time</label>
            <input type="datetime-local" className="pos-input w-full" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Check-out Date & Time</label>
            <input type="datetime-local" className="pos-input w-full" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Adults</label>
            <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
            {!isExclusive && a > 0 && <p className="text-xs text-muted-foreground mt-1">{a} × {formatPeso(adultRate)} = {formatPeso(adultFee)}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Kids (8 & above)</label>
            <input type="number" className="pos-input w-full" value={kids8Above} onChange={(e) => setKids8Above(e.target.value)} placeholder="0" min="0" />
            {!isExclusive && k8 > 0 && <p className="text-xs text-muted-foreground mt-1">{k8} × {formatPeso(kids8Rate)} = {formatPeso(k8 * kids8Rate)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Kids (5-7)</label>
            <input type="number" className="pos-input w-full" value={kids5to7} onChange={(e) => setKids5to7(e.target.value)} placeholder="0" min="0" />
            {!isExclusive && k5 > 0 && <p className="text-xs text-muted-foreground mt-1">{k5} × {formatPeso(kids5Rate)} = {formatPeso(k5 * kids5Rate)}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Kids (4 & Below - FREE)</label>
            <input type="number" className="pos-input w-full" value={kids4Below} onChange={(e) => setKids4Below(e.target.value)} placeholder="0" min="0" />
            {k4 > 0 && <p className="text-xs text-success mt-1">FREE</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Add Rooms (Optional)</label>
            <div className="flex flex-col gap-2">
              {ROOM_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border"
                    checked={selectedRooms.includes(r)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRooms(prev => [...prev, r]);
                      else setSelectedRooms(prev => prev.filter(x => x !== r));
                    }}
                  />
                  {r} <span className="text-muted-foreground text-xs">({formatPeso(r === "Kubo Room" ? kuboRate : barkadaRate)}/day)</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">No. of Days (Rooms)</label>
            <input type="number" min="1" step="1" className="pos-input w-full" value={noOfDays} onChange={(e) => setNoOfDays(e.target.value)} placeholder="1" />
            {roomFee > 0 && <p className="text-xs text-primary mt-1">Room Total: {formatPeso(roomFee)}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Function Hall Fee (Optional / one-off)</label>
          <input type="number" step="0.01" className="pos-input w-full" value={functionHallFee} onChange={(e) => setFunctionHallFee(e.target.value)} placeholder="0.00" min="0" />
        </div>

        <div className="pos-card border-primary/20 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={withFunctionHall} onChange={(e) => setWithFunctionHall(e.target.checked)} />
            <span className="text-sm font-medium">With Function Hall (per-day rental)</span>
          </label>
          {withFunctionHall && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Days</label>
                <input type="number" min="0" step="1" className="pos-input w-full" value={functionHallDays} onChange={(e) => setFunctionHallDays(e.target.value)} placeholder="Auto from dates" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Rate / day</label>
                <input type="number" min="0" step="0.01" className="pos-input w-full" value={functionHallRate} onChange={(e) => setFunctionHallRate(e.target.value)} placeholder={funcHallSettingRate.toString()} />
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                Function Hall Total: <strong className="text-primary">{formatPeso(functionHallTotal)}</strong>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Tables (Optional)</label>
          <input type="number" className="pos-input w-full" value={addOnTables} onChange={(e) => setAddOnTables(e.target.value)} placeholder="0" min="0" />
          {numTables > 0 && <p className="text-xs text-muted-foreground mt-1">{numTables} × {formatPeso(tableRate)} = {formatPeso(tableFee)}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Maintenance Fee (Optional)</label>
            <input type="number" step="0.01" className="pos-input w-full" value={maintenanceFee} onChange={(e) => setMaintenanceFee(e.target.value)} placeholder="0.00" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Discount Amount</label>
            <input type="number" step="0.01" className="pos-input w-full" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="0.00" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Drinks Corkage Fee</label>
            <input type="number" step="0.01" className="pos-input w-full" value={drinksCorkage} onChange={(e) => setDrinksCorkage(e.target.value)} placeholder="0.00" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Liquor Corkage Fee</label>
            <input type="number" step="0.01" className="pos-input w-full" value={liquorCorkage} onChange={(e) => setLiquorCorkage(e.target.value)} placeholder="0.00" min="0" />
          </div>
        </div>

        <div className="pos-card border-primary/30">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-primary tabular-nums">{formatPeso(total)}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            {isExclusive && <p>Exclusive Fee: {formatPeso(exclusiveFee)}</p>}
            {!isExclusive && adultFee > 0 && <p>Adults ({a}): {formatPeso(adultFee)}</p>}
            {!isExclusive && k8 > 0 && <p>Kids 8+ ({k8}): {formatPeso(k8 * kids8Rate)}</p>}
            {!isExclusive && k5 > 0 && <p>Kids 5-7 ({k5}): {formatPeso(k5 * kids5Rate)}</p>}
            {k4 > 0 && <p>Kids 4↓ ({k4}): FREE</p>}
            {roomFee > 0 && <p>+ Rooms: {formatPeso(roomFee)}</p>}
            {funcHall > 0 && <p>+ Function Hall Fee: {formatPeso(funcHall)}</p>}
            {functionHallTotal > 0 && <p>+ Function Hall ({fhDays}d × {formatPeso(fhRate)}): {formatPeso(functionHallTotal)}</p>}
            {tableFee > 0 && <p>+ {numTables} table(s): {formatPeso(tableFee)}</p>}
            {corkage > 0 && <p>+ Maintenance: {formatPeso(corkage)}</p>}
            {drinksCork > 0 && <p>+ Drinks Corkage: {formatPeso(drinksCork)}</p>}
            {liquorCork > 0 && <p>+ Liquor Corkage: {formatPeso(liquorCork)}</p>}
            {discount > 0 && <p className="text-success">− Discount: {formatPeso(discount)}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Deposit Amount</label>
          <input type="number" step="0.01" className="pos-input w-full" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" min="0" />
        </div>

        <div className={`pos-card ${paymentStatus === "Fully Paid" ? "border-success/30 bg-success/5" : paymentStatus === "Partially Paid" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold tabular-nums ${paymentStatus === "Fully Paid" ? "text-success" : paymentStatus === "Partially Paid" ? "text-warning" : "text-destructive"}`}>
                {formatPeso(Math.max(0, balance))}
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

      </ModuleShell>
    </>
  );
}
