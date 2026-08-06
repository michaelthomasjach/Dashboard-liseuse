import { useState, type ReactNode } from "react";
import { MenuIcon, CloseIcon } from "../icons";
import "./HeaderLayout.css";

export interface HeaderNavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface HeaderLayoutProps {
  logo?: ReactNode;
  navItems?: HeaderNavItem[];
  /** Right-aligned slot — search, notifications, `UserMenu`. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** App shell with a sticky horizontal top nav; collapses into a hamburger drawer on narrow screens. */
export function HeaderLayout({ logo, navItems = [], actions, children, className }: HeaderLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={["lq-header-layout", className].filter(Boolean).join(" ")}>
      <header className="lq-header-layout__bar">
        <div className="lq-header-layout__logo">{logo}</div>

        <nav className="lq-header-layout__nav lq-header-layout__nav--desktop">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className={["lq-header-layout__nav-item", item.active && "lq-header-layout__nav-item--active"].filter(Boolean).join(" ")}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="lq-header-layout__actions">
          {actions}
          {navItems.length > 0 && (
            <button
              type="button"
              className="lq-header-layout__menu-button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          )}
        </div>
      </header>

      {mobileOpen && (
        <nav className="lq-header-layout__nav--mobile">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className={["lq-header-layout__nav-item", item.active && "lq-header-layout__nav-item--active"].filter(Boolean).join(" ")}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
                setMobileOpen(false);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}

      <main className="lq-header-layout__content">{children}</main>
    </div>
  );
}
