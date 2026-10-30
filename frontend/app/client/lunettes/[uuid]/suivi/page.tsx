"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
      <>
        <Link href={`/client/lunettes/${params.uuid}`}>Revenir à mes lunettes</Link>
        <p className="mt-3">{error}</p>
      </>
    );
  }

  if (!pair) {
    return <p>Chargement…</p>;
  }

  return (
    <>
      <p>
        <Link href={`/client/lunettes/${pair.uuid}`}>Revenir à mes lunettes</Link>
      </p>
      <h1 className="h4">Suivre ma livraison</h1>
      <p>
        <span className="badge text-bg-primary">{pair.status_label}</span>
      </p>
      {pair.shipment ? (
        <div className="card">
          <div className="card-body">
            <p className="d-flex justify-content-between mb-2">
              <span>Transporteur</span>
              <span>{pair.shipment.carrier}</span>
            </p>
            <p className="d-flex justify-content-between mb-2">
              <span>Destination</span>
              <span className="text-end">{pair.shipment.destination}</span>
            </p>
            <p className="d-flex justify-content-between mb-2">
              <span>Référence</span>
              <span>{pair.shipment.label_ref}</span>
            </p>
            {pair.shipment.tracking_ref ? (
              <p className="d-flex justify-content-between mb-0">
                <span>Code de suivi</span>
                <span>{pair.shipment.tracking_ref}</span>
              </p>
            ) : (
              <p className="mb-0 small text-secondary">
                Le code de suivi sera affiché dès que le colis aura été déposé.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p>Aucune expédition en cours.</p>
      )}
      <p className="small text-secondary mt-3">
        La date de livraison estimée sera affichée dès que le contrat transporteur le permettra.
      </p>
    </>
  );
}
