import { ChevronRightIcon } from "../icons";
import "./Breadcrumbs.css";

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Path trail; the last item renders as the current, non-interactive page. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={["lq-breadcrumbs", className].filter(Boolean).join(" ")} aria-label="Fil d'ariane">
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.id}>
              {isLast ? (
                <span className="lq-breadcrumbs__current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href ?? "#"}
                  className="lq-breadcrumbs__link"
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      item.onClick();
                    }
                  }}
                >
                  {item.label}
                </a>
              )}
              {!isLast && (
                <span className="lq-breadcrumbs__separator">
                  <ChevronRightIcon size={14} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
