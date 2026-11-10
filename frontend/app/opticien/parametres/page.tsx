"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutModal } from "@/components/client/ClientModals";
import { api, clearSession } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

const LEGAL = "mailto:support@perduesdevue.com";

const LEGAL_LINKS = [
  { href: LEGAL, label: "Conditions générales d’utilisation" },
  { href: LEGAL, label: "Politique de confidentialité" },
];

export default function OpticienSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<AuthUser>("/auth/me").then(setUser);
  }, []);

  function logout() {
    setPending(true);
    void api("/auth/logout", { method: "POST" }).finally(() => {
      clearSession();
      router.push("/login?space=opticien");
    });
  }

  if (!user) {
    return <p>Chargement…</p>;
  }

  return (
    <>
      <h1 className="pdv-settings-title">Paramètres du compte</h1>
      <div className="pdv-settings-grid">
        <section>
          <h2 className="pdv-settings-section-title">Mon compte</h2>
          <div className="pdv-settings-list">
            <Link className="pdv-settings-item" href="/opticien/parametres/connexion">
              <span className="pdv-settings-item__label">
                <img src="/icons/pdv/lock-01.svg" alt="" width={20} height={20} className="pdv-settings-item__icon" />
                Informations de connexion
              </span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={24} height={24} className="pdv-settings-item__trail" />
            </Link>
            {user?.role === "opticien_admin" ? (
              <Link className="pdv-settings-item" href="/opticien/parametres/equipe">
                <span className="pdv-settings-item__label">
                  <img src="/icons/pdv/users-01.svg" alt="" width={20} height={20} className="pdv-settings-item__icon" />
                  Mon équipe
                </span>
                <img src="/icons/pdv/chevron-right.svg" alt="" width={24} height={24} className="pdv-settings-item__trail" />
              </Link>
            ) : null}
            <button type="button" className="pdv-settings-item" onClick={() => setLogoutOpen(true)}>
              <span className="pdv-settings-item__label">
                <img src="/icons/pdv/log-out-04.svg" alt="" width={20} height={20} />
                Se déconnecter
              </span>
            </button>
          </div>
        </section>
        <section>
          <h2 className="pdv-settings-section-title">Documents légaux</h2>
          <div className="pdv-settings-list">
            {LEGAL_LINKS.map((item) => (
              <a
                key={item.label}
                className="pdv-settings-item"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className="pdv-settings-item__label">
                  <img src="/icons/pdv/file-02.svg" alt="" width={20} height={20} />
                  {item.label}
                </span>
                <img src="/icons/pdv/arrow-up-s-line.svg" alt="" width={24} height={24} className="pdv-settings-item__trail" />
              </a>
            ))}
          </div>
        </section>
      </div>
      {logoutOpen ? (
        <LogoutModal pending={pending} onConfirm={logout} onClose={() => setLogoutOpen(false)} />
      ) : null}
    </>
  );
}
