import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Printer, X } from "lucide-react";
import { getTransactions, type Transaction } from "@/lib/db";

function formatDateLabel(d: Date) {
  return `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  return { startDay, totalDays };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COLORS = [
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-blue-100 border-blue-300 text-blue-800",
];

function getColor(i: number) {
  return COLORS[i % COLORS.length];
}

/** Return array of day-of-month numbers a booking spans within [monthStart, monthEnd] */
function getBookingDays(b: Transaction, year: number, month: number, totalDays: number): number[] {
  const start = b.check_in ? new Date(b.check_in) : new Date(b.date_time);
  const end = b.check_out ? new Date(b.check_out) : start;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, totalDays, 23, 59, 59);

  const from = start < monthStart ? 1 : start.getDate();
  const to = end > monthEnd ? totalDays : end.getDate();

  const days: number[] = [];
  for (let d = from; d <= to; d++) days.push(d);
  return days;
}

export default function ReservationBoard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const fromDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const toDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const loadBookings = () => {
    getTransactions({ module: "Booking", dateFrom: fromDate, dateTo: toDate }).then(setBookings);
  };

  useEffect(() => { loadBookings(); }, [fromDate, toDate]);

  const { startDay, totalDays } = getMonthDays(year, month);

  // Build color map
  let colorIdx = 0;
  const colorMap = new Map<number, string>();
  bookings.forEach(b => {
    if (b.id && !colorMap.has(b.id)) {
      colorMap.set(b.id, getColor(colorIdx++));
    }
  });

  // Map bookings to days (supports multi-day spans)
  const bookingsByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    bookings.forEach((b) => {
      const days = getBookingDays(b, year, month, totalDays);
      days.forEach(d => {
        if (!map[d]) map[d] = [];
        // avoid duplicates per day
        if (!map[d].some(x => x.id === b.id)) map[d].push(b);
      });
    });
    return map;
  }, [bookings, year, month, totalDays]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthLabel = new Date(year, month).toLocaleString("en-US", { month: "long", year: "numeric" });
  const rangeLabel = `${formatDateLabel(new Date(year, month, 1))} - ${formatDateLabel(new Date(year, month + 1, 0))}`;

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;
    const calHTML = document.getElementById("reservation-board-print")?.outerHTML || "";
    w.document.write(`<html><head><title>Reservation Board</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ccc; padding: 4px; vertical-align: top; font-size: 11px; min-height: 80px; }
        th { background: #f5f5f5; text-align: center; font-size: 12px; }
        h2, h3 { text-align: center; margin: 4px 0; }
        .booking-chip { padding: 2px 4px; margin: 1px 0; border-radius: 3px; font-size: 9px; border-left: 3px solid; }
      </style>
    </head><body>
      <h2>INLAND RESORT – Reservation Board</h2>
      <h3>${rangeLabel}</h3>
      ${calHTML}
      <script>window.print();</script>
    </body></html>`);
    w.document.close();
  };

  const fmtDT = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-primary" />
          <h3 className="text-lg font-bold text-foreground">Monthly Reservation Board</h3>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">
          <Printer size={14} /> Print / PDF
        </button>
      </div>

      {/* Month Nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">← Prev</button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <button onClick={nextMonth} className="px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">Next →</button>
        <span className="text-sm text-muted-foreground ml-auto">{bookings.length} reservations</span>
      </div>

      {/* Calendar Grid */}
      <div id="reservation-board-print" className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="text-center py-3 border-b border-border bg-muted/30">
          <p className="font-bold text-foreground">INLAND RESORT – Reservation Board</p>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} className="border border-border px-2 py-2 text-center font-semibold text-foreground bg-muted/50 w-[14.28%]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  const dayBookings = day ? (bookingsByDay[day] || []) : [];
                  return (
                    <td key={di} className="border border-border p-1 align-top h-24 relative">
                      {day && (
                        <>
                          <span className="text-xs font-medium text-muted-foreground">{day}</span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayBookings.map((b, bi) => (
                              <button
                                key={bi}
                                onClick={() => setSelected(b)}
                                className={`block w-full text-left px-1.5 py-0.5 rounded border-l-[3px] text-[10px] leading-tight cursor-pointer hover:opacity-80 transition-opacity ${colorMap.get(b.id!) || COLORS[0]}`}
                              >
                                <p className="font-semibold truncate">{b.customer_name || "Guest"}</p>
                                <p className="opacity-70">{b.booking_type || "Booking"}</p>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selected.customer_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selected.booking_type || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span className="font-medium">{fmtDT(selected.check_in)}{selected.check_in && <span className="text-[10px] ml-1 opacity-60">{new Date(selected.check_in).toLocaleTimeString()}</span>}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span className="font-medium">{fmtDT(selected.check_out)}{selected.check_out && <span className="text-[10px] ml-1 opacity-60">{new Date(selected.check_out).toLocaleTimeString()}</span>}</span></div>
              {selected.tour_type && <div className="flex justify-between"><span className="text-muted-foreground">Tour</span><span className="font-medium">{selected.tour_type}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Adults</span><span className="font-medium">{selected.adults}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Children</span><span className="font-medium">{selected.children}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Headcount</span><span className="font-medium">{selected.total_headcount}</span></div>
              {selected.room_type && <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span className="font-medium">{selected.room_type}</span></div>}
              {selected.number_of_tables && <div className="flex justify-between"><span className="text-muted-foreground">Tables</span><span className="font-medium">{selected.number_of_tables}</span></div>}
              {selected.corkage_fee && <div className="flex justify-between"><span className="text-muted-foreground">Corkage</span><span className="font-medium">₱{selected.corkage_fee.toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold text-primary">₱{selected.amount_paid.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{selected.payment_method}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
