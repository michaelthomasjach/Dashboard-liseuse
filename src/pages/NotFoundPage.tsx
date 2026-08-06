import type { ReactNode } from "react";
import { Button } from "../components/primitives/Button";
import "./NotFoundPage.css";

export interface NotFoundPageProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  illustration?: ReactNode;
  className?: string;
}

/** Centered 404 page with an optional custom illustration and a way back. */
export function NotFoundPage({
  title = "404",
  message = "Cette page n'existe pas ou a été déplacée.",
  actionLabel = "Retour à l'accueil",
  onAction,
  actionHref = "/",
  illustration,
  className,
}: NotFoundPageProps) {
  return (
    <div className={["lq-not-found-page", className].filter(Boolean).join(" ")}>
      {illustration && <div className="lq-not-found-page__illustration">{illustration}</div>}
      <span className="lq-not-found-page__code">{title}</span>
      <p className="lq-not-found-page__message">{message}</p>
      {onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : (
        <a href={actionHref} className="lq-button">
          {actionLabel}
        </a>
      )}
    </div>
  );
}
