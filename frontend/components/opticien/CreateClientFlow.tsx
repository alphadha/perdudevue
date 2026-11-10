"use client";

import { FormEvent, useEffect, useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import ClientFormFields from "@/components/opticien/ClientFormFields";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCodeBoxes from "@/components/pdv/PdvCodeBoxes";
import { api, ApiRequestError } from "@/lib/api";
import { formatPhoneFr } from "@/lib/formatPhone";
import { clientCreatedToast } from "@/lib/toasts";
import {
  isDuplicatePayload,
  isIdentityChallenge,
  type ClientPayload,
  type IdentityChallenge,
  type ShopClient,
} from "@/lib/types";

type Props = {
  open: boolean;
  onCreated: (client: ShopClient, message: string, title?: string) => void;
  onClose: (discarded: boolean) => void;
  onInfoToast?: (message: string) => void;
};

const emptyForm = (): ClientPayload => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  consent_email: false,
  consent_sms: false,
});

function fieldErrorsFrom(error: ApiRequestError): Record<string, string> {
  const next: Record<string, string> = {};
  error.errors.forEach((item) => {
    if (item.field) {
      next[item.field] = item.message;
    }
  });
  return next;
}

/** Flow Figma dashboard / clients : Nouveau client → doublon → modifier → OTP. */
export default function CreateClientFlow({ open, onCreated, onClose, onInfoToast }: Props) {
  const [form, setForm] = useState<ClientPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<{ token: string; client: ShopClient } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [otp, setOtp] = useState<IdentityChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCreateOpen(false);
      setDuplicate(null);
      setEditOpen(false);
      setEditToken(null);
      setOtp(null);
      setOtpCode("");
      return;
    }
    setForm(emptyForm());
    setFieldErrors({});
    setFormError(null);
    setDuplicate(null);
    setEditOpen(false);
    setEditToken(null);
    setOtp(null);
    setOtpCode("");
    setCreateOpen(true);
  }, [open]);

  function discard() {
    onClose(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await api<ShopClient>("/opticien/clients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const toast = clientCreatedToast(created);
      onCreated(created, toast.message, toast.title);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 409 && isDuplicatePayload(caught.data)) {
        setDuplicate({ token: caught.data.action_token, client: caught.data.client });
        setCreateOpen(false);
      } else if (caught instanceof ApiRequestError) {
        setFieldErrors(fieldErrorsFrom(caught));
        setFormError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDuplicate() {
    if (!duplicate) {
      return;
    }
    setPending(true);
    try {
      const client = await api<ShopClient>(`/opticien/clients/duplicates/${duplicate.token}/confirm`, {
        method: "POST",
      });
      const toast = clientCreatedToast(client);
      onCreated(client, toast.message, toast.title);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFormError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  function startDuplicateUpdate() {
    if (!duplicate) {
      return;
    }
    setEditToken(duplicate.token);
    setForm({
      first_name: duplicate.client.first_name,
      last_name: duplicate.client.last_name,
      email: duplicate.client.email,
      phone: duplicate.client.phone ?? "",
      consent_email: duplicate.client.consent_email,
      consent_sms: duplicate.client.consent_sms,
    });
    setFieldErrors({});
    setFormError(null);
    setDuplicate(null);
    setEditOpen(true);
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editToken) {
      return;
    }
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const result = await api<ShopClient | IdentityChallenge>(`/opticien/clients/duplicates/${editToken}/update`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (isIdentityChallenge(result)) {
        setEditOpen(false);
        setOtp(result);
        return;
      }
      setForm({
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
        phone: result.phone ?? "",
        consent_email: result.consent_email,
        consent_sms: result.consent_sms,
      });
      setEditOpen(false);
      setEditToken(null);
      setCreateOpen(true);
      onInfoToast?.("Fiche mise à jour. Poursuivez l’ajout du client.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFieldErrors(fieldErrorsFrom(caught));
        setFormError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    if (!otp) {
      return;
    }
    setPending(true);
    setOtpError(null);
    try {
      const result = await api<ShopClient | IdentityChallenge>(`/opticien/clients/identity/${otp.action_token}/otp`, {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      if (isIdentityChallenge(result)) {
        setOtp(result);
        setOtpCode("");
        return;
      }
      setOtp(null);
      setOtpCode("");
      setForm({
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
        phone: result.phone ?? "",
        consent_email: result.consent_email,
        consent_sms: result.consent_sms,
      });
      setEditToken(null);
      setCreateOpen(true);
      onInfoToast?.("Fiche mise à jour. Poursuivez l’ajout du client.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.fieldError("code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function resendOtp() {
    if (!otp) {
      return;
    }
    setPending(true);
    try {
      const result = await api<IdentityChallenge>(`/opticien/clients/identity/${otp.action_token}/resend`, {
        method: "POST",
      });
      setOtp(result);
      onInfoToast?.("Un nouveau code a été envoyé.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <>
      {createOpen ? (
        <BootstrapModal title="Nouveau client" size="md" onClose={discard}>
          <form onSubmit={(event) => void submitCreate(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="dash-create" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                Créer le client
              </PdvButton>
              <PdvButton type="button" variant="tertiary" onClick={discard}>
                Annuler
              </PdvButton>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {duplicate ? (
        <BootstrapModal title="Compte client déjà existant" size="md" onClose={discard}>
          <div className="modal-body">
            <div className="pdv-duplicate-copy">
              <p>Un compte client avec les informations personnelles que vous avez saisies existe déjà :</p>
              <ul>
                <li>Nom : {duplicate.client.last_name}</li>
                <li>Prénom : {duplicate.client.first_name}</li>
                <li>Adresse e-mail : {duplicate.client.email}</li>
                <li>Numéro de téléphone : {formatPhoneFr(duplicate.client.phone)}</li>
              </ul>
              <p className="pdv-field__hint">Échanger avec votre client pour savoir si ce compte est le sien.</p>
            </div>
          </div>
          <div className="modal-footer">
            <div className="pdv-modal-cta-stack">
              <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void confirmDuplicate()}>
                Ajouter ce client à mon espace
              </PdvButton>
              <PdvButton type="button" variant="secondary" size="l" block onClick={startDuplicateUpdate}>
                Modifier la fiche client
              </PdvButton>
            </div>
            <PdvButton
              type="button"
              variant="tertiary"
              onClick={() => {
                setDuplicate(null);
                setCreateOpen(true);
              }}
            >
              Annuler
            </PdvButton>
          </div>
        </BootstrapModal>
      ) : null}

      {editOpen ? (
        <BootstrapModal title="Modifier la fiche client" subtitle="Étape 1/3" size="md" onClose={discard}>
          <form onSubmit={(event) => void submitEdit(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="dash-edit" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                Enregistrer les modifications
              </PdvButton>
              <PdvButton type="button" variant="tertiary" onClick={discard}>
                Annuler
              </PdvButton>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {otp ? (
        <BootstrapModal title="Modifier la fiche client" subtitle="Étape 2/3" size="md" onClose={discard}>
          <form onSubmit={(event) => void submitOtp(event)}>
            <div className="modal-body">
              <div className="pdv-code-field">
                <div className="pdv-code-field__head">
                  <label className="pdv-field__label" htmlFor="dash-otp-code-0">
                    Code de vérification*
                  </label>
                  <PdvButton type="button" variant="tertiary" onClick={() => void resendOtp()}>
                    Renvoyer le code
                  </PdvButton>
                </div>
                <PdvCodeBoxes
                  idPrefix="dash-otp-code"
                  value={otpCode}
                  onChange={setOtpCode}
                  numeric
                  invalid={Boolean(otpError)}
                  ariaLabel="Code de vérification"
                />
                {otpError ? <p className="pdv-field__error">{otpError}</p> : null}
                <p className="pdv-field__hint">
                  Le client a reçu un code par mail ou SMS pour valider la mise à jour de ses informations
                  personnelles.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending || otpCode.length !== 6}>
                Vérifier le code et ajouter le client
              </PdvButton>
              <PdvButton type="button" variant="tertiary" onClick={discard}>
                Annuler
              </PdvButton>
            </div>
          </form>
        </BootstrapModal>
      ) : null}
    </>
  );
}
