import type { ReactNode, RefObject } from "react";
import { Popover } from "../forms/Popover";
import type { PopoverPlacement } from "../forms/internal/usePopoverPosition";
import "./DropdownPanel.css";

export interface DropdownPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  placement?: PopoverPlacement;
  /** A title/summary row pinned above the scrollable body — e.g. "Années incluses". Omit for a
   *  plain `Select`-style list with no header. */
  header?: ReactNode;
  /** The scrollable list itself — one row per item, same as `Select`'s own option list. */
  children: ReactNode;
  /** Pinned below the scrollable body, separated by its own divider — quick actions that act on
   *  the whole list at once (select all, a useful preset, …) rather than one row of it. */
  footer?: ReactNode;
  /** Fixed width in px. Default 260. */
  width?: number;
  className?: string;
}

/**
 * A `Popover` with three fixed sections — header, scrollable body, footer — instead of just a
 * bare list of options like `Select`. Meant for a dropdown that needs more than "pick one row":
 * a multi-select with its own bulk actions (see `SeasonalityView`'s years-picker, whose footer
 * offers a couple of one-click presets alongside per-year checkboxes in the body), a filtered
 * search result with a persistent "N selected" summary, and so on. Purely a layout shell — every
 * section's actual content, and all the state behind it, is the caller's own.
 */
export function DropdownPanel({ open, onClose, anchorRef, placement = "bottom", header, children, footer, width = 260, className }: DropdownPanelProps) {
  return (
    <Popover open={open} onClose={onClose} anchorRef={anchorRef} placement={placement} className={className}>
      <div className="lq-dropdown-panel" style={{ width }}>
        {header && <div className="lq-dropdown-panel__header">{header}</div>}
        <div className="lq-dropdown-panel__body">{children}</div>
        {footer && <div className="lq-dropdown-panel__footer">{footer}</div>}
      </div>
    </Popover>
  );
}
