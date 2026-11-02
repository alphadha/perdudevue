"use client";

import PdvRowActions, { type PdvRowAction } from "@/components/pdv/PdvRowActions";
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
  const items: PdvRowAction[] = [{ label: "Voir la fiche", href: `/opticien/lunettes/${pair.uuid}` }];

  if (pair.status === "a_graver") {
    items.push(
      { label: "Exporter le code assigné", onClick: () => downloadAssignedCode(pair) },
      { label: "Indiquer comme gravée", onClick: () => onEngrave(pair) },
    );
  }

  if (pair.status === "active") {
    items.push({ label: "Déclarer comme inactive", onClick: () => onInactivate(pair) });
  }

  if (pair.actions.can_hand_over) {
    items.push(
      { label: "Remettre au client", onClick: () => onHandOver?.() },
      { label: "Relancer le client", onClick: () => onResend?.(pair) },
    );
  } else if (pair.status === "a_recuperer") {
    items.push({ label: "Remettre au client", disabled: true }, { label: "Relancer le client", disabled: true });
  }

  if (pair.actions.can_download_label || pair.actions.can_mark_shipped) {
    items.push(
      {
        label: "Télécharger le bordereau",
        disabled: !pair.actions.can_download_label,
        onClick: () => onDownloadLabel?.(pair),
      },
      {
        label: "Indiquer comme en livraison",
        disabled: !pair.actions.can_mark_shipped,
        onClick: () => onMarkShipped?.(pair),
      },
    );
  } else if (pair.status === "livraison_demandee") {
    items.push(
      { label: "Télécharger le bordereau", disabled: true },
      { label: "Indiquer comme en livraison", disabled: true },
    );
  }

  return <PdvRowActions items={items} />;
}
