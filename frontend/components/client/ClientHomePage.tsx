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
    return (
      <main className="pdv-client-home">
        <p className="pdv-client-page-sub" role="alert">
          {error}
        </p>
      </main>
    );
  }

  if (pairs === null) {
    return (
      <main className="pdv-client-home">
        <p className="pdv-client-page-sub">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="pdv-client-home">
      <header className="pdv-client-page-head">
        <h1 className="pdv-client-page-title">Mes lunettes</h1>
        <p className="pdv-client-page-sub">Retrouvez ici toutes vos paires enregistrées.</p>
      </header>
      {pairs.length === 0 ? (
        <p className="pdv-client-empty">Aucune paire de lunette enregistrée pour le moment</p>
      ) : (
        <div className="pdv-client-pairs">
          {pairs.map((pair) => (
            <article className="pdv-client-pair-card" key={pair.uuid}>
              <div className="pdv-client-pair-card__meta">
                <div className="pdv-client-pair-card__identity">
                  <h2 className="pdv-client-pair-card__title">{pair.title}</h2>
                  <p className="pdv-client-pair-card__code">Code assigné : {pair.assigned_code}</p>
                </div>
                <div className="pdv-client-pair-card__tags">
                  <PairStatusBadge status={pair.status} label={pair.status_label} />
                  {pair.pickup_code ? (
                    <span className="pdv-pickup-chip">
                      <span>Code de restitution :</span>
                      <strong>{pair.pickup_code}</strong>
                    </span>
                  ) : null}
                </div>
              </div>
              <Link className="pdv-client-pair-card__link" href={`/client/lunettes/${pair.uuid}`}>
                <span>Voir la fiche</span>
                <img src="/icons/pdv/chevron-right.svg" alt="" width={20} height={20} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
