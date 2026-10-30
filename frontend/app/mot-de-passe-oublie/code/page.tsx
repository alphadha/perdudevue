"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
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
    await api("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  return (
    <div className="container-fluid min-vh-100">
      <div className="row min-vh-100">
        <BrandPanel space={space} />
        <div className={space === "client" ? "col-12" : "col-lg-6"}>
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-sm-10 col-md-8 col-xl-8">
                <Link href={`/mot-de-passe-oublie?space=${space}`} className="d-inline-block mb-3">
                  Retour
                </Link>
                <div className="progress mb-4">
                  <div className="progress-bar w-50" />
                </div>
                <h1 className="h5 mb-4">Saisissez le code à 6 chiffres envoyé au {email ? maskEmail(email) : "votre e-mail"}</h1>
                {error ? <div className="alert alert-danger">{error}</div> : null}
                <form onSubmit={onSubmit}>
                  <div className="d-flex justify-content-between gap-2 mb-3">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        className="form-control text-center"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => {
                          const next = [...code];
                          next[index] = event.target.value.replace(/\D/g, "").slice(-1);
                          setCode(next);
                        }}
                        required
                      />
                    ))}
                  </div>
                  <p>
                    Vous n’avez pas reçu de code ?{" "}
                    <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => void resend()}>
                      Renvoyer un code
                    </button>
                  </p>
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

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
