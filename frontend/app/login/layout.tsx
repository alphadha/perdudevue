import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à votre espace Perdues de Vue. Pour ne plus perdre le lien avec vos lunettes.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Connexion | Perdues de Vue",
    description: "Pour ne plus perdre le lien avec vos lunettes",
    locale: "fr_FR",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
