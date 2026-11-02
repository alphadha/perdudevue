"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import FoundPairModal from "@/components/opticien/FoundPairModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import MarkShippedModal from "@/components/opticien/MarkShippedModal";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import PdvButton from "@/components/pdv/PdvButton";
import PdvRowActions, { type PdvRowAction } from "@/components/pdv/PdvRowActions";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSelect from "@/components/pdv/PdvSelect";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { api, ApiRequestError } from "@/lib/api";
import { formatSyncLabel } from "@/lib/formatSync";
import { downloadLabelFile } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { formatFrDate, type ShopRestitution, type ShippingLabelFile } from "@/lib/types";

type ToastState = { title?: string; message: string };
type SortKey = "reference" | "type" | "brand" | "colors" | "status" | "found_at";

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
      colors: (item) => item.colors.join(", "),
      status: (item) => item.status_label,
      found_at: (item) => item.found_at,
    });
  }, [items, query, typeFilter, sort]);

  const canHandOver = items.some((item) => item.actions.can_hand_over);
  const selectable = filtered.filter((item) => item.actions.can_select_for_labels);

  const restitutionColumns: PdvTableColumn<ShopRestitution, SortKey>[] = [
    { key: "reference", label: "Ref dossier", width: 130, render: (item) => (item.reference ? `#${item.reference}` : "") },
    { key: "type", label: "Type", width: 130, render: (item) => item.type },
    { key: "brand", label: "Marque", width: 120, render: (item) => item.brand },
    { key: "colors", label: "Couleur(s)", width: 140, render: (item) => item.colors.join(", ") },
    {
      key: "status",
      label: "Statut",
      width: 160,
      render: (item) => <PairStatusBadge status={item.status} label={item.status_label} />,
    },
    { key: "found_at", label: "Date signalement", width: 140, render: (item) => formatFrDate(item.found_at) },
  ];

  function restitutionActions(item: ShopRestitution): PdvRowAction[] {
    const items: PdvRowAction[] = [];
    if (item.actions.can_hand_over) {
      items.push({ label: "Remettre au client", onClick: () => setHandoverOpen(true) });
    }
    if (item.actions.can_resend) {
      items.push({ label: "Relancer le client", onClick: () => setResendTarget(item) });
    }
    if (item.actions.can_download_label || item.actions.can_mark_shipped) {
      items.push(
        {
          label: "Télécharger le bordereau",
          disabled: !item.actions.can_download_label,
          onClick: () => void downloadOne(item),
        },
        {
          label: "Indiquer comme en livraison",
          disabled: !item.actions.can_mark_shipped,
          onClick: () => setShipTarget(item),
        },
      );
    } else if (item.status === "livraison_demandee") {
      items.push(
        { label: "Télécharger le bordereau", disabled: true },
        { label: "Indiquer comme en livraison", disabled: true },
      );
    }
    return items;
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

  const syncLabel = syncedAt ? formatSyncLabel(syncedAt) : "Chargement…";

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
      </div>
      {loading ? (
        <p>Chargement des dossiers…</p>
      ) : (
        <div className="pdv-panel pdv-panel--table">
          <PdvTable
            columns={restitutionColumns}
            rows={filtered}
            getRowId={(item) => item.uuid}
            empty="Aucun dossier de restitution en cours."
            sort={sort}
            onSort={(key) => setSort((current) => toggleSort(current, key))}
            selection={{
              selected,
              isEnabled: (item) => item.actions.can_select_for_labels,
              headerAriaLabel: "Sélectionner les dossiers en livraison demandée",
              rowAriaLabel: (item) => `Sélectionner ${item.assigned_code}`,
              onToggleAll: (checked) => {
                setSelected(checked ? selectable.map((item) => item.uuid) : []);
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
