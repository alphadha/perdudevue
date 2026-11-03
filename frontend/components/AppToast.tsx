"use client";

import { useEffect, useState } from "react";
import { normalizeToast, TOAST_DURATION_MS, type ToastVariant } from "@/lib/toasts";

type Props = {
  title?: string;
  message: string | null;
  variant?: ToastVariant;
  onDismiss?: () => void;
};

export default function AppToast({ title, message, variant, onDismiss }: Props) {
  const [hidden, setHidden] = useState(false);
  const toast = normalizeToast({ title, message, variant });

  useEffect(() => {
    setHidden(false);
  }, [title, message, variant]);

  if (!toast || hidden) {
    return null;
  }

  function dismiss() {
    setHidden(true);
    onDismiss?.();
  }

  const icon = toast.variant === "error" ? "/icons/pdv/alert-circle.svg" : "/icons/pdv/check-circle.svg";

  return (
    <div className="pdv-toast-host">
      <div
        key={`${toast.variant}-${toast.title}-${toast.message}`}
        className={`pdv-toast pdv-toast--${toast.variant}`}
        role="status"
        aria-live="polite"
      >
        <div className="pdv-toast__row">
          <div className="pdv-toast__main">
            <img src={icon} alt="" width={24} height={24} />
            <div className="pdv-toast__copy">
              <p className="pdv-toast__title">{toast.title}</p>
              {toast.message ? <p className="pdv-toast__body">{toast.message}</p> : null}
            </div>
          </div>
          <button type="button" className="pdv-toast__close" aria-label="Fermer" onClick={dismiss}>
            <img src="/icons/pdv/x-close-20.svg" alt="" width={20} height={20} />
          </button>
        </div>
        <div className="pdv-toast__track" aria-hidden>
          <div className="pdv-toast__bar" style={{ animationDuration: `${TOAST_DURATION_MS}ms` }} />
        </div>
      </div>
    </div>
  );
}
