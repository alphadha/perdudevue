"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutModal } from "@/components/client/ClientModals";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import { api, ApiRequestError, clearSession } from "@/lib/api";

const LEGAL = "mailto:support@perduesdevue.com";

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
      <h1 className="pdv-settings-title">Paramètres du compte</h1>
      <div className="pdv-settings-grid">
        <section>
          <h2 className="pdv-settings-section-title">Mon compte</h2>
          <div className="pdv-settings-list">
            <Link className="pdv-settings-item" href="/opticien/parametres/connexion">
              <span className="pdv-settings-item__label">
                <img src="/icons/pdv/passcode.svg" alt="" width={20} height={20} className="pdv-settings-item__icon" />
                Informations de connexion
              </span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </Link>
            <button type="button" className="pdv-settings-item" onClick={() => setLogoutOpen(true)}>
              <span className="pdv-settings-item__label">
                <img src="/icons/pdv/log-out-01.svg" alt="" width={20} height={20} />
                Se déconnecter
              </span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </button>
            <button type="button" className="pdv-settings-item" onClick={() => setDeleteOpen(true)}>
              <span className="pdv-settings-item__label">Supprimer mon compte</span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </button>
          </div>
        </section>
        <section>
          <h2 className="pdv-settings-section-title">Documents légaux</h2>
          <div className="pdv-settings-list">
            <a className="pdv-settings-item" href={LEGAL}>
              <span className="pdv-settings-item__label">Conditions générales d’utilisation</span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </a>
            <a className="pdv-settings-item" href={LEGAL}>
              <span className="pdv-settings-item__label">Conditions générales de Vente</span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </a>
            <a className="pdv-settings-item" href={LEGAL}>
              <span className="pdv-settings-item__label">Politique de confidentialité</span>
              <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
            </a>
          </div>
        </section>
      </div>
      {logoutOpen ? (
        <LogoutModal pending={pending} onConfirm={logout} onClose={() => setLogoutOpen(false)} />
      ) : null}
      {deleteOpen ? (
        <BootstrapModal title="Supprimer mon compte" onClose={() => setDeleteOpen(false)}>
          <div className="modal-body">
            {error ? <div className="alert alert-danger">{error}</div> : null}
            <p className="mb-0">
              Cette action est définitive. Confirmez-vous la suppression de votre compte opticien ?
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteOpen(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger" disabled={pending} onClick={() => void deleteAccount()}>
              {pending ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
