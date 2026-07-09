type PaymentMethod = "Cash" | "GCash" | "Charge to Booking";

interface PaymentToggleProps {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
  options?: readonly PaymentMethod[];
}

const DEFAULT_OPTIONS = ["Cash", "GCash"] as const;

export default function PaymentToggle({ value, onChange, options }: PaymentToggleProps) {
  const opts = options ?? DEFAULT_OPTIONS;
  return (
    <div className="flex gap-2">
      {opts.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`toggle-btn flex-1 ${value === opt ? "toggle-btn-active" : ""}`}
          onClick={() => onChange(opt)}
          tabIndex={0}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
