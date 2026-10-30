"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import FieldError from "@/components/FieldError";
import { api, ApiRequestError, setSession } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

type Invitation = {
  email: string;
  first_name: string;
  last_name: string;
  cgu_required: boolean;
};

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cgu, setCgu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<Invitation>(`/auth/invitation/${token}`)
      .then(setInvitation)
      .catch((caught) => {
        setLoadError(caught instanceof ApiRequestError ? caught.message : "Lien d’invitation invalide.");
      });
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-6">
          <h1 className="h3 mb-3">Activez votre espace</h1>
          {loadError ? <div className="alert alert-danger">{loadError}</div> : null}
          {invitation ? (
            <>
              <p>
                Bonjour {invitation.first_name}, vos informations sont déjà renseignées ({invitation.email}).
                Définissez uniquement votre mot de passe.
              </p>
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
                    <li>8 caractères minimum</li>
                    <li>Au moins une majuscule</li>
                    <li>Au moins un chiffre</li>
                  </ul>
                </div>
                <div className="mb-3">
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
                <div className="form-check mb-4">
                  <input
                    className={`form-check-input${fieldErrors.cgu_accepted ? " is-invalid" : ""}`}
                    type="checkbox"
                    id="cgu"
                    checked={cgu}
                    onChange={(event) => setCgu(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="cgu">
                    J’accepte les conditions générales d’utilisation
                  </label>
                  <FieldError message={fieldErrors.cgu_accepted} />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={pending}>
                  Activer mon compte
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
