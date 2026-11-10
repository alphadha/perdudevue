"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import BootstrapModal, { ModalSuccessMark } from "@/components/opticien/BootstrapModal";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCodeBoxes from "@/components/pdv/PdvCodeBoxes";
import { api, ApiRequestError } from "@/lib/api";
import type { ShopRestitution } from "@/lib/types";

type Props = {
  onDone: () => void;
  onClose: (discarded: boolean) => void;
};

const BOXES = 6;

export default function HandoverModal({ onDone, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pickupCode, setPickupCode] = useState("");
  const [preview, setPreview] = useState<ShopRestitution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const data = await api<ShopRestitution>("/opticien/restitutions/lookup", {
        method: "POST",
        body: JSON.stringify({ pickup_code: pickupCode }),
      });
      setPreview(data);
      setStep(2);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.fieldError("pickup_code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await api<ShopRestitution>("/opticien/restitutions/handover", {
        method: "POST",
        body: JSON.stringify({ pickup_code: pickupCode }),
      });
      setStep(3);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.fieldError("pickup_code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  if (step === 3) {
    return (
      <BootstrapModal title="Remettre des lunettes" subtitle="Étape 3/3" size="md" onClose={() => onDone()}>
        <div className="modal-body">
          <div className="pdv-modal-success">
            <ModalSuccessMark />
            <div className="pdv-modal-success__copy">
              <p className="pdv-modal-success__title">Restitution terminée !</p>
              <p className="pdv-modal-success__text">La paire a été restituée au client. Le dossier est clôturé.</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <PdvButton type="button" variant="secondary" size="l" block onClick={() => onDone()}>
            Fermer
          </PdvButton>
        </div>
      </BootstrapModal>
    );
  }

  if (step === 2 && preview) {
    return (
      <BootstrapModal title="Remettre des lunettes" subtitle="Étape 2/3" size="md" onClose={() => onClose(true)}>
        <div className="modal-body">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <p>
            Vérifiez bien que la paire identifiée est la bonne. Cette action est définitive. La paire sera notée
            comme restituée.
          </p>
          <ul className="pdv-info-card">
            {preview.client ? (
              <li>
                <span>Client :</span>
                <strong>
                  {preview.client.first_name} {preview.client.last_name}
                </strong>
              </li>
            ) : null}
            <li>
              <span>Paire :</span>
              <strong>{preview.type_label}</strong>
            </li>
            <li>
              <span>Marque :</span>
              <strong>{preview.brand}</strong>
            </li>
            <li>
              <span>Couleur(s) :</span>
              <strong>{preview.colors.join(", ")}</strong>
            </li>
            <li>
              <span>Code assigné :</span>
              <strong>{preview.assigned_code}</strong>
            </li>
          </ul>
        </div>
        <div className="modal-footer">
          <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void confirm()}>
            Confirmer la remise
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </BootstrapModal>
    );
  }

  return (
    <BootstrapModal title="Remettre des lunettes" subtitle="Étape 1/3" size="md" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void lookup(event)}>
        <div className="modal-body">
          <div className="pdv-code-field">
            <div className="pdv-code-field__head">
              <label className="pdv-field__label" htmlFor="handover-pickup-0">
                Code de restitution*
              </label>
              <Link href="/opticien/restitution" className="pdv-modal-link" onClick={() => onClose(false)}>
                Le client a oublié son code
              </Link>
            </div>
            <PdvCodeBoxes
              idPrefix="handover-pickup"
              value={pickupCode}
              onChange={setPickupCode}
              invalid={Boolean(error)}
              ariaLabel="Code de restitution"
            />
            <FieldError message={error ?? undefined} />
            <p className="pdv-field__hint">Demander au client de vous fournir le code de restitution reçu.</p>
          </div>
        </div>
        <div className="modal-footer">
          <PdvButton type="submit" variant="primary" size="l" block disabled={pending || pickupCode.length !== BOXES}>
            Valider le code
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </form>
    </BootstrapModal>
  );
}
