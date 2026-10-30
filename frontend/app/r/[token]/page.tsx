"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import type { PublicRestitution } from "@/lib/types";

export default function PublicRestitutionPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicRestitution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<PublicRestitution>(`/public/restitutions/${params.token}`)
      .then(setData)
      .catch((caught) => {
        setError(caught instanceof ApiRequestError ? caught.message : "Lien introuvable.");
      });
  }, [params.token]);

  async function copyCode() {
    if (!data?.pickup_code) {
      return;
    }
    await navigator.clipboard.writeText(data.pickup_code);
    setCopied(true);
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <Link href="/login">Se reconnecter à mon compte</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-5">
        <p>Chargement…</p>
      </div>
    );
  }

  const address = [data.optician?.address, data.optician?.postal_code, data.optician?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="h4 mb-4">{data.title}</h1>
          <h2 className="h6">Détails de la paire</h2>
          <dl className="row">
            <dt className="col-6">Type de lunettes</dt>
            <dd className="col-6 text-end">{data.pair.type}</dd>
            <dt className="col-6">Marque</dt>
            <dd className="col-6 text-end">{data.pair.brand}</dd>
            <dt className="col-6">Couleurs</dt>
            <dd className="col-6 text-end">{data.pair.colors.join(", ")}</dd>
            <dt className="col-6">Code assigné</dt>
            <dd className="col-6 text-end">{data.pair.assigned_code}</dd>
            <dt className="col-6">Date d&apos;enregistrement</dt>
            <dd className="col-6 text-end">{data.pair.registered_at}</dd>
          </dl>
          <hr />
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="mb-1">Code de restitution</p>
                  <p className="h4 mb-0">{data.pickup_code}</p>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => void copyCode()}>
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
              <p className="small mt-3 mb-0">{data.pickup_help}</p>
            </div>
          </div>
          {data.optician ? (
            <>
              <h2 className="h6">Opticien de retrait</h2>
              <div className="card">
                <div className="card-body">
                  <p className="fw-semibold mb-1">{data.optician.name}</p>
                  <p className="mb-1">{address}</p>
                  {data.optician.phone ? <p className="mb-3">Tél : {data.optician.phone}</p> : null}
                  <div className="d-flex flex-wrap gap-3">
                    {data.optician.phone ? <a href={`tel:${data.optician.phone}`}>Appeler</a> : null}
                    <a href={data.optician.maps_url} target="_blank" rel="noreferrer">
                      Ouvrir dans Maps
                    </a>
                    {data.optician.waze_url ? (
                      <a href={data.optician.waze_url} target="_blank" rel="noreferrer">
                        Ouvrir dans Waze
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
          <p className="mt-4 mb-0">
            <Link href="/login?space=client">Se reconnecter à mon compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
