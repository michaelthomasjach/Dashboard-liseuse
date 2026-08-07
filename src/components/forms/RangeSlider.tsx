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
  /** Marks 0 on the track and colors the fill negative/positive on either side of it —
   *  for a "min/max is negative left, positive right" filter. Requires `min < 0 < max`. */
  centerZero?: boolean;
  className?: string;
}

function clampStep(raw: number, min: number, max: number, step: number): number {
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.min(max, Math.max(min, stepped));
}

/** Dual-handle range picker — e.g. a price/date range filter. Drag either handle to resize
 *  the range, or drag the filled segment between them to shift the whole range at once. */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue,
  disabled,
  label,
  centerZero = false,
  className,
}: RangeSliderProps) {
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

  function startDragRange(e: React.PointerEvent) {
    if (disabled) return;
    const track = trackRef.current;
    if (!track) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = track.getBoundingClientRect();
    const startValue = min + ((e.clientX - rect.left) / rect.width) * (max - min);
    const span = hi - lo;
    const startLo = lo;

    const onMove = (ev: PointerEvent) => {
      const value = min + ((ev.clientX - rect.left) / rect.width) * (max - min);
      const rawDelta = Math.round((value - startValue) / step) * step;
      let newLo = startLo + rawDelta;
      let newHi = newLo + span;
      if (newLo < min) {
        newLo = min;
        newHi = min + span;
      }
      if (newHi > max) {
        newHi = max;
        newLo = max - span;
      }
      onChange([newLo, newHi]);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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

  const toPct = (v: number) => ((v - min) / (max - min)) * 100;
  const loPct = toPct(lo);
  const hiPct = toPct(hi);
  const zeroPct = toPct(0);
  const fmt = formatValue ?? ((v: number) => String(v));
  const showZeroTick = centerZero && min < 0 && max > 0;

  return (
    <div className={["lq-range-slider", disabled && "lq-range-slider--disabled", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-field__label">{label}</span>}
      <div className="lq-range-slider__values">
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
      <div ref={trackRef} className="lq-range-slider__track">
        {showZeroTick ? (
          <>
            {lo < 0 && (
              <div
                className="lq-range-slider__fill lq-range-slider__fill--down"
                style={{ left: `${Math.min(loPct, zeroPct)}%`, width: `${Math.abs(Math.min(hiPct, zeroPct) - loPct)}%` }}
              />
            )}
            {hi > 0 && (
              <div
                className="lq-range-slider__fill lq-range-slider__fill--up"
                style={{ left: `${Math.max(loPct, zeroPct)}%`, width: `${Math.abs(hiPct - Math.max(loPct, zeroPct))}%` }}
              />
            )}
            <div className="lq-range-slider__zero-tick" style={{ left: `${zeroPct}%` }} />
          </>
        ) : (
          <div
            className="lq-range-slider__fill lq-range-slider__fill--drag"
            style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
            onPointerDown={startDragRange}
          />
        )}
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
