import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import "./ClockWidget.css";

export interface ClockWidgetProps {
  /** Pre-formatted time string, e.g. "20:14". The widget doesn't own a clock/tick — pass the current value in. */
  time: string;
  /** Pre-formatted date string, e.g. "samedi 7 juin". */
  date: string;
  /** Small glyph in the top-right corner, e.g. a moon/sun icon reflecting day part. */
  icon?: ReactNode;
  /** Optional presence/status line under the date, e.g. a home icon + "Ulrich est à la maison". */
  presence?: ReactNode;
  className?: string;
}

/** Large time + date header, as seen top-left of the reference dashboard. */
export function ClockWidget({ time, date, icon, presence, className }: ClockWidgetProps) {
  return (
    <Panel bare className={["lq-clock", className].filter(Boolean).join(" ")}>
      <div className="lq-clock__top">
        <span className="lq-clock__time">{time}</span>
        {icon && <span className="lq-clock__icon">{icon}</span>}
      </div>
      <span className="lq-clock__date">{date}</span>
      {presence && <div className="lq-clock__presence">{presence}</div>}
    </Panel>
  );
}
