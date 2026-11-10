"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import BrandPanel from "@/components/BrandPanel";
import LoginPattern from "@/components/LoginPattern";
import FieldError from "@/components/FieldError";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCheckbox from "@/components/pdv/PdvCheckbox";
import PdvPasswordRules, { passwordMeetsRules } from "@/components/pdv/PdvPasswordRules";
import { api, ApiRequestError, setSession } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

type Invitation = {
  email: string;
  first_name: string;
  last_name: string;
  cgu_required: boolean;
};

function AuthHero() {
  return (
    <header className="pdv-login__hero pdv-login__hero--mobile">
      <LoginPattern />
      <img className="pdv-login__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
    </header>
  );
}

function InvitationBlocked({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="pdv-login pdv-login--blocked">
      <BrandPanel />
      <div className="pdv-login__main">
        <AuthHero />
        <div className="pdv-login__body">
          <section className="pdv-invite-used">
            <div className="pdv-invite-used__copy">
              <p className="pdv-invite-used__title">{title}</p>
              <p className="pdv-invite-used__body">{body}</p>
            </div>
            <PdvButton href="/login?space=client" variant="tertiary">
              Me connecter
            </PdvButton>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cgu, setCgu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    api<Invitation>(`/auth/invitation/${token}`)
      .then(setInvitation)
      .catch((caught) => {
        const code = caught instanceof ApiRequestError ? caught.errors[0]?.code : undefined;
        setErrorCode(code ?? "link_invalid");
      });
  }, [token]);

  const passwordInvalid = passwordTouched && !passwordMeetsRules(password);
  const confirmationMismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit =
    passwordMeetsRules(password) && password === confirmation && cgu && !pending;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordTouched(true);
    if (!canSubmit) {
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await api<{ token: string; user: AuthUser }>(`/auth/invitation/${token}`, {
        method: "POST",
        body: JSON.stringify({
          password,
          password_confirmation: confirmation,
          cgu_accepted: cgu,
        }),
      });
      setSession(data.token);
      router.push(data.user.home);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const code = caught.errors[0]?.code;
        if (code === "already_used" || code === "link_expired" || code === "link_invalid") {
          setErrorCode(code);
          return;
        }
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

  if (errorCode === "already_used") {
    return (
      <InvitationBlocked
        title="Ce compte a déjà été activé"
        body="Connectez-vous à votre espace pour retrouver toutes vos informations."
      />
    );
  }

  if (errorCode) {
    return (
      <InvitationBlocked
        title="Ce lien n’est plus valide"
        body="Connectez-vous à votre espace pour retrouver toutes vos informations."
      />
    );
  }

  if (!invitation) {
    return (
      <div className="pdv-login">
        <BrandPanel />
        <div className="pdv-login__main">
          <AuthHero />
        </div>
      </div>
    );
  }

  return (
    <div className="pdv-login">
      <BrandPanel />
      <div className="pdv-login__main">
        <AuthHero />
        <div className="pdv-login__body">
          <h1 className="pdv-login__title">Bienvenue chez Perdues de Vue !</h1>

          <div className="pdv-login__section">
            <h2 className="pdv-login__subtitle">Activer votre espace</h2>

            {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

            <form className="pdv-login__form pdv-login__form--invite" onSubmit={onSubmit} noValidate>
                <div className="pdv-login__fields">
                  <div className="pdv-field">
                    <label className="pdv-field__label" htmlFor="email">
                      Adresse e-mail*
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="pdv-field__control"
                      value={invitation.email}
                      autoComplete="username"
                      readOnly
                    />
                  </div>

                  <div className="pdv-password-field">
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
                    </div>
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
                        className={`pdv-field__control${confirmationMismatch ? " is-invalid" : ""}`}
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
                    <FieldError
                      message={
                        confirmationMismatch ? "La confirmation du mot de passe ne correspond pas." : undefined
                      }
                    />
                  </div>
                </div>

                <div className="pdv-login__submit">
                  <div className="pdv-login__consent">
                    <PdvCheckbox
                      checked={cgu}
                      aria-label="J’accepte les CGU et la politique de confidentialité"
                      onChange={setCgu}
                    />
                    <p className="pdv-login__consent-text">
                      J’accepte les <a href="#cgu">CGU</a> et j’ai pris connaissance de la{" "}
                      <a href="#confidentialite">Politique de confidentialité.</a>
                    </p>
                  </div>
                  {fieldErrors.cgu_accepted ? <p className="pdv-field__error">{fieldErrors.cgu_accepted}</p> : null}

                  <PdvButton type="submit" variant="primary" size="l" block disabled={!canSubmit}>
                    {pending ? "Activation…" : "Se connecter"}
                  </PdvButton>
                </div>
              </form>
          </div>
        </div>
      </div>
    </div>
  );
}
