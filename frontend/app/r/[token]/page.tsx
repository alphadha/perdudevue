"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LoginPattern from "@/components/LoginPattern";
import ShopCard from "@/components/client/ShopCard";
import ShopMapModal from "@/components/client/ShopMapModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientShop, PublicRestitution } from "@/lib/types";

const PICKUP_HELP =
  "Ce code est votre preuve de propriété. Présentez-le à l'opticien de retrait pour récupérer vos lunettes. Il sera vérifié lors de la remise.";

function PublicBlocked({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="pdv-public pdv-public--blocked">
      <header className="pdv-login__hero pdv-login__hero--mobile">
        <LoginPattern />
        <img className="pdv-login__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
      </header>
      <section className="container pdv-public__blocked-card">
        <div className="pdv-public__blocked-copy">
          <p className="pdv-public__blocked-title">{title}</p>
          <p className="pdv-public__blocked-body">{body}</p>
        </div>
        <PdvButton href="/login?space=client" variant="tertiary">
          Me connecter
        </PdvButton>
      </section>
    </div>
  );
}

export default function PublicRestitutionPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicRestitution | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    api<PublicRestitution>(`/public/restitutions/${params.token}`)
      .then(setData)
      .catch((caught) => {
        const code = caught instanceof ApiRequestError ? caught.errors[0]?.code : undefined;
        setErrorCode(code ?? "link_invalid");
      });
  }, [params.token]);

  async function copyCode() {
    if (!data?.pickup_code) {
      return;
    }
    await navigator.clipboard.writeText(data.pickup_code);
    setCopied(true);
  }

  if (errorCode === "already_returned") {
    return (
      <PublicBlocked
        title="Ces lunettes vous ont été remises"
        body="Connectez-vous à votre espace pour retrouver toutes les informations."
      />
    );
  }

  if (errorCode) {
    return (
      <PublicBlocked
        title="Ce lien n’est plus valide"
        body="Connectez-vous à votre espace pour retrouver toutes les informations."
      />
    );
  }

  if (!data) {
    return (
      <div className="pdv-public">
        <p className="container pdv-client-page-sub">Chargement…</p>
      </div>
    );
  }

  const shop: ClientShop | null = data.optician
    ? {
        name: data.optician.name,
        address: data.optician.address,
        city: data.optician.city,
        postal_code: data.optician.postal_code,
        phone: data.optician.phone,
        maps_url: data.optician.maps_url,
        waze_url: data.optician.waze_url,
      }
    : null;

  const rows = [
    { label: "Description", value: data.pair.description },
    { label: "Type de lunettes", value: data.pair.type },
    { label: "Marque", value: data.pair.brand },
    { label: "Couleurs", value: data.pair.colors.join(", ") },
    { label: "Code assigné", value: data.pair.assigned_code },
    { label: "Opticien", value: data.pair.optician_name },
    { label: "Date d'enregistrement", value: data.pair.registered_at },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="pdv-public">
      <div className="container pdv-public__inner">
        <h1 className="pdv-public__title">{data.title}</h1>
        <section className="pdv-client-info-card">
          <header className="pdv-client-info-card__head">
            <h2 className="pdv-client-info-card__title">Détails de la paire</h2>
          </header>
          <dl className="pdv-client-info-card__rows">
            {rows.map((row) => (
              <div className="pdv-client-info-card__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {data.pickup_code ? (
          <section className="pdv-pickup-card">
            <div className="pdv-pickup-card__top">
              <div>
                <p className="pdv-pickup-card__label">Code de restitution</p>
                <p className="pdv-pickup-card__code">{data.pickup_code}</p>
              </div>
              <PdvButton type="button" variant="secondary" size="m" iconLeft="/icons/pdv/copy-06.svg" onClick={() => void copyCode()}>
                {copied ? "Copié" : "Copier"}
              </PdvButton>
            </div>
            <p className="pdv-pickup-card__help">{data.pickup_help || PICKUP_HELP}</p>
          </section>
        ) : null}
        {shop ? <ShopCard shop={shop} title="Où les récupérer ?" onMap={() => setMapOpen(true)} /> : null}
      </div>
      {mapOpen && shop ? <ShopMapModal shop={shop} onClose={() => setMapOpen(false)} /> : null}
    </div>
  );
}
