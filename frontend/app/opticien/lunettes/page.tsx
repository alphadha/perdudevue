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
import PdvCheckbox from "@/components/pdv/PdvCheckbox";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSortHeader from "@/components/pdv/PdvSortHeader";
import { api, ApiRequestError } from "@/lib/api";
import { PAIR_CREATED_TOAST, clientDisplayName, downloadAssignedCode, downloadLabelFile } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { formatFrDate, type ShopPair, type ShippingLabelFile } from "@/lib/types";

type ToastState = { title?: string; message: string };
type SortKey = "brand" | "type" | "colors" | "client" | "assigned_code" | "status" | "registered_at";

const PAIR_TYPES = ["Vue", "Soleil", "Solaire de Vue"] as const;

function isCheckboxEnabled(pair: ShopPair): boolean {
  return pair.actions.can_select_for_labels || pair.actions.can_export_code;
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
    const visible = new Set(filtered.map((pair) => pair.uuid));
    setSelected((current) => {
      const next = current.filter((uuid) => visible.has(uuid));
      return next.length === current.length ? current : next;
    });
  }, [filtered]);

  const checkboxable = filtered.filter(isCheckboxEnabled);
  const selectedPairs = filtered.filter((pair) => selected.includes(pair.uuid));
  const selectedCount = selectedPairs.length;
  const selectedForLabels = selectedPairs.filter((pair) => pair.actions.can_select_for_labels);
  const selectedForEngrave = selectedPairs.filter((pair) => pair.actions.can_export_code);
  const showLabelsBulk = selectedForLabels.length >= 2 && selectedForLabels.length === selectedPairs.length;
  const showEngraveBulk = selectedForEngrave.length >= 1 && selectedForEngrave.length === selectedPairs.length;
  const allCheckboxableChecked =
    checkboxable.length > 0 && checkboxable.every((pair) => selected.includes(pair.uuid));
  const someCheckboxableChecked =
    checkboxable.some((pair) => selected.includes(pair.uuid)) && !allCheckboxableChecked;
  const hasSelection = selectedCount > 0;

  function toggleHeaderSort(key: SortKey) {
    setSort((current) => toggleSort(current, key));
  }

  function header(label: string, key: SortKey) {
    return (
      <PdvSortHeader label={label} active={sort?.key === key} onClick={() => toggleHeaderSort(key)} />
    );
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

  const syncLabel = syncedAt
    ? `Dernière synchronisation à ${syncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${syncedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}.`
    : "Chargement…";

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
          size="m"
          iconLeft="/icons/pdv/glasses-01.svg"
          onClick={() => setRegisterOpen(true)}
        >
          Enregistrer une paire
        </PdvButton>
      </div>

      <div className="pdv-panel">
        <div className="pdv-toolbar">
          <PdvSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Rechercher une paire, un code..."
          />
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
                <option value="a_graver">À graver</option>
                <option value="active">Active</option>
                <option value="perdue">Perdue</option>
                <option value="inactive">Inactive</option>
                <option value="a_recuperer">À récupérer</option>
                <option value="livraison_demandee">Livraison demandée</option>
                <option value="en_livraison">En livraison</option>
              </select>
            </label>
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
                    Télécharger les bordereaux
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

      {loading ? (
        <p>Chargement des paires…</p>
      ) : (
        <div className="pdv-table-wrap table-responsive">
          <table className="pdv-table">
            <thead>
              <tr>
                <th>
                  <PdvCheckbox
                    checked={allCheckboxableChecked}
                    indeterminate={someCheckboxableChecked}
                    disabled={checkboxable.length === 0}
                    aria-label="Sélectionner les paires exportables"
                    onChange={(checked) => {
                      setSelected(checked ? checkboxable.map((pair) => pair.uuid) : []);
                    }}
                  />
                </th>
                {header("Code assigné", "assigned_code")}
                {header("Client", "client")}
                {header("Type", "type")}
                {header("Marque", "brand")}
                {header("Couleur(s)", "colors")}
                {header("Statut", "status")}
                {header("Date enreg.", "registered_at")}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>Aucune paire pour le moment.</td>
                </tr>
              ) : (
                filtered.map((pair) => (
                  <tr key={pair.uuid}>
                    <td>
                      <PdvCheckbox
                        checked={selected.includes(pair.uuid)}
                        disabled={!isCheckboxEnabled(pair)}
                        aria-label={`Sélectionner ${pair.assigned_code}`}
                        onChange={(checked) => {
                          setSelected((current) =>
                            checked ? [...current, pair.uuid] : current.filter((uuid) => uuid !== pair.uuid),
                          );
                        }}
                      />
                    </td>
                    <td>{pair.assigned_code}</td>
                    <td>{clientDisplayName(pair)}</td>
                    <td>{pair.type}</td>
                    <td>{pair.brand}</td>
                    <td>{pair.colors.join(", ")}</td>
                    <td>
                      <PairStatusBadge status={pair.status} label={pair.status_label} />
                    </td>
                    <td>{formatFrDate(pair.registered_at)}</td>
                    <td>
                      <PairRowMenu
                        pair={pair}
                        onEngrave={mutations.setEngravePair}
                        onInactivate={mutations.setInactivePair}
                        onHandOver={() => setHandoverOpen(true)}
                        onResend={(item) => setResendTarget(item)}
                        onDownloadLabel={(item) => void downloadOne(item)}
                        onMarkShipped={(item) => setShipTarget(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
