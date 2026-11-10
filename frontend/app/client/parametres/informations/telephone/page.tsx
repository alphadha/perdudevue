"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCodeBoxes from "@/components/pdv/PdvCodeBoxes";
import { api, ApiRequestError } from "@/lib/api";
import { formatPhoneFr } from "@/lib/formatPhone";
import type { ClientProfile } from "@/lib/types";

const STORAGE_KEY = "pdv_phone_otp";

type StoredChallenge = {
  token: string;
  phone: string;
};

function readChallenge(): StoredChallenge | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredChallenge;
    if (!parsed.token || !parsed.phone) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function ClientPhoneOtpPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<StoredChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = readChallenge();
    if (!stored) {
      router.replace("/client/parametres/informations");
      return;
    }
    setChallenge(stored);
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!challenge) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api<ClientProfile>("/client/profile/phone/otp", {
        method: "POST",
        body: JSON.stringify({ action_token: challenge.token, code }),
      });
      sessionStorage.removeItem(STORAGE_KEY);
      router.push("/client/parametres/informations");
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Code invalide.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!challenge) {
      return;
    }
    setResendPending(true);
    setError(null);
    try {
      await api("/client/profile/phone/resend", {
        method: "POST",
        body: JSON.stringify({ action_token: challenge.token }),
      });
      setToast("Un nouveau code a été envoyé.");
      window.setTimeout(() => setToast(null), 4000);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Renvoi impossible.");
    } finally {
      setResendPending(false);
    }
  }

  if (!challenge) {
    return (
      <div className="pdv-phone-otp">
        <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
      </div>
    );
  }

  return (
    <div className="pdv-phone-otp">
      <AppToast message={toast} />
      <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
      <div className="pdv-phone-otp__intro">
        <h1 className="pdv-client-fiche__title">Modifier mon numéro</h1>
        <p>
          Renseignez le code reçu par SMS pour vérifier et valider votre nouveau numéro de téléphone.
        </p>
      </div>
      <form className="pdv-settings-card" onSubmit={onSubmit} noValidate>
        <div className="pdv-otp-form">
          <h2 className="pdv-otp-form__title">
            Saisissez le code à 6 chiffres envoyé
            <br />
            au {formatPhoneFr(challenge.phone)}.
          </h2>
          <div className="pdv-otp-form__block">
            <PdvCodeBoxes
              idPrefix="phone-otp"
              value={code}
              onChange={setCode}
              numeric
              invalid={Boolean(error)}
              className="pdv-otp-form__digits--fluid"
              ariaLabel="Code à 6 chiffres"
            />
            <div className="pdv-otp-form__resend">
              <p>Vous n’avez pas reçu de code ?</p>
              <button type="button" className="pdv-otp-form__resend-btn" disabled={resendPending} onClick={() => void resend()}>
                {resendPending ? "Envoi…" : "Renvoyer un code"}
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="pdv-field__error">{error}</p> : null}
        <PdvButton variant="primary" size="l" block type="submit" disabled={pending || code.length < 6}>
          {pending ? "Vérification…" : "Confirmer"}
        </PdvButton>
      </form>
    </div>
  );
}
