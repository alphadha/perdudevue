"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import PdvButton from "@/components/pdv/PdvButton";
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
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const stored = readChallenge();
    if (!stored) {
      router.replace("/client/parametres/informations");
      return;
    }
    setChallenge(stored);
  }, [router]);

  function updateDigit(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = ["", "", "", "", "", ""];
      digits.slice(0, 6).split("").forEach((digit, offset) => {
        next[offset] = digit;
      });
      setCode(next);
      inputsRef.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const next = [...code];
    next[index] = digits.slice(-1);
    setCode(next);
    if (digits && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, key: string) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

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
        body: JSON.stringify({ action_token: challenge.token, code: code.join("") }),
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
            <div className="pdv-otp-form__digits pdv-otp-form__digits--fluid" role="group" aria-label="Code à 6 chiffres">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputsRef.current[index] = node;
                  }}
                  className={`pdv-otp-form__digit${error ? " is-invalid" : ""}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  aria-label={`Chiffre ${index + 1}`}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event.key)}
                  required
                />
              ))}
            </div>
            <div className="pdv-otp-form__resend">
              <p>Vous n’avez pas reçu de code ?</p>
              <button type="button" className="pdv-otp-form__resend-btn" disabled={resendPending} onClick={() => void resend()}>
                {resendPending ? "Envoi…" : "Renvoyer un code"}
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="pdv-field__error">{error}</p> : null}
        <PdvButton variant="primary" size="l" block type="submit" disabled={pending || code.join("").length < 6}>
          {pending ? "Vérification…" : "Confirmer"}
        </PdvButton>
      </form>
    </div>
  );
}
