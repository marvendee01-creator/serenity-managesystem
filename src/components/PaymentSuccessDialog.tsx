import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface PaymentSuccessDialogProps {
  change: number;
  onClose: () => void;
}

export default function PaymentSuccessDialog({ change, onClose }: PaymentSuccessDialogProps) {
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 523;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 150);
      setTimeout(() => { osc.frequency.value = 784; }, 300);
      setTimeout(() => { osc.stop(); ctx.close(); }, 500);
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-success" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">✅ PAYMENT SUCCESS</h3>
        <p className="text-sm text-muted-foreground mb-2">Change</p>
        <p className="text-4xl font-bold text-success tabular-nums mb-4">₱{change.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-base text-muted-foreground mb-6">Thank You! Come Again! 🎉</p>
        <button onClick={onClose} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all">
          OK
        </button>
      </div>
    </div>
  );
}
