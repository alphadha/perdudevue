"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import PdvButton from "@/components/pdv/PdvButton";
import PdvToggle from "@/components/pdv/PdvToggle";
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
      <form className="d-flex flex-column gap-3" onSubmit={(event) => void onSubmit(event)}>
        <PdvToggle
          checked={consentEmail}
          onChange={setConsentEmail}
          label="Recevoir les notifications par email"
        />
        <PdvToggle
          checked={consentSms}
          onChange={setConsentSms}
          label="Recevoir les notifications par SMS"
        />
        <PdvButton type="submit" variant="primary" size="l" block disabled={pending || !dirty}>
          Enregistrer les modifications
        </PdvButton>
      </form>
    </>
  );
}
