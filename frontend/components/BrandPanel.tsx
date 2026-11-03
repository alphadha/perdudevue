"use client";

/** Panneau marque desktop — Prod UI Connexion (Figma 145:20643). */
export default function BrandPanel() {
  return (
    <aside className="pdv-brand-panel" aria-hidden={false}>
      <div className="pdv-brand-panel__pattern" aria-hidden>
        {Array.from({ length: 5 }).map((_, row) => (
          <div className="pdv-brand-panel__pattern-row" key={`row-${row}`}>
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
            <img src="/brand/login-pattern-b.svg" alt="" />
            <img src="/brand/login-pattern-a.svg" alt="" />
          </div>
        ))}
      </div>
      <div className="pdv-brand-panel__content">
        <img className="pdv-brand-panel__logo" src="/brand/logo-blanc.svg" alt="Perdues de Vue" />
        <div className="pdv-brand-panel__copy">
          <div className="pdv-brand-panel__intro">
            <p className="pdv-brand-panel__tagline">Perdues aujourd&apos;hui, Retrouvées demain</p>
            <p className="pdv-brand-panel__desc">
              Perdues de Vue grave sur vos lunettes un identifiant unique et discret. Enregistré dans
              notre application, il permet de les retrouver facilement en cas de perte. Un service
              proposé par votre opticien.
            </p>
          </div>
          <div className="pdv-brand-panel__card">
            <p className="pdv-brand-panel__card-title">Vous avez trouvé une paire de lunettes&nbsp;?</p>
            <p className="pdv-brand-panel__card-body">
              Déposez-la chez un opticien partenaire.
              <br />
              On s&apos;occupe du reste, et son propriétaire vous remercie&nbsp;!
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
