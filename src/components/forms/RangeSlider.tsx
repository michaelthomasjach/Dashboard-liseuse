import { useCallback, useRef } from "react";
import "./field.css";
import "./RangeSlider.css";

export interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

function clampStep(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, stepped));
}

/** Dual-handle range picker — e.g. a price/date range filter. Drag either handle or the track segment between them. */
export function RangeSlider({ min, max, step = 1, value, onChange, formatValue, disabled, label, className }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [lo, hi] = value;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return clampStep(min + ratio * (max - min), min, max, step);
    },
    [min, max, step]
  );

  function startDrag(which: "lo" | "hi") {
    return (e: React.PointerEvent) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const next = valueFromClientX(ev.clientX);
        if (which === "lo") onChange([Math.min(next, hi), hi]);
        else onChange([lo, Math.max(next, lo)]);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  function handleKey(which: "lo" | "hi") {
    return (e: React.KeyboardEvent) => {
      const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
      if (!delta) return;
      e.preventDefault();
      if (which === "lo") onChange([clampStep(lo + delta, min, Math.min(max, hi), step), hi]);
      else onChange([lo, clampStep(hi + delta, Math.max(min, lo), max, step)]);
    };
  }

  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className={["lq-range-slider", disabled && "lq-range-slider--disabled", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-field__label">{label}</span>}
      <div className="lq-range-slider__values">
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
      <div ref={trackRef} className="lq-range-slider__track">
        <div className="lq-range-slider__fill" style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }} />
        <button
          type="button"
          className="lq-range-slider__thumb"
          style={{ left: `${loPct}%` }}
          onPointerDown={startDrag("lo")}
          onKeyDown={handleKey("lo")}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={lo}
          aria-label={label ? `${label} — minimum` : "Valeur minimum"}
          disabled={disabled}
        />
        <button
          type="button"
          className="lq-range-slider__thumb"
          style={{ left: `${hiPct}%` }}
          onPointerDown={startDrag("hi")}
          onKeyDown={handleKey("hi")}
          role="slider"
          aria-valuemin={lo}
          aria-valuemax={max}
          aria-valuenow={hi}
          aria-label={label ? `${label} — maximum` : "Valeur maximum"}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
