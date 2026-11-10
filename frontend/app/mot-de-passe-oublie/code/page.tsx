"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import AuthFlowShell from "@/components/AuthFlowShell";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCodeBoxes from "@/components/pdv/PdvCodeBoxes";
import { api, ApiRequestError } from "@/lib/api";
import type { Space } from "@/lib/types";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }
  return `${local[0] ?? ""}******@${domain}`;
}

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = (searchParams.get("space") === "opticien" ? "opticien" : "client") as Exclude<Space, "admin">;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem("pdv_reset_email") ?? "");
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/auth/password/otp", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      sessionStorage.setItem("pdv_reset_code", code);
      router.push(`/mot-de-passe-oublie/nouveau?space=${space}`);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Code invalide.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!email) {
      return;
    }
    setResendPending(true);
    setError(null);
    try {
      await api("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Renvoi impossible.");
    } finally {
      setResendPending(false);
    }
  }

  return (
    <AuthFlowShell backHref={`/mot-de-passe-oublie?space=${space}`} title="Mot de passe oublié" progress={50}>
      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      <form className="pdv-auth-flow__form" onSubmit={onSubmit} noValidate>
        <div className="pdv-otp-form">
          <h1 className="pdv-otp-form__title">
            Saisissez le code à 6 chiffres envoyé
            <br />
            {email ? `au ${maskEmail(email)}` : "à votre e-mail"}
          </h1>
          <div className="pdv-otp-form__block">
            <PdvCodeBoxes
              idPrefix="reset-otp"
              value={code}
              onChange={setCode}
              numeric
              invalid={Boolean(error)}
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
        <PdvButton variant="primary" size="l" block type="submit" disabled={pending || code.length < 6}>
          {pending ? "Vérification…" : "Confirmer"}
        </PdvButton>
      </form>
    </AuthFlowShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
