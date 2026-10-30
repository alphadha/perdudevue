"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AppToast from "@/components/AppToast";
import FieldError from "@/components/FieldError";
import { api, ApiRequestError } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

type Props = {
  backHref: string;
  accountPrefix: "/client/account" | "/opticien/account";
  email: string;
};

export default function ConnexionSettings({ backHref, accountPrefix, email: initialEmail }: Props) {
  const [editEmail, setEditEmail] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [displayEmail, setDisplayEmail] = useState(initialEmail);
  const [currentForEmail, setCurrentForEmail] = useState("");
  const [currentForPassword, setCurrentForPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
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

  async function saveEmail(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    try {
      const updated = await api<AuthUser>(`${accountPrefix}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email, current_password: currentForEmail }),
      });
      setDisplayEmail(updated.email);
      setEmail(updated.email);
      setEditEmail(false);
      setCurrentForEmail("");
      showToast("Adresse e-mail mise à jour.");
    } catch (caught) {
      captureErrors(caught);
    } finally {
      setPending(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
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
      setEditPassword(false);
      setCurrentForPassword("");
      setPassword("");
      setPasswordConfirmation("");
      showToast("Mot de passe mis à jour.");
    } catch (caught) {
      captureErrors(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppToast message={toast} />
      <p>
        <Link href={backHref}>Revenir aux paramètres</Link>
      </p>
      <h1 className="h4 mb-4">Informations de connexion</h1>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="form-label mb-0">Adresse e-mail</span>
          <button type="button" className="btn btn-link p-0" onClick={() => setEditEmail((open) => !open)}>
            Modifier
          </button>
        </div>
        {editEmail ? (
          <form onSubmit={(event) => void saveEmail(event)}>
            <input
              className={`form-control mb-2${fieldErrors.email ? " is-invalid" : ""}`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <FieldError message={fieldErrors.email} />
            <label className="form-label" htmlFor="current-email">
              Mot de passe actuel
            </label>
            <input
              id="current-email"
              className={`form-control mb-2${fieldErrors.current_password ? " is-invalid" : ""}`}
              type="password"
              autoComplete="current-password"
              value={currentForEmail}
              onChange={(event) => setCurrentForEmail(event.target.value)}
              required
            />
            <FieldError message={fieldErrors.current_password} />
            <button className="btn btn-primary" type="submit" disabled={pending}>
              Enregistrer
            </button>
          </form>
        ) : (
          <p className="form-control-plaintext">{displayEmail}</p>
        )}
      </div>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="form-label mb-0">Mot de passe</span>
          <button type="button" className="btn btn-link p-0" onClick={() => setEditPassword((open) => !open)}>
            Modifier
          </button>
        </div>
        {editPassword ? (
          <form onSubmit={(event) => void savePassword(event)}>
            <label className="form-label" htmlFor="current-password">
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              className={`form-control mb-2${fieldErrors.current_password ? " is-invalid" : ""}`}
              type="password"
              autoComplete="current-password"
              value={currentForPassword}
              onChange={(event) => setCurrentForPassword(event.target.value)}
              required
            />
            <FieldError message={fieldErrors.current_password} />
            <label className="form-label" htmlFor="new-password">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              className={`form-control mb-2${fieldErrors.password ? " is-invalid" : ""}`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <FieldError message={fieldErrors.password} />
            <label className="form-label" htmlFor="confirm-password">
              Confirmation
            </label>
            <input
              id="confirm-password"
              className="form-control mb-2"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
            />
            <p className="small text-secondary">8 caractères minimum, une majuscule et un chiffre.</p>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              Enregistrer
            </button>
          </form>
        ) : (
          <p className="form-control-plaintext">••••••••••</p>
        )}
      </div>
    </>
  );
}
