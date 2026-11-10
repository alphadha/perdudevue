"use client";

import { useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";

type Props = {
  pairUuid: string;
  onDone: () => void;
  onClose: (discarded: boolean) => void;
};

export default function MarkShippedModal({ pairUuid, onDone, onClose }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await api(`/opticien/restitutions/${pairUuid}/ship`, { method: "POST" });
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Impossible d’indiquer la paire en livraison.");
    } finally {
      setPending(false);
    }
  }

  return (
    <BootstrapModal title="Indiquer comme en livraison" size="md" onClose={() => onClose(true)}>
      <div className="modal-body">
        <p>Vous êtes sur le point de confirmer le dépôt du colis contenant une paire de lunettes à livrer.</p>
        <p className="is-em">Ne confirmez que si le colis a bien été déposé.</p>
        {error ? <p className="text-danger mb-0">{error}</p> : null}
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void confirm()}>
          Indiquer comme en livraison
        </PdvButton>
        <PdvButton type="button" variant="tertiary" disabled={pending} onClick={() => onClose(true)}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}
