"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteAccountModal, LogoutModal } from "@/components/client/ClientModals";
import { api, ApiRequestError, clearSession } from "@/lib/api";

const SUPPORT = "support@perduesdevue.com";

export default function ClientSettingsPage() {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function logout() {
    setPending(true);
    void api("/auth/logout", { method: "POST" }).finally(() => {
      clearSession();
      router.push("/login?space=client");
    });
  }

  async function deleteAccount() {
    setPending(true);
    setError(null);
    try {
      await api("/client/account", { method: "DELETE" });
      clearSession();
      router.push("/login?space=client");
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Suppression impossible.");
      setPending(false);
    }
  }

  return (
    <>
      <Link href="/client" className="pdv-back-link">
        <img src="/icons/pdv/chevron-right.svg" alt="" width={16} height={16} className="pdv-back-link__chevron" />
        Revenir à l’accueil
      </Link>
      <h1 className="pdv-client-page-title">Paramètres du compte</h1>

      <h2 className="pdv-settings-section-title">Mon compte</h2>
      <div className="pdv-settings-list mb-4">
        <Link className="pdv-settings-item" href="/client/parametres/informations">
          <span className="pdv-settings-item__label">
            <img src="/icons/pdv/users-01.svg" alt="" width={20} height={20} />
            Informations personnelles
          </span>
          <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
        </Link>
        <Link className="pdv-settings-item" href="/client/parametres/connexion">
          <span className="pdv-settings-item__label">
            <img src="/icons/pdv/passcode.svg" alt="" width={20} height={20} />
            Informations de connexion
          </span>
          <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
        </Link>
        <Link className="pdv-settings-item" href="/client/parametres/notifications">
          <span className="pdv-settings-item__label">
            <img src="/icons/pdv/bell-02.svg" alt="" width={20} height={20} />
            Notifications
          </span>
          <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
        </Link>
        <button type="button" className="pdv-settings-item" onClick={() => setLogoutOpen(true)}>
          <span className="pdv-settings-item__label">
            <img src="/icons/pdv/log-out-01.svg" alt="" width={20} height={20} />
            Se déconnecter
          </span>
        </button>
        <button type="button" className="pdv-settings-item pdv-settings-item--danger" onClick={() => setDeleteOpen(true)}>
          <span className="pdv-settings-item__label">Supprimer mon compte</span>
        </button>
      </div>

      <h2 className="pdv-settings-section-title">Documents légaux</h2>
      <div className="pdv-settings-list mb-4">
        <a className="pdv-settings-item" href={`mailto:${SUPPORT}`}>
          <span className="pdv-settings-item__label">Conditions générales d’utilisation</span>
        </a>
        <a className="pdv-settings-item" href={`mailto:${SUPPORT}`}>
          <span className="pdv-settings-item__label">Politique de confidentialité</span>
        </a>
      </div>

      <aside className="pdv-help-card">
        <p className="pdv-help-card__title">Vous avez besoin d’aide ?</p>
        <p className="pdv-help-card__body">
          Notre support client est à votre disposition pour répondre à toutes vos questions. Vous pouvez nous
          contacter par mail à {SUPPORT}.
        </p>
      </aside>

      {logoutOpen ? (
        <LogoutModal pending={pending} onConfirm={logout} onClose={() => setLogoutOpen(false)} />
      ) : null}
      {deleteOpen ? (
        <DeleteAccountModal
          pending={pending}
          error={error}
          onConfirm={() => void deleteAccount()}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}
    </>
  );
}
