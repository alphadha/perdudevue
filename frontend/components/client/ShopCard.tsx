"use client";

import { formatPhoneFr } from "@/lib/formatPhone";
import type { ClientShop } from "@/lib/types";

type Props = {
  shop: ClientShop;
  title?: string;
  onMap?: () => void;
};

export default function ShopCard({ shop, title, onMap }: Props) {
  const locality = [shop.postal_code, shop.city].filter(Boolean).join(" ");
  const address = [shop.address, locality].filter(Boolean).join(", ");

  return (
    <section className="pdv-shop-card">
      {title ? <h2 className="pdv-shop-card__title">{title}</h2> : null}
      <div className="pdv-shop-card__identity">
        <p className="pdv-shop-card__name">{shop.name}</p>
        <div className="pdv-shop-card__meta-block">
          {address ? <p className="pdv-shop-card__meta">{address}</p> : null}
          {shop.phone ? <p className="pdv-shop-card__meta">Tél : {formatPhoneFr(shop.phone)}</p> : null}
        </div>
      </div>
      {shop.phone || shop.maps_url || onMap ? (
        <>
          <hr className="pdv-shop-card__rule" />
          <div className="pdv-shop-card__actions">
            {shop.phone ? (
              <a className="pdv-shop-card__action" href={`tel:${shop.phone}`}>
                <img src="/icons/pdv/phone.svg" alt="" width={18} height={18} />
                Appeler
              </a>
            ) : (
              <span />
            )}
            {onMap ? (
              <button type="button" className="pdv-shop-card__action" onClick={onMap}>
                <img src="/icons/pdv/map-01.svg" alt="" width={18} height={18} />
                Voir sur la carte
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
