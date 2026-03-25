import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeTicketProps {
  transactionNo: string;
  module: string;
  dateTime: string;
  amount: number;
  customerName?: string;
  onClose: () => void;
}

export default function BarcodeTicket({ transactionNo, module, dateTime, amount, customerName, onClose }: BarcodeTicketProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, transactionNo, {
        format: "CODE128",
        width: 1.5,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 4,
      });
    }
  }, [transactionNo]);

  const fmtDate = new Date(dateTime).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const handlePrint = () => {
    if (!ticketRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; margin: 0; }
        .ticket { max-width: 300px; margin: 0 auto; }
        h3 { margin: 4px 0; font-size: 14px; }
        p { margin: 2px 0; font-size: 12px; }
        hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
        svg { max-width: 100%; }
      </style></head><body>
      ${ticketRef.current.innerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div ref={ticketRef} className="text-center space-y-2">
          <h3 className="text-sm font-bold text-foreground">SERENITY INLAND RESORT</h3>
          <p className="text-xs text-muted-foreground">{module}</p>
          <hr className="border-dashed border-border" />
          {customerName && <p className="text-xs">{customerName}</p>}
          <p className="text-xs text-muted-foreground">{fmtDate}</p>
          <p className="text-lg font-bold tabular-nums">₱{amount.toLocaleString()}</p>
          <hr className="border-dashed border-border" />
          <svg ref={barcodeRef} className="mx-auto" />
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all">
            Print Ticket
          </button>
          <button onClick={onClose} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 active:scale-95 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
