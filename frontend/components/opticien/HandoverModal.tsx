"use client";

import Link from "next/link";
import { ClipboardEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import BootstrapModal, { ModalSuccessMark } from "@/components/opticien/BootstrapModal";
import FieldError from "@/components/FieldError";
import { api, ApiRequestError } from "@/lib/api";
import type { ShopRestitution } from "@/lib/types";

type Props = {
  onDone: () => void;
  onClose: (discarded: boolean) => void;
};

const BOXES = 6;

export default function HandoverModal({ onDone, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [boxes, setBoxes] = useState<string[]>(Array.from({ length: BOXES }, () => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [preview, setPreview] = useState<ShopRestitution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pickupCode = boxes.join("");

  function setBox(index: number, raw: string) {
    const char = raw.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
    setBoxes((current) => {
      const next = [...current];
      next[index] = char;
      return next;
    });
    if (char && index < BOXES - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onBoxKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !boxes[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function onBoxPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, BOXES)
      .toUpperCase()
      .split("");
    setBoxes((current) => current.map((_, index) => pasted[index] ?? ""));
    const focusAt = Math.min(pasted.length, BOXES - 1);
    inputs.current[focusAt]?.focus();
  }

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
      <BootstrapModal title="Remettre des lunettes" subtitle="Étape 3/3" onClose={() => onDone()}>
        <div className="modal-body text-center">
          <ModalSuccessMark />
          <p className="h5">Restitution terminée !</p>
          <p className="mb-0">La paire a été restituée au client. Le dossier est clôturé.</p>
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
      <BootstrapModal title="Remettre des lunettes" subtitle="Étape 2/3" onClose={() => onClose(true)}>
        <div className="modal-body">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <p>
            Vérifiez bien que la paire identifiée est la bonne. Cette action est définitive. La paire sera marquée
            comme restituée.
          </p>
          <ul className="list-group">
            {preview.client ? (
              <li className="list-group-item d-flex justify-content-between">
                <span>Client :</span>
                <span>
                  {preview.client.first_name} {preview.client.last_name}
                </span>
              </li>
            ) : null}
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
            Confirmer la remise
          </button>
          <button type="button" className="btn btn-link" onClick={() => onClose(true)}>
            Annuler
          </button>
        </div>
      </BootstrapModal>
    );
  }

  return (
    <BootstrapModal title="Remettre des lunettes" subtitle="Étape 1/3" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void lookup(event)}>
        <div className="modal-body">
          <div className="d-flex justify-content-between align-items-start">
            <label className="form-label" htmlFor="handover-pickup-0">
              Code de restitution*
            </label>
            <Link href="/opticien/restitution" className="small" onClick={() => onClose(false)}>
              Renvoyer le code
            </Link>
          </div>
          <div className="d-flex justify-content-center gap-2">
            {boxes.map((value, index) => (
              <input
                key={index}
                id={`handover-pickup-${index}`}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                className={`form-control text-center${error ? " is-invalid" : ""}`}
                value={value}
                maxLength={1}
                autoComplete="off"
                inputMode="text"
                aria-label={`Caractère ${index + 1} du code de restitution`}
                onChange={(event) => setBox(index, event.target.value)}
                onKeyDown={(event) => onBoxKeyDown(index, event)}
                onPaste={onBoxPaste}
                required
              />
            ))}
          </div>
          <FieldError message={error ?? undefined} />
          <p className="small text-secondary mt-2 mb-0">
            Demander au client de vous fournir le code de restitution reçu.
          </p>
        </div>
        <div className="modal-footer flex-column">
          <button type="submit" className="btn btn-primary w-100" disabled={pending || pickupCode.length !== BOXES}>
            Valider le code
          </button>
          <button type="button" className="btn btn-link" onClick={() => onClose(true)}>
            Annuler
          </button>
        </div>
      </form>
    </BootstrapModal>
  );
}
