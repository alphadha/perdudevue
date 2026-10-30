"use client";

import Link from "next/link";
import { downloadAssignedCode } from "@/lib/pairUi";
import type { ShopPair } from "@/lib/types";

type Props = {
  pair: ShopPair;
  onEngrave: (pair: ShopPair) => void;
  onInactivate: (pair: ShopPair) => void;
  onHandOver?: () => void;
  onResend?: (pair: ShopPair) => void;
  onDownloadLabel?: (pair: ShopPair) => void;
  onMarkShipped?: (pair: ShopPair) => void;
};

export default function PairRowMenu({
  pair,
  onEngrave,
  onInactivate,
  onHandOver,
  onResend,
  onDownloadLabel,
  onMarkShipped,
}: Props) {
  return (
    <div className="dropdown">
      <button
        className="pdv-icon-btn"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Actions"
      >
        <img src="/icons/pdv/dots-vertical.svg" alt="" width={20} height={20} />
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li>
          <Link className="dropdown-item" href={`/opticien/lunettes/${pair.uuid}`}>
            Voir la fiche
          </Link>
        </li>
        {pair.status === "a_graver" ? (
          <>
            <li>
              <button type="button" className="dropdown-item" onClick={() => downloadAssignedCode(pair)}>
                Exporter le code assigné
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={() => onEngrave(pair)}>
                Indiquer comme gravée
              </button>
            </li>
          </>
        ) : null}
        {pair.status === "active" ? (
          <li>
            <button type="button" className="dropdown-item" onClick={() => onInactivate(pair)}>
              Déclarer comme inactive
            </button>
          </li>
        ) : null}
        {pair.actions.can_hand_over ? (
          <>
            <li>
              <button type="button" className="dropdown-item" onClick={() => onHandOver?.()}>
                Remettre au client
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={() => onResend?.(pair)}>
                Relancer le client
              </button>
            </li>
          </>
        ) : pair.status === "a_recuperer" ? (
          <>
            <li>
              <button type="button" className="dropdown-item disabled" disabled>
                Remettre au client
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item disabled" disabled>
                Relancer le client
              </button>
            </li>
          </>
        ) : null}
        {pair.actions.can_download_label || pair.actions.can_mark_shipped ? (
          <>
            <li>
              <button
                type="button"
                className="dropdown-item"
                disabled={!pair.actions.can_download_label}
                onClick={() => onDownloadLabel?.(pair)}
              >
                Télécharger le bordereau
              </button>
            </li>
            <li>
              <button
                type="button"
                className="dropdown-item"
                disabled={!pair.actions.can_mark_shipped}
                onClick={() => onMarkShipped?.(pair)}
              >
                Indiquer comme en livraison
              </button>
            </li>
          </>
        ) : pair.status === "livraison_demandee" ? (
          <>
            <li>
              <button type="button" className="dropdown-item disabled" disabled>
                Télécharger le bordereau
              </button>
            </li>
            <li>
              <button type="button" className="dropdown-item disabled" disabled>
                Indiquer comme en livraison
              </button>
            </li>
          </>
        ) : null}
      </ul>
    </div>
  );
}
