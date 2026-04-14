import { useState, useCallback, useEffect, useRef } from "react";
import { DoorOpen, Sun, Moon } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import PaymentSuccessDialog from "@/components/PaymentSuccessDialog";
import ReceiptPrintDialog from "@/components/ReceiptPrintDialog";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { formatPeso } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const TOUR_TYPES = ["Day Tour", "Overnight"] as const;

function getAutoTourType(): "Day Tour" | "Overnight" {
  return new Date().getHours() < 15 ? "Day Tour" : "Overnight";
}

export default function EntranceModule() {
  const [customerName, setCustomerName] = useState("");
  const [adults, setAdults] = useState("");
  const [kids8Above, setKids8Above] = useState("");
  const [kids5to7, setKids5to7] = useState("");
  const [kids4Below, setKids4Below] = useState("");
  const [tourType, setTourType] = useState<string>(getAutoTourType());
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [tableQty, setTableQty] = useState("");
  const [discount, setDiscount] = useState("");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [successChange, setSuccessChange] = useState<number | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const shownAutoDetect = useRef(false);

  const [dayAdultRate, setDayAdultRate] = useState(100);
  const [dayKids8Rate, setDayKids8Rate] = useState(50);
  const [dayKids5Rate, setDayKids5Rate] = useState(30);
  const [overnightAdultRate, setOvernightAdultRate] = useState(150);
  const [overnightKids8Rate, setOvernightKids8Rate] = useState(75);
  const [overnightKids5Rate, setOvernightKids5Rate] = useState(50);
  const [tableRentRate, setTableRentRate] = useState(200);

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    getSettings().then((s) => {
      setDayAdultRate(s.adult_rate_day);
      setDayKids8Rate(s.kids_8_above_rate_day ?? s.child_rate_day);
      setDayKids5Rate(s.kids_5_7_rate_day ?? Math.round(s.child_rate_day * 0.6));
      setOvernightAdultRate(s.adult_rate_night);
      setOvernightKids8Rate(s.kids_8_above_rate_night ?? s.child_rate_night);
      setOvernightKids5Rate(s.kids_5_7_rate_night ?? Math.round(s.child_rate_night * 0.6));
      setTableRentRate(s.table_rent_rate);
    });
  }, []);

  useEffect(() => {
    if (!shownAutoDetect.current) {
      shownAutoDetect.current = true;
      const auto = getAutoTourType();
      if (auto === "Day Tour") {
        toast.info("AUTO DETECT: Day Tour (Before 3PM)", { icon: <Sun size={18} /> });
      } else {
        toast.info("AUTO DETECT: Overnight (After 3PM)", { icon: <Moon size={18} /> });
      }
    }
  }, []);

  useEffect(() => {
    if (tourType !== "Day Tour") return;
    const check = () => {
      if (new Date().getHours() >= 22) {
        toast.warning("⚠️ TIME LIMIT: Day Tour exceeded 10PM", { duration: 10000 });
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [tourType]);

  const a = parseInt(adults) || 0;
  const k8 = parseInt(kids8Above) || 0;
  const k5 = parseInt(kids5to7) || 0;
  const k4 = parseInt(kids4Below) || 0;
  const tblQty = parseInt(tableQty) || 0;
  const discountVal = parseFloat(discount) || 0;
  const headcount = a + k8 + k5 + k4;
  const received = parseFloat(amountReceived) || 0;

  const isDayTour = tourType === "Day Tour";
  const baseAmount = isDayTour
    ? (a * dayAdultRate) + (k8 * dayKids8Rate) + (k5 * dayKids5Rate)
    : (a * overnightAdultRate) + (k8 * overnightKids8Rate) + (k5 * overnightKids5Rate);

  const tableFee = tblQty * tableRentRate;
  const totalAmount = Math.max(0, baseAmount + tableFee - discountVal);

  const change = received - totalAmount;

  const handleSave = useCallback(async () => {
    if (headcount === 0) { toast.error("Please enter guest details"); return; }
    if (received < totalAmount && received > 0) { toast.error("Insufficient amount received"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Entrance",
        customer_name: customerName || undefined,
        adults: a, children: k8 + k5 + k4,
        total_headcount: headcount,
        amount_paid: totalAmount,
        payment_method: payment,
        tour_type: tourType,
        entry_time: now,
        kids_8_above: k8,
        kids_5_7: k5,
        kids_4_below: k4,
        number_of_tables: tblQty > 0 ? tblQty : undefined,
      });
      toast.success("Entrance recorded!");

      const rData = {
        transactionNo: txNo, dateTime: now, module: `Entrance - ${tourType}`,
        customerName: customerName || undefined,
        adults: a, children: k8 + k5 + k4, headcount,
        totalAmount, amountReceived: received > 0 ? received : undefined,
        change: received >= totalAmount && received > 0 ? change : undefined,
        paymentMethod: payment,
        details: [
          ...(tblQty > 0 ? [{ label: "Table Rental", value: `${tblQty} × ${formatPeso(tableRentRate)} = ${formatPeso(tableFee)}` }] : []),
          ...(discountVal > 0 ? [{ label: "Discount", value: `-${formatPeso(discountVal)}` }] : []),
        ],
      };

      if (received >= totalAmount && received > 0) {
        setSuccessChange(change);
      }
      setReceiptData(rData);

      setCustomerName(""); setAdults(""); setKids8Above(""); setKids5to7(""); setKids4Below("");
      setAmountReceived(""); setTableQty(""); setDiscount(""); setTourType(getAutoTourType());
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, a, k8, k5, k4, headcount, totalAmount, payment, tourType, received, change, tblQty, tableFee, discountVal, tableRentRate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const rateLabel = (count: number, rate: number) =>
    count > 0 ? `${count} × ${formatPeso(rate)} = ${formatPeso(count * rate)}` : null;

  return (
    <>
      {successChange !== null && <PaymentSuccessDialog change={successChange} onClose={() => setSuccessChange(null)} />}
      {receiptData && !successChange && <ReceiptPrintDialog data={receiptData} onClose={() => setReceiptData(null)} />}
      <ModuleShell title="Entrance" icon={<DoorOpen size={20} />} onSave={handleSave} saveLabel="Record Entry" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>

        <div className="flex items-center gap-3">
          <Switch id="manual-dt" checked={useManualDatetime} onCheckedChange={setUseManualDatetime} />
          <Label htmlFor="manual-dt" className="text-sm cursor-pointer">Manual Date/Time Override</Label>
        </div>
        {useManualDatetime && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" className="pos-input w-full" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Time</label>
              <input type="time" className="pos-input w-full" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-2">Tour Type</label>
          <div className="flex gap-2">
            {TOUR_TYPES.map((t) => (
              <button
                key={t}
                className={`toggle-btn flex-1 flex items-center justify-center gap-2 ${tourType === t ? "toggle-btn-active" : ""}`}
                onClick={() => setTourType(t)}
              >
                {t === "Day Tour" ? <Sun size={16} /> : <Moon size={16} />}
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-detected: {getAutoTourType()} ({new Date().getHours() < 15 ? "Before" : "After"} 3PM)
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Adults</label>
          <input type="number" className="pos-input w-full" value={adults} onChange={(e) => setAdults(e.target.value)} placeholder="0" min="0" />
          {a > 0 && <p className="text-xs text-muted-foreground mt-1">{rateLabel(a, isDayTour ? dayAdultRate : overnightAdultRate)}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Kids (8 & Above)</label>
          <input type="number" className="pos-input w-full" value={kids8Above} onChange={(e) => setKids8Above(e.target.value)} placeholder="0" min="0" />
          {k8 > 0 && <p className="text-xs text-muted-foreground mt-1">{rateLabel(k8, isDayTour ? dayKids8Rate : overnightKids8Rate)}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Kids (5-7 yrs)</label>
          <input type="number" className="pos-input w-full" value={kids5to7} onChange={(e) => setKids5to7(e.target.value)} placeholder="0" min="0" />
          {k5 > 0 && <p className="text-xs text-muted-foreground mt-1">{rateLabel(k5, isDayTour ? dayKids5Rate : overnightKids5Rate)}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Kids (4 & Below) — FREE</label>
          <input type="number" className="pos-input w-full" value={kids4Below} onChange={(e) => setKids4Below(e.target.value)} placeholder="0" min="0" />
          {k4 > 0 && <p className="text-xs text-success mt-1">FREE — {k4} kid(s)</p>}
        </div>

        <div className="pos-card">
          <p className="text-sm text-muted-foreground mb-1">Total Headcount</p>
          <p className="text-2xl font-bold tabular-nums">{headcount}</p>
        </div>

        {/* Table Rental */}
        <div>
          <label className="text-sm font-medium block mb-1">Table Rental (Qty)</label>
          <input type="number" className="pos-input w-full" value={tableQty} onChange={(e) => setTableQty(e.target.value)} placeholder="0" min="0" />
          {tblQty > 0 && <p className="text-xs text-muted-foreground mt-1">{tblQty} × {formatPeso(tableRentRate)} = {formatPeso(tableFee)}</p>}
        </div>

        {/* Discount */}
        <div>
          <label className="text-sm font-medium block mb-1">Discount</label>
          <input type="number" step="0.01" className="pos-input w-full" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" min="0" />
          {discountVal > 0 && <p className="text-xs text-success mt-1">-{formatPeso(discountVal)} discount applied</p>}
        </div>

        <div className="pos-card border-primary/30">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-primary tabular-nums">{formatPeso(totalAmount)}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            {a > 0 && <p>Adults: {rateLabel(a, isDayTour ? dayAdultRate : overnightAdultRate)}</p>}
            {k8 > 0 && <p>Kids 8+: {rateLabel(k8, isDayTour ? dayKids8Rate : overnightKids8Rate)}</p>}
            {k5 > 0 && <p>Kids 5-7: {rateLabel(k5, isDayTour ? dayKids5Rate : overnightKids5Rate)}</p>}
            {k4 > 0 && <p>Kids 4 & below: FREE</p>}
            {tblQty > 0 && <p>Table Rental: {tblQty} × {formatPeso(tableRentRate)} = {formatPeso(tableFee)}</p>}
            {discountVal > 0 && <p className="text-success">Discount: -{formatPeso(discountVal)}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Amount Received</label>
          <input type="number" step="0.01" className="pos-input w-full text-lg font-bold" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0.00" min="0" />
        </div>

        {received > 0 && totalAmount > 0 && (
          <div className={`pos-card ${received >= totalAmount ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-sm text-muted-foreground mb-1">Change</p>
            <p className={`text-2xl font-bold tabular-nums ${received >= totalAmount ? "text-success" : "text-destructive"}`}>
              {formatPeso(change)}
            </p>
          </div>
        )}
      </ModuleShell>
    </>
  );
}
