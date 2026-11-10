"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import GeolocPrompt from "@/components/client/GeolocPrompt";

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/client";

  return (
    <div className={`pdv-client-shell${isHome ? "" : " pdv-client-shell--sub"}`}>
      <GeolocPrompt />
      {isHome ? (
        <nav className="pdv-client-shell__nav" aria-label="Navigation client">
          <div className="pdv-client-shell__nav-inner">
            <Link href="/client" className="pdv-client-shell__brand">
              <img src="/brand/logo.svg" alt="Perdues de Vue" height={36} />
            </Link>
            <Link
              href="/client/parametres"
              className="pdv-client-shell__settings"
              aria-label="Paramètres"
            >
              <img src="/icons/pdv/settings-01.svg" alt="" width={20} height={20} />
            </Link>
          </div>
        </nav>
      ) : null}
      <div className="pdv-client-shell__body">{children}</div>
    </div>
  );
}
