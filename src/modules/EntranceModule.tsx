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
  const [tentRate, setTentRate] = useState(300);
  const [withTent, setWithTent] = useState(false);
  const [funcHallRate, setFuncHallRate] = useState(1500);
  const [withFunctionHall, setWithFunctionHall] = useState(false);
  const [funcHallDays, setFuncHallDays] = useState("1");
  const [maintenanceFee, setMaintenanceFee] = useState("");
  const [drinksCorkage, setDrinksCorkage] = useState("");
  const [liquorCorkage, setLiquorCorkage] = useState("");

  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    getSettings().then((s) => {
      setDayAdultRate(s.adult_rate_day);
      setDayKids8Rate(s.kids_8_above_rate_day ?? s.child_rate_day);
      setDayKids5Rate(s.kids_5_7_rate_day ?? Math.round(s.child_rate_day * 0.6));
      setOvernightAdultRate(s.adult_rate_night);
      setOvernightKids8Rate(s.kids_8_above_rate_night ?? s.child_rate_night);
      setOvernightKids5Rate(s.kids_5_7_rate_night ?? Math.round(s.child_rate_night * 0.6));
      setTentRate(s.tent_rate ?? 300);
      setFuncHallRate(s.function_hall_rate_per_day ?? 1500);
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
  const discountVal = parseFloat(discount) || 0;
  const headcount = a + k8 + k5 + k4;
  const received = parseFloat(amountReceived) || 0;

  const isDayTour = tourType === "Day Tour";
  const baseAmount = isDayTour
    ? (a * dayAdultRate) + (k8 * dayKids8Rate) + (k5 * dayKids5Rate)
    : (a * overnightAdultRate) + (k8 * overnightKids8Rate) + (k5 * overnightKids5Rate);

  const tentAddon = withTent ? tentRate : 0;
  const fhDays = Math.max(0, parseFloat(funcHallDays) || 0);
  const functionHallTotal = withFunctionHall ? fhDays * funcHallRate : 0;
  const maint = parseFloat(maintenanceFee) || 0;
  const drinksCork = parseFloat(drinksCorkage) || 0;
  const liquorCork = parseFloat(liquorCorkage) || 0;
  const totalAmount = Math.max(0, baseAmount + tentAddon + functionHallTotal + maint + drinksCork + liquorCork - discountVal);

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
        with_function_hall: withFunctionHall,
        function_hall_days: withFunctionHall ? fhDays : 0,
        function_hall_rate: withFunctionHall ? funcHallRate : 0,
        function_hall_total: functionHallTotal,
        maintenance_fee: maint,
        drinks_corkage_fee: drinksCork,
        liquor_corkage_fee: liquorCork,
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
          ...(withTent ? [{ label: "With Tent", value: `+${formatPeso(tentRate)}` }] : []),
          ...(functionHallTotal > 0 ? [{ label: `Function Hall (${fhDays}d × ${formatPeso(funcHallRate)})`, value: `+${formatPeso(functionHallTotal)}` }] : []),
          ...(discountVal > 0 ? [{ label: "Discount", value: `-${formatPeso(discountVal)}` }] : []),
        ],
      };

      if (received >= totalAmount && received > 0) {
        setSuccessChange(change);
      }
      setReceiptData(rData);

      setCustomerName(""); setAdults(""); setKids8Above(""); setKids5to7(""); setKids4Below("");
      setAmountReceived(""); setDiscount(""); setTourType(getAutoTourType());
      setWithTent(false);
      setWithFunctionHall(false); setFuncHallDays("1");
      setMaintenanceFee(""); setDrinksCorkage(""); setLiquorCorkage("");
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, a, k8, k5, k4, headcount, totalAmount, payment, tourType, received, change, discountVal, withTent, tentRate, useManualDatetime, customDate, customTime, withFunctionHall, fhDays, funcHallRate, functionHallTotal, maint, drinksCork, liquorCork]);

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

        {/* With Tent */}
        <div className="flex items-center justify-between gap-3 pos-card">
          <div>
            <Label htmlFor="with-tent" className="text-sm font-medium cursor-pointer">With Tent</Label>
            <p className="text-xs text-muted-foreground">Adds {formatPeso(tentRate)} to total</p>
          </div>
          <Switch id="with-tent" checked={withTent} onCheckedChange={setWithTent} />
        </div>

        {/* With Function Hall */}
        <div className="pos-card space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="with-fh" className="text-sm font-medium cursor-pointer">With Function Hall</Label>
              <p className="text-xs text-muted-foreground">Rate: {formatPeso(funcHallRate)}/day</p>
            </div>
            <Switch id="with-fh" checked={withFunctionHall} onCheckedChange={setWithFunctionHall} />
          </div>
          {withFunctionHall && (
            <div>
              <label className="text-xs font-medium block mb-1">Days</label>
              <input type="number" min="0" step="1" className="pos-input w-full" value={funcHallDays} onChange={(e) => setFuncHallDays(e.target.value)} placeholder="1" />
              <p className="text-xs text-primary mt-1">Function Hall Total: {formatPeso(functionHallTotal)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium block mb-1">Maintenance Fee</label>
            <input type="number" step="0.01" className="pos-input w-full" value={maintenanceFee} onChange={(e) => setMaintenanceFee(e.target.value)} placeholder="0.00" min="0" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Drinks Corkage</label>
            <input type="number" step="0.01" className="pos-input w-full" value={drinksCorkage} onChange={(e) => setDrinksCorkage(e.target.value)} placeholder="0.00" min="0" />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Liquor Corkage</label>
            <input type="number" step="0.01" className="pos-input w-full" value={liquorCorkage} onChange={(e) => setLiquorCorkage(e.target.value)} placeholder="0.00" min="0" />
          </div>
        </div>

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
            {withTent && <p>With Tent: +{formatPeso(tentRate)}</p>}
            {functionHallTotal > 0 && <p>Function Hall ({fhDays}d × {formatPeso(funcHallRate)}): +{formatPeso(functionHallTotal)}</p>}
            {maint > 0 && <p>Maintenance: +{formatPeso(maint)}</p>}
            {drinksCork > 0 && <p>Drinks Corkage: +{formatPeso(drinksCork)}</p>}
            {liquorCork > 0 && <p>Liquor Corkage: +{formatPeso(liquorCork)}</p>}
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
