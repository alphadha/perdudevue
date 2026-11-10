"use client";

import { FormEvent, ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

type Props = {
  title: string;
  subtitle?: string;
  size?: ModalSize;
  variant?: "default" | "client";
  className?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function BootstrapModal({
  title,
  subtitle,
  size = "sm",
  variant = "default",
  className,
  onClose,
  children,
}: Props) {
  const dialogClass = [
    "modal-dialog modal-dialog-centered",
    size === "lg" ? "modal-dialog--lg" : "",
    size === "md" ? "modal-dialog--md" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={`modal fade show d-block${variant === "client" ? " pdv-modal--client" : ""}${className ? ` ${className}` : ""}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className={dialogClass}>
          <div className="modal-content">
            <div className="modal-header">
              <div className="pdv-modal-heading">
                <h2 className="modal-title mb-0">{title}</h2>
                {subtitle ? <p className="pdv-modal-subtitle">{subtitle}</p> : null}
              </div>
              <button type="button" className="pdv-modal-close" aria-label="Fermer" onClick={onClose}>
                <img src="/icons/pdv/x-close.svg" alt="" width={24} height={24} />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

export function ModalSuccessMark() {
  return (
    <div className="pdv-modal-success__icon" aria-hidden>
      <img src="/icons/pdv/check.svg" alt="" width={24} height={24} />
    </div>
  );
}

export function ModalForm({
  onSubmit,
  children,
}: {
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return <form onSubmit={onSubmit}>{children}</form>;
}
