import { useState, useCallback, useEffect, useRef } from "react";
import { BedDouble, Clock, AlertTriangle, LogOut } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getSettings, getTransactions, updateTransaction } from "@/lib/db";
import { toast } from "sonner";

const ROOM_TYPES = ["Kubo Room", "Barkada Room"] as const;
const PAX_LIMITS: Record<string, number> = { "Kubo Room": 10, "Barkada Room": 20 };
const EXTENSION_RATE = 10;

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
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [roomRate, setRoomRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [now, setNow] = useState(Date.now());
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

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
        pax: t.pax || 0, entry_time: t.entry_time!, checkout_time: t.checkout_time, amount_paid: t.amount_paid,
      }))
    );
  }, []);

  useEffect(() => { loadActiveRooms(); }, [loadActiveRooms]);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(interval); }, []);

  const paxNum = parseInt(pax) || 0;
  const paxLimit = PAX_LIMITS[roomType] || 20;
  const received = parseFloat(amountReceived) || 0;

  const getHoursStayed = (entryTime: string) => Math.max(0, Math.floor((now - new Date(entryTime).getTime()) / (1000 * 60 * 60)));
  const getExtensionFee = (entryTime: string, paxCount: number) => paxCount * getHoursStayed(entryTime) * EXTENSION_RATE;

  const totalRoomAmount = roomRate;
  const change = received - totalRoomAmount;

  const handleSave = useCallback(async () => {
    if (paxNum === 0) { toast.error("Enter number of pax"); return; }
    if (paxNum > paxLimit) { toast.error(`PAX LIMIT: Max ${paxLimit} pax only for ${roomType}`); return; }
    if (received < totalRoomAmount && received > 0) { toast.error("Insufficient amount received"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const entryTime = new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo, date_time: entryTime, module: "Room",
        customer_name: customerName || undefined, room_type: roomType,
        pax: paxNum, adults: 0, children: 0,
        total_headcount: paxNum,
        amount_paid: totalRoomAmount, payment_method: payment, entry_time: entryTime,
      });
      toast.success("Room check-in recorded!");

      const rData = {
        transactionNo: txNo, dateTime: entryTime, module: `Room - ${roomType}`,
        customerName: customerName || undefined,
        adults: 0, children: 0, headcount: paxNum,
        totalAmount: totalRoomAmount, amountReceived: received > 0 ? received : undefined,
        change: received >= totalRoomAmount && received > 0 ? change : undefined,
        paymentMethod: payment,
        details: [{ label: "Room Type", value: roomType }, { label: "Room Rate", value: `₱${roomRate.toLocaleString()}` }],
      };

      if (received >= totalRoomAmount && received > 0) setSuccessChange(change);
      setReceiptData(rData);

      setCustomerName(""); setPax(""); setAmountReceived("");
      loadActiveRooms(); firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, roomType, paxNum, paxLimit, totalRoomAmount, payment, loadActiveRooms, received, change, roomRate]);

  const handleCheckout = useCallback(async (room: ActiveRoom) => {
    const checkoutTime = new Date().toISOString();
    const extensionFee = getExtensionFee(room.entry_time, room.pax);
    const totalAmount = room.amount_paid + extensionFee;
    try {
      await updateTransaction(room.id, { checkout_time: checkoutTime, extension_fee: extensionFee, amount_paid: totalAmount });
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
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => setSuccessChange(null)} />}
      {receiptData && !successChange && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
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
          <p className="text-sm font-bold text-primary">Total: ₱{roomRate.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Max {paxLimit} pax • Extension: ₱{EXTENSION_RATE}/pax/hr</p>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Number of Pax</label>
          <input type="number" className="pos-input w-full" value={pax} onChange={(e) => setPax(e.target.value)} placeholder="0" min="0" />
        </div>
        {paxNum > paxLimit && (
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
          <input type="number" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
        </div>
        {received > 0 && totalRoomAmount > 0 && (
          <div className={`pos-card ${received >= totalRoomAmount ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= totalRoomAmount ? "text-success" : "text-destructive"}`}>
              ₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
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
