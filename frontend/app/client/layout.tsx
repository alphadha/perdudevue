"use client";

import Link from "next/link";
import { ReactNode } from "react";
import GeolocPrompt from "@/components/client/GeolocPrompt";
import PdvButton from "@/components/pdv/PdvButton";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pdv-client-shell">
      <GeolocPrompt />
      <nav className="pdv-client-shell__nav">
        <div className="container d-flex justify-content-between align-items-center">
          <Link href="/client" className="pdv-client-shell__brand">
            <img src="/brand/logo.svg" alt="Perdues de Vue" height={32} />
          </Link>
          <PdvButton variant="secondary" size="m" href="/client/parametres" iconLeft="/icons/pdv/settings-01.svg">
            Paramètres
          </PdvButton>
        </div>
      </nav>
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
