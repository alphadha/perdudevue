"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import ClientFormFields from "@/components/opticien/ClientFormFields";
import FieldError from "@/components/FieldError";
import HandoverModal from "@/components/opticien/HandoverModal";
import { PairEngraveModal, PairInactiveModal } from "@/components/opticien/PairActionModals";
import PairRowMenu from "@/components/opticien/PairRowMenu";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import { usePairStatusMutations } from "@/components/opticien/usePairStatusMutations";
import { api, ApiRequestError } from "@/lib/api";
import PdvButton from "@/components/pdv/PdvButton";
import PdvSortHeader from "@/components/pdv/PdvSortHeader";
import { PAIR_CREATED_TOAST } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import {
  isIdentityChallenge,
  formatFrDate,
  type ClientPayload,
  type IdentityChallenge,
  type ShopClient,
  type ShopPair,
} from "@/lib/types";

type PairSortKey = "brand" | "type" | "colors" | "assigned_code" | "status" | "registered_at";

function toPayload(client: ShopClient): ClientPayload {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email,
    phone: client.phone ?? "",
    consent_email: client.consent_email,
    consent_sms: client.consent_sms,
  };
}

type ToastState = { title?: string; message: string };

export default function ClientFichePage() {
  const params = useParams<{ uuid: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ShopClient | null>(null);
  const [pairs, setPairs] = useState<ShopPair[]>([]);
  const [pairSort, setPairSort] = useState<SortState<PairSortKey> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ClientPayload | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resendTarget, setResendTarget] = useState<ShopPair | null>(null);
  const [pendingResend, setPendingResend] = useState(false);
  const [otp, setOtp] = useState<IdentityChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [data, nextPairs] = await Promise.all([
        api<ShopClient>(`/opticien/clients/${params.uuid}`),
        api<ShopPair[]>(`/opticien/pairs?client_uuid=${encodeURIComponent(params.uuid)}`),
      ]);
      setClient(data);
      setPairs(nextPairs);
      setForm(toPayload(data));
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

  const onPairUpdated = useCallback(
    (updated: ShopPair) => {
      setPairs((current) => current.map((item) => (item.uuid === updated.uuid ? updated : item)));
      if (updated.status === "active") {
        showToast("La paire a été indiquée comme gravée.");
      }
      if (updated.status === "inactive") {
        showToast("La paire a été déclarée inactive.");
      }
    },
    [showToast],
  );

  const mutations = usePairStatusMutations(onPairUpdated, (message) => showToast(message));

  const sortedPairs = useMemo(
    () =>
      sortRows(pairs, pairSort, {
        brand: (pair) => pair.brand,
        type: (pair) => pair.type,
        colors: (pair) => pair.colors.join(", "),
        assigned_code: (pair) => pair.assigned_code,
        status: (pair) => pair.status_label,
        registered_at: (pair) => pair.registered_at,
      }),
    [pairs, pairSort],
  );

  function pairHeader(label: string, key: PairSortKey) {
    return (
      <PdvSortHeader
        label={label}
        active={pairSort?.key === key}
        onClick={() => setPairSort((current) => toggleSort(current, key))}
      />
    );
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

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!client || !form) {
      return;
    }
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const result = await api<ShopClient | IdentityChallenge>(`/opticien/clients/${client.uuid}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      if (isIdentityChallenge(result)) {
        setEditOpen(false);
        setOtp(result);
        return;
      }
      setClient(result);
      setForm(toPayload(result));
      setEditOpen(false);
      showToast("La fiche client a bien été mise à jour.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const next: Record<string, string> = {};
        caught.errors.forEach((item) => {
          if (item.field) {
            next[item.field] = item.message;
          }
        });
        setFieldErrors(next);
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
      setClient(result);
      setForm(toPayload(result));
      setOtp(null);
      setOtpCode("");
      showToast("La fiche client a bien été mise à jour.");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setOtpError(caught.fieldError("code") ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!client) {
      return;
    }
    setPending(true);
    try {
      await api(`/opticien/clients/${client.uuid}`, { method: "DELETE" });
      showToast("Le client a été retiré de votre liste.");
      router.push("/opticien/clients");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        showToast(caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <Link href="/opticien/clients">Revenir à mes clients</Link>
        <p className="mt-3">{error}</p>
      </>
    );
  }

  if (!client || !form) {
    return <p>Chargement de la fiche…</p>;
  }

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} />
      <p className="mb-3">
        <PdvButton variant="tertiary" href="/opticien/clients">
          Revenir à mes clients
        </PdvButton>
      </p>
      <div className="pdv-page-head">
        <div>
          <h1>
            {client.last_name} {client.first_name}
          </h1>
          <p className="text-secondary mb-0">
            {client.phone} · {client.email}
          </p>
          {client.account_pending ? (
            <p className="small mb-0">Le client n’a pas encore activé son espace.</p>
          ) : null}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <PdvButton
            variant="secondary"
            size="m"
            disabled={!pairs.some((pair) => pair.actions.can_hand_over)}
            onClick={() => setHandoverOpen(true)}
          >
            Remettre des lunettes
          </PdvButton>
          <PdvButton variant="primary" size="m" iconLeft="/icons/pdv/glasses-01.svg" onClick={() => setRegisterOpen(true)}>
            Enregistrer une paire
          </PdvButton>
          <div className="dropdown">
            <button
              className="pdv-icon-btn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Autres actions"
            >
              <img src="/icons/pdv/dots-vertical.svg" alt="" width={20} height={20} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button type="button" className="dropdown-item" onClick={() => setEditOpen(true)}>
                  Modifier
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item text-danger" onClick={() => setToDelete(true)}>
                  Supprimer
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <h2 className="h5">Paires enregistrées</h2>
      <div className="pdv-table-wrap table-responsive mb-4">
        <table className="pdv-table">
          <thead>
            <tr>
              {pairHeader("Marque", "brand")}
              {pairHeader("Type", "type")}
              {pairHeader("Couleur(s)", "colors")}
              {pairHeader("Code assigné", "assigned_code")}
              {pairHeader("Statut", "status")}
              {pairHeader("Date enreg.", "registered_at")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPairs.length === 0 ? (
              <tr>
                <td colSpan={7}>Aucune paire enregistrée pour le moment.</td>
              </tr>
            ) : (
              sortedPairs.map((pair) => (
                <tr key={pair.uuid}>
                  <td>{pair.brand}</td>
                  <td>{pair.type}</td>
                  <td>{pair.colors.join(", ")}</td>
                  <td>{pair.assigned_code}</td>
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
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="h5 mt-4">Historique des restitutions</h2>
      <p className="text-secondary">Aucun dossier pour le moment.</p>

      {registerOpen ? (
        <RegisterPairModal
          lockedClient={client}
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

      {editOpen ? (
        <BootstrapModal title="Modifier la fiche client" subtitle="Étape 1/3" onClose={() => setEditOpen(false)}>
          <form onSubmit={(event) => void submitEdit(event)}>
            <div className="modal-body">
              {formError ? <div className="alert alert-danger">{formError}</div> : null}
              <ClientFormFields idPrefix="fiche" value={form} fieldErrors={fieldErrors} onChange={setForm} />
            </div>
            <div className="modal-footer flex-column">
              <button type="submit" className="btn btn-primary w-100" disabled={pending}>
                Enregistrer
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
          onClose={() => {
            setOtp(null);
            showToast("Modifications non prises en compte");
          }}
        >
          <form onSubmit={(event) => void submitOtp(event)}>
            <div className="modal-body">
              <label className="form-label" htmlFor="fiche-otp">
                Code de vérification*
              </label>
              <input
                id="fiche-otp"
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
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setOtp(null);
                  showToast("Modifications non prises en compte");
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {toDelete ? (
        <BootstrapModal title="Supprimer un client" onClose={() => setToDelete(false)}>
          <div className="modal-body">
            <p className="mb-0">
              Vous êtes sur le point de supprimer {client.last_name} {client.first_name} de votre liste de
              clients. Toutes les données rattachées à son dossier client seront supprimées.
            </p>
          </div>
          <div className="modal-footer flex-column">
            <button type="button" className="btn btn-danger w-100" disabled={pending} onClick={() => void confirmDelete()}>
              Supprimer
            </button>
            <button type="button" className="btn btn-link" onClick={() => setToDelete(false)}>
              Annuler
            </button>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
