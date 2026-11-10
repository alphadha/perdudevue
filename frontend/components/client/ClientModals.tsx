"use client";

import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import type { ClientPair } from "@/lib/types";

type LostProps = {
  pair: ClientPair;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeclareLostModal({ pending, onConfirm, onClose }: LostProps) {
  return (
    <BootstrapModal title="Déclarer comme perdue" variant="client" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de déclarer cette paire de lunette comme perdue.</p>
        <p>
          Si vos lunettes sont retrouvées et déposées chez un opticien partenaire, vous en serez informé pour les
          récupérer
        </p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={onConfirm}>
          Déclarer comme perdue
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}

export function CancelLostModal({ pending, onConfirm, onClose }: Omit<LostProps, "pair">) {
  return (
    <BootstrapModal title="J’ai retrouvé mes lunettes" variant="client" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de confirmer que vous avez retrouvé vos lunettes.</p>
        <p>
          Si vous confirmez, votre déclaration de perte sera supprimée et le statut de votre paire passera à « Active
          ».
        </p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={onConfirm}>
          J’ai retrouvé mes lunettes
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}

export function ClientInactiveModal({ pending, onConfirm, onClose }: LostProps) {
  return (
    <BootstrapModal title="Déclarer comme inactive" variant="client" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de déclarer cette paire de lunette comme inactive.</p>
        <p>Une paire inactive correspond à une paire définitivement perdue ou cassée.</p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={onConfirm}>
          Déclarer comme inactive
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}

export function ArchivePairModal({ pending, onConfirm, onClose }: Omit<LostProps, "pair">) {
  return (
    <BootstrapModal title="Supprimer une paire" variant="client" onClose={onClose}>
      <div className="modal-body">
        <p>Vous êtes sur le point de supprimer définitivement cette paire de lunettes.</p>
        <p>Elle ne sera plus visible dans votre espace ni dans celui de l’opticien. Cette action est irréversible.</p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="danger" size="l" block disabled={pending} onClick={onConfirm}>
          Supprimer définitivement
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
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
    <BootstrapModal title="Supprimer mon compte" variant="client" className="pdv-modal--client-pad24" onClose={onClose}>
      <div className="modal-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <p>
          Êtes-vous certain(e) de vouloir supprimer votre compte Perdues de vue ?
          <br />
          Toutes vos données seront supprimées.
        </p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="danger" size="l" block disabled={pending} onClick={onConfirm}>
          Supprimer mon compte
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Conserver mon compte
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}

export function LogoutModal({
  pending,
  onConfirm,
  onClose,
  variant = "default",
}: LogoutProps & { variant?: "default" | "client" }) {
  return (
    <BootstrapModal title="Se déconnecter" variant={variant} onClose={onClose}>
      <div className="modal-body">
        <p>Êtes-vous sûr(e) de vouloir vous déconnecter ?</p>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={onConfirm}>
          Me déconnecter
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}
