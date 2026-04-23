import { useState, useEffect } from "react";
import { getTransactions } from "@/lib/db";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getEmoji() {
  const hour = new Date().getHours();
  if (hour < 12) return "🌅";
  if (hour < 18) return "☀️";
  return "🌙";
}

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export default function WelcomePopup({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [expectedGuests, setExpectedGuests] = useState(0);
  const [roomsToday, setRoomsToday] = useState<string[]>([]);
  const [entranceGuestsToday, setEntranceGuestsToday] = useState(0);

  useEffect(() => {
    getTransactions({ module: "Booking" }).then(txns => {
      const todays = txns.filter(t => t.status !== "Cancelled" && isToday(t.check_in));
      setTodayCount(todays.length);
      setExpectedGuests(todays.reduce((sum, t) => sum + (t.total_headcount || 0), 0));
      const rooms = todays.map(t => t.room_type).filter((r): r is string => !!r);
      setRoomsToday(rooms);
    }).catch(() => {});

    getTransactions({ module: "Entrance" }).then(txns => {
      const todays = txns.filter(t => isToday(t.date_time));
      const total = todays.reduce((sum, t) => sum + (t.adults || 0) + (t.kids_8_above || 0) + (t.kids_5_7 || 0) + (t.kids_4_below || 0), 0);
      setEntranceGuestsToday(total);
    }).catch(() => {});

    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 523; osc.type = "sine"; gain.gain.value = 0.15;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 150);
      setTimeout(() => { osc.frequency.value = 784; }, 300);
      setTimeout(() => { osc.stop(); ctx.close(); }, 450);
    } catch {}
  }, []);

  if (!visible) return null;

  const roomsLabel = roomsToday.length ? roomsToday.join(", ") : "None";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setVisible(false); onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4">{getEmoji()}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">WELCOME!</h2>
        <p className="text-lg text-primary font-semibold mb-3">{getGreeting()}!</p>
        <p className="text-sm text-muted-foreground mb-4">
          Please greet the customer properly.
        </p>
        <div className="bg-muted/50 rounded-lg p-3 mb-2 text-left space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Bookings</p>
          <p className="text-sm font-semibold text-foreground">👥 Total Guests (Booking): <span className="text-primary">{expectedGuests} pax</span></p>
          <p className="text-sm font-semibold text-foreground">🏠 Room Booked Today: <span className="text-primary">{roomsLabel}</span></p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 mb-6 text-left space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Entrance</p>
          <p className="text-sm font-semibold text-foreground">🎟️ Entrance Guests Today: <span className="text-primary">{entranceGuestsToday} pax</span></p>
        </div>
        <button
          onClick={() => { setVisible(false); onClose(); }}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all"
        >
          OK, Let's Go!
        </button>
      </div>
    </div>
  );
}
