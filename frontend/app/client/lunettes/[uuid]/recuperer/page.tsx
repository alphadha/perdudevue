"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ClientBackLink from "@/components/client/ClientBackLink";
import ShopCard from "@/components/client/ShopCard";
import ShopMapModal from "@/components/client/ShopMapModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientPair } from "@/lib/types";

const PICKUP_HELP =
  "Ce code est votre preuve de propriété. Présentez-le à l'opticien de retrait pour récupérer vos lunettes. Il sera vérifié lors de la remise.";

export default function RecoverPairPage() {
  const params = useParams<{ uuid: string }>();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setPair(await api<ClientPair>(`/client/pairs/${params.uuid}`));
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger le dossier.");
    }
  }, [params.uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyCode() {
    if (!pair?.pickup_code) {
      return;
    }
    await navigator.clipboard.writeText(pair.pickup_code);
    setCopied(true);
  }

  if (error) {
    return (
      <div className="pdv-client-fiche">
        <ClientBackLink href={`/client/lunettes/${params.uuid}`}>Revenir à mes lunettes</ClientBackLink>
        <p className="pdv-client-page-sub">{error}</p>
      </div>
    );
  }

  if (!pair) {
    return <p className="pdv-client-page-sub">Chargement…</p>;
  }

  const shop = pair.depositary_shop ?? pair.origin_shop;

  return (
    <div className="pdv-client-fiche">
      <ClientBackLink href={`/client/lunettes/${pair.uuid}`}>Revenir à mes lunettes</ClientBackLink>
      <div className="pdv-client-fiche__main">
        <h1 className="pdv-client-fiche__title">Récupérer mes lunettes</h1>
        <div className="pdv-client-fiche__cards">
          <section className="pdv-pickup-card">
            <div className="pdv-pickup-card__top">
              <div>
                <p className="pdv-pickup-card__label">Code de restitution</p>
                <p className="pdv-pickup-card__code">{pair.pickup_code}</p>
              </div>
              <PdvButton type="button" variant="secondary" size="m" iconLeft="/icons/pdv/copy-06.svg" onClick={() => void copyCode()}>
                {copied ? "Copié" : "Copier"}
              </PdvButton>
            </div>
            <p className="pdv-pickup-card__help">{PICKUP_HELP}</p>
          </section>
          {shop ? <ShopCard shop={shop} title="Où les récupérer ?" onMap={() => setMapOpen(true)} /> : null}
        </div>
        <section className="pdv-delivery-card">
          <div>
            <h2 className="pdv-delivery-card__title">Je ne peux pas me déplacer</h2>
            <p className="pdv-delivery-card__body">
              Si l’opticien est trop loin de chez vous ou que vous ne pouvez pas vous y rendre, optez pour la
              livraison à domicile ou en point relais.
            </p>
          </div>
          <PdvButton
            href={`/client/lunettes/${pair.uuid}/livraison`}
            variant="secondary"
            size="l"
            block
            disabled={!pair.actions.can_request_delivery}
          >
            Me faire livrer mes lunettes
          </PdvButton>
        </section>
      </div>
      {mapOpen && shop ? <ShopMapModal shop={shop} onClose={() => setMapOpen(false)} /> : null}
    </div>
  );
}
