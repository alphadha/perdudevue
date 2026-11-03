"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import ClientFormFields from "@/components/opticien/ClientFormFields";
import CreateClientFlow from "@/components/opticien/CreateClientFlow";
import { api, ApiRequestError } from "@/lib/api";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvRowActions from "@/components/pdv/PdvRowActions";
import PdvPagination from "@/components/pdv/PdvPagination";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { formatSyncLabel } from "@/lib/formatSync";
import { PAIR_CREATED_TOAST } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import {
  isIdentityChallenge,
  type ClientPayload,
  type IdentityChallenge,
  type ShopClient,
} from "@/lib/types";

type SortKey = "last_name" | "first_name" | "email" | "phone" | "pairs_count" | "pairs_lost_count";

const PAGE_SIZE = 10;

const CLIENT_COLUMNS: PdvTableColumn<ShopClient, SortKey>[] = [
  { key: "last_name", label: "Nom", width: 170, render: (client) => client.last_name },
  { key: "first_name", label: "Prénom", width: 170, render: (client) => client.first_name },
  { key: "email", label: "Email", width: 220, render: (client) => client.email },
  { key: "phone", label: "Téléphone", width: 120, render: (client) => client.phone },
  { key: "pairs_count", label: "Paires enreg.", width: 120, render: (client) => client.pairs_count },
  { key: "pairs_lost_count", label: "Paires perdues", width: 130, render: (client) => client.pairs_lost_count },
];

const emptyForm = (): ClientPayload => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  consent_email: false,
  consent_sms: false,
});

function fieldErrorsFrom(error: ApiRequestError): Record<string, string> {
  const next: Record<string, string> = {};
  error.errors.forEach((item) => {
    if (item.field) {
      next[item.field] = item.message;
    }
  });
  return next;
}

export default function OpticienClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ShopClient[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTitle, setToastTitle] = useState<string | undefined>();
  const [registerFor, setRegisterFor] = useState<ShopClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ClientPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShopClient | null>(null);
  const [otp, setOtp] = useState<IdentityChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ShopClient | null>(null);

  const showToast = useCallback((message: string, title?: string) => {
    setToastTitle(title);
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const data = await api<ShopClient[]>("/opticien/clients");
    setClients(data);
    setSyncedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [query, sort]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = !needle
      ? clients
      : clients.filter((client) =>
          [client.last_name, client.first_name, client.email, client.phone ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );

    return sortRows(base, sort, {
      last_name: (client) => client.last_name,
      first_name: (client) => client.first_name,
      email: (client) => client.email,
      phone: (client) => client.phone,
      pairs_count: (client) => client.pairs_count,
      pairs_lost_count: (client) => client.pairs_lost_count,
    });
  }, [clients, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const emptyCopy =
    clients.length === 0
      ? "Aucune client enregistré pour le moment"
      : "Aucun client ne correspond à votre recherche.";

  function openCreate() {
    setCreateOpen(true);
  }

  function openEdit(client: ShopClient) {
    setEditTarget(client);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone ?? "",
      consent_email: client.consent_email,
      consent_sms: client.consent_sms,
    });
    setFieldErrors({});
    setFormError(null);
    setEditOpen(true);
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const result = await api<ShopClient | IdentityChallenge>(`/opticien/clients/${editTarget?.uuid}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      if (isIdentityChallenge(result)) {
        setEditOpen(false);
        setOtp(result);
        return;
      }
      setEditOpen(false);
      showToast("La fiche client a bien été mise à jour.");
      await load();
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFieldErrors(fieldErrorsFrom(caught));
        setFormError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault();
    if (!otp) {
      return;
    }
    setPending(true);
    setOtpError(null);
    try {
      const result = await api<ShopClient | IdentityChallenge>(`/opticien/clients/identity/${otp.action_token}/otp`, {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      if (isIdentityChallenge(result)) {
        setOtp(result);
        setOtpCode("");
        return;
      }
      setOtp(null);
      setOtpCode("");
      showToast("La fiche client a bien été mise à jour.");
      await load();
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.fieldError("code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function resendOtp() {
    if (!otp) {
      return;
    }
    setPending(true);
    try {
      const result = await api<IdentityChallenge>(`/opticien/clients/identity/${otp.action_token}/resend`, {
        method: "POST",
      });
      setOtp(result);
      showToast("Un nouveau code a été envoyé.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) {
      return;
    }
    setPending(true);
    try {
      await api(`/opticien/clients/${toDelete.uuid}`, { method: "DELETE" });
      setToDelete(null);
      showToast("Le client a été retiré de votre liste.");
      await load();
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
      <AppToast title={toastTitle} message={toast} />
      <div className="pdv-page-head">
        <div>
          <h1>Mes clients</h1>
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
          iconLeft="/icons/pdv/user-plus-01.svg"
          onClick={openCreate}
        >
          Créer un nouveau client
        </PdvButton>
      </div>

      {loading ? (
        <p>Chargement des clients…</p>
      ) : (
        <div className="pdv-table-block">
        <div className="pdv-table-stack">
          <div className="pdv-panel pdv-panel--search">
            <PdvSearchBar
              id="client-search"
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un client par nom, email..."
            />
          </div>
          <div className="pdv-panel pdv-panel--table">
          <PdvTable
            columns={CLIENT_COLUMNS}
            rows={pageRows}
            getRowId={(client) => client.uuid}
            empty={emptyCopy}
            sort={sort}
            onSort={(key) => setSort((current) => toggleSort(current, key))}
            selection={{
              selected,
              headerAriaLabel: "Sélectionner les clients de la page",
              rowAriaLabel: (client) => `Sélectionner ${client.last_name} ${client.first_name}`,
              onToggleAll: (checked) => {
                const pageIds = pageRows.map((client) => client.uuid);
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
            actions={(client) => (
              <PdvRowActions
                items={[
                  { label: "Enregistrer une paire", onClick: () => setRegisterFor(client) },
                  { label: "Voir la fiche", href: `/opticien/clients/${client.uuid}` },
                  { label: "Modifier la fiche", onClick: () => openEdit(client) },
                  { label: "Supprimer le client", danger: true, onClick: () => setToDelete(client) },
                ]}
              />
            )}
          />
          </div>
        </div>
          <PdvPagination page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      )}

      {registerFor ? (
        <RegisterPairModal
          lockedClient={registerFor}
          onCreated={() => {
            setRegisterFor(null);
            showToast(PAIR_CREATED_TOAST.message, PAIR_CREATED_TOAST.title);
            void load();
          }}
          onClose={(discarded) => {
            setRegisterFor(null);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}

      <CreateClientFlow
        open={createOpen}
        onCreated={(client, message) => {
          setCreateOpen(false);
          showToast(message);
          router.push(`/opticien/clients/${client.uuid}`);
        }}
        onClose={(discarded) => {
          setCreateOpen(false);
          if (discarded) {
            showToast("Modifications non prises en compte");
          }
        }}
        onInfoToast={(message) => showToast(message)}
      />

      {editOpen ? (
        <BootstrapModal
          title="Modifier la fiche client"
          subtitle="Étape 1/3"
          size="md"
          onClose={() => {
            setEditOpen(false);
            showToast("Modifications non prises en compte");
          }}
        >
          <form onSubmit={(event) => void submitEdit(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="edit" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <button type="submit" className="btn btn-primary w-100" disabled={pending}>
                Enregistrer les modifications
              </button>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setEditOpen(false);
                  showToast("Modifications non prises en compte");
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {otp ? (
        <BootstrapModal
          title="Modifier la fiche client"
          subtitle="Étape 2/3"
          size="md"
          onClose={() => {
            setOtp(null);
            showToast("Modifications non prises en compte");
          }}
        >
          <form onSubmit={(event) => void submitOtp(event)}>
            <div className="modal-body">
              <div className="pdv-field">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="pdv-field__label" htmlFor="otp-code">
                    Code de vérification*
                  </label>
                  <PdvButton type="button" variant="tertiary" onClick={() => void resendOtp()}>
                    Renvoyer le code
                  </PdvButton>
                </div>
                <input
                  id="otp-code"
                  className={`pdv-field__control${otpError ? " is-invalid" : ""}`}
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  required
                />
                {otpError ? <p className="pdv-field__error">{otpError}</p> : null}
              </div>
              <p className="pdv-field__hint mb-0">
                Le client a reçu un code par mail ou SMS pour valider la mise à jour de ses informations
                personnelles.
              </p>
            </div>
            <div className="modal-footer flex-column">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                Vérifier le code
              </PdvButton>
              <PdvButton
                type="button"
                variant="tertiary"
                onClick={() => {
                  setOtp(null);
                  showToast("Modifications non prises en compte");
                }}
              >
                Annuler
              </PdvButton>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {toDelete ? (
        <BootstrapModal title="Supprimer un client" onClose={() => setToDelete(null)}>
          <div className="modal-body">
            <p className="mb-0">
              Vous êtes sur le point de supprimer {toDelete.last_name} {toDelete.first_name} de votre liste de
              clients. Toutes les données rattachées à son dossier client seront supprimées.
            </p>
          </div>
          <div className="modal-footer flex-column">
            <PdvButton type="button" variant="danger" size="l" block disabled={pending} onClick={() => void confirmDelete()}>
              Supprimer le client
            </PdvButton>
            <button type="button" className="btn btn-link" onClick={() => setToDelete(null)}>
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
