"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import PdvButton from "@/components/pdv/PdvButton";
import PdvRestitutionIcon from "@/components/pdv/PdvRestitutionIcon";
import { api, clearSession } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

const links: Array<{
  href: string;
  label: string;
  icon?: string;
  iconClass?: string;
  restitution?: boolean;
}> = [
  { href: "/opticien", label: "Tableau de bord", icon: "/icons/pdv/speedometer-03.svg", iconClass: "pdv-icon-17" },
  { href: "/opticien/clients", label: "Clients", icon: "/icons/pdv/users-01.svg" },
  { href: "/opticien/lunettes", label: "Lunettes", icon: "/icons/pdv/lunettes-nav.svg", iconClass: "pdv-icon-22" },
  { href: "/opticien/restitution", label: "Restitution", restitution: true },
  { href: "/opticien/notifications", label: "Notifications", icon: "/icons/pdv/bell-02.svg" },
  { href: "/opticien/parametres", label: "Paramètres du compte", icon: "/icons/pdv/settings-01.svg" },
];

export default function OpticienShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const offcanvasId = useId().replace(/:/g, "");
  const offcanvasTarget = `pdv-nav-${offcanvasId}`;

  useEffect(() => {
    void api<AuthUser>("/auth/me")
      .then((data) => {
        if (data.role !== "opticien_admin" && data.role !== "opticien_user") {
          router.replace(data.home);
        }
      })
      .catch(() => {
        clearSession();
        router.replace("/login?space=opticien");
      });
  }, [router]);

  useEffect(() => {
    const el = document.getElementById(offcanvasTarget);
    if (!el?.classList.contains("show")) {
      return;
    }
    const closer = el.querySelector<HTMLButtonElement>('[data-bs-dismiss="offcanvas"]');
    closer?.click();
  }, [pathname, offcanvasTarget]);

  function logout() {
    void api("/auth/logout", { method: "POST" }).finally(() => {
      clearSession();
      router.push("/login?space=opticien");
    });
  }

  function isActive(href: string): boolean {
    if (href === "/opticien") {
      return pathname === "/opticien";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderLinks() {
    return links.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        className={`pdv-nav__link${isActive(link.href) ? " is-active" : ""}`}
      >
        {link.restitution ? (
          <PdvRestitutionIcon />
        ) : link.icon ? (
          <img src={link.icon} alt="" className={link.iconClass ?? undefined} />
        ) : null}
        <span>{link.label}</span>
      </Link>
    ));
  }

  return (
    <div className="pdv-shell">
      <header className="pdv-nav">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          <div className="pdv-nav__left">
            <Link href="/opticien" className="pdv-nav__brand">
              <img className="pdv-nav__logo" src="/brand/logo.svg" alt="Perdues de Vue" />
            </Link>
            <nav className="pdv-nav__links pdv-nav__links--desktop" aria-label="Navigation opticien">
              {renderLinks()}
            </nav>
          </div>
          <div className="pdv-nav__right">
            <PdvButton
              variant="secondary"
              size="m"
              className="pdv-nav__logout-desktop"
              iconLeft="/icons/pdv/log-out-01.svg"
              onClick={logout}
            >
              Se déconnecter
            </PdvButton>
            <button
              type="button"
              className="pdv-nav__toggler"
              data-bs-toggle="offcanvas"
              data-bs-target={`#${offcanvasTarget}`}
              aria-controls={offcanvasTarget}
              aria-label="Ouvrir le menu"
            >
              <span className="pdv-nav__toggler-bar" />
              <span className="pdv-nav__toggler-bar" />
              <span className="pdv-nav__toggler-bar" />
            </button>
          </div>
        </div>
      </header>

      <div
        className="offcanvas offcanvas-end pdv-nav-offcanvas"
        tabIndex={-1}
        id={offcanvasTarget}
        aria-labelledby={`${offcanvasTarget}-label`}
      >
        <div className="offcanvas-header">
          <h2 className="offcanvas-title" id={`${offcanvasTarget}-label`}>
            Menu
          </h2>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Fermer" />
        </div>
        <div className="offcanvas-body">
          <nav className="pdv-nav__links pdv-nav__links--mobile" aria-label="Navigation opticien mobile">
            {renderLinks()}
          </nav>
          <PdvButton
            variant="secondary"
            size="m"
            block
            iconLeft="/icons/pdv/log-out-01.svg"
            onClick={logout}
          >
            Se déconnecter
          </PdvButton>
        </div>
      </div>

      <main className="pdv-main">
        <div className="container py-4">{children}</div>
      </main>
    </div>
  );
}
