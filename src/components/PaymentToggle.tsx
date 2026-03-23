interface PaymentToggleProps {
  value: "Cash" | "GCash";
  onChange: (v: "Cash" | "GCash") => void;
}

export default function PaymentToggle({ value, onChange }: PaymentToggleProps) {
  return (
    <div className="flex gap-2">
      {(["Cash", "GCash"] as const).map((opt) => (
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
