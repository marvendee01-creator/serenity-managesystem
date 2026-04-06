import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { getSettings } from "@/lib/db";
import { useState } from "react";
import { Printer, X } from "lucide-react";

interface ReceiptData {
  transactionNo: string;
  dateTime: string;
  module: string;
  customerName?: string;
  adults?: number;
  children?: number;
  headcount?: number;
  totalAmount: number;
  amountReceived?: number;
  change?: number;
  paymentMethod: string;
  paymentStatus?: string;
  details?: { label: string; value: string }[];
}

interface ReceiptPrintDialogProps {
  data: ReceiptData;
  onClose: () => void;
}

export default function ReceiptPrintDialog({ data, onClose }: ReceiptPrintDialogProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [company, setCompany] = useState({ name: "SERENITY INLAND RESORT", address: "", contact: "", tin: "" });

  useEffect(() => {
    getSettings().then(s => {
      setCompany({
        name: s.company_name || "SERENITY INLAND RESORT",
        address: s.company_address || "",
        contact: s.contact_number || "",
        tin: s.tin_number || "",
      });
    });
  }, []);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, data.transactionNo, {
        format: "CODE128", width: 1.5, height: 50, displayValue: true, fontSize: 12, margin: 4,
      });
    }
  }, [data.transactionNo]);

  const fmtDate = new Date(data.dateTime).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const handlePrint = () => {
    const sep = "------------------------------";
    const lines = [
      company.name,
      company.address ? company.address : null,
      company.contact ? `Contact: ${company.contact}` : null,
      company.tin ? `TIN: ${company.tin}` : null,
      sep,
      `Txn #: ${data.transactionNo}`,
      `Date: ${fmtDate}`,
      `Module: ${data.module}`,
      data.customerName ? `Customer: ${data.customerName}` : null,
      sep,
      "DETAILS:",
      ...(data.details || []).map(d => `${d.label}: ${d.value}`),
      data.adults !== undefined ? `Adults: ${data.adults}` : null,
      data.children !== undefined ? `Children: ${data.children}` : null,
      data.headcount !== undefined ? `Headcount: ${data.headcount}` : null,
      sep,
      `TOTAL: ₱${data.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      data.amountReceived !== undefined ? `CASH: ₱${data.amountReceived.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : null,
      data.change !== undefined ? `CHANGE: ₱${data.change.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : null,
      sep,
      `Payment: ${data.paymentMethod}`,
      data.paymentStatus ? `Status: ${data.paymentStatus}` : null,
      sep,
      "Thank You! Come Again!",
      sep,
    ].filter(Boolean);

    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        .line { margin: 2px 0; white-space: pre-wrap; }
        .center { text-align: center; }
        svg { max-width: 100%; display: block; margin: 8px auto; }
      </style></head><body>
      ${lines.map(l => `<div class="line center">${l}</div>`).join("")}
      <script>window.print();</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-3" onClick={e => e.stopPropagation()}>
        {/* Preview */}
        <div className="text-center space-y-1 font-mono text-xs leading-relaxed">
          <p className="font-bold text-sm">{company.name}</p>
          {company.address && <p>{company.address}</p>}
          {company.contact && <p>Contact: {company.contact}</p>}
          {company.tin && <p>TIN: {company.tin}</p>}
          <hr className="border-dashed border-border" />
          <p>Txn #: {data.transactionNo}</p>
          <p>{fmtDate}</p>
          <p>{data.module}</p>
          {data.customerName && <p>Customer: {data.customerName}</p>}
          <hr className="border-dashed border-border" />
          {data.details?.map((d, i) => <p key={i}>{d.label}: {d.value}</p>)}
          {data.adults !== undefined && <p>Adults: {data.adults}</p>}
          {data.children !== undefined && <p>Children: {data.children}</p>}
          {data.headcount !== undefined && <p>Headcount: {data.headcount}</p>}
          <hr className="border-dashed border-border" />
          <p className="text-base font-bold">TOTAL: ₱{data.totalAmount.toLocaleString()}</p>
          {data.amountReceived !== undefined && <p>CASH: ₱{data.amountReceived.toLocaleString()}</p>}
          {data.change !== undefined && <p>CHANGE: ₱{data.change.toLocaleString()}</p>}
          <hr className="border-dashed border-border" />
          <p>Payment: {data.paymentMethod}</p>
          {data.paymentStatus && <p>Status: {data.paymentStatus}</p>}
          <hr className="border-dashed border-border" />
          <p>Thank You! Come Again!</p>
          <svg ref={barcodeRef} className="mx-auto" />
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all">
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={onClose} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 active:scale-95 transition-all">
            <X size={16} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}
