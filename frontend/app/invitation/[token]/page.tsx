"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCheckbox from "@/components/pdv/PdvCheckbox";
import PdvField from "@/components/pdv/PdvField";
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
              <form className="d-flex flex-column gap-3" onSubmit={onSubmit}>
                <PdvField
                  id="password"
                  type="password"
                  label="Mot de passe*"
                  value={password}
                  error={fieldErrors.password}
                  hint="8 caractères minimum, une majuscule et un chiffre."
                  required
                  onChange={(event) => setPassword(event.target.value)}
                />
                <PdvField
                  id="confirmation"
                  type="password"
                  label="Confirmer le mot de passe*"
                  value={confirmation}
                  required
                  onChange={(event) => setConfirmation(event.target.value)}
                />
                <div className="pdv-field">
                  <div className="pdv-toggle-line">
                    <PdvCheckbox
                      checked={cgu}
                      aria-label="J’accepte les conditions générales d’utilisation"
                      onChange={setCgu}
                    />
                    <span className="pdv-toggle-line__label">J’accepte les conditions générales d’utilisation</span>
                  </div>
                  {fieldErrors.cgu_accepted ? <p className="pdv-field__error">{fieldErrors.cgu_accepted}</p> : null}
                </div>
                <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                  Activer mon compte
                </PdvButton>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
