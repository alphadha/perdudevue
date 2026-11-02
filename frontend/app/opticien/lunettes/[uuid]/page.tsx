"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import HandoverModal from "@/components/opticien/HandoverModal";
import MarkShippedModal from "@/components/opticien/MarkShippedModal";
import { PairEngraveModal, PairInactiveModal } from "@/components/opticien/PairActionModals";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import { usePairStatusMutations } from "@/components/opticien/usePairStatusMutations";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import { downloadAssignedCode, downloadLabelFile } from "@/lib/pairUi";
import { formatFrDate, type ShopPair, type ShippingLabelFile } from "@/lib/types";

export default function PairFichePage() {
  const params = useParams<{ uuid: string }>();
  const [pair, setPair] = useState<ShopPair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<ShopPair>(`/opticien/pairs/${params.uuid}`);
      setPair(data);
      setError(null);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.message);
      }
    }
  }, [params.uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpdated = useCallback(
    (updated: ShopPair) => {
      setPair(updated);
      if (updated.status === "active") {
        showToast("La paire a été indiquée comme gravée.");
      }
      if (updated.status === "inactive") {
        showToast("La paire a été déclarée inactive.");
      }
    },
    [showToast],
  );

  const mutations = usePairStatusMutations(onUpdated, showToast);

  async function downloadLabel() {
    try {
      const file = await api<ShippingLabelFile>(`/opticien/restitutions/${params.uuid}/label`);
      downloadLabelFile(file);
    } catch {
      showToast("Téléchargement du bordereau impossible.");
    }
  }

  async function copyAssignedCode() {
    if (!pair) {
      return;
    }
    try {
      await navigator.clipboard.writeText(pair.assigned_code);
      showToast("Code assigné copié.");
    } catch {
      showToast("Copie du code assigné impossible.");
    }
  }

  if (error) {
    return (
      <>
        <PdvButton variant="tertiary" href="/opticien/lunettes" iconLeft="/icons/pdv/arrow-narrow-left.svg">
          Revenir aux lunettes
        </PdvButton>
        <p className="mt-3">{error}</p>
      </>
    );
  }

  if (!pair) {
    return <p>Chargement de la fiche…</p>;
  }

  const events = [...(pair.events ?? [])].sort((a, b) => {
    const left = a.at ? Date.parse(a.at) : 0;
    const right = b.at ? Date.parse(b.at) : 0;
    return right - left;
  });

  return (
    <>
      <AppToast message={toast} />
      <p className="mb-3">
        <PdvButton variant="tertiary" href="/opticien/lunettes" iconLeft="/icons/pdv/arrow-narrow-left.svg">
          Revenir aux lunettes
        </PdvButton>
      </p>
      <div className="pdv-page-head">
        <div>
          <h1>{pair.title}</h1>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {pair.status === "a_graver" ? (
            <PdvButton
              variant="secondary"
              size="l"
              iconLeft="/icons/pdv/download-01.svg"
              onClick={() => downloadAssignedCode(pair)}
            >
              Télécharger le code assigné
            </PdvButton>
          ) : null}
          {pair.status === "active" ? (
            <PdvButton variant="secondary" size="l" onClick={() => mutations.setInactivePair(pair)}>
              Déclarer comme inactive
            </PdvButton>
          ) : null}
          {pair.actions.can_hand_over ? (
            <PdvButton variant="primary" size="l" onClick={() => setHandoverOpen(true)}>
              Remettre au client
            </PdvButton>
          ) : pair.status === "a_recuperer" ? (
            <PdvButton variant="primary" size="l" disabled>
              Remettre au client
            </PdvButton>
          ) : null}
          {pair.actions.can_download_label || pair.actions.can_mark_shipped ? (
            <>
              <PdvButton
                variant="secondary"
                size="l"
                iconLeft="/icons/pdv/download-01.svg"
                disabled={!pair.actions.can_download_label}
                onClick={() => void downloadLabel()}
              >
                Télécharger le bordereau
              </PdvButton>
              {pair.actions.can_mark_shipped ? (
                <PdvButton variant="primary" size="l" onClick={() => setShipOpen(true)}>
                  Indiquer comme en livraison
                </PdvButton>
              ) : null}
            </>
          ) : pair.status === "livraison_demandee" ? (
            <>
              <PdvButton variant="secondary" size="l" disabled>
                Télécharger le bordereau
              </PdvButton>
              <PdvButton variant="primary" size="l" disabled>
                Indiquer comme en livraison
              </PdvButton>
            </>
          ) : null}
        </div>
      </div>
      <div className="pdv-fiche-grid">
        <div className="pdv-panel pdv-panel--fiche">
          <div className="pdv-fiche-card-head">
            <h2>Informations</h2>
            <PairStatusBadge status={pair.status} label={pair.status_label} />
          </div>
          <div className="pdv-kv">
            {pair.client ? (
              <>
                <div className="pdv-kv__row">
                  <span className="pdv-kv__label">Client</span>
                  <span className="pdv-kv__value">
                    <Link href={`/opticien/clients/${pair.client.uuid}`}>
                      {pair.client.first_name} {pair.client.last_name}
                    </Link>
                  </span>
                </div>
                <div className="pdv-kv__row">
                  <span className="pdv-kv__label">Numéro de téléphone client</span>
                  <span className="pdv-kv__value">{pair.client.phone}</span>
                </div>
                <div className="pdv-kv__row">
                  <span className="pdv-kv__label">Adresse mail client</span>
                  <span className="pdv-kv__value">{pair.client.email}</span>
                </div>
              </>
            ) : null}
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Type de lunettes</span>
              <span className="pdv-kv__value">{pair.type}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Marque</span>
              <span className="pdv-kv__value">{pair.brand}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Couleurs</span>
              <span className="pdv-kv__value">{pair.colors.join(", ")}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Code assigné</span>
              <span className="pdv-kv__value">
                {pair.assigned_code}
                <button type="button" className="pdv-copy-btn" aria-label="Copier le code assigné" onClick={() => void copyAssignedCode()}>
                  <img src="/icons/pdv/copy-06.svg" alt="" width={14} height={14} />
                </button>
              </span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Date d&apos;enregistrement</span>
              <span className="pdv-kv__value">{formatFrDate(pair.registered_at)}</span>
            </div>
          </div>
        </div>
        <div className="pdv-panel pdv-panel--fiche">
          <div className="pdv-fiche-card-head">
            <h2>Historique des événements</h2>
          </div>
          {events.length > 0 ? (
            <ul className="pdv-timeline">
              {events.map((event, index) => (
                <li key={`${event.type}-${event.at}-${index}`} className="pdv-timeline__item">
                  <span className="pdv-timeline__mark">
                    <span className="pdv-timeline__dot" />
                  </span>
                  <span className="pdv-timeline__body">
                    <span className="pdv-timeline__date">{formatFrDate(event.at)}</span>
                    <span className="pdv-timeline__label">{event.label}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pdv-timeline__date mb-0">Aucun événement.</p>
          )}
        </div>
      </div>

      {handoverOpen ? (
        <HandoverModal
          onDone={() => {
            setHandoverOpen(false);
            void load();
          }}
          onClose={(discarded) => {
            setHandoverOpen(false);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}
      {shipOpen && pair ? (
        <MarkShippedModal
          pairUuid={pair.uuid}
          onDone={() => {
            setShipOpen(false);
            void load();
            showToast("La paire a été indiquée comme en livraison.");
          }}
          onClose={(discarded) => {
            setShipOpen(false);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}
      {mutations.engravePair ? (
        <PairEngraveModal
          pair={mutations.engravePair}
          pending={mutations.pending}
          onConfirm={() => void mutations.confirmEngrave()}
          onClose={() => mutations.setEngravePair(null)}
        />
      ) : null}
      {mutations.inactivePair ? (
        <PairInactiveModal
          pair={mutations.inactivePair}
          pending={mutations.pending}
          onClose={() => mutations.setInactivePair(null)}
          onConfirm={() => void mutations.confirmInactive()}
        />
      ) : null}
    </>
  );
}
