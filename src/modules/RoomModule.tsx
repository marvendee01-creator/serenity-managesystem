import { useState, useCallback, useEffect, useRef } from "react";
import { BedDouble, Clock, AlertTriangle, LogOut } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import { addTransaction, getSettings, getTransactions, updateTransaction } from "@/lib/db";
import { toast } from "sonner";

const ROOM_TYPES = ["Kubo Room", "Barkada Room"] as const;
const PAX_LIMITS: Record<string, number> = { "Kubo Room": 10, "Barkada Room": 20 };
const EXTENSION_RATE = 10; // ₱10 per pax per hour

interface ActiveRoom {
  id: number;
  customer_name?: string;
  room_type?: string;
  pax: number;
  entry_time: string;
  checkout_time?: string;
  amount_paid: number;
}

export default function RoomModule() {
  const [customerName, setCustomerName] = useState("");
  const [roomType, setRoomType] = useState<string>(ROOM_TYPES[0]);
  const [pax, setPax] = useState("");
  const [adults, setAdults] = useState("");
  const [kids8Above, setKids8Above] = useState("");
  const [kids5to7, setKids5to7] = useState("");
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [roomRate, setRoomRate] = useState(0);
  const [adultRate, setAdultRate] = useState(100);
  const [kids8Rate, setKids8Rate] = useState(50);
  const [kids5Rate, setKids5Rate] = useState(30);
  const [saving, setSaving] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [now, setNow] = useState(Date.now());
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    getSettings().then((s) => {
      setRoomRate(roomType === "Barkada Room" ? s.barkada_room_rate : s.kubo_room_rate);
      setAdultRate(s.adult_rate_day || 100);
      setKids8Rate(s.kids_8_above_rate_day || 50);
      setKids5Rate(s.kids_5_7_rate_day || 30);
    });
  }, [roomType]);

  // Load active rooms (no checkout_time)
  const loadActiveRooms = useCallback(async () => {
    const txs = await getTransactions({ module: "Room" });
    setActiveRooms(
      txs
        .filter((t) => t.entry_time && !t.checkout_time)
        .map((t) => ({
          id: t.id!,
          customer_name: t.customer_name,
          room_type: t.room_type,
          pax: t.pax || 0,
          entry_time: t.entry_time!,
          checkout_time: t.checkout_time,
          amount_paid: t.amount_paid,
        }))
    );
  }, []);

  useEffect(() => { loadActiveRooms(); }, [loadActiveRooms]);

  // Tick every minute for live hours tracking
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const adultsNum = parseInt(adults) || 0;
  const kids8Num = parseInt(kids8Above) || 0;
  const kids5Num = parseInt(kids5to7) || 0;
  const paxNum = parseInt(pax) || 0;
  const totalPax = paxNum || (adultsNum + kids8Num + kids5Num);
  const paxLimit = PAX_LIMITS[roomType] || 20;
  const headcountFee = (adultsNum * adultRate) + (kids8Num * kids8Rate) + (kids5Num * kids5Rate);

  const getHoursStayed = (entryTime: string) => {
    const diff = now - new Date(entryTime).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  };

  const getExtensionFee = (entryTime: string, paxCount: number) => {
    const hours = getHoursStayed(entryTime);
    return paxCount * hours * EXTENSION_RATE;
  };

  const handleSave = useCallback(async () => {
    if (paxNum === 0) { toast.error("Enter number of pax"); return; }
    if (paxNum > paxLimit) {
      toast.error(`PAX LIMIT: Max ${paxLimit} pax only for ${roomType}`);
      return;
    }
    setSaving(true);
    const entryTime = new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: `SR-${Date.now()}`,
        date_time: entryTime,
        module: "Room",
        customer_name: customerName || undefined,
        room_type: roomType,
        pax: paxNum,
        adults: 0, children: 0,
        total_headcount: paxNum,
        amount_paid: roomRate,
        payment_method: payment,
        entry_time: entryTime,
      });
      toast.success("Room check-in recorded!");
      setCustomerName(""); setPax("");
      loadActiveRooms();
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, roomType, paxNum, paxLimit, roomRate, payment, loadActiveRooms]);

  const handleCheckout = useCallback(async (room: ActiveRoom) => {
    const checkoutTime = new Date().toISOString();
    const extensionFee = getExtensionFee(room.entry_time, room.pax);
    const totalAmount = room.amount_paid + extensionFee;
    try {
      await updateTransaction(room.id, {
        checkout_time: checkoutTime,
        extension_fee: extensionFee,
        amount_paid: totalAmount,
      });
      toast.success(`Checked out! Total: ₱${totalAmount.toLocaleString()}${extensionFee > 0 ? ` (incl. ₱${extensionFee.toLocaleString()} extension)` : ""}`);
      loadActiveRooms();
    } catch { toast.error("Failed to checkout"); }
  }, [now, loadActiveRooms]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
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
        <p className="text-sm text-muted-foreground">Room Rate: ₱{roomRate.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Max {paxLimit} pax • Extension: ₱{EXTENSION_RATE}/pax/hr</p>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Number of Pax</label>
        <input
          type="number"
          className={`pos-input w-full ${paxNum > paxLimit ? "border-destructive" : ""}`}
          value={pax}
          onChange={(e) => setPax(e.target.value)}
          placeholder="0"
          min="0"
        />
        {paxNum > paxLimit && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertTriangle size={12} /> Max {paxLimit} pax only for {roomType}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium block mb-2">Payment Method</label>
        <PaymentToggle value={payment} onChange={setPayment} />
      </div>

      {/* Active Rooms */}
      {activeRooms.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Clock size={14} /> Active Rooms ({activeRooms.length})
          </h3>
          <div className="space-y-2">
            {activeRooms.map((room) => {
              const hours = getHoursStayed(room.entry_time);
              const extFee = getExtensionFee(room.entry_time, room.pax);
              const total = room.amount_paid + extFee;
              return (
                <div key={room.id} className="pos-card border-primary/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{room.customer_name || "Guest"}</p>
                      <p className="text-xs text-muted-foreground">{room.room_type} • {room.pax} pax</p>
                      <p className="text-xs text-muted-foreground">
                        In: {new Date(room.entry_time).toLocaleTimeString()} • {hours}h elapsed
                      </p>
                      {extFee > 0 && (
                        <p className="text-xs text-warning font-medium mt-1">
                          Extension: ₱{extFee.toLocaleString()} ({room.pax} pax × {hours}h × ₱{EXTENSION_RATE})
                        </p>
                      )}
                      <p className="text-sm font-bold mt-1">Total: ₱{total.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleCheckout(room)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                    >
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
  );
}
