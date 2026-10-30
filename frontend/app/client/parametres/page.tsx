"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteAccountModal, LogoutModal } from "@/components/client/ClientModals";
import { api, ApiRequestError, clearSession } from "@/lib/api";

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
      <p>
        <Link href="/client">Revenir à l’accueil</Link>
      </p>
      <h1 className="h4 mb-4">Paramètres du compte</h1>
      <div className="list-group mb-4">
        <Link className="list-group-item list-group-item-action" href="/client/parametres/informations">
          Informations personnelles
        </Link>
        <Link className="list-group-item list-group-item-action" href="/client/parametres/connexion">
          Informations de connexion
        </Link>
        <Link className="list-group-item list-group-item-action" href="/client/parametres/notifications">
          Notifications
        </Link>
        <button type="button" className="list-group-item list-group-item-action" onClick={() => setDeleteOpen(true)}>
          Supprimer mon compte
        </button>
      </div>
      <div className="list-group mb-4">
        <a className="list-group-item list-group-item-action" href="mailto:support@perduesdevue.fr">
          Conditions générales d’utilisation
        </a>
        <a className="list-group-item list-group-item-action" href="mailto:support@perduesdevue.fr">
          Politique de confidentialité
        </a>
        <button type="button" className="list-group-item list-group-item-action" onClick={() => setLogoutOpen(true)}>
          Me déconnecter
        </button>
      </div>
      <div className="alert alert-info">
        <p className="fw-semibold mb-1">Besoin d’aide ?</p>
        <p className="mb-0">
          Notre support client est à votre disposition pour répondre à toutes vos questions. Vous pouvez nous
          contacter par mail à <a href="mailto:support@perduesdevue.fr">support@perduesdevue.fr</a>.
        </p>
      </div>
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
