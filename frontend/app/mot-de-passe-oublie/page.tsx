"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import FieldError from "@/components/FieldError";
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
        body: JSON.stringify({ email }),
      });
      sessionStorage.setItem("pdv_reset_email", email);
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
    <div className="container-fluid min-vh-100">
      <div className="row min-vh-100">
        <BrandPanel space={space} />
        <div className={space === "client" ? "col-12" : "col-lg-6"}>
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-sm-10 col-md-8 col-xl-8">
                <Link href={`/login?space=${space}`} className="d-inline-block mb-3">
                  Retour
                </Link>
                <div className="progress mb-4" role="progressbar" aria-valuenow={33} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-bar w-50" />
                </div>
                <h1 className="h4 mb-4">Mot de passe oublié</h1>
                {error ? <div className="alert alert-danger">{error}</div> : null}
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="email">
                      Adresse e-mail*
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={`form-control${fieldErrors.email ? " is-invalid" : ""}`}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <FieldError message={fieldErrors.email} />
                  </div>
                  <p className="text-muted">Un code à 6 chiffres vous sera envoyé par e-mail si un compte existe.</p>
                  <button className="btn btn-primary w-100" type="submit" disabled={pending}>
                    Continuer
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

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
