"use client";

import { useEffect, useState } from "react";
import ConnexionSettings from "@/components/ConnexionSettings";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientProfile } from "@/lib/types";

export default function ClientConnexionPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ClientProfile>("/client/profile")
      .then(setProfile)
      .catch((caught) => {
        setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger le compte.");
      });
  }, []);

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!profile) {
    return <p>Chargement…</p>;
  }

  return (
    <ConnexionSettings backHref="/client/parametres" accountPrefix="/client/account" email={profile.email} />
  );
}
