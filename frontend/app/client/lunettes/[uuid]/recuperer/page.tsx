"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import { MapModal } from "@/components/client/ClientModals";
import ShopCard from "@/components/client/ShopCard";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientPair, ClientProfile } from "@/lib/types";

export default function RecoverPairPage() {
  const params = useParams<{ uuid: string }>();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextPair, nextProfile] = await Promise.all([
        api<ClientPair>(`/client/pairs/${params.uuid}`),
        api<ClientProfile>("/client/profile"),
      ]);
      setPair(nextPair);
      setProfile(nextProfile);
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

  async function resend(channel: "email" | "sms") {
    setPending(true);
    try {
      await api(`/client/pairs/${params.uuid}/resend`, {
        method: "POST",
        body: JSON.stringify({ channels: [channel] }),
      });
      setToast(channel === "sms" ? "Code renvoyé par SMS." : "Code renvoyé par e-mail.");
    } catch (caught) {
      setToast(caught instanceof ApiRequestError ? caught.message : "Renvoi impossible.");
    } finally {
      setPending(false);
    }
  }

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

  const shop = pair.depositary_shop ?? pair.origin_shop;

  return (
    <>
      <AppToast message={toast} />
      <p>
        <Link href={`/client/lunettes/${pair.uuid}`}>Revenir à mes lunettes</Link>
      </p>
      <h1 className="h4">Récupérer mes lunettes</h1>
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <p className="mb-1">Code de restitution</p>
              <p className="h4 mb-0">{pair.pickup_code}</p>
            </div>
            <button type="button" className="btn btn-outline-primary" onClick={() => void copyCode()}>
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="small mt-3">{pair.pickup_help}</p>
          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-link p-0"
              disabled={pending || profile?.consent_sms === false}
              onClick={() => void resend("sms")}
            >
              Renvoyer par SMS
            </button>
            <button
              type="button"
              className="btn btn-link p-0"
              disabled={pending || profile?.consent_email === false}
              onClick={() => void resend("email")}
            >
              Renvoyer par mail
            </button>
          </div>
        </div>
      </div>
      {shop ? (
        <>
          <h2 className="h6">Opticien de retrait</h2>
          <ShopCard shop={shop} onMap={() => setMapOpen(true)} />
        </>
      ) : null}
      <h2 className="h6">Vous ne pouvez pas vous déplacer ?</h2>
      <p>
        Si l’opticien de retrait est trop loin de chez vous ou que vous ne pouvez pas vous rendre sur place, vous
        pouvez choisir une livraison à domicile ou en point relais.
      </p>
      <Link
        href={`/client/lunettes/${pair.uuid}/livraison`}
        className={`btn btn-primary w-100${pair.actions.can_request_delivery ? "" : " disabled"}`}
        aria-disabled={!pair.actions.can_request_delivery}
      >
        Me faire livrer mes lunettes
      </Link>
      {mapOpen && shop ? <MapModal shop={shop} onClose={() => setMapOpen(false)} /> : null}
    </>
  );
}
