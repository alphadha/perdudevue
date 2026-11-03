"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type PdvRowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: string;
};

type Props = {
  items: PdvRowAction[];
  "aria-label"?: string;
};

type MenuPos = { top: number; right: number };

const ICON_BY_LABEL: Record<string, string> = {
  "Voir la fiche": "/icons/pdv/file-02.svg",
  "Voir restitution": "/icons/pdv/file-02.svg",
  "Modifier la paire": "/icons/pdv/edit-02.svg",
  "Modifier la fiche": "/icons/pdv/edit-02.svg",
  "Enregistrer une paire": "/icons/pdv/glasses-01.svg",
  "Supprimer le client": "/icons/pdv/trash-01.svg",
  "Déclarer comme inactive": "/icons/pdv/clock-snooze.svg",
  "Remettre au client": "/icons/pdv/remettre-client.svg",
  "Relancer le client": "/icons/pdv/mail-01.svg",
  "Exporter le code assigné": "/icons/pdv/share-03.svg",
  "Indiquer comme gravée": "/icons/pdv/stamp-01.svg",
  "Télécharger le bordereau": "/icons/pdv/download-01.svg",
  "Télécharger le bordereau d’envoi": "/icons/pdv/download-01.svg",
  "Indiquer comme en livraison": "/icons/pdv/truck-01.svg",
};

function iconFor(item: PdvRowAction): string | undefined {
  return item.icon ?? ICON_BY_LABEL[item.label];
}

/** Menu ⋮ Figma (bulle Union + icônes 20px) — overlay fixed pour échapper au overflow du tableau. */
export default function PdvRowActions({ items, "aria-label": ariaLabel = "Actions" }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function place() {
    const trigger = rootRef.current?.querySelector("button");
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    place();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onReposition() {
      place();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className={`pdv-row-actions${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        className="pdv-icon-btn"
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <img src="/icons/pdv/dots-vertical.svg" alt="" width={24} height={24} />
      </button>
      {open && pos ? (
        <ul
          id={menuId}
          className="pdv-row-actions__menu"
          role="menu"
          style={{ top: pos.top, right: pos.right }}
        >
          {items.map((item, index) => {
            const icon = iconFor(item);
            const className = `pdv-row-actions__item${item.danger ? " pdv-row-actions__item--danger" : ""}${
              item.disabled ? " is-disabled" : ""
            }`;
            const content = (
              <>
                {icon ? (
                  <span className="pdv-row-actions__icon">
                    <img src={icon} alt="" width={20} height={20} />
                  </span>
                ) : null}
                {item.label}
              </>
            );
            return (
              <li key={`${item.label}-${index}`} role="none">
                {item.href && !item.disabled ? (
                  <Link className={className} href={item.href} role="menuitem" onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={className}
                    disabled={item.disabled}
                    onClick={() => {
                      item.onClick?.();
                      close();
                    }}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
