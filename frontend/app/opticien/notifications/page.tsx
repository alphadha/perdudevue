"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import PdvButton from "@/components/pdv/PdvButton";
import { api, ApiRequestError } from "@/lib/api";
import { type ShopInboxNotification } from "@/lib/types";

type Filter = "all" | "unread" | "read";

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Aujourd'hui, ${hours}:${minutes}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}, ${hours}:${minutes}`;
}

export default function OpticienNotificationsPage() {
  const [items, setItems] = useState<ShopInboxNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const data = await api<ShopInboxNotification[]>("/opticien/notifications");
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => !item.read);
    }
    if (filter === "read") {
      return items.filter((item) => item.read);
    }
    return items;
  }, [items, filter]);

  async function markRead(uuid: string) {
    setPending(true);
    try {
      const updated = await api<ShopInboxNotification>(`/opticien/notifications/${uuid}/read`, {
        method: "PATCH",
      });
      setItems((current) => current.map((item) => (item.uuid === uuid ? updated : item)));
    } catch (caught) {
      showToast(caught instanceof ApiRequestError ? caught.message : "Action impossible.");
    } finally {
      setPending(false);
    }
  }

  async function markAllRead() {
    setPending(true);
    try {
      await api("/opticien/notifications/read-all", { method: "PATCH" });
      setItems((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          actions: { ...item.actions, can_mark_read: false },
        })),
      );
    } catch (caught) {
      showToast(caught instanceof ApiRequestError ? caught.message : "Action impossible.");
    } finally {
      setPending(false);
    }
  }

  async function deleteAll() {
    setPending(true);
    try {
      await api("/opticien/notifications", { method: "DELETE" });
      setItems([]);
    } catch (caught) {
      showToast(caught instanceof ApiRequestError ? caught.message : "Action impossible.");
    } finally {
      setPending(false);
    }
  }

  const emptyLabel =
    filter === "unread"
      ? "Aucune notification non lue"
      : filter === "read"
        ? "Aucune notification lue"
        : "Aucune notification pour le moment";

  return (
    <>
      <AppToast message={toast} />
      <div className="pdv-page-head">
        <div>
          <h1>Notifications</h1>
          <p className="pdv-page-head__sync mb-0">
            Retrouvez ici les notifications liées aux restitutions de lunettes.
          </p>
        </div>
        <div className="pdv-page-head__actions">
          <PdvButton
            variant="secondary"
            size="l"
            disabled={pending || items.length === 0}
            onClick={() => void deleteAll()}
          >
            Tout supprimer
          </PdvButton>
          <PdvButton
            variant="secondary"
            size="l"
            disabled={pending || items.length === 0 || items.every((item) => item.read)}
            onClick={() => void markAllRead()}
          >
            Tout marquer comme lu
          </PdvButton>
        </div>
      </div>

      <div className="pdv-notif-stack">
        <div className="pdv-filter-tabs" role="group" aria-label="Filtrer les notifications">
          <button
            type="button"
            className={`pdv-filter-tabs__btn${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Toutes
          </button>
          <button
            type="button"
            className={`pdv-filter-tabs__btn${filter === "unread" ? " is-active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Non lues
          </button>
          <button
            type="button"
            className={`pdv-filter-tabs__btn${filter === "read" ? " is-active" : ""}`}
            onClick={() => setFilter("read")}
          >
            Lues
          </button>
        </div>

        {loading ? <p>Chargement…</p> : null}
        {!loading && visible.length === 0 ? <p className="pdv-notif-empty">{emptyLabel}</p> : null}

        <div className="pdv-notif-list">
          {visible.map((item) => {
            const canOpen = Boolean(item.actions.can_open_dossier && item.href);
            const canMark = item.actions.can_mark_read;

            return (
              <article className={`pdv-notif-card${item.read ? " is-read" : ""}`} key={item.uuid}>
                <div>
                  <div className="pdv-notif-card__head">
                    {canOpen && item.href ? (
                      <Link className="pdv-notif-card__title-link" href={item.href}>
                        {item.title}
                      </Link>
                    ) : (
                      <h2 className="pdv-notif-card__title">{item.title}</h2>
                    )}
                    <div className="pdv-notif-card__meta">
                      {!item.read ? <span className="pdv-notif-card__dot" aria-label="Non lue" /> : null}
                      <time>{formatWhen(item.created_at)}</time>
                    </div>
                  </div>
                  <p className="pdv-notif-card__body">{item.body}</p>
                </div>
                {canOpen || canMark ? (
                  <div className="pdv-notif-card__actions">
                    {canOpen && item.href ? (
                      <Link className="pdv-notif-card__link" href={item.href}>
                        <img src="/icons/pdv/folder.svg" alt="" width={18} height={18} />
                        Voir le dossier
                      </Link>
                    ) : null}
                    {canOpen && canMark ? <span className="pdv-notif-card__sep">I</span> : null}
                    {canMark ? (
                      <button
                        type="button"
                        className="pdv-notif-card__link"
                        disabled={pending}
                        onClick={() => void markRead(item.uuid)}
                      >
                        <img src="/icons/pdv/annotation-check.svg" alt="" width={18} height={18} />
                        Marquer comme lue
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
