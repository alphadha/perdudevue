"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppToast from "@/components/AppToast";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
import PdvSearchBar from "@/components/pdv/PdvSearchBar";
import PdvTable, { type PdvTableColumn } from "@/components/pdv/PdvTable";
import { api, ApiRequestError } from "@/lib/api";
import { sortRows, toggleSort, type SortState } from "@/lib/tableSort";
import { TEAM_INVITED_TOAST, TEAM_REMOVED_TOAST, type ToastState } from "@/lib/toasts";
import { formatFrDate, type AuthUser, type ShopMember } from "@/lib/types";

type SortKey = "last_name" | "first_name" | "email" | "status" | "added_at";

const emptyInvite = {
  last_name: "",
  first_name: "",
  email: "",
};

export default function OpticienTeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(emptyInvite);
  const [toRemove, setToRemove] = useState<ShopMember | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await api<AuthUser>("/auth/me");
      if (me.role !== "opticien_admin") {
        router.replace("/opticien/parametres");
        return;
      }
      setMembers(await api<ShopMember[]>("/opticien/users"));
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.status === 404) {
        router.replace("/opticien/parametres");
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = members.filter((member) => {
      if (!needle) {
        return true;
      }
      return [member.last_name, member.first_name, member.email].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
    return sortRows(filtered, sort, {
      last_name: (member) => member.last_name,
      first_name: (member) => member.first_name,
      email: (member) => member.email,
      status: (member) => member.status_label,
      added_at: (member) => member.added_at,
    });
  }, [members, query, sort]);

  const columns: PdvTableColumn<ShopMember, SortKey>[] = [
    { key: "last_name", label: "Nom", width: 160, render: (member) => member.last_name },
    {
      key: "first_name",
      label: "Prénom",
      width: 180,
      render: (member) => (member.is_self ? `${member.first_name} (vous)` : member.first_name),
    },
    { key: "email", label: "Email", width: 240, render: (member) => member.email },
    {
      key: "status",
      label: "Statut",
      width: 170,
      render: (member) => (
        <span className={`pdv-tag pdv-tag--${member.status === "active" ? "active" : "a_graver"}`}>
          {member.status_label}
        </span>
      ),
    },
    {
      key: "added_at",
      label: "Date d’ajout",
      width: 130,
      render: (member) => formatFrDate(member.added_at),
    },
  ];

  function showToast(next: ToastState) {
    setToast(next);
  }

  function captureErrors(caught: unknown) {
    if (caught instanceof ApiRequestError) {
      const next: Record<string, string> = {};
      caught.errors.forEach((item) => {
        if (item.field) {
          next[item.field] = item.message;
        }
      });
      setFieldErrors(next);
      if (!caught.errors.some((item) => item.field)) {
        showToast({ title: "Invitation impossible", message: caught.message, variant: "error" });
      }
      return;
    }
    showToast({ title: "Invitation impossible", message: "Enregistrement impossible.", variant: "error" });
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    try {
      await api<ShopMember>("/opticien/users", {
        method: "POST",
        body: JSON.stringify(invite),
      });
      setInviteOpen(false);
      setInvite(emptyInvite);
      await load();
      showToast({
        ...TEAM_INVITED_TOAST,
        message: `${invite.first_name} ${invite.last_name} a reçu un email pour activer son accès.`,
      });
    } catch (caught) {
      captureErrors(caught);
    } finally {
      setPending(false);
    }
  }

  async function confirmRemove() {
    if (!toRemove) {
      return;
    }
    setPending(true);
    try {
      await api(`/opticien/users/${toRemove.uuid}`, { method: "DELETE" });
      const removed = toRemove;
      setToRemove(null);
      await load();
      showToast({
        ...TEAM_REMOVED_TOAST,
        message: `${removed.first_name} ${removed.last_name} n’a plus accès à l’espace de votre magasin.`,
      });
    } catch (caught) {
      showToast({
        title: "Retrait impossible",
        message: caught instanceof ApiRequestError ? caught.message : "Retrait impossible.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppToast title={toast?.title} message={toast?.message ?? null} variant={toast?.variant} />
      <div className="pdv-page-head">
        <div>
          <Link className="pdv-page-head__back" href="/opticien/parametres">
            <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
            <h1>Mon équipe</h1>
          </Link>
          <p className="pdv-page-head__lead">
            Invitez vos collaborateurs et gérez leurs accès à votre espace.
          </p>
        </div>
        <PdvButton
          variant="primary"
          size="l"
          iconLeft="/icons/pdv/user-plus-01.svg"
          onClick={() => {
            setInvite(emptyInvite);
            setFieldErrors({});
            setInviteOpen(true);
          }}
        >
          Ajouter un collaborateur
        </PdvButton>
      </div>

      {loading ? (
        <p>Chargement de l’équipe…</p>
      ) : (
        <div className="pdv-table-block">
          <div className="pdv-table-stack">
            <div className="pdv-panel pdv-panel--search">
              <PdvSearchBar
                id="team-search"
                value={query}
                onChange={setQuery}
                placeholder="Rechercher un collaborateur..."
              />
            </div>
            <div className="pdv-panel pdv-panel--table">
              <PdvTable
                columns={columns}
                rows={rows}
                getRowId={(member) => member.uuid}
                empty="Aucun collaborateur."
                sort={sort}
                onSort={(key) => setSort((current) => toggleSort(current, key))}
                actions={(member) =>
                  member.actions.can_remove ? (
                    <button
                      type="button"
                      className="pdv-icon-btn"
                      aria-label={`Retirer ${member.first_name} ${member.last_name}`}
                      onClick={() => setToRemove(member)}
                    >
                      <img src="/icons/pdv/trash-01.svg" alt="" width={20} height={20} />
                    </button>
                  ) : null
                }
              />
            </div>
          </div>
        </div>
      )}

      {inviteOpen ? (
        <BootstrapModal
          title="Ajouter un collaborateur"
          size="md"
          onClose={() => {
            setInviteOpen(false);
            setFieldErrors({});
          }}
        >
          <form onSubmit={(event) => void submitInvite(event)}>
            <div className="modal-body">
              <div className="pdv-form-grid">
                <PdvField
                  id="team-last-name"
                  label="Nom*"
                  value={invite.last_name}
                  error={fieldErrors.last_name}
                  required
                  onChange={(event) => setInvite((current) => ({ ...current, last_name: event.target.value }))}
                />
                <PdvField
                  id="team-first-name"
                  label="Prénom*"
                  value={invite.first_name}
                  error={fieldErrors.first_name}
                  required
                  onChange={(event) => setInvite((current) => ({ ...current, first_name: event.target.value }))}
                />
              </div>
              <PdvField
                id="team-email"
                label="Adresse e-mail*"
                type="email"
                value={invite.email}
                error={fieldErrors.email}
                required
                onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))}
              />
              <div className="pdv-invite-copy">
                <p className="pdv-invite-copy__title">Invitation par email</p>
                <p className="pdv-invite-copy__body">
                  Votre collaborateur recevra un email pour activer son espace et créer son mot de passe. Il
                  pourra gérer les clients, les paires et les restitutions de votre magasin.
                </p>
              </div>
            </div>
            <div className="modal-footer flex-column">
              <PdvButton type="submit" variant="primary" size="l" block disabled={pending}>
                Envoyer l’invitation
              </PdvButton>
              <PdvButton
                type="button"
                variant="tertiary"
                onClick={() => {
                  setInviteOpen(false);
                  setFieldErrors({});
                }}
              >
                Annuler
              </PdvButton>
            </div>
          </form>
        </BootstrapModal>
      ) : null}

      {toRemove ? (
        <BootstrapModal title="Retirer un collaborateur" size="md" onClose={() => setToRemove(null)}>
          <div className="modal-body">
            <p className="mb-0">
              Vous êtes sur le point de retirer {toRemove.first_name} {toRemove.last_name} de votre équipe. Il
              n’aura plus accès à l’espace de votre magasin. Les actions qu’il a déjà effectuées restent
              visibles dans l’historique.
            </p>
          </div>
          <div className="modal-footer flex-column">
            <PdvButton type="button" variant="danger" size="l" block disabled={pending} onClick={() => void confirmRemove()}>
              Retirer le collaborateur
            </PdvButton>
            <PdvButton type="button" variant="tertiary" onClick={() => setToRemove(null)}>
              Annuler
            </PdvButton>
          </div>
        </BootstrapModal>
      ) : null}
    </>
  );
}
