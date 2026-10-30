import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/pdv.css";
import BootstrapClient from "@/components/BootstrapClient";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--pdv-font-family",
});

export const metadata: Metadata = {
  title: "Perdues de Vue",
  description: "Pour ne plus perdre le lien avec vos lunettes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={poppins.variable} suppressHydrationWarning>
      <body className={poppins.className} suppressHydrationWarning>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
