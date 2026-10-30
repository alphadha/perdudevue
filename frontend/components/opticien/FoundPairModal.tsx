"use client";

import { FormEvent, useState } from "react";
import BootstrapModal, { ModalSuccessMark } from "@/components/opticien/BootstrapModal";
import FieldError from "@/components/FieldError";
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
      <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 3/3" onClose={() => onDone()}>
        <div className="modal-body text-center">
          <ModalSuccessMark />
          <p className="h5">Signalement confirmé !</p>
          <p className="mb-0">Le propriétaire a été notifié que ses lunettes ont été retrouvées.</p>
        </div>
        <div className="modal-footer flex-column">
          <button type="button" className="btn btn-primary w-100" onClick={() => onDone()}>
            Fermer
          </button>
        </div>
      </BootstrapModal>
    );
  }

  if (step === 2 && preview) {
    return (
      <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 2/3" onClose={() => onClose(true)}>
        <div className="modal-body">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <p>
            Vérifiez bien que la paire identifiée est la bonne. Cette action permettra au propriétaire de la paire
            d’être notifié.
          </p>
          <ul className="list-group">
            <li className="list-group-item d-flex justify-content-between">
              <span>Paire :</span>
              <span>{preview.type_label}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Marque :</span>
              <span>{preview.brand}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Couleur(s) :</span>
              <span>{preview.colors.join(", ")}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Code assigné :</span>
              <span>{preview.assigned_code}</span>
            </li>
          </ul>
        </div>
        <div className="modal-footer flex-column">
          <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={() => void confirm()}>
            Confirmer le signalement
          </button>
          <button type="button" className="btn btn-link" onClick={() => onClose(true)}>
            Annuler
          </button>
        </div>
      </BootstrapModal>
    );
  }

  return (
    <BootstrapModal title="Signaler des lunettes retrouvées" subtitle="Étape 1/3" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void identify(event)}>
        <div className="modal-body">
          <label className="form-label" htmlFor="found-assigned-code">
            Code assigné à la paire*
          </label>
          <input
            id="found-assigned-code"
            className={`form-control${error ? " is-invalid" : ""}`}
            placeholder={ASSIGNED_CODE_EXAMPLE}
            value={assignedCode}
            onChange={(event) => setAssignedCode(event.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            required
          />
          <FieldError message={error ?? undefined} />
        </div>
        <div className="modal-footer flex-column">
          <button type="submit" className="btn btn-primary w-100" disabled={pending}>
            Signaler comme retrouvé
          </button>
          <button type="button" className="btn btn-link" onClick={() => onClose(true)}>
            Annuler
          </button>
        </div>
      </form>
    </BootstrapModal>
  );
}
