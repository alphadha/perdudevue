"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import FieldError from "@/components/FieldError";
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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setEmail(sessionStorage.getItem("pdv_reset_email") ?? "");
    setCode(sessionStorage.getItem("pdv_reset_code") ?? "");
  }, []);

  const longEnough = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    <div className="container-fluid min-vh-100">
      <div className="row min-vh-100">
        <BrandPanel space={space} />
        <div className={space === "client" ? "col-12" : "col-lg-6"}>
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-sm-10 col-md-8 col-xl-8">
                <Link href={`/mot-de-passe-oublie/code?space=${space}`} className="d-inline-block mb-3">
                  Retour
                </Link>
                <div className="progress mb-4">
                  <div className="progress-bar w-100" />
                </div>
                <h1 className="h4 mb-4">Nouveau mot de passe</h1>
                {error ? <div className="alert alert-danger">{error}</div> : null}
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="password">
                      Mot de passe*
                    </label>
                    <input
                      id="password"
                      type="password"
                      className={`form-control${fieldErrors.password ? " is-invalid" : ""}`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <FieldError message={fieldErrors.password} />
                    <ul className="list-unstyled small mt-2 mb-0">
                      <li className={longEnough ? "text-success" : "text-muted"}>8 caractères minimum</li>
                      <li className={hasUpper ? "text-success" : "text-muted"}>Au moins une majuscule</li>
                      <li className={hasDigit ? "text-success" : "text-muted"}>Au moins un chiffre</li>
                    </ul>
                  </div>
                  <div className="mb-4">
                    <label className="form-label" htmlFor="confirmation">
                      Confirmer le mot de passe*
                    </label>
                    <input
                      id="confirmation"
                      type="password"
                      className="form-control"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary w-100" type="submit" disabled={pending}>
                    Valider
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense>
      <NewPasswordForm />
    </Suspense>
  );
}
