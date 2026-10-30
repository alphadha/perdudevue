"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import ClientFormFields from "@/components/opticien/ClientFormFields";
import FieldError from "@/components/FieldError";
import { api, ApiRequestError } from "@/lib/api";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvSortHeader from "@/components/pdv/PdvSortHeader";
import { PAIR_CREATED_TOAST } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import {
  isDuplicatePayload,
  isIdentityChallenge,
  type ClientPayload,
  type IdentityChallenge,
  type ShopClient,
} from "@/lib/types";

type SortKey = "last_name" | "first_name" | "email" | "phone" | "pairs_count" | "pairs_lost_count";

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

  const [duplicate, setDuplicate] = useState<{ token: string; client: ShopClient } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editToken, setEditToken] = useState<string | null>(null);
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

  function header(label: string, key: SortKey) {
    return (
      <PdvSortHeader
        label={label}
        active={sort?.key === key}
        onClick={() => setSort((current) => toggleSort(current, key))}
      />
    );
  }

  function closeCreate(discard: boolean) {
    setCreateOpen(false);
    setDuplicate(null);
    setEditOpen(false);
    setEditToken(null);
    setOtp(null);
    setOtpCode("");
    if (discard) {
      showToast("Modifications non prises en compte");
    }
  }

  function openCreate() {
    setForm(emptyForm());
    setFieldErrors({});
    setFormError(null);
    setDuplicate(null);
    setEditOpen(false);
    setCreateOpen(true);
  }

  function openEdit(client: ShopClient) {
    setEditTarget(client);
    setEditToken(null);
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

  async function handleCreated(client: ShopClient, message: string) {
    closeCreate(false);
    showToast(message);
    router.push(`/opticien/clients/${client.uuid}`);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await api<ShopClient>("/opticien/clients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      await handleCreated(created, "Le client a bien été créé.");
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 409 && isDuplicatePayload(caught.data)) {
        setDuplicate({ token: caught.data.action_token, client: caught.data.client });
        setCreateOpen(false);
      } else if (caught instanceof ApiRequestError) {
        setFieldErrors(fieldErrorsFrom(caught));
        setFormError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDuplicate() {
    if (!duplicate) {
      return;
    }
    setPending(true);
    try {
      const client = await api<ShopClient>(`/opticien/clients/duplicates/${duplicate.token}/confirm`, {
        method: "POST",
      });
      await handleCreated(client, "Le client a bien été ajouté.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFormError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  function startDuplicateUpdate() {
    if (!duplicate) {
      return;
    }
    setEditToken(duplicate.token);
    setEditTarget(duplicate.client);
    setDuplicate(null);
    setEditOpen(true);
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const path = editToken
        ? `/opticien/clients/duplicates/${editToken}/update`
        : `/opticien/clients/${editTarget?.uuid}`;
      const result = await api<ShopClient | IdentityChallenge>(path, {
        method: editToken ? "POST" : "PATCH",
        body: JSON.stringify(form),
      });
      if (isIdentityChallenge(result)) {
        setEditOpen(false);
        setOtp(result);
        return;
      }
      if (editToken) {
        // Mémo §4 : après Mettre à jour → retour au flow création avec infos à jour.
        setForm({
          first_name: result.first_name,
          last_name: result.last_name,
          email: result.email,
          phone: result.phone ?? "",
          consent_email: result.consent_email,
          consent_sms: result.consent_sms,
        });
        setEditOpen(false);
        setEditToken(null);
        setEditTarget(null);
        setCreateOpen(true);
        showToast("Fiche mise à jour. Poursuivez l’ajout du client.");
        await load();
      } else {
        setEditOpen(false);
        showToast("La fiche client a bien été mise à jour.");
        await load();
      }
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
      if (editToken) {
        setForm({
          first_name: result.first_name,
          last_name: result.last_name,
          email: result.email,
          phone: result.phone ?? "",
          consent_email: result.consent_email,
          consent_sms: result.consent_sms,
        });
        setEditToken(null);
        setEditTarget(null);
        setCreateOpen(true);
        showToast("Fiche mise à jour. Poursuivez l’ajout du client.");
        await load();
      } else {
        showToast("La fiche client a bien été mise à jour.");
        await load();
      }
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

  const syncLabel = syncedAt
    ? `Dernière synchronisation à ${syncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} le ${syncedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}.`
    : "Chargement…";

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
          size="m"
          iconLeft="/icons/pdv/user-plus-01.svg"
          onClick={openCreate}
        >
          Ajouter un client
        </PdvButton>
      </div>

      <div className="pdv-panel">
        <div className="pdv-toolbar">
          <PdvSearchBar id="client-search" value={query} onChange={setQuery} placeholder="Rechercher" />
        </div>
      </div>

      {loading ? (
        <p>Chargement des clients…</p>
      ) : (
        <div className="pdv-table-wrap table-responsive">
          <table className="pdv-table">
            <thead>
              <tr>
                {header("Nom", "last_name")}
                {header("Prénom", "first_name")}
                {header("Email", "email")}
                {header("Téléphone", "phone")}
                {header("Paires enreg.", "pairs_count")}
                {header("Paires perdues", "pairs_lost_count")}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>Aucun client pour le moment.</td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.uuid}>
                    <td>{client.last_name}</td>
                    <td>{client.first_name}</td>
                    <td>{client.email}</td>
                    <td>{client.phone}</td>
                    <td>{client.pairs_count}</td>
                    <td>{client.pairs_lost_count}</td>
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
                          <li>
                            <button type="button" className="dropdown-item" onClick={() => setRegisterFor(client)}>
                              Enregistrer une paire
                            </button>
                          </li>
                          <li>
                            <Link className="dropdown-item" href={`/opticien/clients/${client.uuid}`}>
                              Voir la fiche
                            </Link>
                          </li>
                          <li>
                            <button type="button" className="dropdown-item" onClick={() => openEdit(client)}>
                              Modifier la fiche
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item text-danger"
                              onClick={() => setToDelete(client)}
                            >
                              Supprimer le client
                            </button>
                          </li>
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

      {createOpen ? (
        <BootstrapModal title="Nouveau client" onClose={() => closeCreate(true)}>
          <form onSubmit={(event) => void submitCreate(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="create" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <button type="submit" className="btn btn-primary w-100" disabled={pending}>
                Créer le client
              </button>
              <button type="button" className="btn btn-link" onClick={() => closeCreate(true)}>
                Annuler
              </button>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {duplicate ? (
        <BootstrapModal title="Compte client déjà existant" onClose={() => closeCreate(true)}>
          <div className="modal-body">
            <p>Un compte client avec les informations personnelles que vous avez saisies existe déjà :</p>
            <p>
              Nom : {duplicate.client.last_name}
              <br />
              Prénom : {duplicate.client.first_name}
              <br />
              Adresse e-mail : {duplicate.client.email}
              <br />
              Numéro de téléphone : {duplicate.client.phone}
            </p>
            <p className="mb-0">Échanger avec votre client pour savoir si ce compte est le sien.</p>
          </div>
          <div className="modal-footer flex-column">
            <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={() => void confirmDuplicate()}>
              Confirmer
            </button>
            <button type="button" className="btn btn-outline-primary w-100" onClick={startDuplicateUpdate}>
              Mettre à jour
            </button>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setDuplicate(null);
                setCreateOpen(true);
              }}
            >
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}

      {editOpen ? (
        <BootstrapModal
          title="Modifier la fiche client"
          subtitle={editToken ? "Étape 1/3" : undefined}
          onClose={() => closeCreate(true)}
        >
          <form onSubmit={(event) => void submitEdit(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="edit" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <button type="submit" className="btn btn-primary w-100" disabled={pending}>
                Enregistrer
              </button>
              <button type="button" className="btn btn-link" onClick={() => closeCreate(true)}>
                Annuler
              </button>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {otp ? (
        <BootstrapModal title="Modifier la fiche client" subtitle="Étape 2/3" onClose={() => closeCreate(true)}>
          <form onSubmit={(event) => void submitOtp(event)}>
            <div className="modal-body">
              <div className="d-flex justify-content-between">
                <label className="form-label" htmlFor="otp-code">
                  Code de vérification*
                </label>
                <button type="button" className="btn btn-link p-0" onClick={() => void resendOtp()}>
                  Renvoyé le code
                </button>
              </div>
              <input
                id="otp-code"
                className={`form-control${otpError ? " is-invalid" : ""}`}
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                required
              />
              <FieldError message={otpError ?? undefined} />
              <p className="small mt-3 mb-0">
                Le client a reçu un code par mail ou SMS pour valider la mise à jour de ses informations
                personnelles.
              </p>
            </div>
            <div className="modal-footer flex-column">
              <button type="submit" className="btn btn-primary w-100" disabled={pending}>
                Valider
              </button>
              <button type="button" className="btn btn-link" onClick={() => closeCreate(true)}>
                Annuler
              </button>
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
            <button type="button" className="btn btn-danger w-100" disabled={pending} onClick={() => void confirmDelete()}>
              Supprimer
            </button>
            <button type="button" className="btn btn-link" onClick={() => setToDelete(null)}>
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
