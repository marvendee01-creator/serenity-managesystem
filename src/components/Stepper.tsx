import { useCallback } from "react";

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}

export default function Stepper({ label, value, onChange, min = 0 }: StepperProps) {
  const dec = useCallback(() => onChange(Math.max(min, value - 1)), [value, min, onChange]);
  const inc = useCallback(() => onChange(value + 1), [value, onChange]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={dec} className="stepper-btn" tabIndex={0} aria-label={`Decrease ${label}`}>−</button>
        <span className="w-12 text-center text-lg font-semibold tabular-nums">{value}</span>
        <button onClick={inc} className="stepper-btn" tabIndex={0} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
