import { useState, useCallback, useEffect, useRef } from "react";
import { BedDouble, Clock, AlertTriangle, LogOut } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getSettings, getTransactions, updateTransaction } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";

const ROOM_TYPES = ["Kubo Room", "Barkada Room"] as const;
const PAX_LIMITS: Record<string, number> = { "Kubo Room": 10, "Barkada Room": 20 };
const EXTENSION_RATE_PER_HOUR = 10;
const MAX_EXTENSION_HOURS = 4;

interface ActiveRoom {
  id: number;
  customer_name?: string;
  room_type?: string;
  pax: number;
  entry_time: string;
  check_in?: string;
  check_out?: string; // scheduled checkout
  checkout_time?: string; // actual checkout
  amount_paid: number;
  adults?: number;
  kids_8_above?: number;
  kids_5_7?: number;
  kids_4_below?: number;
}

/* ── Extension Reminder Popup ── */
function ExtendReminderDialog({ room, onExtend, onCheckoutNow }: {
  room: ActiveRoom;
  onExtend: () => void;
  onCheckoutNow: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
        <div className="text-4xl mb-3">⏰</div>
        <h3 className="text-lg font-bold text-warning mb-2">CHECK-OUT REMINDER</h3>
        <p className="text-sm text-muted-foreground mb-1">
          <strong>{room.customer_name || "Guest"}</strong> • {room.room_type}
        </p>
        <p className="text-sm text-foreground mb-4">
          Scheduled check-out is in <strong>less than 1 hour</strong>.<br />
          Would you like to extend the stay?
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Extension rate: {formatPeso(EXTENSION_RATE_PER_HOUR)}/hour (max {MAX_EXTENSION_HOURS} hrs)
        </p>
        <div className="flex gap-3">
          <button onClick={onCheckoutNow} className="flex-1 h-11 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors text-sm">
            Checkout Now
          </button>
          <button onClick={onExtend} className="flex-1 h-11 rounded-lg bg-warning text-warning-foreground font-semibold hover:bg-warning/90 transition-colors text-sm">
            Extend Stay
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Checkout Dialog ── */
function CheckoutDialog({ room, onConfirm, onCancel }: {
  room: ActiveRoom;
  onConfirm: (checkoutISO: string, extensionFee: number, totalAmount: number) => void;
  onCancel: () => void;
}) {
  const [checkOutDate, setCheckOutDate] = useState(getTodayDate);
  const [checkOutTime, setCheckOutTime] = useState(getCurrentTime);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    if (manualOverride) return;
    const interval = setInterval(() => setCheckOutTime(getCurrentTime()), 60000);
    return () => clearInterval(interval);
  }, [manualOverride]);

  const checkoutISO = new Date(`${checkOutDate}T${checkOutTime}`).toISOString();

  // Extension is calculated from scheduled checkout, not entry_time
  const scheduledCheckout = room.check_out ? new Date(room.check_out).getTime() : null;
  const actualCheckoutMs = new Date(checkoutISO).getTime();

  let extensionHours = 0;
  let extensionFee = 0;
  let durationFromEntry = 0;

  if (scheduledCheckout && actualCheckoutMs > scheduledCheckout) {
    const overMs = actualCheckoutMs - scheduledCheckout;
    extensionHours = Math.min(Math.ceil(overMs / (1000 * 60 * 60)), MAX_EXTENSION_HOURS);
    extensionFee = extensionHours * EXTENSION_RATE_PER_HOUR;
  }

  const diffMsEntry = actualCheckoutMs - new Date(room.entry_time).getTime();
  durationFromEntry = Math.max(0, Math.floor(diffMsEntry / (1000 * 60 * 60)));

  const totalAmount = room.amount_paid + extensionFee;

  useEffect(() => {
    if (extensionHours <= 0) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 660; osc.type = "sine"; gain.gain.value = 0.25;
      osc.start();
      setTimeout(() => { osc.frequency.value = 880; }, 200);
      setTimeout(() => { osc.stop(); ctx.close(); }, 400);
    } catch {}
  }, [extensionHours]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground mb-1 text-center">
          {extensionHours > 0 ? "⏰ EXTENSION CHARGES" : "Checkout"}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 text-center">
          {room.customer_name || "Guest"} • {room.room_type} • {room.pax} pax
        </p>

        {/* Checkout Date & Time */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="text-xs font-medium block mb-1">Check-out Date</label>
            <input type="date" className="pos-input w-full text-sm" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Check-out Time</label>
            <input type="time" className="pos-input w-full text-sm" value={checkOutTime}
              onChange={e => { setCheckOutTime(e.target.value); setManualOverride(true); }}
              disabled={!manualOverride} />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="coManualOverride" checked={manualOverride}
            onChange={e => { setManualOverride(e.target.checked); if (!e.target.checked) setCheckOutTime(getCurrentTime()); }}
            className="rounded border-border" />
          <label htmlFor="coManualOverride" className="text-xs text-muted-foreground">Override Time (Manual Input)</label>
        </div>

        {scheduledCheckout && (
          <p className="text-xs text-muted-foreground mb-2 text-center">
            Scheduled checkout: {new Date(scheduledCheckout).toLocaleString()}
          </p>
        )}

        {extensionHours > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-2 text-center">
              Additional <strong>{formatPeso(EXTENSION_RATE_PER_HOUR)}</strong> per hour (max {MAX_EXTENSION_HOURS} hrs).
            </p>
            <div className="pos-card border-warning/30 bg-warning/5 mb-4 text-left">
              <p className="text-xs text-muted-foreground">Extension: {extensionHours}hr × {formatPeso(EXTENSION_RATE_PER_HOUR)}</p>
              <p className="text-lg font-bold text-warning mt-1">Extension Fee: {formatPeso(extensionFee)}</p>
              <p className="text-sm font-bold text-foreground mt-1">New Total: {formatPeso(totalAmount)}</p>
            </div>
          </>
        )}

        {extensionHours === 0 && (
          <div className="pos-card border-primary/20 mb-4 text-left">
            <p className="text-xs text-muted-foreground">Duration: {durationFromEntry}h</p>
            <p className="text-sm font-bold text-foreground mt-1">Total: {formatPeso(totalAmount)}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(checkoutISO, extensionFee, totalAmount)} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors">
            Confirm Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function getCurrentTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function RoomModule() {
  const [customerName, setCustomerName] = useState("");
  const [roomType, setRoomType] = useState<string>(ROOM_TYPES[0]);
  const [adults, setAdults] = useState("");
  const [kids8Above, setKids8Above] = useState("");
  const [kids5to7, setKids5to7] = useState("");
  const [kids4Below, setKids4Below] = useState("");
  const [checkInDate, setCheckInDate] = useState(getTodayDate);
  const [checkInTime, setCheckInTime] = useState(getCurrentTime);
  const [manualOverrideTime, setManualOverrideTime] = useState(false);
  // Scheduled check-out fields
  const [checkOutDate, setCheckOutDate] = useState(getTodayDate);
  const [checkOutTime, setCheckOutTime] = useState("17:00"); // default 5PM
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [discount, setDiscount] = useState("");
  const [roomRate, setRoomRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [now, setNow] = useState(Date.now());
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [checkoutRoom, setCheckoutRoom] = useState<ActiveRoom | null>(null);
  const [reminderRoom, setReminderRoom] = useState<ActiveRoom | null>(null);
  const [dismissedReminders, setDismissedReminders] = useState<Set<number>>(new Set());
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    if (manualOverrideTime) return;
    const interval = setInterval(() => {
      setCheckInTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, [manualOverrideTime]);

  useEffect(() => {
    getSettings().then((s) => {
      setRoomRate(roomType === "Barkada Room" ? s.barkada_room_rate : s.kubo_room_rate);
    });
  }, [roomType]);

  const loadActiveRooms = useCallback(async () => {
    const txs = await getTransactions({ module: "Room" });
    setActiveRooms(
      txs.filter((t) => t.entry_time && !t.checkout_time).map((t) => ({
        id: t.id!, customer_name: t.customer_name, room_type: t.room_type,
        pax: t.pax || 0, entry_time: t.entry_time!, check_in: t.check_in,
        check_out: t.check_out || undefined, checkout_time: t.checkout_time || undefined,
        amount_paid: t.amount_paid,
        adults: t.adults, kids_8_above: t.kids_8_above, kids_5_7: t.kids_5_7, kids_4_below: t.kids_4_below,
      }))
    );
  }, []);

  useEffect(() => { loadActiveRooms(); }, [loadActiveRooms]);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(interval); }, []);

  // ── Auto-popup 1hr before scheduled checkout ──
  useEffect(() => {
    if (reminderRoom || checkoutRoom) return; // don't interrupt existing dialogs
    for (const room of activeRooms) {
      if (!room.check_out || dismissedReminders.has(room.id)) continue;
      const scheduledMs = new Date(room.check_out).getTime();
      const timeUntil = scheduledMs - now;
      // Show reminder when <= 1 hour (60min) before scheduled checkout and not yet past
      if (timeUntil > 0 && timeUntil <= 60 * 60 * 1000) {
        setReminderRoom(room);
        break;
      }
    }
  }, [now, activeRooms, dismissedReminders, reminderRoom, checkoutRoom]);

  const a = parseInt(adults) || 0;
  const k8 = parseInt(kids8Above) || 0;
  const k5 = parseInt(kids5to7) || 0;
  const k4 = parseInt(kids4Below) || 0;
  const totalHeadcount = a + k8 + k5 + k4;
  const paxLimit = PAX_LIMITS[roomType] || 20;
  const received = parseFloat(amountReceived) || 0;

  const getHoursElapsed = (entryTime: string) => {
    const diffMs = now - new Date(entryTime).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  };

  const computeExtensionFromSchedule = (room: ActiveRoom) => {
    const durationHours = getHoursElapsed(room.entry_time);
    if (!room.check_out) return { durationHours, extensionHours: 0, extensionFee: 0 };
    const scheduledMs = new Date(room.check_out).getTime();
    const overMs = now - scheduledMs;
    if (overMs <= 0) return { durationHours, extensionHours: 0, extensionFee: 0 };
    const extensionHours = Math.min(Math.ceil(overMs / (1000 * 60 * 60)), MAX_EXTENSION_HOURS);
    const extensionFee = extensionHours * EXTENSION_RATE_PER_HOUR;
    return { durationHours, extensionHours, extensionFee };
  };

  const totalRoomAmount = roomRate;
  const change = received - totalRoomAmount;

  const handleSave = useCallback(async () => {
    if (totalHeadcount === 0) { toast.error("Enter number of guests"); return; }
    if (totalHeadcount > paxLimit) { toast.error(`PAX LIMIT: Max ${paxLimit} pax only for ${roomType}`); return; }
    if (received < totalRoomAmount && received > 0) { toast.error("Insufficient amount received"); return; }
    if (!checkInDate) { toast.error("Select check-in date"); return; }
    if (!checkOutDate) { toast.error("Select check-out date"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const checkInDateTime = new Date(`${checkInDate}T${checkInTime || getCurrentTime()}`).toISOString();
    const scheduledCheckOutISO = new Date(`${checkOutDate}T${checkOutTime || "17:00"}`).toISOString();
    try {
      await addTransaction({
        transaction_no: txNo, date_time: checkInDateTime, module: "Room",
        customer_name: customerName || undefined, room_type: roomType,
        pax: totalHeadcount, adults: a, children: k8 + k5 + k4,
        kids_8_above: k8, kids_5_7: k5, kids_4_below: k4,
        total_headcount: totalHeadcount,
        amount_paid: totalRoomAmount, payment_method: payment,
        entry_time: checkInDateTime, check_in: checkInDateTime,
        check_out: scheduledCheckOutISO,
      });
      toast.success("Room check-in recorded!");

      const rData = {
        transactionNo: txNo, dateTime: checkInDateTime, module: `Room - ${roomType}`,
        customerName: customerName || undefined,
        adults: a, children: k8 + k5 + k4, headcount: totalHeadcount,
        totalAmount: totalRoomAmount, amountReceived: received > 0 ? received : undefined,
        change: received >= totalRoomAmount && received > 0 ? change : undefined,
        paymentMethod: payment,
        details: [
          { label: "Room Type", value: roomType },
          { label: "Room Rate", value: formatPeso(roomRate) },
          { label: "Check-in", value: `${checkInDate} ${checkInTime}` },
          { label: "Scheduled Check-out", value: `${checkOutDate} ${checkOutTime}` },
          ...(a > 0 ? [{ label: "Adults", value: `${a}` }] : []),
          ...(k8 > 0 ? [{ label: "Kids 8+", value: `${k8}` }] : []),
          ...(k5 > 0 ? [{ label: "Kids 5-7", value: `${k5}` }] : []),
          ...(k4 > 0 ? [{ label: "Kids 4↓ FREE", value: `${k4}` }] : []),
        ],
      };

      if (received >= totalRoomAmount && received > 0) setSuccessChange(change);
      setReceiptData(rData);

      setCustomerName(""); setAdults(""); setKids8Above(""); setKids5to7(""); setKids4Below("");
      setAmountReceived(""); setCheckInDate(getTodayDate()); setCheckInTime(getCurrentTime());
      setCheckOutDate(getTodayDate()); setCheckOutTime("17:00");
      setManualOverrideTime(false);
      loadActiveRooms(); firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, roomType, totalHeadcount, paxLimit, totalRoomAmount, payment, loadActiveRooms, received, change, roomRate, checkInDate, checkInTime, checkOutDate, checkOutTime, a, k8, k5, k4]);

  const handleCheckout = useCallback((room: ActiveRoom) => {
    setCheckoutRoom(room);
  }, []);

  const doCheckout = useCallback(async (checkoutISO: string, extensionFee: number, totalAmount: number) => {
    if (!checkoutRoom) return;
    try {
      await updateTransaction(checkoutRoom.id, {
        checkout_time: checkoutISO,
        extension_fee: extensionFee,
        amount_paid: totalAmount,
      });
      toast.success(`Checked out! Total: ${formatPeso(totalAmount)}${extensionFee > 0 ? ` (incl. ${formatPeso(extensionFee)} extension)` : ""}`);
      setCheckoutRoom(null);
      loadActiveRooms();
    } catch { toast.error("Failed to checkout"); }
  }, [checkoutRoom, loadActiveRooms]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const getTimeRemaining = (scheduledCheckout: string) => {
    const diff = new Date(scheduledCheckout).getTime() - now;
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remainMins}m left` : `${remainMins}m left`;
  };

  return (
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => setSuccessChange(null)} />}
      {receiptData && !successChange && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      {reminderRoom && (
        <ExtendReminderDialog
          room={reminderRoom}
          onExtend={() => {
            setDismissedReminders(prev => new Set(prev).add(reminderRoom.id));
            setReminderRoom(null);
            toast.info("Extension noted. Charges will apply after scheduled checkout.");
          }}
          onCheckoutNow={() => {
            setReminderRoom(null);
            setCheckoutRoom(reminderRoom);
          }}
        />
      )}
      {checkoutRoom && (
        <CheckoutDialog
          room={checkoutRoom}
          onConfirm={doCheckout}
          onCancel={() => setCheckoutRoom(null)}
        />
      )}
      <ModuleShell title="Room" icon={<BedDouble size={20} />} onSave={handleSave} saveLabel="Check In" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Room Type</label>
          <div className="flex gap-2">
            {ROOM_TYPES.map((rt) => (
              <button key={rt} className={`toggle-btn flex-1 ${roomType === rt ? "toggle-btn-active" : ""}`} onClick={() => setRoomType(rt)}>{rt}</button>
            ))}
          </div>
        </div>
        <div className="pos-card">
          <p className="text-sm font-bold text-primary">Total: {formatPeso(roomRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">Max {paxLimit} pax • Extension: {formatPeso(EXTENSION_RATE_PER_HOUR)}/hr (max {MAX_EXTENSION_HOURS}hrs)</p>
        </div>

        {/* Check-in Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Check-in Date</label>
            <input type="date" className="pos-input w-full" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Check-in Time</label>
            <input
              type="time"
              className="pos-input w-full"
              value={checkInTime}
              onChange={(e) => { setCheckInTime(e.target.value); setManualOverrideTime(true); }}
              disabled={!manualOverrideTime}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="manualOverride"
            checked={manualOverrideTime}
            onChange={(e) => {
              setManualOverrideTime(e.target.checked);
              if (!e.target.checked) setCheckInTime(getCurrentTime());
            }}
            className="rounded border-border"
          />
          <label htmlFor="manualOverride" className="text-xs text-muted-foreground">Manual override time</label>
        </div>

        {/* Scheduled Check-out Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Check-out Date</label>
            <input type="date" className="pos-input w-full" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Check-out Time</label>
            <input type="time" className="pos-input w-full" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Set the scheduled check-out. Extension charges apply if exceeded.</p>

        {/* Age group headcount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Adults</label>
            <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Kids (8 & above)</label>
            <input type="number" className="pos-input w-full" value={kids8Above} onChange={(e) => setKids8Above(e.target.value)} placeholder="0" min="0" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Kids (5-7)</label>
            <input type="number" className="pos-input w-full" value={kids5to7} onChange={(e) => setKids5to7(e.target.value)} placeholder="0" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Kids (4 & Below - FREE)</label>
            <input type="number" className="pos-input w-full" value={kids4Below} onChange={(e) => setKids4Below(e.target.value)} placeholder="0" min="0" />
            {k4 > 0 && <p className="text-xs text-success mt-1">FREE</p>}
          </div>
        </div>

        {totalHeadcount > 0 && (
          <div className="pos-card border-primary/20">
            <p className="text-xs text-muted-foreground">Total Headcount: <strong>{totalHeadcount}</strong></p>
          </div>
        )}

        {totalHeadcount > paxLimit && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle size={12} /> Max {paxLimit} pax only for {roomType}
          </p>
        )}
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Amount Received</label>
          <input type="number" step="0.01" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
        </div>
        {received > 0 && totalRoomAmount > 0 && (
          <div className={`pos-card ${received >= totalRoomAmount ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= totalRoomAmount ? "text-success" : "text-destructive"}`}>
              {formatPeso(change)}
            </p>
          </div>
        )}

        {activeRooms.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Clock size={14} /> Active Rooms ({activeRooms.length})
            </h3>
            <div className="space-y-2">
              {activeRooms.map((room) => {
                const { durationHours, extensionHours, extensionFee } = computeExtensionFromSchedule(room);
                const total = room.amount_paid + extensionFee;
                const timeLeft = room.check_out ? getTimeRemaining(room.check_out) : null;
                const isPastSchedule = room.check_out && now > new Date(room.check_out).getTime();
                return (
                  <div key={room.id} className={`pos-card ${isPastSchedule ? "border-destructive/30 bg-destructive/5" : "border-primary/20"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{room.customer_name || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{room.room_type} • {room.pax} pax</p>
                        <p className="text-xs text-muted-foreground">
                          In: {new Date(room.entry_time).toLocaleTimeString()} • {durationHours}h elapsed
                        </p>
                        {room.check_out && (
                          <p className={`text-xs font-medium mt-0.5 ${isPastSchedule ? "text-destructive" : "text-muted-foreground"}`}>
                            Scheduled out: {new Date(room.check_out).toLocaleString()}
                            {timeLeft && <span className="text-warning ml-1">({timeLeft})</span>}
                            {isPastSchedule && <span className="text-destructive ml-1">(OVERDUE)</span>}
                          </p>
                        )}
                        {extensionHours > 0 && (
                          <p className="text-xs text-warning font-medium mt-1">
                            Extension: {formatPeso(extensionFee)} ({extensionHours}h × {formatPeso(EXTENSION_RATE_PER_HOUR)}) {extensionHours >= MAX_EXTENSION_HOURS && "— MAX"}
                          </p>
                        )}
                        <p className="text-sm font-bold mt-1">Total: {formatPeso(total)}</p>
                      </div>
                      <button onClick={() => handleCheckout(room)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors">
                        <LogOut size={14} /> Checkout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ModuleShell>
    </>
  );
}
