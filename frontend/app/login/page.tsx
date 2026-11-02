"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import PdvToggle from "@/components/pdv/PdvToggle";
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

  const help = useMemo(() => {
    if (space === "opticien") {
      return {
        title: "Vous êtes opticien et vous n’avez pas encore de compte ?",
        body: "Vous pouvez nous contacter par mail à support@perduesdevue.com. Nous vous assisterons dans la création de votre compte.",
      };
    }
    return {
      title: "Vous n’avez pas encore de compte ?",
      body: "Rapprochez-vous de votre opticien. Il pourra créer votre compte et vous recevrez un email pour accéder à votre espace.",
    };
  }, [space]);

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
          <div className="pdv-login__pattern" aria-hidden>
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
          </div>
          <img className="pdv-login__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
        </header>

        <div className="pdv-login__body">
          <h1 className="pdv-login__title">Bienvenue chez Perdues de Vue !</h1>

          <div className="pdv-login__section">
            <h2 className="pdv-login__subtitle">Connexion</h2>

            <PdvToggle
              checked={space === "client"}
              onChange={(isClient) => selectSpace(isClient ? "client" : "opticien")}
              leftLabel="Espace Opticien"
              rightLabel="Espace Client"
              ariaLabel="Choisir l’espace Opticien ou Client"
            />

            {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

            <form className="pdv-login__form" onSubmit={onSubmit} noValidate>
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

              <div className="pdv-login__submit">
                <PdvButton variant="primary" size="l" block type="submit" disabled={pending}>
                  {pending ? "Connexion…" : "Se connecter"}
                </PdvButton>

                <aside className="pdv-login__help">
                  <p className="pdv-login__help-title">{help.title}</p>
                  <p className="pdv-login__help-body">{help.body}</p>
                </aside>
              </div>
            </form>
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
