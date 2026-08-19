import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "../../../primitives/Modal";
import { Popover } from "../../../forms/Popover";
import { Select } from "../../../forms/Select";
import { TextField } from "../../../forms/TextField";
import { Checkbox } from "../../../forms/Checkbox";
import { DatePicker } from "../../../forms/DatePicker";
import {
  ChevronDownIcon,
  CrossingIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  GreaterThanIcon,
  LessThanIcon,
  CheckIcon,
  RefreshIcon,
  CandleModeIcon,
  ActivityIcon,
} from "../../../icons";
import type { Indicator } from "../interfaces/Indicator.interface";
import type { ChartAlertCrossing, ChartAlertDraft } from "../interfaces/ChartAlertDraft.interface";
import { FIBONACCI_LEVELS, FIBONACCI_EXTENSION_LEVELS } from "../drawingCatalog";

const DEFAULT_SOUND_OPTIONS = [
  { value: "none", label: "Aucun" },
  { value: "bell", label: "Cloche" },
  { value: "chime", label: "Carillon" },
  { value: "ding", label: "Ding" },
  { value: "alert", label: "Alerte" },
];

const LINE_CROSSING_OPTIONS: { value: Exclude<ChartAlertCrossing, { kind: "fibLevel" }>["kind"]; label: string; icon: typeof CrossingIcon }[] = [
  { value: "crossing", label: "Croisement", icon: CrossingIcon },
  { value: "crossingUp", label: "Croisement à la hausse", icon: ArrowUpIcon },
  { value: "crossingDown", label: "Croisement à la baisse", icon: ArrowDownIcon },
  { value: "greaterThan", label: "Supérieur à", icon: GreaterThanIcon },
  { value: "lessThan", label: "Inférieur à", icon: LessThanIcon },
];

const TRIGGER_OPTIONS: { value: ChartAlertDraft["trigger"]; label: string; description: string; icon: typeof CheckIcon }[] = [
  { value: "onlyOnce", label: "Une seule fois", description: "se déclenche quand la condition est remplie", icon: CheckIcon },
  { value: "oncePerBar", label: "Une fois par bougie", description: "se déclenche une fois par bougie quand la condition est remplie", icon: RefreshIcon },
  {
    value: "oncePerBarClose",
    label: "Une fois à la clôture de la bougie",
    description: "se déclenche à chaque clôture de bougie où la condition est remplie",
    icon: CandleModeIcon,
  },
  {
    value: "oncePerMinute",
    label: "Une fois par minute",
    description: "se déclenche une fois par minute tant que la condition reste remplie",
    icon: ActivityIcon,
  },
];

function crossingLabel(crossing: ChartAlertCrossing): string {
  if (crossing.kind === "fibLevel") return `niveau ${crossing.level}`;
  return LINE_CROSSING_OPTIONS.find((o) => o.value === crossing.kind)?.label ?? "";
}

interface IconDropdownOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: typeof CrossingIcon;
}

/** A `Select`-styled trigger button opening a `.lq-chart__tool-menu` list of icon+label rows —
 *  `Select` itself has no per-option icon slot (see its own doc), so the condition/crossing/
 *  trigger dropdowns below share this instead, local to this file since nothing else needs it. */
function IconDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: IconDropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);
  const SelectedIcon = selected?.icon;

  return (
    <div className="lq-field">
      <span className="lq-field__label">{label}</span>
      <button
        ref={anchorRef}
        type="button"
        className="lq-field__control lq-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lq-select__value lq-alert-modal__trigger-value">
          {SelectedIcon && <SelectedIcon size={14} />}
          {selected ? selected.label : "Sélectionner…"}
        </span>
        <ChevronDownIcon size={16} className={open ? "lq-select__chevron lq-select__chevron--open" : "lq-select__chevron"} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement="bottom" matchAnchorWidth>
        <div className="lq-chart__tool-menu">
          {options.map((opt) => {
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                className={["lq-chart__tool-menu-option", opt.value === value && "lq-chart__tool-menu-option--selected"].filter(Boolean).join(" ")}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {OptIcon && <OptIcon size={14} />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

export interface AlertCreateModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string | undefined;
  timeframe: string | undefined;
  drawingId: string | null;
  /** Whether the current target is a Fibonacci drawing/tool — shows a level picker instead of the
   *  standard crossing options (see AlertCreateModal's own doc). */
  isFibonacciTarget: boolean;
  /** Which level set to offer while `isFibonacciTarget` — the retracement set (0/0.236/…/1) or
   *  the extension set (0/0.382/…/2.618), matching whichever the target tool actually is. */
  fibonacciExtension: boolean;
  /** A human label for the current target ("Ligne de tendance", "Retracement de Fibonacci", …) —
   *  used only to seed the default message text, not shown anywhere in the modal's own chrome. */
  targetLabel: string;
  /** Indicators currently shown as an overlay on the price chart (pane: "price") — see
   *  indicatorCatalogEntry's own doc — alongside a synthetic "Prix" entry, always first. */
  overlayIndicators: Indicator[];
  indicatorLabel: (indicator: Indicator) => string;
  /** This library ships no audio assets — purely a label picker, no playback. Default a small
   *  built-in list. */
  soundOptions?: { value: string; label: string }[];
  onCreate: ((alert: ChartAlertDraft) => void) | undefined;
}

/** "Create alert" modal opened from the floating drawing toolbar's own bell button — modeled on
 *  TradingView's own alert dialog. Purely a form: "Create" hands the assembled `ChartAlertDraft`
 *  to `onCreate` and closes; this library never stores, evaluates, or fires alerts itself (same
 *  "caller owns the data" shape as `drawings`/`indicators`/the `alerts` tab). */
export function AlertCreateModal({
  open,
  onClose,
  symbol,
  timeframe,
  drawingId,
  isFibonacciTarget,
  fibonacciExtension,
  targetLabel,
  overlayIndicators,
  indicatorLabel,
  soundOptions = DEFAULT_SOUND_OPTIONS,
  onCreate,
}: AlertCreateModalProps) {
  const fibLevels = fibonacciExtension ? FIBONACCI_EXTENSION_LEVELS : FIBONACCI_LEVELS;
  const defaultCrossing: ChartAlertCrossing = isFibonacciTarget ? { kind: "fibLevel", level: fibLevels[0] } : { kind: "crossing" };

  const [conditionIndicatorId, setConditionIndicatorId] = useState("price");
  const [crossing, setCrossing] = useState<ChartAlertCrossing>(defaultCrossing);
  const [trigger, setTrigger] = useState<ChartAlertDraft["trigger"]>("onlyOnce");
  const [sound, setSound] = useState(soundOptions[0]?.value ?? "none");
  const [message, setMessage] = useState("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  // Stops the message field's own auto-templating (see the effect below) once the user has typed
  // something themselves — same "user input permanently wins" reasoning the floating toolbar's
  // own theme-color sync already uses.
  const messageCustomizedRef = useRef(false);

  // Fresh form every time the modal opens — same "stale state from a previous visit" concern
  // LinkGroupsModal/SymbolTargetModal's own reset-on-open effects already guard against.
  useEffect(() => {
    if (!open) return;
    setConditionIndicatorId("price");
    setCrossing(defaultCrossing);
    setTrigger("onlyOnce");
    setSound(soundOptions[0]?.value ?? "none");
    setHasExpiration(false);
    setExpiresAt(null);
    messageCustomizedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (messageCustomizedRef.current) return;
    setMessage([symbol, timeframe, `${crossingLabel(crossing)} sur ${targetLabel}`].filter(Boolean).join(", "));
  }, [symbol, timeframe, crossing, targetLabel]);

  if (!open) return null;

  const conditionOptions = [
    { value: "price", label: "Prix" },
    ...overlayIndicators.map((ind) => ({ value: ind.id, label: indicatorLabel(ind) })),
  ];

  function handleCreate() {
    onCreate?.({
      drawingId,
      conditionIndicatorId,
      crossing,
      trigger,
      sound,
      message,
      expiresAt: hasExpiration ? expiresAt : null,
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="lq-alert-modal__title">
          Créer une alerte sur {symbol ?? "—"} {timeframe ?? ""}
        </span>
      }
      footer={
        <div className="lq-chart__edit-drawing-footer">
          <button type="button" className="lq-chart__reset-button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="lq-chart__confirm-button" onClick={handleCreate}>
            Créer
          </button>
        </div>
      }
    >
      <div className="lq-alert-modal__body">
        <Select label="Condition" options={conditionOptions} value={conditionIndicatorId} onChange={setConditionIndicatorId} />

        {isFibonacciTarget ? (
          <IconDropdown
            label="Niveau"
            value={crossing.kind === "fibLevel" ? String(crossing.level) : null}
            options={fibLevels.map((level) => ({ value: String(level), label: String(level) }))}
            onChange={(v) => setCrossing({ kind: "fibLevel", level: Number(v) })}
          />
        ) : (
          <IconDropdown
            label="Type de croisement"
            value={crossing.kind === "fibLevel" ? null : crossing.kind}
            options={LINE_CROSSING_OPTIONS}
            onChange={(kind) => setCrossing({ kind })}
          />
        )}

        <IconDropdown
          label="Déclenchement"
          value={trigger}
          options={TRIGGER_OPTIONS.map((opt) => ({
            value: opt.value,
            label: (
              <>
                {opt.label} <span className="lq-alert-modal__option-desc">({opt.description})</span>
              </>
            ),
            icon: opt.icon,
          }))}
          onChange={setTrigger}
        />

        <Select label="Son" options={soundOptions} value={sound} onChange={setSound} />

        <TextField
          label="Message"
          value={message}
          onChange={(e) => {
            messageCustomizedRef.current = true;
            setMessage(e.target.value);
          }}
        />

        <Checkbox checked={hasExpiration} onChange={setHasExpiration} label="Date d'expiration" />
        {hasExpiration && <DatePicker value={expiresAt} onChange={setExpiresAt} placeholder="Aucune expiration" minDate={new Date()} />}
      </div>
    </Modal>
  );
}
