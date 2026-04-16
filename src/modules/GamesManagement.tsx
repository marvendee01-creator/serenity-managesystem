import { useState, useEffect, useCallback, useRef } from "react";
import { Gamepad2, Clock, Play, Square, Plus, X } from "lucide-react";
import { getTransactions, updateTransaction, type Transaction } from "@/lib/db";
import { formatPeso } from "@/lib/format";
import { toast } from "sonner";

function timeRemaining(endTime: string): { label: string; overdue: boolean; ms: number } {
  const diff = new Date(endTime).getTime() - Date.now();
  const overdue = diff <= 0;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const label = `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  return { label: overdue ? `-${label}` : label, overdue, ms: diff };
}

export default function GamesManagement() {
  const [sessions, setSessions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendHours, setExtendHours] = useState("1");
  const [extendAmount, setExtendAmount] = useState("");
  const [alertedIds, setAlertedIds] = useState<Set<number>>(new Set());
  const [showAlert, setShowAlert] = useState<Transaction | null>(null);

  const loadSessions = useCallback(async () => {
    const txns = await getTransactions({ module: "Games Rental" });
    // Show ongoing first, then ended/cancelled for today
    const today = new Date().toISOString().slice(0, 10);
    const filtered = txns.filter(t => 
      t.status === "ONGOING" || t.date_time.slice(0, 10) === today
    );
    setSessions(filtered);
    setLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Tick every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for overdue alerts
  useEffect(() => {
    const ongoing = sessions.filter(s => s.status === "ONGOING" && s.end_time);
    for (const s of ongoing) {
      const { overdue } = timeRemaining(s.end_time!);
      if (overdue && s.id && !alertedIds.has(s.id)) {
        setAlertedIds(prev => new Set(prev).add(s.id!));
        setShowAlert(s);
        break;
      }
    }
  }, [sessions, alertedIds]);

  const handleEnd = useCallback(async (id: number) => {
    try {
      await updateTransaction(id, { status: "ENDED", checkout_time: new Date().toISOString() } as any);
      toast.success("Session ended");
      loadSessions();
    } catch { toast.error("Failed to end session"); }
  }, [loadSessions]);

  const handleCancel = useCallback(async (id: number) => {
    try {
      await updateTransaction(id, { status: "CANCELLED" } as any);
      toast.success("Session cancelled");
      loadSessions();
    } catch { toast.error("Failed to cancel"); }
  }, [loadSessions]);

  const handleExtend = useCallback(async () => {
    if (!extendId) return;
    const session = sessions.find(s => s.id === extendId);
    if (!session?.end_time) return;
    const addHours = parseFloat(extendHours) || 1;
    const addAmt = parseFloat(extendAmount) || 0;
    const newEnd = new Date(new Date(session.end_time).getTime() + addHours * 3600000).toISOString();
    const newExtendHours = (session.extend_hours || 0) + addHours;
    const newExtendAmount = (session.extend_amount || 0) + addAmt;
    const newTotal = (session.rate || session.amount_paid) + newExtendAmount;
    try {
      await updateTransaction(extendId, {
        end_time: newEnd,
        extend_hours: newExtendHours,
        extend_amount: newExtendAmount,
        amount_paid: newTotal,
      } as any);
      toast.success(`Extended by ${addHours}h`);
      setExtendId(null);
      setExtendHours("1");
      setExtendAmount("");
      // Remove from alerted so it can alert again
      setAlertedIds(prev => { const n = new Set(prev); n.delete(extendId); return n; });
      loadSessions();
    } catch { toast.error("Failed to extend"); }
  }, [extendId, extendHours, extendAmount, sessions, loadSessions]);

  const ongoing = sessions.filter(s => s.status === "ONGOING");
  const ended = sessions.filter(s => s.status !== "ONGOING");

  return (
    <div className="space-y-4">
      {/* Time Alert Popup */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-destructive rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <Clock className="text-destructive" size={32} />
              </div>
              <h2 className="text-xl font-bold text-destructive">⏰ TIME ALERT</h2>
              <p className="text-base text-foreground">
                <span className="font-bold">{showAlert.customer_name}</span> already time.
              </p>
              <p className="text-sm text-muted-foreground">
                {showAlert.game_type} • Started {showAlert.start_time ? new Date(showAlert.start_time).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base"
                  onClick={() => { setShowAlert(null); if (showAlert.id) setExtendId(showAlert.id); }}
                >
                  EXTEND
                </button>
                <button
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-base"
                  onClick={() => { setShowAlert(null); if (showAlert.id) handleEnd(showAlert.id); }}
                >
                  END
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Dialog */}
      {extendId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Extend Session</h3>
              <button onClick={() => setExtendId(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Additional Hours</label>
                <input type="number" step="0.5" min="0.5" className="pos-input w-full" value={extendHours} onChange={(e) => setExtendHours(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Extension Fee (₱)</label>
                <input type="number" step="0.01" className="pos-input w-full" value={extendAmount} onChange={(e) => setExtendAmount(e.target.value)} placeholder="0.00" />
              </div>
              <button onClick={handleExtend} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold">
                Confirm Extend
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Gamepad2 size={20} /> Games Management
        </h2>
        <button onClick={loadSessions} className="text-xs text-primary underline">Refresh</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : ongoing.length === 0 && ended.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No game sessions today</p>
      ) : (
        <>
          {/* Ongoing Sessions */}
          {ongoing.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">🟢 Ongoing ({ongoing.length})</h3>
              {ongoing.map((s) => {
                const tr = s.end_time ? timeRemaining(s.end_time) : null;
                return (
                  <div key={s.id} className={`pos-card space-y-2 ${tr?.overdue ? "border-destructive/50 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-base">{s.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{s.game_type} • {formatPeso(s.amount_paid)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold tabular-nums ${tr?.overdue ? "text-destructive" : "text-success"}`}>
                          {tr?.label || "--"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          End: {s.end_time ? new Date(s.end_time).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => s.id && setExtendId(s.id)}
                        className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> Extend
                      </button>
                      <button
                        onClick={() => s.id && handleEnd(s.id)}
                        className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-1"
                      >
                        <Square size={14} /> End
                      </button>
                      <button
                        onClick={() => s.id && handleCancel(s.id)}
                        className="py-2 px-3 rounded-lg bg-muted text-muted-foreground font-semibold text-sm flex items-center justify-center gap-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ended/Cancelled */}
          {ended.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed Today ({ended.length})</h3>
              {ended.map((s) => (
                <div key={s.id} className="pos-card opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{s.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{s.game_type} • {formatPeso(s.amount_paid)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${s.status === "ENDED" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
