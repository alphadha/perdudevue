"use client";

import { FormEvent, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

export default function ClientInformationsPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api<ClientProfile>("/client/profile")
      .then((data) => {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhone(data.phone ?? "");
      })
      .catch((caught) => {
        setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger le profil.");
      });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    try {
      const updated = await api<ClientProfile>("/client/profile", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
      });
      setProfile(updated);
      setToast("Informations enregistrées.");
      window.setTimeout(() => setToast(null), 4000);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const next: Record<string, string> = {};
        caught.errors.forEach((item) => {
          if (item.field) {
            next[item.field] = item.message;
          }
        });
        setFieldErrors(next);
        if (!caught.errors.some((item) => item.field)) {
          setToast(caught.message);
        }
      } else {
        setToast("Enregistrement impossible.");
      }
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

  return (
    <div className="pdv-client-fiche">
      <AppToast message={toast} />
      <ClientBackLink href="/client/parametres">Revenir aux paramètres</ClientBackLink>
      <h1 className="pdv-client-fiche__title">Informations personnelles</h1>
      <form className="d-flex flex-column gap-3" onSubmit={(event) => void save(event)}>
        <PdvField
          id="last-name"
          label="Nom"
          value={lastName}
          error={fieldErrors.last_name}
          required
          onChange={(event) => setLastName(event.target.value)}
        />
        <PdvField
          id="first-name"
          label="Prénom"
          value={firstName}
          error={fieldErrors.first_name}
          required
          onChange={(event) => setFirstName(event.target.value)}
        />
        <PdvField
          id="phone"
          label="Téléphone"
          type="tel"
          value={phone}
          error={fieldErrors.phone}
          required
          onChange={(event) => setPhone(event.target.value)}
        />
        <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
          Enregistrer
        </PdvButton>
      </form>
    </div>
  );
}
