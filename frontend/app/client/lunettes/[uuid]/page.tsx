"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import {
  ArchivePairModal,
  CancelLostModal,
  ClientInactiveModal,
  DeclareLostModal,
  MapModal,
} from "@/components/client/ClientModals";
import ShopCard from "@/components/client/ShopCard";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import { api, ApiRequestError } from "@/lib/api";
import { formatFrDate, type ClientPair } from "@/lib/types";

export default function ClientPairPage() {
  const params = useParams<{ uuid: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ title?: string; message: string } | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setPair(await api<ClientPair>(`/client/pairs/${params.uuid}`));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Fiche introuvable.");
    }
  }, [params.uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const status = searchParams.get("paiement");
    const sessionId = searchParams.get("session_id");
    if (status !== "ok" || !sessionId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const updated = await api<ClientPair>(`/client/pairs/${params.uuid}/shipments/pay`, {
          method: "POST",
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (cancelled) {
          return;
        }
        setPair(updated);
        setToast({
          title: "Paiement confirmé",
          message:
            "Votre opticien prépare actuellement vos lunettes de vue. Elles seront remises au transporteur dans les plus brefs délais.",
        });
        router.replace(`/client/lunettes/${params.uuid}`);
      } catch (caught) {
        if (!cancelled) {
          setToast({
            message: caught instanceof ApiRequestError ? caught.message : "Le paiement n’a pas abouti.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.uuid, router, searchParams]);

  async function mutate(
    path: string,
    method: string,
    success: string | { title: string; message: string },
  ) {
    setPending(true);
    try {
      const updated = await api<ClientPair>(path, { method });
      setPair(updated);
      setLostOpen(false);
      setCancelOpen(false);
      setInactiveOpen(false);
      setToast(typeof success === "string" ? { message: success } : success);
    } catch (caught) {
      setToast({
        message: caught instanceof ApiRequestError ? caught.message : "Action impossible.",
      });
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    setPending(true);
    try {
      await api(`/client/pairs/${params.uuid}`, { method: "DELETE" });
      router.push("/client");
    } catch (caught) {
      setToast({
        message: caught instanceof ApiRequestError ? caught.message : "Suppression impossible.",
      });
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <Link href="/client">Revenir à mes lunettes</Link>
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
      <AppToast
        title={toast?.title}
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
      />
      <p>
        <Link href="/client">Revenir à mes lunettes</Link>
      </p>
      <h1 className="h4">{pair.title}</h1>
      <p>
        <PairStatusBadge status={pair.status} label={pair.status_label} />
      </p>
      <dl className="row">
        {pair.description ? (
          <>
            <dt className="col-6">Description</dt>
            <dd className="col-6 text-end">{pair.description}</dd>
          </>
        ) : null}
        <dt className="col-6">Type de lunettes</dt>
        <dd className="col-6 text-end">{pair.type}</dd>
        <dt className="col-6">Marque</dt>
        <dd className="col-6 text-end">{pair.brand}</dd>
        <dt className="col-6">Couleurs</dt>
        <dd className="col-6 text-end">{pair.colors.join(", ")}</dd>
        <dt className="col-6">Code assigné</dt>
        <dd className="col-6 text-end">{pair.assigned_code}</dd>
        <dt className="col-6">Date d&apos;enregistrement</dt>
        <dd className="col-6 text-end">{formatFrDate(pair.registered_at)}</dd>
      </dl>
      {shop ? <ShopCard shop={shop} onMap={() => setMapOpen(true)} /> : null}

      {pair.actions.can_recover ? (
        <Link href={`/client/lunettes/${pair.uuid}/recuperer`} className="btn btn-primary w-100 mb-2">
          Récupérer mes lunettes
        </Link>
      ) : null}
      {pair.actions.can_track_delivery ? (
        <Link href={`/client/lunettes/${pair.uuid}/suivi`} className="btn btn-primary w-100 mb-2">
          Suivre ma livraison
        </Link>
      ) : null}
      {pair.actions.can_declare_lost ? (
        <button type="button" className="btn btn-primary w-100 mb-2" onClick={() => setLostOpen(true)}>
          Déclarer comme perdue
        </button>
      ) : null}
      {pair.actions.can_cancel_lost ? (
        <button type="button" className="btn btn-primary w-100 mb-2" onClick={() => setCancelOpen(true)}>
          J’ai retrouvé mes lunettes
        </button>
      ) : null}
      {pair.actions.can_inactivate ? (
        <button type="button" className="btn btn-outline-primary w-100 mb-2" onClick={() => setInactiveOpen(true)}>
          Déclarer comme inactive
        </button>
      ) : null}
      {pair.actions.can_archive ? (
        <>
          <button type="button" className="btn btn-danger w-100 mb-2" onClick={() => setArchiveOpen(true)}>
            Supprimer définitivement la paire
          </button>
          <button type="button" className="btn btn-link w-100 mb-2" disabled>
            Réactiver la paire
          </button>
        </>
      ) : null}

      {pair.events && pair.events.length > 0 ? (
        <>
          <h2 className="h6 mt-4">Historique des événements</h2>
          <ul className="list-unstyled">
            {pair.events.map((event) => (
              <li key={`${event.type}-${event.at}`} className="mb-3">
                <p className="small text-secondary mb-0">{formatFrDate(event.at)}</p>
                <p className="mb-0">{event.label}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {lostOpen ? (
        <DeclareLostModal
          pair={pair}
          pending={pending}
          onConfirm={() =>
            void mutate(`/client/pairs/${pair.uuid}/lost`, "POST", {
              title: "Paire déclarée comme perdue",
              message:
                "Votre déclaration a bien été prise en compte. Si vos lunettes sont retrouvées, vous en serez notifié.",
            })
          }
          onClose={() => setLostOpen(false)}
        />
      ) : null}
      {cancelOpen ? (
        <CancelLostModal
          pending={pending}
          onConfirm={() =>
            void mutate(`/client/pairs/${pair.uuid}/recovered`, "POST", "Déclaration de perte annulée.")
          }
          onClose={() => setCancelOpen(false)}
        />
      ) : null}
      {inactiveOpen ? (
        <ClientInactiveModal
          pair={pair}
          pending={pending}
          onConfirm={() =>
            void mutate(`/client/pairs/${pair.uuid}/inactivate`, "POST", "Paire déclarée comme inactive.")
          }
          onClose={() => setInactiveOpen(false)}
        />
      ) : null}
      {archiveOpen ? (
        <ArchivePairModal pending={pending} onConfirm={() => void archive()} onClose={() => setArchiveOpen(false)} />
      ) : null}
      {mapOpen && shop ? <MapModal shop={shop} onClose={() => setMapOpen(false)} /> : null}
    </>
  );
}
