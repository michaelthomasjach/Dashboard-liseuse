import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../icons";
import "./Toast.css";

export type ToastTone = "neutral" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. Pass 0 to require manual dismissal. Default 4000. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Wrap your app (or a layout) in this once; call `useToast().show(...)` anywhere below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, tone: "neutral", duration: 4000, ...options }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="lq-toast-viewport">
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div className={["lq-toast", `lq-toast--${toast.tone}`].join(" ")} role="status">
      <div className="lq-toast__body">
        {toast.title && <strong className="lq-toast__title">{toast.title}</strong>}
        {toast.description && <p className="lq-toast__description">{toast.description}</p>}
      </div>
      <button type="button" className="lq-toast__close" onClick={onDismiss} aria-label="Fermer">
        <CloseIcon size={14} />
      </button>
    </div>
  );
}

/** Access `show(options)` to push a toast. Must be called from within a `ToastProvider`. */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider on purpose
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
