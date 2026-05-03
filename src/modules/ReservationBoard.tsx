import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Printer, X, AlertTriangle } from "lucide-react";
import { getTransactions, updateTransaction, type Transaction } from "@/lib/db";
import { toast } from "sonner";

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

const EXCLUSIVE_STYLE = "bg-red-100 border-red-400 text-red-900";
const NON_EXCLUSIVE_STYLE = "bg-blue-100 border-blue-400 text-blue-900";
const DEFAULT_STYLE = "bg-purple-100 border-purple-300 text-purple-800";

function getBookingStyle(b: Transaction): string {
  if (b.booking_type === "Exclusive") return EXCLUSIVE_STYLE;
  if (b.booking_type === "Non-Exclusive") return NON_EXCLUSIVE_STYLE;
  return DEFAULT_STYLE;
}

/** Strip time → local date at 00:00 */
function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Normalize a booking's date range: swap if reversed, default end to start if missing */
function getNormalizedRange(b: Transaction): { start: Date; end: Date } {
  const rawStart = b.check_in ? new Date(b.check_in) : new Date(b.date_time);
  let start = dateOnly(rawStart);
  let end: Date;
  if (!b.check_out) {
    end = start;
  } else {
    end = dateOnly(new Date(b.check_out));
  }
  if (end < start) {
    [start, end] = [end, start];
  }
  return { start, end };
}

/** Return array of day-of-month numbers a booking spans within [monthStart, monthEnd] (continuous span, deduped per day) */
function getBookingDays(b: Transaction, year: number, month: number, totalDays: number): number[] {
  const { start, end } = getNormalizedRange(b);
  const monthStart = dateOnly(new Date(year, month, 1));
  const monthEnd = dateOnly(new Date(year, month, totalDays));

  if (end < monthStart || start > monthEnd) return [];

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
  const [dragging, setDragging] = useState<Transaction | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{ booking: Transaction; targetDate: Date; conflict: boolean } | null>(null);

  const refresh = () => getTransactions({ module: "Booking" }).then(txns => {
    setBookings(txns.filter(t => t.status !== "Cancelled" && t.check_in && t.check_out));
  });

  // Load ALL bookings once (with both check_in & check_out); filter by visible month client-side
  // so multi-month spans render correctly when navigating prev/next.
  useEffect(() => {
    refresh();
  }, []);

  const performMove = async (b: Transaction, targetDate: Date) => {
    if (!b.id || !b.check_in || !b.check_out) return;
    const oldIn = new Date(b.check_in);
    const oldOut = new Date(b.check_out);
    const duration = oldOut.getTime() - oldIn.getTime();
    const newIn = new Date(targetDate);
    newIn.setHours(oldIn.getHours(), oldIn.getMinutes(), 0, 0);
    const newOut = new Date(newIn.getTime() + duration);
    try {
      await updateTransaction(b.id, { check_in: newIn.toISOString(), check_out: newOut.toISOString() });
      toast.success("Booking moved");
      refresh();
    } catch { toast.error("Failed to move"); }
  };

  // Filter bookings whose date range intersects the visible month
  const visibleBookings = useMemo(() => {
    const monthStart = dateOnly(new Date(year, month, 1));
    const monthEnd = dateOnly(new Date(year, month + 1, 0));
    return bookings.filter(b => {
      const { start, end } = getNormalizedRange(b);
      return start <= monthEnd && end >= monthStart;
    });
  }, [bookings, year, month]);

  const { startDay, totalDays } = getMonthDays(year, month);

  // Map bookings to days (supports multi-day spans, deduped per day by booking id)
  const bookingsByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    visibleBookings.forEach((b) => {
      const days = getBookingDays(b, year, month, totalDays);
      days.forEach(d => {
        if (!map[d]) map[d] = [];
        if (!map[d].some(x => x.id === b.id)) map[d].push(b);
      });
    });
    return map;
  }, [visibleBookings, year, month, totalDays]);

  // Conflict detection: days where 2+ exclusive bookings overlap, OR exclusive overlaps with any other
  const conflictDays = useMemo(() => {
    const conflicts = new Set<number>();
    Object.entries(bookingsByDay).forEach(([day, bs]) => {
      if (bs.length < 2) return;
      const hasExclusive = bs.some(b => b.booking_type === "Exclusive");
      if (hasExclusive) conflicts.add(Number(day));
    });
    return conflicts;
  }, [bookingsByDay]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

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
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={prevMonth} className="px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">← Prev</button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <button onClick={nextMonth} className="px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">Next →</button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400" /> Exclusive</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-200 border border-blue-400" /> Non-Exclusive</span>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">{visibleBookings.length} reservations this month</span>
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
                  const isToday = day === todayDate;
                  const hasConflict = day ? conflictDays.has(day) : false;
                  const cellStyle: React.CSSProperties = {};
                  if (isToday) {
                    cellStyle.border = "2px solid hsl(200 90% 50%)";
                    cellStyle.backgroundColor = "hsl(200 90% 92%)";
                  }
                  return (
                    <td
                      key={di}
                      className="border border-border p-1 align-top h-24 relative"
                      style={cellStyle}
                      onDragOver={(e) => { if (day && dragging) e.preventDefault(); }}
                      onDrop={(e) => {
                        if (!day || !dragging) return;
                        e.preventDefault();
                        const target = new Date(year, month, day);
                        const conflict = (bookingsByDay[day] || []).some(b => b.id !== dragging.id);
                        setDropConfirm({ booking: dragging, targetDate: target, conflict });
                        setDragging(null);
                      }}
                    >
                      {day && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isToday ? "text-sky-700 font-bold" : "text-muted-foreground"}`}>{day}{isToday && " • TODAY"}</span>
                            {hasConflict && (
                              <span title="⚠ Double booking detected on this date!" className="text-[9px] font-bold text-destructive bg-destructive/15 px-1 rounded">⚠</span>
                            )}
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            {dayBookings.map((b, bi) => {
                              const ttCheckIn = b.check_in ? new Date(b.check_in).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
                              const ttCheckOut = b.check_out ? new Date(b.check_out).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
                              const tooltip = `Customer: ${b.customer_name || "Guest"}\nCheck-in: ${ttCheckIn}\nCheck-out: ${ttCheckOut}\nStatus: ${b.payment_status || "—"}`;
                              return (
                                <button
                                  key={bi}
                                  draggable
                                  onDragStart={() => setDragging(b)}
                                  onDragEnd={() => setDragging(null)}
                                  onClick={() => setSelected(b)}
                                  title={tooltip}
                                  className={`block w-full text-left px-1.5 py-0.5 rounded border-l-[3px] text-[9px] leading-tight cursor-move hover:opacity-80 transition-opacity ${getBookingStyle(b)}`}
                                >
                                  <p className="font-semibold truncate">{b.customer_name || "Guest"}</p>
                                  <p className="truncate">A:{b.adults || 0} | K8+:{b.kids_8_above || 0}</p>
                                  <p className="truncate">K5-7:{b.kids_5_7 || 0} | K4↓:{b.kids_4_below || 0}</p>
                                  {b.room_type && <p className="truncate">Room: {b.room_type}</p>}
                                  {b.number_of_tables ? <p className="truncate">Tables: {b.number_of_tables}</p> : null}
                                </button>
                              );
                            })}
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
              <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-bold text-primary">₱{(selected.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              {(() => {
                const total = selected.amount_paid || 0;
                const deposit = selected.deposit_amount ?? 0;
                const balance = (selected.balance ?? Math.max(0, total - deposit));
                const status = deposit <= 0 ? "Unpaid" : (balance > 0 ? "Partially Paid" : "Fully Paid");
                const statusColor = status === "Fully Paid" ? "text-success" : status === "Partially Paid" ? "text-warning" : "text-destructive";
                return (
                  <>
                    {deposit > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span className="font-medium">₱{deposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    {balance > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span className="font-bold text-destructive">₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><span className={`font-bold ${statusColor}`}>{status}</span></div>
                  </>
                );
              })()}
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium">{selected.payment_method}</span></div>
            </div>
          </div>
        </div>
      )}

      {dropConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDropConfirm(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-center mb-3">
              {dropConfirm.conflict ? "⚠️ Conflict Detected" : "Move Booking?"}
            </h3>
            <p className="text-base text-muted-foreground text-center mb-2">
              Move <strong>{dropConfirm.booking.customer_name || "Guest"}</strong> to {formatDateLabel(dropConfirm.targetDate)}?
            </p>
            {dropConfirm.conflict && (
              <p className="text-sm text-destructive text-center mb-4">⚠️ This date already has a booking. Proceed anyway?</p>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDropConfirm(null)} className="flex-1 h-12 rounded-lg bg-secondary text-secondary-foreground font-semibold">Cancel</button>
              <button onClick={async () => { const d = dropConfirm; setDropConfirm(null); await performMove(d.booking, d.targetDate); }} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-semibold">
                {dropConfirm.conflict ? "Proceed Anyway" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
