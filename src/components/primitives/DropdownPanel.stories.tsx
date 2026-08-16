import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DropdownPanel } from "./DropdownPanel";
import { Checkbox } from "../forms/Checkbox";
// Trigger buttons below are plain native `<button>`s styled with `Button`'s own "lq-button" class
// rather than the `Button` component itself — `Button` isn't ref-forwarding, and these need a real
// DOM ref to anchor the popover, same convention every other anchor-ref trigger in this codebase
// (Select, DatePicker, ToolsRail…) already follows.
import "./Button.css";

const meta: Meta<typeof DropdownPanel> = {
  title: "Primitives/DropdownPanel",
  component: DropdownPanel,
};
export default meta;
type Story = StoryObj<typeof DropdownPanel>;

const CATEGORIES = ["Actions", "Obligations", "Immobilier", "Matières premières", "Liquidités", "Crypto-actifs"];

/** A multi-select with its own bulk actions in the footer — the case `Select` alone can't cover
 *  (one row picked, popover closes). Same shape `SeasonalityView`'s own years-picker uses. */
export const MultiSelectWithFooterActions: Story = {
  name: "Multi-sélection avec actions de masse",
  render: () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [excluded, setExcluded] = useState<Set<string>>(new Set());
    const includedCount = CATEGORIES.length - excluded.size;

    function toggle(category: string) {
      setExcluded((prev) => {
        const next = new Set(prev);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        return next;
      });
    }

    return (
      <div style={{ padding: 24 }}>
        <button type="button" className="lq-button" ref={anchorRef} onClick={() => setOpen((o) => !o)}>
          {includedCount} catégorie{includedCount > 1 ? "s" : ""}
        </button>
        <DropdownPanel
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
          header={
            <div className="lq-dropdown-panel__header-row">
              <span>Catégories incluses</span>
              <span className="lq-dropdown-panel__header-count">
                {includedCount} / {CATEGORIES.length}
              </span>
            </div>
          }
          footer={
            <>
              <button type="button" className="lq-dropdown-panel__footer-action" onClick={() => setExcluded(new Set())}>
                Tout cocher
              </button>
              <button type="button" className="lq-dropdown-panel__footer-action" onClick={() => setExcluded(new Set(CATEGORIES))}>
                Tout décocher
              </button>
            </>
          }
        >
          {CATEGORIES.map((category) => (
            <Checkbox key={category} checked={!excluded.has(category)} onChange={() => toggle(category)} label={category} />
          ))}
        </DropdownPanel>
      </div>
    );
  },
};

/** A plain option list, no header/footer — closer to what `Select` already gives, just via the
 *  lower-level shell (useful once a caller wants a custom trigger `Select` doesn't offer). */
export const ListOnly: Story = {
  name: "Liste seule (sans en-tête ni pied)",
  render: () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [value, setValue] = useState(CATEGORIES[0]);
    return (
      <div style={{ padding: 24 }}>
        <button type="button" className="lq-button" ref={anchorRef} onClick={() => setOpen((o) => !o)}>
          {value}
        </button>
        <DropdownPanel open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} width={200}>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={["lq-dropdown-panel__option", category === value && "lq-dropdown-panel__option--selected"].filter(Boolean).join(" ")}
              onClick={() => {
                setValue(category);
                setOpen(false);
              }}
            >
              {category}
            </button>
          ))}
        </DropdownPanel>
      </div>
    );
  },
};
