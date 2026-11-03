"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
import PdvPasswordRules, { passwordMeetsRules } from "@/components/pdv/PdvPasswordRules";
import { api, ApiRequestError } from "@/lib/api";
import { EMAIL_UPDATED_TOAST } from "@/lib/toasts";
import { isIdentityChallenge, type AuthUser, type IdentityChallenge } from "@/lib/types";

type Props = {
  backHref: string;
  accountPrefix: "/client/account" | "/opticien/account";
  email: string;
  variant?: "page" | "card";
};

type View = "idle" | "email-form" | "email-otp" | "password";

function EyeToggle({ onToggle, label }: { onToggle: () => void; label: string }) {
  return (
    <button type="button" className="pdv-field__eye" aria-label={label} onClick={onToggle}>
      <img src="/icons/pdv/eye.svg" alt="" width={20} height={20} />
    </button>
  );
}

export default function ConnexionSettings({
  backHref,
  accountPrefix,
  email: initialEmail,
  variant = "page",
}: Props) {
  const [view, setView] = useState<View>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [displayEmail, setDisplayEmail] = useState(initialEmail);
  const [challenge, setChallenge] = useState<IdentityChallenge | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [currentForPassword, setCurrentForPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTitle, setToastTitle] = useState<string | undefined>(undefined);

  const card = variant === "card";
  const emailLabel = card ? "Adresse mail" : "Adresse e-mail";
  const otpValue = otpDigits.join("");
  const passwordInvalid = passwordTouched && !passwordMeetsRules(password);
  const canAttemptPassword =
    currentForPassword.length > 0 && password.length > 0 && passwordConfirmation.length > 0;

  function showToast(message: string, title?: string) {
    setToastTitle(title);
    setToast(message);
    window.setTimeout(() => {
      setToast(null);
      setToastTitle(undefined);
    }, 4000);
  }

  function captureErrors(caught: unknown) {
    if (caught instanceof ApiRequestError) {
      const next: Record<string, string> = {};
      caught.errors.forEach((item) => {
        if (item.field) {
          next[item.field] = item.message;
        }
      });
      setFieldErrors(next);
      if (!caught.errors.some((item) => item.field)) {
        showToast(caught.message);
      }
      return;
    }
    showToast("Enregistrement impossible.");
  }

  function goIdle() {
    setView("idle");
    setNewEmail("");
    setChallenge(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError(null);
    setCurrentForPassword("");
    setPassword("");
    setPasswordConfirmation("");
    setShowCurrent(false);
    setShowPassword(false);
    setShowConfirmation(false);
    setPasswordTouched(false);
    setFieldErrors({});
  }

  function openPassword() {
    setCurrentForPassword("");
    setPassword("");
    setPasswordConfirmation("");
    setShowCurrent(false);
    setShowPassword(false);
    setShowConfirmation(false);
    setPasswordTouched(false);
    setFieldErrors({});
    setView("password");
  }

  async function requestEmailChange(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    try {
      const result = await api<AuthUser | IdentityChallenge>(`${accountPrefix}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email: newEmail }),
      });
      if (isIdentityChallenge(result)) {
        setChallenge(result);
        setView("email-otp");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError(null);
        return;
      }
      setDisplayEmail(result.email);
      goIdle();
      showToast(EMAIL_UPDATED_TOAST.message, EMAIL_UPDATED_TOAST.title);
    } catch (caught) {
      captureErrors(caught);
    } finally {
      setPending(false);
    }
  }

  async function confirmEmail(event: FormEvent) {
    event.preventDefault();
    if (!challenge) {
      return;
    }
    setPending(true);
    setOtpError(null);
    try {
      const updated = await api<AuthUser>(`${accountPrefix}/email/otp`, {
        method: "POST",
        body: JSON.stringify({ action_token: challenge.action_token, code: otpValue }),
      });
      setDisplayEmail(updated.email);
      goIdle();
      showToast(EMAIL_UPDATED_TOAST.message, EMAIL_UPDATED_TOAST.title);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.fieldError("code") ?? caught.message);
        return;
      }
      setOtpError("Code invalide ou expiré.");
    } finally {
      setPending(false);
    }
  }

  async function resendEmailCode() {
    if (!challenge) {
      return;
    }
    setResendPending(true);
    setOtpError(null);
    try {
      const result = await api<IdentityChallenge>(`${accountPrefix}/email/resend`, {
        method: "POST",
        body: JSON.stringify({ action_token: challenge.action_token }),
      });
      setChallenge(result);
    } catch (caught) {
      setOtpError(caught instanceof ApiRequestError ? caught.message : "Renvoi impossible.");
    } finally {
      setResendPending(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordTouched(true);
    const nextErrors: Record<string, string> = {};
    if (password !== passwordConfirmation) {
      nextErrors.password_confirmation = "La confirmation du mot de passe ne correspond pas.";
    }
    if (!passwordMeetsRules(password) || nextErrors.password_confirmation) {
      setFieldErrors(nextErrors);
      return;
    }
    setPending(true);
    setFieldErrors({});
    try {
      await api(`${accountPrefix}/password`, {
        method: "PATCH",
        body: JSON.stringify({
          current_password: currentForPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      goIdle();
      showToast("Mot de passe mis à jour.");
    } catch (caught) {
      captureErrors(caught);
    } finally {
      setPending(false);
    }
  }

  function updateDigit(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = ["", "", "", "", "", ""];
      digits.slice(0, 6).split("").forEach((digit, offset) => {
        next[offset] = digit;
      });
      setOtpDigits(next);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[index] = digits.slice(-1);
    setOtpDigits(next);
    if (digits && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function onOtpKeyDown(index: number, key: string) {
    if (key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  const idleFields = (
    <div className={card ? "pdv-connexion-card__fields" : undefined}>
      <div className={card ? undefined : "mb-4"}>
        <div className={card ? "pdv-connexion-card__row" : "d-flex justify-content-between align-items-center mb-2"}>
          <span className="pdv-field__label">{emailLabel}</span>
          <PdvButton
            type="button"
            variant="tertiary"
            onClick={() => {
              setNewEmail("");
              setFieldErrors({});
              setView("email-form");
            }}
          >
            Modifier
          </PdvButton>
        </div>
        {card ? (
          <div className="pdv-connexion-card__value">{displayEmail}</div>
        ) : (
          <p className="pdv-field__hint mb-0">{displayEmail}</p>
        )}
      </div>
      <div>
        <div className={card ? "pdv-connexion-card__row" : "d-flex justify-content-between align-items-center mb-2"}>
          <span className="pdv-field__label">Mot de passe</span>
          <PdvButton type="button" variant="tertiary" onClick={openPassword}>
            Modifier
          </PdvButton>
        </div>
        {card ? (
          <div className="pdv-connexion-card__value" aria-hidden>
            ••••••••••
          </div>
        ) : (
          <p className="pdv-field__hint mb-0">••••••••••</p>
        )}
      </div>
    </div>
  );

  const emailForm = (
    <form className="d-flex flex-column gap-3" onSubmit={(event) => void requestEmailChange(event)}>
      <PdvField id="connexion-old-email" label="Ancienne adresse mail*" type="email" value={displayEmail} readOnly />
      <PdvField
        id="connexion-new-email"
        label="Nouvelle adresse mail*"
        type="email"
        value={newEmail}
        error={fieldErrors.email}
        autoComplete="email"
        required
        onChange={(event) => setNewEmail(event.target.value)}
      />
      <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
        Enregistrer les modifications
      </PdvButton>
    </form>
  );

  const otpForm = (
    <form className="pdv-otp-form" onSubmit={(event) => void confirmEmail(event)} noValidate>
      <h2 className="pdv-otp-form__title">
        Saisis le code à 6 chiffres envoyé à {challenge?.masked_email ?? "votre nouvelle adresse"}
      </h2>
      {otpError ? <p className="pdv-field__error">{otpError}</p> : null}
      <div className="pdv-otp-form__digits" role="group" aria-label="Code à 6 chiffres">
        {otpDigits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              otpRefs.current[index] = node;
            }}
            className={`pdv-otp-form__digit${otpError ? " is-invalid" : ""}`}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            aria-label={`Chiffre ${index + 1}`}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => onOtpKeyDown(index, event.key)}
            required
          />
        ))}
      </div>
      <div className="pdv-otp-form__resend">
        <p>Vous n’avez pas reçu de code ?</p>
        <button type="button" className="pdv-otp-form__resend-btn" disabled={resendPending} onClick={() => void resendEmailCode()}>
          {resendPending ? "Envoi…" : "Renvoyer un code"}
        </button>
      </div>
      <PdvButton variant="primary" size="l" block type="submit" disabled={pending || otpValue.length < 6}>
        {pending ? "Vérification…" : "Confirmer"}
      </PdvButton>
    </form>
  );

  const passwordForm = (
    <form className="d-flex flex-column gap-3" onSubmit={(event) => void savePassword(event)} autoComplete="off">
      <PdvField
        id="current-password"
        label="Ancien mot de passe*"
        type={showCurrent ? "text" : "password"}
        autoComplete="current-password"
        value={currentForPassword}
        error={fieldErrors.current_password}
        required
        onChange={(event) => setCurrentForPassword(event.target.value)}
        trailing={
          <EyeToggle
            onToggle={() => setShowCurrent((open) => !open)}
            label={showCurrent ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          />
        }
      />
      <div>
        <PdvField
          id="new-password"
          label="Mot de passe*"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          invalid={passwordInvalid}
          required
          onBlur={() => {
            if (password.length > 0) {
              setPasswordTouched(true);
            }
          }}
          onChange={(event) => setPassword(event.target.value)}
          trailing={
            <EyeToggle
              onToggle={() => setShowPassword((open) => !open)}
              label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            />
          }
        />
        <div className="mt-2">
          <PdvPasswordRules password={password} showError={passwordInvalid} />
        </div>
      </div>
      <PdvField
        id="confirm-password"
        label="Confirmer le mot de passe*"
        type={showConfirmation ? "text" : "password"}
        autoComplete="new-password"
        value={passwordConfirmation}
        error={fieldErrors.password_confirmation}
        required
        onChange={(event) => setPasswordConfirmation(event.target.value)}
        trailing={
          <EyeToggle
            onToggle={() => setShowConfirmation((open) => !open)}
            label={showConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          />
        }
      />
      <PdvButton type="submit" variant="primary" size="l" block disabled={pending || !canAttemptPassword}>
        Enregistrer les modifications
      </PdvButton>
    </form>
  );

  const cardTitle =
    view === "password"
      ? "Modifier mon mot de passe"
      : view === "idle"
        ? "Informations de connexion"
        : "Modifier mon adresse mail";
  const pageTitle =
    view === "password" ? "Modifier mon mot de passe" : view === "idle" ? "Informations de connexion" : "Modifier mon adresse mail";

  const editor =
    view === "email-form" ? emailForm : view === "email-otp" ? otpForm : view === "password" ? passwordForm : idleFields;

  return (
    <>
      <AppToast title={toastTitle} message={toast} />
      {card ? (
        <section className="pdv-connexion-card">
          {view === "idle" ? (
            <Link className="pdv-connexion-card__back" href={backHref}>
              <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
              <h1 className="pdv-connexion-card__title">{cardTitle}</h1>
            </Link>
          ) : (
            <button type="button" className="pdv-connexion-card__back" onClick={goIdle}>
              <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
              <h1 className="pdv-connexion-card__title">{cardTitle}</h1>
            </button>
          )}
          {editor}
        </section>
      ) : view === "idle" ? (
        <div className="pdv-client-fiche">
          <ClientBackLink href={backHref}>Revenir aux paramètres</ClientBackLink>
          <h1 className="pdv-client-fiche__title">{pageTitle}</h1>
          {idleFields}
        </div>
      ) : (
        <section className="pdv-email-flow">
          <button type="button" className="pdv-back-link" onClick={goIdle}>
            <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
            Revenir aux informations
          </button>
          <h1 className="pdv-email-flow__title">{pageTitle}</h1>
          {view === "email-otp" ? (
            <p className="pdv-email-flow__lead">
              Renseignez le code reçu par mail pour vérifier et valider votre nouvelle adresse e-mail.
            </p>
          ) : null}
          <div className="pdv-connexion-card">{editor}</div>
        </section>
      )}
    </>
  );
}
