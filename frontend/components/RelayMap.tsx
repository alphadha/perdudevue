"use client";

import { useEffect, useRef, useState } from "react";
import type { MapsConfig, ShippingRelay } from "@/lib/types";

type Props = {
  maps: MapsConfig;
  relays: ShippingRelay[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };

type LatLng = { lat: number; lng: number };

function withCoords(relays: ShippingRelay[]) {
  return relays.filter(
    (relay): relay is ShippingRelay & LatLng =>
      typeof relay.lat === "number" && typeof relay.lng === "number",
  );
}

export default function RelayMap({ maps, relays, selectedId, onSelect }: Props) {
  if (maps.provider === "google") {
    return (
      <GoogleRelayMap
        apiKey={maps.google_maps_key}
        relays={relays}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  return <LeafletRelayMap relays={relays} selectedId={selectedId} onSelect={onSelect} />;
}

function LeafletRelayMap({
  relays,
  selectedId,
  onSelect,
}: {
  relays: ShippingRelay[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!containerRef.current || mapRef.current) {
        return;
      }
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      leafletRef.current = L;
      if (cancelled || !containerRef.current) {
        return;
      }

      const points = withCoords(relays);
      const center = points[0] ?? DEFAULT_CENTER;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([center.lat, center.lng], points.length ? 12 : 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
      if (!cancelled) {
        setMapReady(true);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!mapReady || !map || !L || !layer) {
      return;
    }

    layer.clearLayers();
    const points = withCoords(relays);
    const bounds: import("leaflet").LatLngExpression[] = [];

    points.forEach((relay) => {
      const selected = relay.id === selectedId;
      const marker = L.circleMarker([relay.lat, relay.lng], {
        radius: selected ? 10 : 8,
        color: "#ffffff",
        weight: 2,
        fillColor: selected ? "#2699FB" : "#7FC4FD",
        fillOpacity: 1,
      });
      marker.bindTooltip(relay.name, { direction: "top", offset: [0, -8] });
      marker.on("click", () => onSelectRef.current(relay.id));
      marker.addTo(layer);
      bounds.push([relay.lat, relay.lng]);
    });

    requestAnimationFrame(() => map.invalidateSize());

    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
      return;
    }
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    }
  }, [mapReady, relays, selectedId]);

  function recenter() {
    const map = mapRef.current;
    const points = withCoords(relays);
    const selected = points.find((relay) => relay.id === selectedId) ?? points[0];
    if (!map || !selected) {
      return;
    }
    map.setView([selected.lat, selected.lng], 12);
  }

  return (
    <div className="position-relative mb-3" style={{ zIndex: 1 }}>
      <div className="ratio ratio-16x9 bg-body-secondary">
        <div ref={containerRef} />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 m-2 p-2"
        aria-label="Recentrer la carte"
        onClick={recenter}
      >
        <img src="/icons/focus-3-line.svg" alt="" width={17} height={17} />
      </button>
    </div>
  );
}

function GoogleRelayMap({
  apiKey,
  relays,
  selectedId,
  onSelect,
}: {
  apiKey: string | null;
  relays: ShippingRelay[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!apiKey) {
      return;
    }
    let cancelled = false;

    async function boot() {
      await loadGoogleMaps(apiKey!, false);
      if (cancelled || !containerRef.current || mapRef.current || !window.google?.maps) {
        return;
      }
      const points = withCoords(relays);
      const center = points[0] ?? DEFAULT_CENTER;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: points.length ? 13 : 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    void boot();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const points = withCoords(relays);
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((relay) => {
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: relay.lat, lng: relay.lng },
        title: relay.name,
        opacity: relay.id === selectedId ? 1 : 0.75,
      });
      marker.addListener("click", () => onSelectRef.current(relay.id));
      markersRef.current.push(marker);
      bounds.extend({ lat: relay.lat, lng: relay.lng });
    });

    if (points.length === 1) {
      map.panTo({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(12);
    } else if (points.length > 1) {
      map.fitBounds(bounds, 40);
    }
  }, [relays, selectedId, apiKey]);

  function recenter() {
    const points = withCoords(relays);
    const selected = points.find((relay) => relay.id === selectedId) ?? points[0];
    if (!mapRef.current || !selected) {
      return;
    }
    mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
    mapRef.current.setZoom(12);
  }

  if (!apiKey) {
    return (
      <div className="ratio ratio-16x9 bg-body-secondary mb-3">
        <div className="d-flex align-items-center justify-content-center p-3">
          <p className="small text-secondary mb-0 text-center">
            Carte Google indisponible : clé API manquante dans les paramètres plateforme.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative mb-3" style={{ zIndex: 1 }}>
      <div className="ratio ratio-16x9 bg-body-secondary">
        <div ref={containerRef} />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 m-2 p-2"
        aria-label="Recentrer la carte"
        onClick={recenter}
      >
        <img src="/icons/focus-3-line.svg" alt="" width={17} height={17} />
      </button>
    </div>
  );
}

type GoogleMap = {
  panTo: (pos: LatLng) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: unknown, padding?: number) => void;
};

type GoogleMarker = {
  setMap: (map: GoogleMap | null) => void;
  addListener: (event: string, handler: () => void) => void;
};

type GoogleMapsApi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
  Marker: new (opts: Record<string, unknown>) => GoogleMarker;
  LatLngBounds: new () => { extend: (pos: LatLng) => void };
  places?: {
    AutocompleteService: new () => {
      getPlacePredictions: (
        req: { input: string; componentRestrictions?: { country: string } },
        cb: (preds: Array<{ description: string }> | null, status: string) => void,
      ) => void;
    };
  };
};

let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string, withPlaces: boolean): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) {
    if (!withPlaces || window.google.maps.places) {
      return Promise.resolve();
    }
  }
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const libraries = withPlaces ? "&libraries=places" : "";
  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pdv-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Chargement Google Maps impossible.")));
      return;
    }
    const script = document.createElement("script");
    script.dataset.pdvGoogleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${libraries}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Chargement Google Maps impossible."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

declare global {
  interface Window {
    google?: { maps: GoogleMapsApi };
  }
}
