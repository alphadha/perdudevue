"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppToast from "@/components/AppToast";
import { api, ApiRequestError } from "@/lib/api";
import { type ShopInboxNotification } from "@/lib/types";

type Filter = "all" | "unread" | "read";

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Aujourd'hui, ${time}`;
  }

  return `${date.toLocaleDateString("fr-FR")}, ${time}`;
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
      ? "Aucune notification non lue."
      : filter === "read"
        ? "Aucune notification lue."
        : "Aucune notification pour le moment.";

  return (
    <>
      <AppToast message={toast} />
      <div className="pdv-page-head">
        <div>
          <h1>Notifications</h1>
          <p className="text-secondary mb-0">
            Retrouvez ici les notifications liées aux restitutions de lunettes.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={pending || items.length === 0}
            onClick={() => void deleteAll()}
          >
            Tout supprimer
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={pending || items.every((item) => item.read)}
            onClick={() => void markAllRead()}
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="btn-group mb-3" role="group" aria-label="Filtrer les notifications">
        <button
          type="button"
          className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("all")}
        >
          Toutes
        </button>
        <button
          type="button"
          className={`btn ${filter === "unread" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("unread")}
        >
          Non lues
        </button>
        <button
          type="button"
          className={`btn ${filter === "read" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFilter("read")}
        >
          Lues
        </button>
      </div>

      {loading ? <p>Chargement…</p> : null}
      {!loading && visible.length === 0 ? <p>{emptyLabel}</p> : null}

      <div className="d-grid gap-3">
        {visible.map((item) => (
          <div className={`card ${item.read ? "" : "bg-info-subtle"}`} key={item.uuid}>
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <h2 className="h6 mb-1">{item.title}</h2>
                <div className="d-flex align-items-center gap-2">
                  <p className="small text-secondary mb-0">{formatWhen(item.created_at)}</p>
                  {item.read ? null : <span className="badge text-bg-primary">Non lue</span>}
                </div>
              </div>
              <p className="text-secondary mb-3">{item.body}</p>
              <hr />
              <div className="d-flex flex-wrap gap-3">
                {item.actions.can_open_dossier && item.href ? (
                  <Link href={item.href}>Voir le dossier</Link>
                ) : null}
                {item.actions.can_mark_read ? (
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    disabled={pending}
                    onClick={() => void markRead(item.uuid)}
                  >
                    Marquer comme lue
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
