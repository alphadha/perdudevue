"use client";

import type { ClientShop } from "@/lib/types";

type Props = {
  shop: ClientShop;
  onMap: () => void;
};

export default function ShopCard({ shop, onMap }: Props) {
  const address = [shop.address, shop.postal_code, shop.city].filter(Boolean).join(", ");

  return (
    <div className="card mb-4">
      <div className="card-body">
        <p className="fw-semibold mb-1">{shop.name}</p>
        <p className="mb-1">{address}</p>
        {shop.phone ? <p className="mb-3">Tél : {shop.phone}</p> : <p className="mb-3" />}
        <div className="d-flex justify-content-between">
          {shop.phone ? <a href={`tel:${shop.phone}`}>Appeler</a> : <span />}
          <button type="button" className="btn btn-link p-0" onClick={onMap}>
            Voir sur la carte
          </button>
        </div>
      </div>
    </div>
  );
}
