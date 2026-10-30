"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientPair } from "@/lib/types";

export default function ClientHomePage() {
  const [pairs, setPairs] = useState<ClientPair[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ClientPair[]>("/client/pairs")
      .then(setPairs)
      .catch((caught) => {
        setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger vos lunettes.");
      });
  }, []);

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (pairs === null) {
    return <p>Chargement…</p>;
  }

  return (
    <>
      <h1 className="h4 mb-1">Mes lunettes</h1>
      <p className="text-secondary">Retrouvez ici toutes vos paires enregistrées.</p>
      {pairs.length === 0 ? (
        <p>Aucune paire enregistrée pour le moment.</p>
      ) : (
        <div className="d-grid gap-3">
          {pairs.map((pair) => (
            <div className="card" key={pair.uuid}>
              <div className="card-body">
                <h2 className="h6">{pair.title}</h2>
                <p className="small text-secondary mb-2">Code assigné : {pair.assigned_code}</p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <PairStatusBadge status={pair.status} label={pair.status_label} />
                  {pair.pickup_code ? (
                    <span className="badge text-bg-success">Code de restitution : {pair.pickup_code}</span>
                  ) : null}
                </div>
                <Link href={`/client/lunettes/${pair.uuid}`}>Voir la fiche</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
