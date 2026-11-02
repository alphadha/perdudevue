"use client";

import { FormEvent, ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function BootstrapModal({ title, subtitle, onClose, children }: Props) {
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title mb-0">{title}</h2>
                {subtitle ? <p className="pdv-field__hint mb-0">{subtitle}</p> : null}
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
    <p className="mb-3" aria-hidden="true">
      <span className="fs-4 text-primary border border-primary rounded-circle px-2">✓</span>
    </p>
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
