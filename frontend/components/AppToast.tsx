"use client";

type Props = {
  title?: string;
  message: string | null;
  onDismiss?: () => void;
};

export default function AppToast({ title, message, onDismiss }: Props) {
  if (!message && !title) {
    return null;
  }

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3">
      <div className="toast show" role="status" aria-live="polite">
        {title ? (
          <div className="toast-header">
            <strong className="me-auto">{title}</strong>
            {onDismiss ? (
              <button type="button" className="btn-close" aria-label="Fermer" onClick={onDismiss} />
            ) : null}
          </div>
        ) : null}
        {message ? <div className="toast-body">{message}</div> : null}
      </div>
    </div>
  );
}
