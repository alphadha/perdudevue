"use client";

import { useEffect, useRef } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import type { ClientShop } from "@/lib/types";

type Props = {
  shop: ClientShop;
  onClose: () => void;
};

type LatLng = { lat: number; lng: number };

function shopQuery(shop: ClientShop): string {
  return [shop.address, shop.postal_code, shop.city].filter(Boolean).join(" ");
}

function shopAddress(shop: ClientShop): string {
  const locality = [shop.postal_code, shop.city].filter(Boolean).join(" ");
  return [shop.address, locality].filter(Boolean).join(", ");
}

function itineraryUrl(shop: ClientShop): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shopQuery(shop))}&travelmode=driving`;
}

function fallbackCoords(shop: ClientShop): LatLng {
  if (shop.city?.toLowerCase().includes("toulouse")) {
    return { lat: 43.6045, lng: 1.444 };
  }
  return { lat: 48.8686, lng: 2.331 };
}

const geoHeaders = { Accept: "application/json", "User-Agent": "PerduesDeVue/1.0" };

async function geocode(query: string): Promise<LatLng | null> {
  if (!query.trim()) {
    return null;
  }
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: geoHeaders },
  );
  if (!response.ok) {
    return null;
  }
  const rows = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!rows[0]) {
    return null;
  }
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
}

async function drivingPath(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
    "?overview=full&geometries=geojson";
  const response = await fetch(url, { headers: geoHeaders });
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };
  return (payload.routes?.[0]?.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }));
}

function ShopMiniMap({ shop }: { shop: ClientShop }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function boot() {
      if (!containerRef.current) {
        return;
      }
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) {
        return;
      }

      const shopPoint = (await geocode(shopQuery(shop))) ?? fallbackCoords(shop);
      if (cancelled || !containerRef.current) {
        return;
      }

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([shopPoint.lat, shopPoint.lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const shopIcon = L.divIcon({
        className: "pdv-shop-pin",
        html:
          '<div class="pdv-shop-pin__bubble"><img src="/icons/pdv/building-02.svg" alt="" width="12" height="12"></div><span class="pdv-shop-pin__tail"></span>',
        iconSize: [26, 32],
        iconAnchor: [13, 32],
      });
      L.marker([shopPoint.lat, shopPoint.lng], { icon: shopIcon, interactive: false }).addTo(map);

      const user = await new Promise<LatLng | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000 },
        );
      });

      if (cancelled || !map) {
        return;
      }

      if (user) {
        const userIcon = L.divIcon({
          className: "pdv-shop-user",
          html: '<span class="pdv-shop-user__dot"></span>',
          iconSize: [15, 15],
          iconAnchor: [8, 8],
        });
        L.marker([user.lat, user.lng], { icon: userIcon, interactive: false }).addTo(map);
        const path = await drivingPath(user, shopPoint);
        if (cancelled || !map) {
          return;
        }
        const line = path.length > 1 ? path : [];
        if (line.length > 1) {
          L.polyline(
            line.map((point) => [point.lat, point.lng] as [number, number]),
            { color: "#13263f", weight: 3, lineJoin: "round", lineCap: "round", smoothFactor: 0 },
          ).addTo(map);
          map.fitBounds(
            line.map((point) => [point.lat, point.lng] as [number, number]),
            { padding: [24, 24], maxZoom: 16 },
          );
        } else {
          map.fitBounds(
            [
              [user.lat, user.lng],
              [shopPoint.lat, shopPoint.lng],
            ],
            { padding: [24, 24], maxZoom: 16 },
          );
        }
      }

      requestAnimationFrame(() => map?.invalidateSize());
    }

    void boot();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [shop]);

  return <div ref={containerRef} className="pdv-shop-map" />;
}

export default function ShopMapModal({ shop, onClose }: Props) {
  const address = shopAddress(shop);

  function openItinerary() {
    window.location.assign(itineraryUrl(shop));
  }

  return (
    <BootstrapModal title="Localisation" variant="client" onClose={onClose}>
      <div className="modal-body pdv-shop-map-modal__body">
        <ShopMiniMap shop={shop} />
        <div className="pdv-shop-map-modal__details">
          <p className="pdv-shop-card__name">{shop.name}</p>
          {address ? <p className="pdv-shop-card__meta">{address}</p> : null}
        </div>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block iconLeft="/icons/pdv/share-03.svg" onClick={openItinerary}>
          Voir l’itinéraire
        </PdvButton>
        <PdvButton type="button" variant="tertiary" onClick={onClose}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}
