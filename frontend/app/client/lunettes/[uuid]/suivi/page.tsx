"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ClientBackLink from "@/components/client/ClientBackLink";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientPair } from "@/lib/types";

export default function TrackDeliveryPage() {
  const params = useParams<{ uuid: string }>();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPair(await api<ClientPair>(`/client/pairs/${params.uuid}`));
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Suivi introuvable.");
    }
  }, [params.uuid]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const shipment = pair.shipment;

  return (
    <div className="pdv-client-fiche">
      <ClientBackLink href={`/client/lunettes/${pair.uuid}`}>Revenir à mes lunettes</ClientBackLink>
      <div className="pdv-client-fiche__main">
        <h1 className="pdv-client-fiche__title">Suivre ma livraison</h1>
        {shipment ? (
          <section className="pdv-client-info-card">
            <header className="pdv-client-info-card__head">
              <h2 className="pdv-client-info-card__title">Expédition</h2>
            </header>
            <dl className="pdv-client-info-card__rows">
              {shipment.carrier ? (
                <div className="pdv-client-info-card__row">
                  <dt>Transporteur</dt>
                  <dd>{shipment.carrier}</dd>
                </div>
              ) : null}
              <div className="pdv-client-info-card__row">
                <dt>Destination</dt>
                <dd>{shipment.destination}</dd>
              </div>
              {shipment.label_ref ? (
                <div className="pdv-client-info-card__row">
                  <dt>Référence</dt>
                  <dd>{shipment.label_ref}</dd>
                </div>
              ) : null}
              {shipment.tracking_ref ? (
                <div className="pdv-client-info-card__row">
                  <dt>Code de suivi</dt>
                  <dd>{shipment.tracking_ref}</dd>
                </div>
              ) : (
                <p className="pdv-client-history__help">
                  Le code de suivi sera affiché dès que le colis aura été déposé.
                </p>
              )}
            </dl>
          </section>
        ) : (
          <p className="pdv-client-page-sub">Aucune expédition en cours.</p>
        )}
        <p className="pdv-client-history__help">
          Si vous rencontrez un problème avec votre livraison, contactez le transporteur depuis la page de suivi de
          votre colis.
        </p>
      </div>
    </div>
  );
}
