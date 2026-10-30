"use client";

import { useEffect, useState } from "react";
import ConnexionSettings from "@/components/ConnexionSettings";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

export default function OpticienConnexionPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void api<AuthUser>("/auth/me").then(setUser);
  }, []);

  if (!user) {
    return <p>Chargement…</p>;
  }

  return (
    <ConnexionSettings backHref="/opticien/parametres" accountPrefix="/opticien/account" email={user.email} />
  );
}
