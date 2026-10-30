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

  if (error) {
    return (
      <>
        <Link href="/opticien/lunettes">Revenir aux lunettes</Link>
        <p className="mt-3">{error}</p>
      </>
    );
  }

  if (!pair) {
    return <p>Chargement de la fiche…</p>;
  }

  return (
    <>
      <AppToast message={toast} />
      <p className="mb-3">
        <PdvButton variant="tertiary" href="/opticien/lunettes">
          Revenir aux lunettes
        </PdvButton>
      </p>
      <div className="pdv-page-head">
        <div>
          <h1 className="mb-2">{pair.title}</h1>
          <PairStatusBadge status={pair.status} label={pair.status_label} />
        </div>
        <div className="d-flex flex-wrap gap-2">
          {pair.status === "a_graver" ? (
            <>
              <PdvButton variant="secondary" size="m" onClick={() => downloadAssignedCode(pair)}>
                Télécharger le code assigné
              </PdvButton>
              <PdvButton variant="primary" size="m" onClick={() => mutations.setEngravePair(pair)}>
                Indiquer comme gravée
              </PdvButton>
            </>
          ) : null}
          {pair.status === "active" ? (
            <PdvButton variant="secondary" size="m" onClick={() => mutations.setInactivePair(pair)}>
              Passer en &quot;inactive&quot;
            </PdvButton>
          ) : null}
          {pair.actions.can_hand_over ? (
            <PdvButton variant="primary" size="m" onClick={() => setHandoverOpen(true)}>
              Remettre au client
            </PdvButton>
          ) : pair.status === "a_recuperer" ? (
            <PdvButton variant="primary" size="m" disabled>
              Remettre au client
            </PdvButton>
          ) : null}
          {pair.actions.can_download_label || pair.actions.can_mark_shipped ? (
            <>
              <PdvButton
                variant="secondary"
                size="m"
                disabled={!pair.actions.can_download_label}
                onClick={() => void downloadLabel()}
              >
                Télécharger le bordereau
              </PdvButton>
              {pair.actions.can_mark_shipped ? (
                <PdvButton variant="primary" size="m" onClick={() => setShipOpen(true)}>
                  Indiquer comme en livraison
                </PdvButton>
              ) : null}
            </>
          ) : pair.status === "livraison_demandee" ? (
            <>
              <PdvButton variant="secondary" size="m" disabled>
                Télécharger le bordereau
              </PdvButton>
              <PdvButton variant="primary" size="m" disabled>
                Indiquer comme en livraison
              </PdvButton>
            </>
          ) : null}
        </div>
      </div>
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Informations</h2>
              {pair.client ? (
                <>
                  <p className="d-flex justify-content-between mb-2">
                    <span>Client</span>
                    <span>
                      <Link href={`/opticien/clients/${pair.client.uuid}`}>
                        {pair.client.last_name} {pair.client.first_name}
                      </Link>
                    </span>
                  </p>
                  <p className="d-flex justify-content-between mb-2">
                    <span>Numéro de téléphone client</span>
                    <span>{pair.client.phone}</span>
                  </p>
                  <p className="d-flex justify-content-between mb-2">
                    <span>Adresse mail client</span>
                    <span>{pair.client.email}</span>
                  </p>
                </>
              ) : null}
              <p className="d-flex justify-content-between mb-2">
                <span>Type de lunettes</span>
                <span>{pair.type}</span>
              </p>
              <p className="d-flex justify-content-between mb-2">
                <span>Marque</span>
                <span>{pair.brand}</span>
              </p>
              <p className="d-flex justify-content-between mb-2">
                <span>Couleur(s)</span>
                <span>{pair.colors.join(", ")}</span>
              </p>
              <p className="d-flex justify-content-between mb-2">
                <span>Description</span>
                <span>{pair.description ?? ""}</span>
              </p>
              <p className="d-flex justify-content-between mb-2">
                <span>Code assigné</span>
                <span>{pair.assigned_code}</span>
              </p>
              <p className="d-flex justify-content-between mb-0">
                <span>Date d&apos;enregistrement</span>
                <span>{formatFrDate(pair.registered_at)}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Historique des événements</h2>
              {pair.events && pair.events.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {pair.events.map((event) => (
                    <li key={`${event.type}-${event.at}`} className="mb-3">
                      <div className="small text-secondary">{formatFrDate(event.at)}</div>
                      <div>{event.label}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-0 text-secondary">Aucun événement.</p>
              )}
            </div>
          </div>
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
