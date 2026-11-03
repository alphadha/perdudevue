"use client";

import { FormEvent, useState } from "react";
import BootstrapModal, { ModalSuccessMark } from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
import { api, ApiRequestError } from "@/lib/api";
import { ASSIGNED_CODE_EXAMPLE } from "@/lib/assignedCode";
import type { FoundPairPreview, ShopRestitution } from "@/lib/types";

type Props = {
  onDone: () => void;
  onClose: (discarded: boolean) => void;
};

export default function FoundPairModal({ onDone, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [assignedCode, setAssignedCode] = useState("");
  const [preview, setPreview] = useState<FoundPairPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function identify(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const data = await api<FoundPairPreview>("/opticien/restitutions/identify", {
        method: "POST",
        body: JSON.stringify({ assigned_code: assignedCode }),
      });
      setPreview(data);
      setStep(2);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.fieldError("assigned_code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await api<ShopRestitution>("/opticien/restitutions", {
        method: "POST",
        body: JSON.stringify({ assigned_code: assignedCode }),
      });
      setStep(3);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.fieldError("assigned_code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  if (step === 3) {
    return (
      <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 3/3" size="md" onClose={() => onDone()}>
        <div className="modal-body text-center">
          <ModalSuccessMark />
          <p className="h5">Signalement confirmé !</p>
          <p className="mb-0">Le propriétaire a été notifié que ses lunettes ont été retrouvées.</p>
        </div>
        <div className="modal-footer flex-column">
          <PdvButton type="button" variant="primary" size="l" block onClick={() => onDone()}>
            Fermer
          </PdvButton>
        </div>
      </BootstrapModal>
    );
  }

  if (step === 2 && preview) {
    return (
      <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 2/3" size="md" onClose={() => onClose(true)}>
        <div className="modal-body">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <p>
            Vérifiez bien que la paire identifiée est la bonne. Cette action permettra au propriétaire de la paire
            d’être notifié.
          </p>
          <ul className="pdv-recap-list">
            <li>
              <span>Type de lunettes</span>
              <strong>{preview.type_label}</strong>
            </li>
            <li>
              <span>Marque</span>
              <strong>{preview.brand}</strong>
            </li>
            <li>
              <span>Couleur(s)</span>
              <strong>{preview.colors.join(", ")}</strong>
            </li>
            <li>
              <span>Code assigné</span>
              <strong>{preview.assigned_code}</strong>
            </li>
          </ul>
        </div>
        <div className="modal-footer flex-column">
          <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void confirm()}>
            Confirmer le signalement
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </BootstrapModal>
    );
  }

  return (
    <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 1/3" size="md" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void identify(event)}>
        <div className="modal-body">
          <PdvField
            id="found-assigned-code"
            label="Code assigné à la paire*"
            placeholder={ASSIGNED_CODE_EXAMPLE}
            value={assignedCode}
            error={error ?? undefined}
            maxLength={8}
            autoComplete="off"
            required
            onChange={(event) => setAssignedCode(event.target.value.toUpperCase())}
          />
        </div>
        <div className="modal-footer flex-column">
          <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
            Signaler comme retrouvé
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </form>
    </BootstrapModal>
  );
}
