"use client";

import { useRouter } from "next/navigation";
import { api, clearSession } from "@/lib/api";

type Props = {
  title: string;
  loginHref: string;
};

export default function AppHeader({ title, loginHref }: Props) {
  const router = useRouter();

  function logout() {
    void api("/auth/logout", { method: "POST" }).finally(() => {
      clearSession();
      router.push(loginHref);
    });
  }

  return (
    <nav className="navbar navbar-light bg-light mb-4">
      <div className="container">
        <span className="navbar-brand mb-0 h1">{title}</span>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={logout}>
          Se déconnecter
        </button>
      </div>
    </nav>
  );
}
