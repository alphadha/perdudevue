"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type PdvRowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  items: PdvRowAction[];
  "aria-label"?: string;
};

type MenuPos = { top: number; right: number };

/** Menu ⋮ Figma (dots-vertical 24px) — overlay fixed pour échapper au overflow du tableau. */
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
          className="dropdown-menu dropdown-menu-end show"
          role="menu"
          style={{ position: "fixed", top: pos.top, right: pos.right, left: "auto" }}
        >
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} role="none">
              {item.href && !item.disabled ? (
                <Link
                  className={`dropdown-item${item.danger ? " text-danger" : ""}`}
                  href={item.href}
                  role="menuitem"
                  onClick={close}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={`dropdown-item${item.danger ? " text-danger" : ""}${item.disabled ? " disabled" : ""}`}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    close();
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
