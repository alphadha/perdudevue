import type { Metadata } from "next";
import { ReactNode } from "react";
import ClientShell from "@/components/client/ClientShell";

export const metadata: Metadata = {
  title: "Mes lunettes",
  description: "Retrouvez ici toutes vos paires enregistrées.",
};

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
