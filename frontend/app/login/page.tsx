"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import LoginPattern from "@/components/LoginPattern";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import PdvSegmented from "@/components/pdv/PdvSegmented";
import { api, ApiRequestError, setSession } from "@/lib/api";
import type { AuthUser, Space } from "@/lib/types";

type LoginSpace = Exclude<Space, "admin">;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpace: LoginSpace = searchParams.get("space") === "opticien" ? "opticien" : "client";
  const [space, setSpace] = useState<LoginSpace>(initialSpace);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const helpTitle =
    space === "opticien"
      ? "Vous êtes opticien et vous n’avez pas encore de compte ?"
      : "Vous n’avez pas encore de compte ?";

  function selectSpace(next: LoginSpace) {
    setSpace(next);
    router.replace(`/login?space=${next}`, { scroll: false });
  }

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
    <div className="pdv-login">
      <BrandPanel />

      <div className="pdv-login__main">
        <header className="pdv-login__hero pdv-login__hero--mobile">
          <LoginPattern />
          <img className="pdv-login__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
        </header>

        <div className="container pdv-login__body">
          <h1 className="pdv-login__title">Bienvenue chez Perdues de Vue !</h1>

          <form className="pdv-login__stack" onSubmit={onSubmit} noValidate>
            <div className="pdv-login__section">
              <h2 className="pdv-login__subtitle">Connexion</h2>

              <PdvSegmented
                value={space}
                onChange={selectSpace}
                ariaLabel="Choisir l’espace Opticien ou Client"
                options={[
                  { value: "opticien", label: "Espace Opticien" },
                  { value: "client", label: "Espace Client" },
                ]}
              />

              {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

              <div className="pdv-login__fields">
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
                </div>

                <div className="pdv-field">
                  <label className="pdv-field__label" htmlFor="password">
                    Mot de passe*
                  </label>
                  <div className="pdv-field__password">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className={`pdv-field__control${fieldErrors.password ? " is-invalid" : ""}`}
                      value={password}
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
                  <div className="pdv-field__forgot">
                    <Link href={`/mot-de-passe-oublie?space=${space}`}>Mot de passe oublié</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="pdv-login__submit">
              <PdvButton variant="primary" size="l" block type="submit" disabled={pending}>
                {pending ? "Connexion…" : "Se connecter"}
              </PdvButton>

              <aside className="pdv-login__help">
                <p className="pdv-login__help-title">{helpTitle}</p>
                {space === "opticien" ? (
                  <p className="pdv-login__help-body">
                    Vous pouvez nous contacter par mail à{" "}
                    <a href="mailto:support@perduesdevue.com">support@perduesdevue.com</a>. Nous vous
                    assisterons dans la création de votre compte.
                  </p>
                ) : (
                  <p className="pdv-login__help-body">
                    Rapprochez-vous de votre opticien. Il créera votre compte et vous recevrez un email
                    pour accéder à votre espace.
                  </p>
                )}
              </aside>
            </div>
          </form>
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
