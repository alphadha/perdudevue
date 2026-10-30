"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import FoundPairModal from "@/components/opticien/FoundPairModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import MarkShippedModal from "@/components/opticien/MarkShippedModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import PdvButton from "@/components/pdv/PdvButton";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSortHeader from "@/components/pdv/PdvSortHeader";
import { api, ApiRequestError } from "@/lib/api";
import { downloadLabelFile } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { formatFrDate, type ShopRestitution, type ShippingLabelFile } from "@/lib/types";

type ToastState = { title?: string; message: string };
type SortKey = "reference" | "type" | "brand" | "client" | "assigned_code" | "status" | "found_at";

const PAIR_TYPES = ["Vue", "Soleil", "Solaire de Vue"] as const;

export default function RestitutionPage() {
  const [items, setItems] = useState<ShopRestitution[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [foundOpen, setFoundOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState<ShopRestitution | null>(null);
  const [shipTarget, setShipTarget] = useState<ShopRestitution | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const path = status
      ? `/opticien/restitutions?status=${encodeURIComponent(status)}`
      : "/opticien/restitutions";
    const data = await api<ShopRestitution[]>(path);
    setItems(data);
    setSyncedAt(new Date());
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = items.filter((item) => {
      if (typeFilter && item.type !== typeFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [
        item.reference,
        item.brand,
        item.type,
        item.assigned_code,
        item.client?.last_name,
        item.client?.first_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return sortRows(base, sort, {
      reference: (item) => item.reference,
      type: (item) => item.type,
      brand: (item) => item.brand,
      client: (item) => (item.client ? `${item.client.last_name} ${item.client.first_name}` : ""),
      assigned_code: (item) => item.assigned_code,
      status: (item) => item.status_label,
      found_at: (item) => item.found_at,
    });
  }, [items, query, typeFilter, sort]);

  function header(label: string, key: SortKey) {
    return (
      <PdvSortHeader
        label={label}
        active={sort?.key === key}
        onClick={() => setSort((current) => toggleSort(current, key))}
      />
    );
  }

  const canHandOver = items.some((item) => item.actions.can_hand_over);
  const selectable = filtered.filter((item) => item.actions.can_select_for_labels);
  const allSelectableChecked = selectable.length > 0 && selectable.every((item) => selected.includes(item.uuid));

  async function downloadLabels(uuids: string[]) {
    try {
      const files = await api<ShippingLabelFile[]>("/opticien/labels", {
        method: "POST",
        body: JSON.stringify({ uuids }),
      });
      files.forEach((file) => downloadLabelFile(file));
      setSelected([]);
    } catch {
      showToast("Téléchargement du bordereau impossible.");
    }
  }

  async function downloadOne(item: ShopRestitution) {
    try {
      const file = await api<ShippingLabelFile>(`/opticien/restitutions/${item.uuid}/label`);
      downloadLabelFile(file);
    } catch {
      showToast("Téléchargement du bordereau impossible.");
    }
  }

  async function resend(channels: Array<"email" | "sms">) {
    if (!resendTarget) {
      return;
    }
    setPending(true);
    try {
      await api(`/opticien/restitutions/${resendTarget.uuid}/resend`, {
        method: "POST",
        body: JSON.stringify({ channels }),
      });
      setResendTarget(null);
      showToast("Le code de restitution a été renvoyé au client.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        showToast(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  const syncLabel = syncedAt
    ? `Dernière synchronisation à ${syncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${syncedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}.`
    : "Chargement…";

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} />
      <div className="pdv-page-head">
        <div>
          <h1>Restitution</h1>
          <div className="pdv-page-head__sync">
            <span>{syncLabel}</span>
            <PdvButton
              variant="tertiary"
              iconLeft="/icons/pdv/refresh-ccw-05-dark.svg"
              onClick={() => void load()}
            >
              Rafraîchir
            </PdvButton>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {selected.length >= 2 ? (
            <PdvButton variant="secondary" size="m" onClick={() => void downloadLabels(selected)}>
              Télécharger les bordereaux ({selected.length})
            </PdvButton>
          ) : null}
          <PdvButton
            variant="secondary"
            size="m"
            iconLeft="/icons/pdv/announcement-01-dark.svg"
            onClick={() => setFoundOpen(true)}
          >
            Signaler des lunettes retrouvées
          </PdvButton>
          <PdvButton
            variant="primary"
            size="m"
            disabled={!canHandOver}
            onClick={() => setHandoverOpen(true)}
          >
            Remettre des lunettes
          </PdvButton>
        </div>
      </div>
      <div className="pdv-panel">
        <div className="pdv-toolbar">
          <PdvSearchBar value={query} onChange={setQuery} placeholder="Rechercher" />
          <div className="pdv-toolbar__filters">
            <label className="pdv-filter">
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer par type">
                <option value="">Tous les types</option>
                {PAIR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="pdv-filter">
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrer par statut">
                <option value="">Tous les statuts</option>
                <option value="a_recuperer">À récupérer</option>
                <option value="livraison_demandee">Livraison demandée</option>
                <option value="en_livraison">En livraison</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      {loading ? (
        <p>Chargement des dossiers…</p>
      ) : (
        <div className="pdv-table-wrap table-responsive">
          <table className="pdv-table">
            <thead>
              <tr>
                <th>
                  <input
                    className="pdv-check"
                    type="checkbox"
                    checked={allSelectableChecked}
                    {...(selectable.length === 0 ? { disabled: true } : {})}
                    onChange={(event) => {
                      setSelected(event.target.checked ? selectable.map((item) => item.uuid) : []);
                    }}
                    aria-label="Sélectionner les dossiers en livraison demandée"
                  />
                </th>
                {header("Ref dossier", "reference")}
                {header("Type", "type")}
                {header("Marque", "brand")}
                {header("Client", "client")}
                {header("Code assigné", "assigned_code")}
                {header("Statut", "status")}
                {header("Date signalement", "found_at")}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>Aucun dossier de restitution en cours.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.uuid}>
                    <td>
                      <input
                        className="pdv-check"
                        type="checkbox"
                        checked={selected.includes(item.uuid)}
                        {...(!item.actions.can_select_for_labels ? { disabled: true } : {})}
                        onChange={(event) => {
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, item.uuid]
                              : current.filter((uuid) => uuid !== item.uuid),
                          );
                        }}
                        aria-label={`Sélectionner ${item.assigned_code}`}
                      />
                    </td>
                    <td>{item.reference ? `#${item.reference}` : ""}</td>
                    <td>{item.type}</td>
                    <td>{item.brand}</td>
                    <td>
                      {item.client ? `${item.client.last_name} ${item.client.first_name}` : null}
                    </td>
                    <td>{item.assigned_code}</td>
                    <td>
                      <PairStatusBadge status={item.status} label={item.status_label} />
                    </td>
                    <td>{formatFrDate(item.found_at)}</td>
                    <td>
                      <div className="dropdown">
                        <button
                          className="pdv-icon-btn"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="Actions"
                        >
                          <img src="/icons/pdv/dots-vertical.svg" alt="" width={20} height={20} />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          {item.actions.can_hand_over ? (
                            <li>
                              <button type="button" className="dropdown-item" onClick={() => setHandoverOpen(true)}>
                                Remettre au client
                              </button>
                            </li>
                          ) : null}
                          {item.actions.can_resend ? (
                            <li>
                              <button type="button" className="dropdown-item" onClick={() => setResendTarget(item)}>
                                Relancer le client
                              </button>
                            </li>
                          ) : null}
                          {item.actions.can_download_label || item.actions.can_mark_shipped ? (
                            <>
                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item"
                                  disabled={!item.actions.can_download_label}
                                  onClick={() => void downloadOne(item)}
                                >
                                  Télécharger le bordereau
                                </button>
                              </li>
                              <li>
                                <button
                                  type="button"
                                  className="dropdown-item"
                                  disabled={!item.actions.can_mark_shipped}
                                  onClick={() => setShipTarget(item)}
                                >
                                  Indiquer comme en livraison
                                </button>
                              </li>
                            </>
                          ) : item.status === "livraison_demandee" ? (
                            <>
                              <li>
                                <button type="button" className="dropdown-item disabled" disabled>
                                  Télécharger le bordereau
                                </button>
                              </li>
                              <li>
                                <button type="button" className="dropdown-item disabled" disabled>
                                  Indiquer comme en livraison
                                </button>
                              </li>
                            </>
                          ) : null}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
      {shipTarget ? (
        <MarkShippedModal
          pairUuid={shipTarget.uuid}
          onDone={() => {
            setShipTarget(null);
            void load();
            showToast("La paire a été indiquée comme en livraison.");
          }}
          onClose={(discarded) => {
            setShipTarget(null);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}
      {resendTarget ? (
        <BootstrapModal title="Relancer le client" onClose={() => setResendTarget(null)}>
          <div className="modal-body">
            <p className="mb-0">Choisissez le canal de renvoi du code de restitution (selon les consentements).</p>
          </div>
          <div className="modal-footer flex-column gap-2">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={pending}
              onClick={() => void resend(["email"])}
            >
              Renvoyer par e-mail
            </button>
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              disabled={pending}
              onClick={() => void resend(["sms"])}
            >
              Renvoyer par SMS
            </button>
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              disabled={pending}
              onClick={() => void resend(["email", "sms"])}
            >
              Renvoyer par e-mail et SMS
            </button>
            <button type="button" className="btn btn-link" onClick={() => setResendTarget(null)}>
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
