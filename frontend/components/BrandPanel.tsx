"use client";

type Props = {
  space: "client" | "opticien";
};

export default function BrandPanel({ space }: Props) {
  if (space === "client") {
    return null;
  }

  return (
    <div className="col-lg-6 d-none d-lg-flex bg-light align-items-center">
      <div className="p-5">
        <p className="text-uppercase small text-muted mb-2">Logo</p>
        <h1 className="h3 mb-4">Perdues de Vue, pour ne plus perdre le lien avec vos lunettes</h1>
        <p>
          Pour les clients, la plateforme permet de suivre leurs lunettes et de retrouver facilement les
          informations nécessaires lorsqu’elles sont retrouvées chez un opticien partenaire.
        </p>
        <p>
          Pour les opticiens, elle simplifie l’enregistrement des lunettes, le suivi des clients et la
          gestion des restitutions.
        </p>
        <p className="mb-0">
          De la perte jusqu’à la restitution, Perdues de Vue permet à chacun de garder le lien et de
          faciliter le retour des lunettes à leur propriétaire.
        </p>
      </div>
    </div>
  );
}
