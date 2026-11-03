"use client";

import { FormEvent, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
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
    return (
      <div className="pdv-client-fiche">
        <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
        <p className="pdv-client-page-sub">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pdv-client-fiche">
        <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
      </div>
    );
  }

  const dirty = consentEmail !== profile.consent_email || consentSms !== profile.consent_sms;

  return (
    <div className="pdv-client-fiche">
      <AppToast message={toast} />
      <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
      <h1 className="pdv-client-fiche__title">Notifications</h1>
      <form className="pdv-settings-card" onSubmit={(event) => void onSubmit(event)}>
        <PdvToggle
          checked={consentEmail}
          onChange={setConsentEmail}
          label="Recevoir les notifications mail"
        />
        <PdvToggle
          checked={consentSms}
          onChange={setConsentSms}
          label="Recevoir les notifications SMS"
        />
        <PdvButton type="submit" variant="primary" size="l" block disabled={pending || !dirty}>
          Enregistrer les modifications
        </PdvButton>
      </form>
    </div>
  );
}
