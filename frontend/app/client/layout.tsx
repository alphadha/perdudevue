"use client";

import Link from "next/link";
import { ReactNode } from "react";
import GeolocPrompt from "@/components/client/GeolocPrompt";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pdv-client-shell">
      <GeolocPrompt />
      <nav className="pdv-client-shell__nav">
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
      <div className="pdv-client-shell__body">{children}</div>
    </div>
  );
}
