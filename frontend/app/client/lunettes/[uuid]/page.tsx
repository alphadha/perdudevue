"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import {
  ArchivePairModal,
  CancelLostModal,
  ClientInactiveModal,
  DeclareLostModal,
} from "@/components/client/ClientModals";
import ShopCard from "@/components/client/ShopCard";
import ShopMapModal from "@/components/client/ShopMapModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import { formatFrDate, type ClientPair } from "@/lib/types";

export default function ClientPairPage() {
  const params = useParams<{ uuid: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ title?: string; message: string; variant?: "success" | "error" } | null>(null);
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
            "Votre opticien prépare actuellement vos lunettes. Elles seront remises au transporteur dans les plus brefs délais.",
          variant: "success",
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
      <div className="pdv-client-fiche">
        <ClientBackLink href="/client">Revenir à mes lunettes</ClientBackLink>
        <p className="pdv-client-page-sub">{error}</p>
      </div>
    );
  }

  if (!pair) {
    return <p className="pdv-client-page-sub">Chargement…</p>;
  }

  const shop = pair.depositary_shop ?? pair.origin_shop;
  const rows = [
    { label: "Type de lunettes", value: pair.type },
    { label: "Marque", value: pair.brand },
    { label: "Couleurs", value: pair.colors.join(", ") },
    { label: "Description", value: pair.description },
    { label: "Code assigné", value: pair.assigned_code },
    { label: "Date d'enregistrement", value: formatFrDate(pair.registered_at) },
  ].filter((row) => Boolean(row.value));

  return (
    <div className="pdv-client-fiche">
      <AppToast
        title={toast?.title}
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
      <ClientBackLink href="/client">Revenir à mes lunettes</ClientBackLink>
      <div className="pdv-client-fiche__main">
        <div className="pdv-client-fiche__hero">
        <h1 className="pdv-client-fiche__title">{pair.title}</h1>
        <div className="pdv-client-fiche__cards">
          <section className="pdv-client-info-card">
            <header className="pdv-client-info-card__head">
              <h2 className="pdv-client-info-card__title">Informations</h2>
              <PairStatusBadge status={pair.status} label={pair.status_label} />
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
          {shop ? <ShopCard shop={shop} onMap={() => setMapOpen(true)} /> : null}
        </div>
        </div>

        {pair.status === "a_recuperer" ||
        pair.status === "en_livraison" ||
        pair.status === "active" ||
        pair.status === "perdue" ||
        pair.status === "inactive" ? (
        <div className="pdv-client-fiche__actions">
          {pair.status === "a_recuperer" ? (
            <PdvButton href={`/client/lunettes/${pair.uuid}/recuperer`} variant="primary" size="l" block>
              Récupérer mes lunettes
            </PdvButton>
          ) : null}
          {pair.status === "en_livraison" ? (
            <PdvButton
              href={`/client/lunettes/${pair.uuid}/suivi`}
              variant="primary"
              size="l"
              block
              iconLeft="/icons/pdv/share-03.svg"
            >
              Suivre ma livraison
            </PdvButton>
          ) : null}
          {pair.status === "active" ? (
            <>
              <PdvButton type="button" variant="primary" size="l" block onClick={() => setLostOpen(true)}>
                Déclarer comme perdue
              </PdvButton>
              <PdvButton type="button" variant="secondary" size="l" block onClick={() => setInactiveOpen(true)}>
                Déclarer comme inactive
              </PdvButton>
            </>
          ) : null}
          {pair.status === "perdue" ? (
            <>
              <PdvButton type="button" variant="primary" size="l" block onClick={() => setCancelOpen(true)}>
                J’ai retrouvé mes lunettes
              </PdvButton>
              <PdvButton type="button" variant="tertiary" size="l" block onClick={() => setInactiveOpen(true)}>
                Déclarer comme inactive
              </PdvButton>
            </>
          ) : null}
          {pair.status === "inactive" ? (
            <>
              <PdvButton type="button" variant="danger" size="l" block onClick={() => setArchiveOpen(true)}>
                Supprimer définitivement la paire
              </PdvButton>
              <PdvButton type="button" variant="tertiary" size="l" block disabled>
                Réactiver la paire
              </PdvButton>
            </>
          ) : null}
        </div>
        ) : null}

        {pair.events && pair.events.length > 0 ? (
          <section className="pdv-client-history">
            <h2 className="pdv-client-history__title">Historique des événements</h2>
            <ol className="pdv-client-history__list">
              {pair.events.map((event, index) => {
                const showCarrierHelp = event.type === "shipped";
                return (
                  <li className="pdv-client-history__item" key={`${event.type}-${event.at}-${index}`}>
                    <span className="pdv-client-history__rail" aria-hidden>
                      <img src="/icons/pdv/history-rail.svg" alt="" width={12} height={45} />
                    </span>
                    <div className="pdv-client-history__copy">
                      <p className="pdv-client-history__date">{formatFrDate(event.at)}</p>
                      <p className="pdv-client-history__label">{event.label}</p>
                      {showCarrierHelp ? (
                        <p className="pdv-client-history__help">
                          *Si vous rencontrez un problème avec votre livraison, contactez le transporteur depuis la
                          page de suivi de votre colis.
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>

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
      {mapOpen && shop ? <ShopMapModal shop={shop} onClose={() => setMapOpen(false)} /> : null}
    </div>
  );
}
