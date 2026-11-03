"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthFlowShell from "@/components/AuthFlowShell";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import type { Space } from "@/lib/types";

function ForgotForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const space = (searchParams.get("space") === "opticien" ? "opticien" : "client") as Exclude<Space, "admin">;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await api("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      sessionStorage.setItem("pdv_reset_email", email.trim());
      router.push(`/mot-de-passe-oublie/code?space=${space}`);
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
    <AuthFlowShell backHref={`/login?space=${space}`} title="Mot de passe oublié" progress={30.5}>
      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      <form className="pdv-auth-flow__form" onSubmit={onSubmit} noValidate>
        <div className="pdv-field">
          <label className="pdv-field__label" htmlFor="email">
            Adresse e-mail*
          </label>
          <input
            id="email"
            type="email"
            className={`pdv-field__control${fieldErrors.email ? " is-invalid" : ""}`}
            placeholder="adresse@mail.fr"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <FieldError message={fieldErrors.email} />
          <p className="pdv-field__hint">
            Renseignez votre adresse e-mail pour recevoir un code de validation. Il est nécessaire pour vérifier
            votre identité. Vous pourrez par la suite réinitialiser votre mot de passe.
          </p>
        </div>
        <PdvButton variant="primary" size="l" block type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Recevoir le code par email"}
        </PdvButton>
      </form>
    </AuthFlowShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
