"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import FieldError from "@/components/FieldError";
import { api, ApiRequestError, setSession } from "@/lib/api";
import type { AuthUser, Space } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpace = searchParams.get("space") === "opticien" ? "opticien" : "client";
  const [space, setSpace] = useState<Exclude<Space, "admin">>(initialSpace);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const help = useMemo(() => {
    if (space === "opticien") {
      return {
        title: "Vous êtes opticien et vous n’avez pas encore de compte ?",
        body: "Vous pouvez nous contacter par mail à support@perduesdevue.fr. Nous vous assisterons dans la création de votre compte.",
      };
    }
    return {
      title: "Vous n’avez pas encore de compte ?",
      body: "Rapprochez-vous de votre opticien. Il pourra créer votre compte et vous recevrez ensuite un email pour accéder à votre espace.",
    };
  }, [space]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);
    try {
            const data = await api<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          space,
        }),
      });
      setSession(data.token);
      router.push(data.user.home);
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
      } else {
        setError("Impossible de se connecter pour le moment.");
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
              <div className="col-12 col-sm-10 col-md-8 col-lg-10 col-xl-8">
                <h1 className="h3 mb-4">Content de vous revoir !</h1>
                <h2 className="h4 mb-3">Connexion</h2>
                <div className="btn-group mb-4" role="group" aria-label="Espace">
                  <button
                    type="button"
                    className={`btn ${space === "opticien" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setSpace("opticien")}
                  >
                    Espace Opticien
                  </button>
                  <button
                    type="button"
                    className={`btn ${space === "client" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setSpace("client")}
                  >
                    Espace Client
                  </button>
                </div>
                {error ? <div className="alert alert-danger">{error}</div> : null}
                <form onSubmit={onSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="email">
                      Adresse e-mail*
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={`form-control${fieldErrors.email ? " is-invalid" : ""}`}
                      placeholder="adresse@mail.fr"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <FieldError message={fieldErrors.email} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label" htmlFor="password">
                      Mot de passe*
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className={`form-control${fieldErrors.password ? " is-invalid" : ""}`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <FieldError message={fieldErrors.password} />
                  </div>
                  <div className="text-end mb-4">
                    <Link href={`/mot-de-passe-oublie?space=${space}`}>Mot de passe oublié</Link>
                  </div>
                  <button className="btn btn-primary w-100" type="submit" disabled={pending}>
                    {pending ? "Connexion…" : "Se connecter"}
                  </button>
                </form>
                <div className="card mt-4">
                  <div className="card-body">
                    <p className="card-title mb-2">{help.title}</p>
                    <p className="card-text mb-0">{help.body}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
