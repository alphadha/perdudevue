"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import AuthFlowShell from "@/components/AuthFlowShell";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import PdvPasswordRules, { passwordMeetsRules } from "@/components/pdv/PdvPasswordRules";
import { api, ApiRequestError } from "@/lib/api";
import type { Space } from "@/lib/types";

function NewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = (searchParams.get("space") === "opticien" ? "opticien" : "client") as Exclude<Space, "admin">;
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem("pdv_reset_email") ?? "");
    setCode(sessionStorage.getItem("pdv_reset_code") ?? "");
  }, []);

  const passwordInvalid = passwordTouched && !passwordMeetsRules(password);
  const canAttempt = password.length > 0 && confirmation.length > 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordTouched(true);
    if (!passwordMeetsRules(password) || password !== confirmation) {
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await api("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({
          email,
          code,
          password,
          password_confirmation: confirmation,
        }),
      });
      sessionStorage.removeItem("pdv_reset_email");
      sessionStorage.removeItem("pdv_reset_code");
      router.push(`/login?space=${space}`);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const nextFields: Record<string, string> = {};
        caught.errors.forEach((item) => {
          if (item.field) {
            nextFields[item.field] = item.message;
          }
        });
        setFieldErrors(nextFields);
        setError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFlowShell
      backHref={`/mot-de-passe-oublie/code?space=${space}`}
      title="Nouveau mot de passe"
      progress={100}
    >
      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      <form className="pdv-auth-flow__form" onSubmit={onSubmit} noValidate>
        <div className="pdv-login__fields">
          <div className="pdv-field">
            <label className="pdv-field__label" htmlFor="password">
              Mot de passe*
            </label>
            <div className="pdv-field__password">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`pdv-field__control${fieldErrors.password || passwordInvalid ? " is-invalid" : ""}`}
                placeholder="Saisissez votre mot de passe"
                autoComplete="new-password"
                value={password}
                onBlur={() => {
                  if (password.length > 0) {
                    setPasswordTouched(true);
                  }
                }}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="pdv-field__eye"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword((current) => !current)}
              >
                <img src="/icons/pdv/eye.svg" alt="" width={20} height={20} />
              </button>
            </div>
            <FieldError message={fieldErrors.password} />
            <PdvPasswordRules password={password} showError={passwordInvalid} />
          </div>

          <div className="pdv-field">
            <label className="pdv-field__label" htmlFor="confirmation">
              Confirmer le mot de passe*
            </label>
            <div className="pdv-field__password">
              <input
                id="confirmation"
                type={showConfirmation ? "text" : "password"}
                className="pdv-field__control"
                placeholder="Saisissez votre mot de passe"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
              <button
                type="button"
                className="pdv-field__eye"
                aria-label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowConfirmation((current) => !current)}
              >
                <img src="/icons/pdv/eye.svg" alt="" width={20} height={20} />
              </button>
            </div>
          </div>
        </div>

        <PdvButton variant="primary" size="l" block type="submit" disabled={pending || !canAttempt}>
          {pending ? "Enregistrement…" : "Réinitialiser le mot de passe"}
        </PdvButton>
      </form>
    </AuthFlowShell>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense>
      <NewPasswordForm />
    </Suspense>
  );
}
