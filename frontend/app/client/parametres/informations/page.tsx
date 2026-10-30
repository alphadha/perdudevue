"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import FieldError from "@/components/FieldError";
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
    <>
      <AppToast message={toast} />
      <p>
        <Link href="/client/parametres">Revenir aux paramètres</Link>
      </p>
      <h1 className="h4 mb-4">Informations personnelles</h1>
      <form onSubmit={(event) => void save(event)}>
        <div className="mb-3">
          <label className="form-label" htmlFor="last-name">
            Nom
          </label>
          <input
            id="last-name"
            className={`form-control${fieldErrors.last_name ? " is-invalid" : ""}`}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
          <FieldError message={fieldErrors.last_name} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="first-name">
            Prénom
          </label>
          <input
            id="first-name"
            className={`form-control${fieldErrors.first_name ? " is-invalid" : ""}`}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
          <FieldError message={fieldErrors.first_name} />
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="phone">
            Téléphone
          </label>
          <input
            id="phone"
            className={`form-control${fieldErrors.phone ? " is-invalid" : ""}`}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <button className="btn btn-primary w-100" type="submit" disabled={pending}>
          Enregistrer
        </button>
      </form>
    </>
  );
}
