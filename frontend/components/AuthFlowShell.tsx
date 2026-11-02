"use client";

import Link from "next/link";
import { ReactNode } from "react";
import BrandPanel from "@/components/BrandPanel";

type Props = {
  backHref: string;
  title: string;
  progress: number;
  children: ReactNode;
};

/** Shell auth Figma (login / MDP oublié / code / nouveau MDP) — BrandPanel desktop + hero mobile. */
export default function AuthFlowShell({ backHref, title, progress, children }: Props) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="pdv-login">
      <BrandPanel />
      <div className="pdv-login__main">
        <header className="pdv-login__hero pdv-login__hero--mobile">
          <div className="pdv-login__pattern" aria-hidden>
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
          </div>
          <img className="pdv-login__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
        </header>

        <div className="pdv-login__body pdv-auth-flow">
          <div className="pdv-auth-flow__head">
            <Link href={backHref} className="pdv-auth-flow__back">
              <img
                src="/icons/pdv/arrow-narrow-left.svg"
                alt=""
                width={24}
                height={24}
                className="pdv-auth-flow__back-icon"
              />
              <span>{title}</span>
            </Link>
            <div
              className="pdv-auth-flow__progress"
              role="progressbar"
              aria-valuenow={clamped}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="pdv-auth-flow__progress-bar" style={{ width: `${clamped}%` }} />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
