"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import FoundPairModal from "@/components/opticien/FoundPairModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api } from "@/lib/api";
import { PAIR_CREATED_TOAST } from "@/lib/pairUi";
import type { OpticienDashboard, ShopRestitution } from "@/lib/types";

type ToastState = { title?: string; message: string };

function clientName(item: ShopRestitution): string {
  if (!item.client) {
    return "Client masqué";
  }
  return `${item.client.first_name} ${item.client.last_name}`;
}

function pairMeta(item: ShopRestitution): string {
  return `Lunettes ${item.type} - ${item.brand}`;
}

export default function OpticienHomePage() {
  const [dashboard, setDashboard] = useState<OpticienDashboard | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [foundOpen, setFoundOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const data = await api<OpticienDashboard>("/opticien/dashboard");
    setDashboard(data);
    setSyncedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  const syncLabel = syncedAt
    ? `Dernière synchronisation à ${syncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${syncedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}.`
    : "Chargement…";

  const waiting = dashboard?.waiting_pickup ?? [];
  const waitingRows: ShopRestitution[][] = [];
  for (let i = 0; i < waiting.length; i += 2) {
    waitingRows.push(waiting.slice(i, i + 2));
  }

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} />

      {loading || !dashboard ? (
        <p>Chargement du tableau de bord…</p>
      ) : (
        <>
          <div className="pdv-dash-top">
            <div className="pdv-welcome">
              <img className="pdv-welcome__deco" src="/brand/welcome-deco.svg" alt="" />
              <h1 className="pdv-welcome__title">Bienvenue sur votre espace</h1>
              <div className="pdv-welcome__sync">
                <p>{syncLabel}</p>
                <PdvButton
                  variant="tertiary"
                  light
                  iconLeft="/icons/pdv/refresh-ccw-05.svg"
                  onClick={() => void load()}
                >
                  Rafraîchir
                </PdvButton>
              </div>
              <PdvButton
                variant="primary"
                size="l"
                iconLeft="/icons/pdv/announcement-01.svg"
                onClick={() => setFoundOpen(true)}
              >
                Signaler des lunettes retrouvées
              </PdvButton>
            </div>

            <div className="pdv-kpis">
              <div className="pdv-kpis__row">
                <div className="pdv-kpi">
                  <div className="pdv-kpi__icon">
                    <img src="/icons/pdv/glasses-kpi.svg" alt="" />
                  </div>
                  <div>
                    <p className="pdv-kpi__value">{dashboard.pairs_count}</p>
                    <p className="pdv-kpi__label">Lunettes enregistrées</p>
                  </div>
                </div>
                <div className="pdv-kpi">
                  <div className="pdv-kpi__icon">
                    <img src="/icons/pdv/glasses-found.svg" alt="" />
                  </div>
                  <div>
                    <p className="pdv-kpi__value">{dashboard.found_count}</p>
                    <p className="pdv-kpi__label">Lunettes retrouvées</p>
                  </div>
                </div>
              </div>
              <div className="pdv-kpis__row">
                <div className="pdv-kpi">
                  <div className="pdv-kpi__icon">
                    <img src="/icons/pdv/passcode.svg" alt="" />
                  </div>
                  <div>
                    <p className="pdv-kpi__value">{dashboard.to_engrave_count}</p>
                    <p className="pdv-kpi__label">Codes disponibles</p>
                  </div>
                </div>
                <div className="pdv-kpi">
                  <div className="pdv-kpi__icon">
                    <img src="/icons/pdv/users-kpi.svg" alt="" />
                  </div>
                  <div>
                    <p className="pdv-kpi__value">{dashboard.clients_count}</p>
                    <p className="pdv-kpi__label">Clients enregistrés</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pdv-actions-bar">
            <div className="pdv-actions-bar__row">
              <PdvButton
                variant="secondary"
                size="m"
                grow
                iconLeft="/icons/pdv/user-plus-01.svg"
                href="/opticien/clients"
              >
                Créer un nouveau client
              </PdvButton>
              <PdvButton
                variant="secondary"
                size="m"
                grow
                iconLeft="/icons/pdv/glasses-01.svg"
                onClick={() => setRegisterOpen(true)}
              >
                Enregistrer une paire
              </PdvButton>
              <PdvButton variant="secondary" size="m" grow iconLeft="/icons/pdv/plus.svg" disabled>
                Bouton supplémentaire
              </PdvButton>
              <PdvButton
                variant="secondary"
                size="m"
                grow
                iconLeft="/icons/pdv/restitution-bottom.svg"
                disabled={!dashboard.can_hand_over}
                onClick={() => setHandoverOpen(true)}
              >
                Remettre des lunettes à un client
              </PdvButton>
            </div>
          </div>

          <section className="pdv-waiting">
            <div className="pdv-waiting__head">
              <h2>Lunettes retrouvées en attente de retrait</h2>
              <PdvButton
                variant="tertiary"
                href="/opticien/restitution"
                iconRight="/icons/pdv/chevron-right.svg"
              >
                Gérer les retraits
              </PdvButton>
            </div>
            {waiting.length === 0 ? (
              <p className="mb-0" style={{ color: "var(--pdv-legende)", fontSize: 14 }}>
                Aucune lunette en attente de retrait.
              </p>
            ) : (
              <div className="pdv-waiting__grid">
                {waitingRows.map((row, rowIndex) => (
                  <div className="pdv-waiting__row" key={`row-${rowIndex}`}>
                    {row.map((item, colIndex) => (
                      <Link
                        key={item.uuid}
                        href="/opticien/restitution"
                        className={`pdv-waiting-card${rowIndex === 0 && colIndex === 0 ? " is-highlight" : ""}`}
                      >
                        <div>
                          <p className="pdv-waiting-card__name">{clientName(item)}</p>
                          <p className="pdv-waiting-card__meta">{pairMeta(item)}</p>
                        </div>
                        <PairStatusBadge status={item.status} label={item.status_label} />
                      </Link>
                    ))}
                    {row.length === 1 ? <div className="pdv-waiting-card pdv-waiting-card--spacer" aria-hidden /> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {registerOpen ? (
        <RegisterPairModal
          onCreated={() => {
            setRegisterOpen(false);
            showToast(PAIR_CREATED_TOAST.message, PAIR_CREATED_TOAST.title);
            void load();
          }}
          onClose={(discarded) => {
            setRegisterOpen(false);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}
      {foundOpen ? (
        <FoundPairModal
          onDone={() => {
            setFoundOpen(false);
            void load();
          }}
          onClose={(discarded) => {
            setFoundOpen(false);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}
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
    </>
  );
}
