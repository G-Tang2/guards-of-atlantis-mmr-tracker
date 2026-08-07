"use client";

import { Minus, Plus, LucideIcon } from "lucide-react";

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  compact = false,
  icon: Icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className={`goa-stepper${compact ? " compact" : ""}`}>
      <span className="goa-stepper-label">
        {Icon && <Icon size={12} className="goa-stepper-label-icon" />}
        {label}
      </span>
      <div className="goa-stepper-controls">
        <button
          type="button"
          className="goa-stepper-btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={13} />
        </button>
        <span className="goa-stepper-value">{value}</span>
        <button
          type="button"
          className="goa-stepper-btn"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
