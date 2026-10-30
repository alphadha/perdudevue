"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

export default function ClientNotificationsPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [consentEmail, setConsentEmail] = useState(true);
  const [consentSms, setConsentSms] = useState(true);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ClientProfile>("/client/profile")
      .then((data) => {
        setProfile(data);
        setConsentEmail(data.consent_email);
        setConsentSms(data.consent_sms);
      })
      .catch((caught) => {
        setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger les préférences.");
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const data = await api<ClientProfile>("/client/profile/consents", {
        method: "PATCH",
        body: JSON.stringify({
          consent_email: consentEmail,
          consent_sms: consentSms,
        }),
      });
      setProfile(data);
      setToast("Préférences enregistrées.");
    } catch (caught) {
      setToast(caught instanceof ApiRequestError ? caught.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!profile) {
    return <p>Chargement…</p>;
  }

  const dirty = consentEmail !== profile.consent_email || consentSms !== profile.consent_sms;

  return (
    <>
      <AppToast message={toast} />
      <p>
        <Link href="/client/parametres">Revenir aux paramètres</Link>
      </p>
      <h1 className="h4 mb-4">Notifications</h1>
      <form onSubmit={(event) => void onSubmit(event)}>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="consent-email"
            checked={consentEmail}
            onChange={(event) => setConsentEmail(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="consent-email">
            Recevoir les notifications par email
          </label>
        </div>
        <div className="form-check form-switch mb-4">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="consent-sms"
            checked={consentSms}
            onChange={(event) => setConsentSms(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="consent-sms">
            Recevoir les notifications par SMS
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={pending || !dirty}>
          Enregistrer les modifications
        </button>
      </form>
    </>
  );
}
