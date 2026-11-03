"use client";

import { useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import { CODE_RESENT_TOAST, RESEND_LIMIT_TOAST } from "@/lib/toasts";

type Props = {
  uuid: string;
  onDone: (toast: { title?: string; message: string }) => void;
  onClose: (discarded: boolean) => void;
};

export default function ResendPickupModal({ uuid, onDone, onClose }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend(channels: Array<"email" | "sms">) {
    setPending(true);
    setError(null);
    try {
      await api(`/opticien/restitutions/${uuid}/resend`, {
        method: "POST",
        body: JSON.stringify({ channels }),
      });
      onDone(CODE_RESENT_TOAST);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 429) {
        onDone(RESEND_LIMIT_TOAST);
        return;
      }
      setError(caught instanceof ApiRequestError ? caught.message : "Renvoi impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <BootstrapModal title="Relancer le client" onClose={() => onClose(true)}>
      <div className="modal-body">
        <p className="mb-0">Choisissez le canal de renvoi du code de restitution (selon les consentements).</p>
        {error ? <p className="text-danger mt-3 mb-0">{error}</p> : null}
      </div>
      <div className="modal-footer flex-column">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void resend(["email"])}>
          Renvoyer par e-mail
        </PdvButton>
        <PdvButton type="button" variant="secondary" size="l" block disabled={pending} onClick={() => void resend(["sms"])}>
          Renvoyer par SMS
        </PdvButton>
        <PdvButton
          type="button"
          variant="secondary"
          size="l"
          block
          disabled={pending}
          onClick={() => void resend(["email", "sms"])}
        >
          Renvoyer par e-mail et SMS
        </PdvButton>
        <PdvButton type="button" variant="tertiary" disabled={pending} onClick={() => onClose(true)}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}
