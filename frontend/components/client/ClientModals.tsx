"use client";

import BootstrapModal from "@/components/opticien/BootstrapModal";
import type { ClientPair, ClientShop } from "@/lib/types";

type LostProps = {
  pair: ClientPair;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeclareLostModal({ pair, pending, onConfirm, onClose }: LostProps) {
  return (
    <BootstrapModal title="Déclarer comme perdue" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de déclarer cette paire de lunette comme perdue.</p>
        <p>
          Si vos lunettes sont retrouvées et déposées chez un opticien partenaire, vous en serez informé pour les
          récupérer.
        </p>
        <div className="card">
          <div className="card-body py-2">
            <p className="mb-1">{pair.title}</p>
            <p className="small text-secondary mb-0">Code assigné : {pair.assigned_code}</p>
          </div>
        </div>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={onConfirm}>
          Déclarer comme perdue
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

export function CancelLostModal({ pending, onConfirm, onClose }: Omit<LostProps, "pair">) {
  return (
    <BootstrapModal title="J’ai retrouvé mes lunettes" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de confirmer que vous avez retrouvé vos lunettes.</p>
        <p className="mb-0">
          Si vous confirmez, votre déclaration de perte sera supprimée et le statut de votre paire passera à « Active
          ».
        </p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={onConfirm}>
          J’ai retrouvé mes lunettes
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

export function ClientInactiveModal({ pair, pending, onConfirm, onClose }: LostProps) {
  return (
    <BootstrapModal title="Déclarer comme inactive" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de déclarer cette paire de lunette comme inactive.</p>
        <p>Une paire inactive correspond à une paire définitivement perdue ou cassée.</p>
        <div className="card">
          <div className="card-body py-2">
            <p className="mb-1">{pair.title}</p>
            <p className="small text-secondary mb-0">Code assigné : {pair.assigned_code}</p>
          </div>
        </div>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={onConfirm}>
          Déclarer comme inactive
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

export function ArchivePairModal({ pending, onConfirm, onClose }: Omit<LostProps, "pair">) {
  return (
    <BootstrapModal title="Supprimer définitivement la paire" onClose={onClose}>
      <div className="modal-body">
        <p className="mb-0">
          Cette action est irréversible. La paire disparaîtra de votre espace. Le code assigné ne sera jamais
          réutilisé.
        </p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-danger w-100" disabled={pending} onClick={onConfirm}>
          Supprimer définitivement la paire
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

type MapProps = {
  shop: ClientShop;
  onClose: () => void;
};

export function MapModal({ shop, onClose }: MapProps) {
  const address = [shop.address, shop.postal_code, shop.city].filter(Boolean).join(", ");

  return (
    <BootstrapModal title="Localisation" onClose={onClose}>
      <div className="modal-body">
        <p className="fw-semibold mb-1">{shop.name}</p>
        <p className="mb-0">{address}</p>
      </div>
      <div className="modal-footer flex-column gap-2">
        <a className="btn btn-primary w-100" href={shop.maps_url} target="_blank" rel="noreferrer">
          Ouvrir dans Maps
        </a>
        {shop.waze_url ? (
          <a className="btn btn-outline-primary w-100" href={shop.waze_url} target="_blank" rel="noreferrer">
            Ouvrir dans Waze
          </a>
        ) : null}
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

type LogoutProps = {
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteAccountModal({ pending, onConfirm, onClose, error }: LogoutProps & { error?: string | null }) {
  return (
    <BootstrapModal title="Supprimer mon compte" onClose={onClose}>
      <div className="modal-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <p className="mb-0">
          Êtes-vous certain(e) de vouloir supprimer votre compte Perdues de vue ? Toutes vos données seront
          supprimées.
        </p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-danger w-100" disabled={pending} onClick={onConfirm}>
          Supprimer mon compte
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

export function LogoutModal({ pending, onConfirm, onClose }: LogoutProps) {
  return (
    <BootstrapModal title="Se déconnecter" onClose={onClose}>
      <div className="modal-body">
        <p className="mb-0">Êtes-vous sûr(e) de vouloir vous déconnecter ?</p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={onConfirm}>
          Me déconnecter
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}
