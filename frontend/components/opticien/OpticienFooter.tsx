import Link from "next/link";

const LEGAL = "mailto:support@perduesdevue.com";

const COL_NAV = [
  [
    { href: "/opticien", label: "Tableau de bord" },
    { href: "/opticien/clients", label: "Clients" },
    { href: "/opticien/lunettes", label: "Lunettes" },
  ],
  [
    { href: "/opticien/restitution", label: "Restitution" },
    { href: "/opticien/notifications", label: "Notifications" },
    { href: "/opticien/parametres", label: "Paramètres" },
  ],
] as const;

const COL_LEGAL = [
  { href: LEGAL, label: "Protection des données" },
  { href: LEGAL, label: "Conditions Générales d’Utilisation" },
] as const;

export default function OpticienFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="pdv-footer">
      <div className="container">
        <div className="pdv-footer__brand">
          <img className="pdv-footer__logo" src="/brand/logo.svg" alt="Perdues de Vue" />
          <p className="pdv-footer__copy">Perdues de vue © {year}</p>
        </div>
        <nav className="pdv-footer__nav" aria-label="Pied de page">
          {COL_NAV.map((column) => (
            <ul key={column[0].href} className="pdv-footer__col">
              {column.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          ))}
          <ul className="pdv-footer__col">
            {COL_LEGAL.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
