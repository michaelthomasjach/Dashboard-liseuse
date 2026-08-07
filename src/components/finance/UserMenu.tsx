import { useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "../forms/Popover";
import { Avatar } from "./Avatar";
import { ChevronDownIcon, ChevronRightIcon } from "../icons";
import "./UserMenu.css";

export interface UserMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  /** Nested items rendered as a flyout submenu (opens right, or left if there isn't room). */
  children?: UserMenuItem[];
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
            <UserMenuRow key={item.id} item={item} onSelect={() => setOpen(false)} />
          ))}
        </ul>
      </Popover>
    </div>
  );
}

function UserMenuRow({ item, onSelect }: { item: UserMenuItem; onSelect: () => void }) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasChildren = Boolean(item.children && item.children.length > 0);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  function cancelClose() {
    clearTimeout(closeTimerRef.current);
  }

  // Moving the mouse from the trigger to the flyout crosses a gap that belongs to
  // neither element — closing immediately on mouseleave makes the submenu
  // impossible to reach diagonally. Delay the close briefly instead, and cancel
  // it if the pointer lands back on the trigger *or* the flyout in that window.
  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setSubmenuOpen(false), 300);
  }

  function openSubmenu() {
    cancelClose();
    const rect = rowRef.current?.getBoundingClientRect();
    if (rect) setOpenLeft(rect.right + 200 > window.innerWidth);
    setSubmenuOpen(true);
  }

  return (
    <li
      ref={rowRef}
      className="lq-user-menu__list-item"
      onMouseEnter={hasChildren ? openSubmenu : undefined}
      onMouseLeave={hasChildren ? scheduleClose : undefined}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup={hasChildren ? "menu" : undefined}
        aria-expanded={hasChildren ? submenuOpen : undefined}
        className={["lq-user-menu__item", item.danger && "lq-user-menu__item--danger"].filter(Boolean).join(" ")}
        onClick={() => {
          if (hasChildren) {
            if (submenuOpen) setSubmenuOpen(false);
            else openSubmenu();
            return;
          }
          item.onClick?.();
          onSelect();
        }}
      >
        {item.icon}
        <span className="lq-user-menu__item-label">{item.label}</span>
        {hasChildren && <ChevronRightIcon size={14} className="lq-user-menu__submenu-caret" />}
      </button>

      {hasChildren && submenuOpen && (
        <ul
          className={["lq-user-menu__list", "lq-user-menu__submenu", openLeft && "lq-user-menu__submenu--left"]
            .filter(Boolean)
            .join(" ")}
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {item.children!.map((child) => (
            <UserMenuRow key={child.id} item={child} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
