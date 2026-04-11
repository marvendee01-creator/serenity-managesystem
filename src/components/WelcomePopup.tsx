import { useState, useEffect } from "react";

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

export default function WelcomePopup({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setVisible(false); onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4">{getEmoji()}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">WELCOME!</h2>
        <p className="text-lg text-primary font-semibold mb-3">{getGreeting()}!</p>
        <p className="text-sm text-muted-foreground mb-6">
          Please greet the customer properly.<br />
          <strong>{getGreeting()}!</strong>
        </p>
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
