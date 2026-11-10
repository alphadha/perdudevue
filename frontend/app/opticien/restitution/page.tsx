"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import FoundPairModal from "@/components/opticien/FoundPairModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import MarkShippedModal from "@/components/opticien/MarkShippedModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import ResendPickupModal from "@/components/opticien/ResendPickupModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvPagination from "@/components/pdv/PdvPagination";
import PdvRowActions, { type PdvRowAction } from "@/components/pdv/PdvRowActions";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSelect from "@/components/pdv/PdvSelect";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { api } from "@/lib/api";
import { formatSyncLabel } from "@/lib/formatSync";
import { downloadLabelFile } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { DISCARD_TOAST, type ToastState } from "@/lib/toasts";
import { formatFrDate, type ShopRestitution, type ShippingLabelFile } from "@/lib/types";

type SortKey = "reference" | "type" | "brand" | "colors" | "status" | "found_at";

const PAIR_TYPES = ["Vue", "Soleil", "Solaire de Vue"] as const;
const PAGE_SIZE = 10;

function selectionLabel(count: number): string {
  return count <= 1 ? `${count} paire sélectionnée` : `${count} paires sélectionnées`;
}

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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

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
      colors: (item) => item.colors.join(", "),
      status: (item) => item.status_label,
      found_at: (item) => item.found_at,
    });
  }, [items, query, typeFilter, sort]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canHandOver = items.some((item) => item.actions.can_hand_over);
  const selectedForLabels = items.filter(
    (item) => selected.includes(item.uuid) && item.actions.can_select_for_labels,
  );
  const checkboxable = pageRows.filter((item) => item.actions.can_select_for_labels);
  const selectedCount = selected.length;
  const hasSelection = selectedCount > 0;
  const showLabelsBulk = selectedForLabels.length >= 2;

  const restitutionColumns: PdvTableColumn<ShopRestitution, SortKey>[] = [
    { key: "reference", label: "Ref dossier", width: 109, render: (item) => (item.reference ? `#${item.reference}` : "") },
    { key: "type", label: "Type", width: 113, render: (item) => item.type },
    { key: "brand", label: "Marque", width: 100, render: (item) => item.brand },
    { key: "colors", label: "Couleur(s)", width: 120, render: (item) => item.colors.join(", ") },
    {
      key: "status",
      label: "Statut",
      width: 149,
      render: (item) => <PairStatusBadge status={item.status} label={item.status_label} />,
    },
    { key: "found_at", label: "Date signalement", width: 152, render: (item) => formatFrDate(item.found_at) },
  ];

  function restitutionActions(item: ShopRestitution): PdvRowAction[] {
    const actions: PdvRowAction[] = [
      { label: "Voir la fiche", href: `/opticien/restitution/${item.uuid}` },
    ];
    if (item.actions.can_hand_over) {
      actions.push({ label: "Remettre au client", onClick: () => setHandoverOpen(true) });
    }
    if (item.actions.can_resend) {
      actions.push({ label: "Relancer le client", onClick: () => setResendTarget(item) });
    }
    if (item.actions.can_download_label || item.actions.can_mark_shipped) {
      actions.push(
        {
          label: "Télécharger le bordereau d’envoi",
          disabled: !item.actions.can_download_label,
          onClick: () => void downloadOne(item),
        },
        {
          label: "Indiquer comme en livraison",
          disabled: !item.actions.can_mark_shipped,
          onClick: () => setShipTarget(item),
        },
      );
    }
    return actions;
  }

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

  const syncLabel = syncedAt ? formatSyncLabel(syncedAt) : "Chargement…";

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} variant={toast?.variant} onDismiss={() => setToast(null)} />
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
        <div className="pdv-page-head__actions">
          <PdvButton
            variant="secondary"
            size="l"
            iconLeft="/icons/pdv/announcement-01-dark.svg"
            onClick={() => setFoundOpen(true)}
          >
            Signaler des lunettes retrouvées
          </PdvButton>
          <PdvButton
            variant="primary"
            size="l"
            iconLeft="/icons/pdv/restitution-bottom.svg"
            disabled={!canHandOver}
            onClick={() => setHandoverOpen(true)}
          >
            Remettre des lunettes
          </PdvButton>
        </div>
      </div>

      {loading ? (
        <p>Chargement des dossiers…</p>
      ) : (
        <div className="pdv-table-block">
          <div className="pdv-table-stack">
            <div className="pdv-panel pdv-panel--search">
              <div className="pdv-toolbar">
                <PdvSearchBar value={query} onChange={setQuery} placeholder="Rechercher un dossier..." />
                <div className="pdv-toolbar__filters">
                  <PdvSelect
                    variant="filter"
                    aria-label="Filtrer par type"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <option value="">Tous les types</option>
                    {PAIR_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </PdvSelect>
                  <PdvSelect
                    variant="filter"
                    aria-label="Filtrer par statut"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">Tous les statuts</option>
                    <option value="a_recuperer">À récupérer</option>
                    <option value="livraison_demandee">Livraison demandée</option>
                    <option value="en_livraison">En livraison</option>
                  </PdvSelect>
                </div>
              </div>
              {hasSelection ? (
                <>
                  <hr className="pdv-panel__divider" />
                  <div className="pdv-selection">
                    <p className="pdv-selection__count">{selectionLabel(selectedCount)}</p>
                    <div className="pdv-selection__actions">
                      {showLabelsBulk ? (
                        <PdvButton
                          variant="secondary"
                          size="m"
                          iconLeft="/icons/pdv/download-01.svg"
                          onClick={() => void downloadLabels(selectedForLabels.map((item) => item.uuid))}
                        >
                          {`Télécharger les bordereaux (${selectedForLabels.length})`}
                        </PdvButton>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="pdv-panel pdv-panel--table">
              <PdvTable
                columns={restitutionColumns}
                rows={pageRows}
                getRowId={(item) => item.uuid}
                empty="Aucune paire de lunette en attente de restitution pour le moment"
                sort={sort}
                onSort={(key) => setSort((current) => toggleSort(current, key))}
                selection={{
                  selected,
                  isEnabled: (item) => item.actions.can_select_for_labels,
                  headerAriaLabel: "Sélectionner les dossiers en livraison demandée",
                  rowAriaLabel: (item) => `Sélectionner ${item.assigned_code}`,
                  onToggleAll: (checked) => {
                    const pageIds = checkboxable.map((item) => item.uuid);
                    setSelected((current) =>
                      checked
                        ? Array.from(new Set([...current, ...pageIds]))
                        : current.filter((uuid) => !pageIds.includes(uuid)),
                    );
                  },
                  onToggleRow: (id, checked) => {
                    setSelected((current) =>
                      checked ? [...current, id] : current.filter((uuid) => uuid !== id),
                    );
                  },
                }}
                actions={(item) => <PdvRowActions items={restitutionActions(item)} />}
              />
            </div>
          </div>
          <PdvPagination page={page} pageCount={pageCount} onChange={setPage} />
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
              setToast(DISCARD_TOAST);
              window.setTimeout(() => setToast(null), 4000);
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
              setToast(DISCARD_TOAST);
              window.setTimeout(() => setToast(null), 4000);
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
              setToast(DISCARD_TOAST);
              window.setTimeout(() => setToast(null), 4000);
            }
          }}
        />
      ) : null}
      {resendTarget ? (
        <ResendPickupModal
          uuid={resendTarget.uuid}
          onDone={(next) => {
            setResendTarget(null);
            setToast(next);
            window.setTimeout(() => setToast(null), 4000);
          }}
          onClose={(discarded) => {
            setResendTarget(null);
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
