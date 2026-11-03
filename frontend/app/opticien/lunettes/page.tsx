"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import MarkShippedModal from "@/components/opticien/MarkShippedModal";
import { PairEngraveModal, PairInactiveModal } from "@/components/opticien/PairActionModals";
import PairRowMenu from "@/components/opticien/PairRowMenu";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import { usePairStatusMutations } from "@/components/opticien/usePairStatusMutations";
import PdvButton from "@/components/pdv/PdvButton";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSelect from "@/components/pdv/PdvSelect";
import PdvPagination from "@/components/pdv/PdvPagination";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { api, ApiRequestError } from "@/lib/api";
import { formatSyncLabel } from "@/lib/formatSync";
import { PAIR_CREATED_TOAST, clientDisplayName, downloadAssignedCode, downloadLabelFile } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { formatFrDate, type ShopPair, type ShippingLabelFile } from "@/lib/types";

type ToastState = { title?: string; message: string };
type SortKey = "brand" | "type" | "colors" | "client" | "assigned_code" | "status" | "registered_at";

const PAIR_TYPES = ["Vue", "Soleil", "Solaire de Vue"] as const;
const PAGE_SIZE = 10;

function isCheckboxEnabled(pair: ShopPair): boolean {
  return pair.actions.can_select_for_labels;
}

function selectionLabel(count: number): string {
  return count <= 1 ? `${count} paire sélectionnée` : `${count} paires sélectionnées`;
}

export default function LunettesPage() {
  const [pairs, setPairs] = useState<ShopPair[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [shipTarget, setShipTarget] = useState<ShopPair | null>(null);
  const [resendTarget, setResendTarget] = useState<ShopPair | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pendingResend, setPendingResend] = useState(false);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const path = status ? `/opticien/pairs?status=${encodeURIComponent(status)}` : "/opticien/pairs";
    const data = await api<ShopPair[]>(path);
    setPairs(data);
    setSyncedAt(new Date());
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  const onUpdated = useCallback(
    (updated: ShopPair) => {
      setPairs((current) =>
        current
          .map((item) => (item.uuid === updated.uuid ? updated : item))
          .filter((item) => !status || item.status === status),
      );
      if (updated.status === "active") {
        showToast("La paire a été indiquée comme gravée.");
      }
      if (updated.status === "inactive") {
        showToast("La paire a été déclarée inactive.");
      }
    },
    [showToast, status],
  );

  const mutations = usePairStatusMutations(onUpdated, (message) => showToast(message));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = pairs.filter((pair) => {
      if (typeFilter && pair.type !== typeFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [pair.brand, pair.type, pair.assigned_code, pair.client?.last_name, pair.client?.first_name]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return sortRows(base, sort, {
      brand: (pair) => pair.brand,
      type: (pair) => pair.type,
      colors: (pair) => pair.colors.join(", "),
      client: (pair) => clientDisplayName(pair),
      assigned_code: (pair) => pair.assigned_code,
      status: (pair) => pair.status_label,
      registered_at: (pair) => pair.registered_at,
    });
  }, [pairs, query, typeFilter, sort]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, status, sort]);

  useEffect(() => {
    const visible = new Set(filtered.map((pair) => pair.uuid));
    setSelected((current) => {
      const next = current.filter((uuid) => visible.has(uuid));
      return next.length === current.length ? current : next;
    });
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const checkboxable = pageRows.filter(isCheckboxEnabled);
  const selectedPairs = filtered.filter((pair) => selected.includes(pair.uuid));
  const selectedCount = selectedPairs.length;
  const selectedForLabels = selectedPairs.filter((pair) => pair.actions.can_select_for_labels);
  const selectedForEngrave = selectedPairs.filter((pair) => pair.actions.can_export_code);
  const showLabelsBulk = selectedForLabels.length >= 2;
  const showEngraveBulk = selectedForEngrave.length >= 1 && selectedForEngrave.length === selectedPairs.length;
  const hasSelection = selectedCount > 0;

  const pairColumns: PdvTableColumn<ShopPair, SortKey>[] = [
    { key: "assigned_code", label: "Code assigné", width: 120, render: (pair) => pair.assigned_code },
    { key: "client", label: "Client", width: 170, render: (pair) => clientDisplayName(pair) },
    { key: "type", label: "Type", width: 130, render: (pair) => pair.type },
    { key: "brand", label: "Marque", width: 120, render: (pair) => pair.brand },
    { key: "colors", label: "Couleur(s)", width: 140, render: (pair) => pair.colors.join(", ") },
    {
      key: "status",
      label: "Statut",
      width: 160,
      render: (pair) => <PairStatusBadge status={pair.status} label={pair.status_label} />,
    },
    { key: "registered_at", label: "Date enreg.", width: 110, render: (pair) => formatFrDate(pair.registered_at) },
  ];

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

  async function downloadOne(pair: ShopPair) {
    try {
      const file = await api<ShippingLabelFile>(`/opticien/restitutions/${pair.uuid}/label`);
      downloadLabelFile(file);
    } catch {
      showToast("Téléchargement du bordereau impossible.");
    }
  }

  function exportEngraveCodes(targets: ShopPair[]) {
    targets.forEach((pair) => downloadAssignedCode(pair));
    setSelected([]);
    showToast(`${targets.length} code(s) à graver exporté(s).`);
  }

  async function resend(channels: Array<"email" | "sms">) {
    if (!resendTarget) {
      return;
    }
    setPendingResend(true);
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
      setPendingResend(false);
    }
  }

  const syncLabel = syncedAt ? formatSyncLabel(syncedAt) : "Chargement…";

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} />
      <div className="pdv-page-head">
        <div>
          <h1>Lunettes</h1>
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
        <PdvButton
          variant="primary"
          size="l"
          iconLeft="/icons/pdv/glasses-01-light.svg"
          onClick={() => setRegisterOpen(true)}
        >
          Enregistrer une paire
        </PdvButton>
      </div>

      {loading ? (
        <p>Chargement des paires…</p>
      ) : (
        <div className="pdv-table-block">
          <div className="pdv-table-stack">
            <div className="pdv-panel pdv-panel--search">
              <div className="pdv-toolbar">
                <PdvSearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Rechercher une paire, un code..."
                />
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
                    <option value="a_graver">À graver</option>
                    <option value="active">Active</option>
                    <option value="perdue">Perdue</option>
                    <option value="inactive">Inactive</option>
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
                          onClick={() => void downloadLabels(selectedForLabels.map((pair) => pair.uuid))}
                        >
                          {`Télécharger les bordereaux (${selectedForLabels.length})`}
                        </PdvButton>
                      ) : null}
                      {showEngraveBulk ? (
                        <PdvButton variant="secondary" size="m" onClick={() => exportEngraveCodes(selectedForEngrave)}>
                          Exporter les codes à graver
                        </PdvButton>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div className="pdv-panel pdv-panel--table">
              <PdvTable
                columns={pairColumns}
                rows={pageRows}
                getRowId={(pair) => pair.uuid}
                empty="Aucune paire pour le moment."
                sort={sort}
                onSort={(key) => setSort((current) => toggleSort(current, key))}
                selection={{
                  selected,
                  isEnabled: isCheckboxEnabled,
                  headerAriaLabel: "Sélectionner les paires exportables",
                  rowAriaLabel: (pair) => `Sélectionner ${pair.assigned_code}`,
                  onToggleAll: (checked) => {
                    const pageIds = checkboxable.map((pair) => pair.uuid);
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
                actions={(pair) => (
                  <PairRowMenu
                    pair={pair}
                    onEngrave={mutations.setEngravePair}
                    onInactivate={mutations.setInactivePair}
                    onHandOver={() => setHandoverOpen(true)}
                    onResend={(item) => setResendTarget(item)}
                    onDownloadLabel={(item) => void downloadOne(item)}
                    onMarkShipped={(item) => setShipTarget(item)}
                  />
                )}
              />
            </div>
          </div>
          <PdvPagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
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
          onConfirm={() => void mutations.confirmInactive()}
          onClose={() => mutations.setInactivePair(null)}
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
              disabled={pendingResend}
              onClick={() => void resend(["email"])}
            >
              Renvoyer par e-mail
            </button>
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              disabled={pendingResend}
              onClick={() => void resend(["sms"])}
            >
              Renvoyer par SMS
            </button>
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              disabled={pendingResend}
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
