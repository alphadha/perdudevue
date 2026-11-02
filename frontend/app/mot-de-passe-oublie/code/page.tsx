"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import AuthFlowShell from "@/components/AuthFlowShell";
import PdvButton from "@/components/pdv/PdvButton";
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
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

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
        body: JSON.stringify({ email, code: code.join("") }),
      });
      sessionStorage.setItem("pdv_reset_code", code.join(""));
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

  function updateDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, key: string) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <AuthFlowShell backHref={`/mot-de-passe-oublie?space=${space}`} title="Mot de passe oublié" progress={50}>
      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      <form className="pdv-login__form pdv-otp-form" onSubmit={onSubmit} noValidate>
        <h1 className="pdv-otp-form__title">
          Saisissez le code à 6 chiffres envoyé {email ? `au ${maskEmail(email)}` : "à votre e-mail"}
        </h1>
        <div className="pdv-otp-form__digits" role="group" aria-label="Code à 6 chiffres">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputsRef.current[index] = node;
              }}
              className="pdv-otp-form__digit"
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
        <PdvButton variant="primary" size="l" block type="submit" disabled={pending || code.join("").length < 6}>
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
