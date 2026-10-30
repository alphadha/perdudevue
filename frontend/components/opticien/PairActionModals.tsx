"use client";

import BootstrapModal from "@/components/opticien/BootstrapModal";
import type { ShopPair } from "@/lib/types";

type EngraveProps = {
  pair: ShopPair;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PairEngraveModal({ pending, onConfirm, onClose }: EngraveProps) {
  return (
    <BootstrapModal title="Indiquer comme gravée" onClose={onClose}>
      <div className="modal-body">
        <p>
          Vous êtes sur le point de confirmer que la paire de lunettes a bien été gravée. Cette action est
          irréversible.
        </p>
        <p className="mb-0">Ne confirmez que si la paire a bien été gravée.</p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={onConfirm}>
          Indiquer comme gravée
        </button>
        <button type="button" className="btn btn-link" onClick={onClose}>
          Annuler
        </button>
      </div>
    </BootstrapModal>
  );
}

type InactiveProps = {
  pair: ShopPair;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function PairInactiveModal({ pair, pending, onConfirm, onClose }: InactiveProps) {
  return (
    <BootstrapModal title="Déclarer la paire comme inactive" onClose={onClose}>
      <div className="modal-body">
        <p className="mb-0">
          Vous êtes sur le point de déclarer la paire “{pair.title}” comme inactive. Une paire inactive
          correspond à une paire définitivement perdue ou cassée par le client.
        </p>
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
