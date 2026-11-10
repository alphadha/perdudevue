"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppToast from "@/components/AppToast";
import HandoverModal from "@/components/opticien/HandoverModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import ResendPickupModal from "@/components/opticien/ResendPickupModal";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import { formatPhoneFr } from "@/lib/formatPhone";
import { downloadLabelFile } from "@/lib/pairUi";
import { DISCARD_TOAST, type ToastState } from "@/lib/toasts";
import { formatFrDate, type ShopRestitution, type ShippingLabelFile } from "@/lib/types";

export default function RestitutionFichePage() {
  const params = useParams<{ uuid: string }>();
  const [item, setItem] = useState<ShopRestitution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<ShopRestitution>(`/opticien/restitutions/${params.uuid}`);
      setItem(data);
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

  async function downloadLabel() {
    try {
      const file = await api<ShippingLabelFile>(`/opticien/restitutions/${params.uuid}/label`);
      downloadLabelFile(file);
    } catch {
      showToast("Téléchargement du bordereau impossible.");
    }
  }

  async function copyAssignedCode() {
    if (!item) {
      return;
    }
    try {
      await navigator.clipboard.writeText(item.assigned_code);
      showToast("Code assigné copié.");
    } catch {
      showToast("Copie du code assigné impossible.");
    }
  }

  if (error) {
    return (
      <div className="pdv-fiche">
        <Link href="/opticien/restitution" className="pdv-back-link">
          <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
          Revenir aux restitutions
        </Link>
        <p className="pdv-client-page-sub">{error}</p>
      </div>
    );
  }

  if (!item) {
    return <p>Chargement de la fiche…</p>;
  }

  const events = [...(item.events ?? [])].sort((a, b) => {
    const left = a.at ? Date.parse(a.at) : 0;
    const right = b.at ? Date.parse(b.at) : 0;
    return right - left;
  });
  const dossierTitle = item.reference ? `Dossier #${item.reference}` : item.title;

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} variant={toast?.variant} onDismiss={() => setToast(null)} />
      <div className="pdv-fiche">
      <div className="pdv-fiche__intro">
        <Link href="/opticien/restitution" className="pdv-back-link">
          <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
          Revenir aux restitutions
        </Link>
      <div className="pdv-page-head pdv-page-head--pair">
        <div>
          <h1>{dossierTitle}</h1>
        </div>
        <div className="pdv-page-head__actions">
          {item.status === "a_recuperer" ? (
            <>
              <PdvButton
                variant="secondary"
                size="l"
                iconLeft="/icons/pdv/mail-01.svg"
                disabled={!item.actions.can_resend}
                onClick={() => setResendOpen(true)}
              >
                Relancer le client
              </PdvButton>
              <PdvButton
                variant="primary"
                size="l"
                iconLeft="/icons/pdv/restitution-bottom.svg"
                disabled={!item.actions.can_hand_over}
                onClick={() => setHandoverOpen(true)}
              >
                Remettre au client
              </PdvButton>
            </>
          ) : null}
          {item.status === "livraison_demandee" ? (
            <PdvButton
              variant="secondary"
              size="l"
              iconLeft="/icons/pdv/download-01.svg"
              disabled={!item.actions.can_download_label}
              onClick={() => void downloadLabel()}
            >
              Télécharger le bordereau d’envoi
            </PdvButton>
          ) : null}
        </div>
      </div>
      </div>
      <div className="pdv-fiche-grid">
        <div className="pdv-panel pdv-panel--fiche">
          <div className="pdv-fiche-card-head">
            <h2>Informations</h2>
            <PairStatusBadge status={item.status} label={item.status_label} />
          </div>
          <div className="pdv-kv">
            {item.client ? (
              <>
                <div className="pdv-kv__row">
                  <span className="pdv-kv__label">Client</span>
                  <span className="pdv-kv__value">
                    <Link href={`/opticien/clients/${item.client.uuid}`}>
                      {item.client.first_name} {item.client.last_name}
                    </Link>
                  </span>
                </div>
                {item.client.phone ? (
                  <div className="pdv-kv__row">
                    <span className="pdv-kv__label">Numéro de téléphone client</span>
                    <span className="pdv-kv__value">{formatPhoneFr(item.client.phone)}</span>
                  </div>
                ) : null}
                {item.client.email ? (
                  <div className="pdv-kv__row">
                    <span className="pdv-kv__label">Adresse mail client</span>
                    <span className="pdv-kv__value">{item.client.email}</span>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Type de lunettes</span>
              <span className="pdv-kv__value">{item.type}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Marque</span>
              <span className="pdv-kv__value">{item.brand}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Couleurs</span>
              <span className="pdv-kv__value">{item.colors.join(", ")}</span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Code assigné</span>
              <span className="pdv-kv__value">
                {item.assigned_code}
                <button type="button" className="pdv-copy-btn" aria-label="Copier le code assigné" onClick={() => void copyAssignedCode()}>
                  <img src="/icons/pdv/copy-06.svg" alt="" width={14} height={14} />
                </button>
              </span>
            </div>
            <div className="pdv-kv__row">
              <span className="pdv-kv__label">Date d&apos;enregistrement</span>
              <span className="pdv-kv__value">{formatFrDate(item.registered_at)}</span>
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
              setToast(DISCARD_TOAST);
              window.setTimeout(() => setToast(null), 4000);
            }
          }}
        />
      ) : null}
      {resendOpen ? (
        <ResendPickupModal
          uuid={item.uuid}
          onDone={(next) => {
            setResendOpen(false);
            setToast(next);
            window.setTimeout(() => setToast(null), 4000);
          }}
          onClose={(discarded) => {
            setResendOpen(false);
            if (discarded) {
              setToast(DISCARD_TOAST);
              window.setTimeout(() => setToast(null), 4000);
            }
          }}
        />
      ) : null}
    </>
  );
}
