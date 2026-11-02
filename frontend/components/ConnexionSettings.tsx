"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AppToast from "@/components/AppToast";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
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
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="pdv-field__label">Adresse e-mail</span>
          <PdvButton type="button" variant="tertiary" onClick={() => setEditEmail((open) => !open)}>
            Modifier
          </PdvButton>
        </div>
        {editEmail ? (
          <form className="d-flex flex-column gap-3" onSubmit={(event) => void saveEmail(event)}>
            <PdvField
              id="connexion-email"
              label="Nouvelle adresse e-mail*"
              type="email"
              value={email}
              error={fieldErrors.email}
              required
              onChange={(event) => setEmail(event.target.value)}
            />
            <PdvField
              id="current-email"
              label="Mot de passe actuel*"
              type="password"
              autoComplete="current-password"
              value={currentForEmail}
              error={fieldErrors.current_password}
              required
              onChange={(event) => setCurrentForEmail(event.target.value)}
            />
            <PdvButton type="submit" variant="primary" size="l" disabled={pending}>
              Enregistrer
            </PdvButton>
          </form>
        ) : (
          <p className="pdv-field__hint mb-0">{displayEmail}</p>
        )}
      </div>
      <div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="pdv-field__label">Mot de passe</span>
          <PdvButton type="button" variant="tertiary" onClick={() => setEditPassword((open) => !open)}>
            Modifier
          </PdvButton>
        </div>
        {editPassword ? (
          <form className="d-flex flex-column gap-3" onSubmit={(event) => void savePassword(event)}>
            <PdvField
              id="current-password"
              label="Mot de passe actuel*"
              type="password"
              autoComplete="current-password"
              value={currentForPassword}
              error={fieldErrors.current_password}
              required
              onChange={(event) => setCurrentForPassword(event.target.value)}
            />
            <PdvField
              id="new-password"
              label="Nouveau mot de passe*"
              type="password"
              autoComplete="new-password"
              value={password}
              error={fieldErrors.password}
              required
              onChange={(event) => setPassword(event.target.value)}
            />
            <PdvField
              id="confirm-password"
              label="Confirmation*"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              hint="8 caractères minimum, une majuscule et un chiffre."
              required
              onChange={(event) => setPasswordConfirmation(event.target.value)}
            />
            <PdvButton type="submit" variant="primary" size="l" disabled={pending}>
              Enregistrer
            </PdvButton>
          </form>
        ) : (
          <p className="pdv-field__hint mb-0">••••••••••</p>
        )}
      </div>
    </>
  );
}
