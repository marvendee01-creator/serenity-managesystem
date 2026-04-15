import { useState, useCallback, useEffect, useRef } from "react";
import { Table2 } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import PaymentToggle from "@/components/PaymentToggle";
import BarcodeTicket from "@/components/BarcodeTicket";
import Stepper from "@/components/Stepper";
import { addTransaction, getSettings } from "@/lib/db";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TableRentModule() {
  const [customerName, setCustomerName] = useState("");
  const [tables, setTables] = useState("");
  const [rate, setRate] = useState(200);
  const [adults, setAdults] = useState(0);
  const [kids8Above, setKids8Above] = useState(0);
  const [kids5to7, setKids5to7] = useState(0);
  const [kids4Below, setKids4Below] = useState(0);
  const [payment, setPayment] = useState<"Cash" | "GCash">("Cash");
  const [useManualDatetime, setUseManualDatetime] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<{ txNo: string; date: string; amount: number } | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => { getSettings().then((s) => setRate(s.table_rent_rate)); }, []);

  const numTables = parseInt(tables) || 0;
  const total = numTables * rate;
  const storeIncome = total * 0.80;
  const budoyShare = total * 0.20;
  const totalHeadcount = adults + kids8Above + kids5to7 + kids4Below;
  const totalChildren = kids8Above + kids5to7 + kids4Below;

  const handleSave = useCallback(async () => {
    if (numTables === 0) { toast.error("Enter number of tables"); return; }
    setSaving(true);
    const txNo = `SR-${Date.now()}`;
    const now = useManualDatetime && customDate
      ? new Date(`${customDate}T${customTime || "00:00"}`).toISOString()
      : new Date().toISOString();
    try {
      await addTransaction({
        transaction_no: txNo,
        date_time: now,
        module: "Table Rent",
        customer_name: customerName || undefined,
        number_of_tables: numTables,
        adults,
        children: totalChildren,
        kids_8_above: kids8Above,
        kids_5_7: kids5to7,
        kids_4_below: kids4Below,
        total_headcount: totalHeadcount,
        amount_paid: total,
        payment_method: payment,
      });
      toast.success("Table rent saved!");
      setTicket({ txNo, date: now, amount: total });
      setCustomerName(""); setTables("");
      setAdults(0); setKids8Above(0); setKids5to7(0); setKids4Below(0);
      setUseManualDatetime(false); setCustomDate(""); setCustomTime("");
      firstRef.current?.focus();
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [customerName, numTables, total, adults, kids8Above, kids5to7, kids4Below, totalHeadcount, totalChildren, payment, useManualDatetime, customDate, customTime]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <>
      <ModuleShell title="Table Rent" icon={<Table2 size={20} />} onSave={handleSave} saveLabel="Record Rent" saving={saving}>
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (Optional)</label>
          <input ref={firstRef} type="text" className="pos-input w-full" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="table-manual-dt" checked={useManualDatetime} onCheckedChange={setUseManualDatetime} />
          <Label htmlFor="table-manual-dt" className="text-sm cursor-pointer">Manual Date/Time Override</Label>
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
          <label className="text-sm font-medium block mb-1">Number of Tables</label>
          <input type="number" className="pos-input w-full" value={tables} onChange={(e) => setTables(e.target.value)} placeholder="0" min="0" />
        </div>
        <div className="pos-card space-y-2">
          <p className="text-sm font-medium mb-1">Headcount (for reporting only)</p>
          <Stepper label="Adults" value={adults} onChange={setAdults} />
          <Stepper label="Kids 8 & Above" value={kids8Above} onChange={setKids8Above} />
          <Stepper label="Kids 5-7" value={kids5to7} onChange={setKids5to7} />
          <Stepper label="Kids 4 & Below (FREE)" value={kids4Below} onChange={setKids4Below} />
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="text-sm font-medium">Total Headcount</span>
            <span className="text-sm font-bold tabular-nums">{totalHeadcount}</span>
          </div>
        </div>
        <div className="pos-card space-y-1">
          <p className="text-sm text-muted-foreground">Rate per table: ₱{rate.toLocaleString()}</p>
          <p className="text-2xl font-bold tabular-nums mt-1">₱{total.toLocaleString()}</p>
          {total > 0 && (
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Store Income (80%)</span>
                <span className="font-semibold tabular-nums text-green-600">₱{storeIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budoy Share (20%)</span>
                <span className="font-semibold tabular-nums text-orange-500">₱{budoyShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Method</label>
          <PaymentToggle value={payment} onChange={setPayment} />
        </div>
      </ModuleShell>
      {ticket && (
        <BarcodeTicket
          transactionNo={ticket.txNo}
          module="Table Rent"
          dateTime={ticket.date}
          amount={ticket.amount}
          customerName={customerName}
          onClose={() => setTicket(null)}
        />
      )}
    </>
  );
}
