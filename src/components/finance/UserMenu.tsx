import { useRef, useState, type ReactNode } from "react";
import { Popover } from "../forms/Popover";
import { Avatar } from "./Avatar";
import { ChevronDownIcon } from "../icons";
import "./UserMenu.css";

export interface UserMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export interface UserMenuProps {
  name: string;
  subtitle?: string;
  avatarSrc?: string;
  items: UserMenuItem[];
  placement?: "bottom" | "top";
  className?: string;
}

/** Avatar + name trigger opening an adaptive dropdown menu — the usual header/sidebar account switcher. */
export function UserMenu({ name, subtitle, avatarSrc, items, placement = "bottom", className }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={["lq-user-menu", className].filter(Boolean).join(" ")}>
      <button ref={anchorRef} type="button" className="lq-user-menu__trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={name} src={avatarSrc} size={32} />
        <span className="lq-user-menu__identity">
          <span className="lq-user-menu__name">{name}</span>
          {subtitle && <span className="lq-user-menu__subtitle">{subtitle}</span>}
        </span>
        <ChevronDownIcon size={16} />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement={placement}>
        <ul className="lq-user-menu__list" role="menu">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="menuitem"
                className={["lq-user-menu__item", item.danger && "lq-user-menu__item--danger"].filter(Boolean).join(" ")}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
