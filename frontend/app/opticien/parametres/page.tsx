"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutModal } from "@/components/client/ClientModals";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import { api, ApiRequestError, clearSession } from "@/lib/api";

const LEGAL = "mailto:support@perduesdevue.fr";

export default function OpticienSettingsPage() {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function logout() {
    setPending(true);
    void api("/auth/logout", { method: "POST" }).finally(() => {
      clearSession();
      router.push("/login?space=opticien");
    });
  }

  async function deleteAccount() {
    setPending(true);
    setError(null);
    try {
      await api("/opticien/account", { method: "DELETE" });
      clearSession();
      router.push("/login?space=opticien");
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Suppression impossible.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-4">Paramètres du compte</h1>
      <div className="row g-4">
        <div className="col-lg-6">
          <h2 className="h5">Mon compte</h2>
          <div className="list-group pdv-panel p-0 overflow-hidden">
            <Link className="list-group-item list-group-item-action" href="/opticien/parametres/connexion">
              Informations de connexion
            </Link>
            <button type="button" className="list-group-item list-group-item-action" onClick={() => setLogoutOpen(true)}>
              Se déconnecter
            </button>
            <button type="button" className="list-group-item list-group-item-action" onClick={() => setDeleteOpen(true)}>
              Supprimer mon compte
            </button>
          </div>
        </div>
        <div className="col-lg-6">
          <h2 className="h5">Documents légaux</h2>
          <div className="list-group">
            <a className="list-group-item list-group-item-action" href={LEGAL}>
              Conditions générales d’utilisation
            </a>
            <a className="list-group-item list-group-item-action" href={LEGAL}>
              Conditions générales de Vente
            </a>
            <a className="list-group-item list-group-item-action" href={LEGAL}>
              Politique de confidentialité
            </a>
          </div>
        </div>
      </div>
      {logoutOpen ? (
        <LogoutModal pending={pending} onConfirm={logout} onClose={() => setLogoutOpen(false)} />
      ) : null}
      {deleteOpen ? (
        <BootstrapModal title="Supprimer mon compte" onClose={() => setDeleteOpen(false)}>
          <div className="modal-body">
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <p className="mb-0">
              Cette action est définitive. Si vous êtes le dernier administrateur du magasin, contactez
              support@perduesdevue.fr.
            </p>
          </div>
          <div className="modal-footer flex-column">
            <button type="button" className="btn btn-danger w-100" disabled={pending} onClick={() => void deleteAccount()}>
              Supprimer mon compte
            </button>
            <button type="button" className="btn btn-link" onClick={() => setDeleteOpen(false)}>
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
