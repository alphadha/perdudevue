"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import BootstrapModal, { ModalSuccessMark } from "@/components/opticien/BootstrapModal";
import ClientFormFields from "@/components/opticien/ClientFormFields";
import EditPairModal from "@/components/opticien/EditPairModal";
import ExportCodeModal from "@/components/opticien/ExportCodeModal";
import HandoverModal from "@/components/opticien/HandoverModal";
import { PairEngraveModal, PairInactiveModal } from "@/components/opticien/PairActionModals";
import PairRowMenu from "@/components/opticien/PairRowMenu";
import PairStatusBadge from "@/components/opticien/PairStatusBadge";
import RegisterPairModal from "@/components/opticien/RegisterPairModal";
import { usePairStatusMutations } from "@/components/opticien/usePairStatusMutations";
import { api, ApiRequestError } from "@/lib/api";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCodeBoxes from "@/components/pdv/PdvCodeBoxes";
import PdvRowActions from "@/components/pdv/PdvRowActions";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { formatPhoneFr } from "@/lib/formatPhone";
import { PAIR_CREATED_TOAST } from "@/lib/pairUi";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import {
  isIdentityChallenge,
  formatFrDate,
  type ClientPayload,
  type IdentityChallenge,
  type ShopClient,
  type ShopPair,
  type ShopRestitution,
} from "@/lib/types";

type PairSortKey = "assigned_code" | "type" | "brand" | "colors" | "status" | "registered_at";
type RestitutionSortKey = "reference" | "type" | "brand" | "colors" | "status" | "found_at";

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
  const [restitutions, setRestitutions] = useState<ShopRestitution[]>([]);
  const [pairSort, setPairSort] = useState<SortState<PairSortKey> | null>(null);
  const [restSort, setRestSort] = useState<SortState<RestitutionSortKey> | null>(null);
  const [selectedRest, setSelectedRest] = useState<string[]>([]);
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
  const [editSuccess, setEditSuccess] = useState(false);
  const [toDelete, setToDelete] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [exportPair, setExportPair] = useState<ShopPair | null>(null);
  const [editPair, setEditPair] = useState<ShopPair | null>(null);
  const [pending, setPending] = useState(false);

  const showToast = useCallback((message: string, title?: string) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [data, nextPairs, nextRestitutions] = await Promise.all([
        api<ShopClient>(`/opticien/clients/${params.uuid}`),
        api<ShopPair[]>(`/opticien/pairs?client_uuid=${encodeURIComponent(params.uuid)}`),
        api<ShopRestitution[]>("/opticien/restitutions"),
      ]);
      setClient(data);
      setPairs(nextPairs);
      setRestitutions(nextRestitutions.filter((item) => item.client?.uuid === params.uuid));
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
      void load();
    },
    [load, showToast],
  );

  const mutations = usePairStatusMutations(onPairUpdated, (message) => showToast(message));

  const sortedPairs = useMemo(
    () =>
      sortRows(pairs, pairSort, {
        assigned_code: (pair) => pair.assigned_code,
        type: (pair) => pair.type,
        brand: (pair) => pair.brand,
        colors: (pair) => pair.colors.join(", "),
        status: (pair) => pair.status_label,
        registered_at: (pair) => pair.registered_at,
      }),
    [pairs, pairSort],
  );

  const sortedRestitutions = useMemo(
    () =>
      sortRows(restitutions, restSort, {
        reference: (item) => item.reference,
        type: (item) => item.type,
        brand: (item) => item.brand,
        colors: (item) => item.colors.join(", "),
        status: (item) => item.status_label,
        found_at: (item) => item.found_at,
      }),
    [restitutions, restSort],
  );

  const pairColumns: PdvTableColumn<ShopPair, PairSortKey>[] = [
    { key: "assigned_code", label: "Code assigné", width: 120, render: (pair) => pair.assigned_code },
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

  const restColumns: PdvTableColumn<ShopRestitution, RestitutionSortKey>[] = [
    { key: "reference", label: "Ref dossier", width: 130, render: (item) => (item.reference ? `#${item.reference}` : "") },
    { key: "type", label: "Type", width: 130, render: (item) => item.type_label || item.type },
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
      setEditSuccess(true);
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
      setEditSuccess(true);
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
      <div className="pdv-fiche">
      <div className="pdv-fiche__intro">
        <Link href="/opticien/clients" className="pdv-back-link">
          <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
          Revenir à mes clients
        </Link>

        <div className="pdv-page-head">
          <div className="pdv-fiche-identity">
            <h1>
              {client.last_name} {client.first_name}
            </h1>
            <p className="pdv-fiche-meta">
              {formatPhoneFr(client.phone)}
              {client.phone && client.email ? (
                <span className="pdv-fiche-meta__sep" aria-hidden>
                  I
                </span>
              ) : null}
              {client.email}
            </p>
            {client.account_pending ? (
              <p className="pdv-fiche-meta">Le client n’a pas encore activé son espace.</p>
            ) : null}
          </div>
          <div className="pdv-page-head__actions">
            <PdvButton
              variant="secondary"
              size="l"
              iconLeft="/icons/pdv/restitution-bottom.svg"
              disabled={!pairs.some((pair) => pair.actions.can_hand_over)}
              onClick={() => setHandoverOpen(true)}
            >
              Remettre des lunettes
            </PdvButton>
            <PdvButton
              variant="primary"
              size="l"
              iconLeft="/icons/pdv/glasses-01-light.svg"
              onClick={() => setRegisterOpen(true)}
            >
              Enregistrer une paire
            </PdvButton>
          </div>
        </div>
      </div>

      <section>
      <h2 className="pdv-section-title">Paires enregistrées</h2>
      <div className="pdv-panel pdv-panel--table">
        <PdvTable
          columns={pairColumns}
          rows={sortedPairs}
          getRowId={(pair) => pair.uuid}
          empty="Aucune paire de lunettes enregistrée pour le moment."
          sort={pairSort}
          onSort={(key) => setPairSort((current) => toggleSort(current, key))}
          actions={(pair) => (
            <PairRowMenu
              pair={pair}
              onEngrave={mutations.setEngravePair}
              onInactivate={mutations.setInactivePair}
              onEdit={setEditPair}
              onExport={setExportPair}
              onHandOver={() => setHandoverOpen(true)}
              onResend={(item) => setResendTarget(item)}
            />
          )}
        />
      </div>
      </section>

      <section>
      <h2 className="pdv-section-title">Historique des restitutions</h2>
      <div className="pdv-panel pdv-panel--table">
        <PdvTable
          columns={restColumns}
          rows={sortedRestitutions}
          getRowId={(item) => item.uuid}
          empty="Aucune paire de lunettes à récupérer pour le moment."
          sort={restSort}
          onSort={(key) => setRestSort((current) => toggleSort(current, key))}
          selection={{
            selected: selectedRest,
            headerAriaLabel: "Sélectionner les dossiers",
            rowAriaLabel: (item) => `Sélectionner ${item.reference ?? item.assigned_code}`,
            onToggleAll: (checked) => {
              setSelectedRest(checked ? sortedRestitutions.map((item) => item.uuid) : []);
            },
            onToggleRow: (id, checked) => {
              setSelectedRest((current) =>
                checked ? [...current, id] : current.filter((uuid) => uuid !== id),
              );
            },
          }}
          actions={(item) => {
            const pairLike = pairs.find((pair) => pair.uuid === item.uuid) ?? null;
            return pairLike ? (
              <PairRowMenu
                pair={pairLike}
                onEngrave={mutations.setEngravePair}
                onInactivate={mutations.setInactivePair}
                onEdit={setEditPair}
                onExport={setExportPair}
                onHandOver={() => setHandoverOpen(true)}
                onResend={(pair) => setResendTarget(pair)}
              />
            ) : (
              <PdvRowActions items={[{ label: "Voir restitution", href: `/opticien/restitution/${item.uuid}` }]} />
            );
          }}
        />
      </div>
      </section>
      </div>

      {editPair ? (
        <EditPairModal
          pair={editPair}
          onUpdated={() => {
            void load();
          }}
          onClose={(discarded) => {
            setEditPair(null);
            if (discarded) {
              showToast("Modifications non prises en compte");
            }
          }}
        />
      ) : null}

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

      {exportPair ? (
        <ExportCodeModal
          pairs={[exportPair]}
          onClose={(discarded) => {
            setExportPair(null);
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
              <ClientFormFields
                idPrefix="fiche"
                value={form}
                fieldErrors={fieldErrors}
                onChange={setForm}
                showConsents={false}
              />
            </div>
            <div className="modal-footer">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                Enregistrer les modifications
              </PdvButton>
              <PdvButton
                type="button"
                variant="tertiary"
                onClick={() => {
                  setEditOpen(false);
                  showToast("Modifications non prises en compte");
                }}
              >
                Annuler
              </PdvButton>
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
              <div className="pdv-code-field">
                <div className="pdv-code-field__head">
                  <label className="pdv-field__label" htmlFor="fiche-otp-0">
                    Code de vérification*
                  </label>
                  <PdvButton
                    type="button"
                    variant="tertiary"
                    onClick={() => {
                      void api<IdentityChallenge>(`/opticien/clients/identity/${otp.action_token}/resend`, {
                        method: "POST",
                      }).then((result) => {
                        setOtp(result);
                        showToast("Un nouveau code a été envoyé.");
                      });
                    }}
                  >
                    Renvoyer le code
                  </PdvButton>
                </div>
                <PdvCodeBoxes
                  idPrefix="fiche-otp"
                  value={otpCode}
                  onChange={setOtpCode}
                  numeric
                  invalid={Boolean(otpError)}
                  ariaLabel="Code de vérification"
                />
                {otpError ? <p className="pdv-field__error">{otpError}</p> : null}
                <p className="pdv-field__hint">
                  Le client a reçu un code par mail ou SMS pour valider la mise à jour de ses informations
                  personnelles.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending || otpCode.length !== 6}>
                Vérifier le code et ajouter le client
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

      {editSuccess ? (
        <BootstrapModal title="Modifier la fiche client" subtitle="Étape 3/3" size="md" onClose={() => setEditSuccess(false)}>
          <div className="modal-body">
            <div className="pdv-modal-success">
              <ModalSuccessMark />
              <div className="pdv-modal-success__copy">
                <p className="pdv-modal-success__title">Modifications enregistrée</p>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <PdvButton type="button" variant="secondary" size="l" block onClick={() => setEditSuccess(false)}>
              Fermer
            </PdvButton>
          </div>
        </BootstrapModal>
      ) : null}

      {toDelete ? (
        <BootstrapModal title="Supprimer client" size="md" onClose={() => setToDelete(false)}>
          <div className="modal-body">
            <p>
              Vous êtes sur le point de supprimer {client.last_name} {client.first_name} de votre liste de
              clients. Toutes les données rattachées à son dossier client seront supprimées de votre espace.
            </p>
          </div>
          <div className="modal-footer">
            <PdvButton type="button" variant="danger" size="l" block disabled={pending} onClick={() => void confirmDelete()}>
              Supprimer le client
            </PdvButton>
            <PdvButton type="button" variant="tertiary" onClick={() => setToDelete(false)}>
              Annuler
            </PdvButton>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
