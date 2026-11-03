"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadGoogleMaps } from "@/components/RelayMap";
import type { MapsConfig } from "@/lib/types";

export type AddressSuggestion = {
  label: string;
  postal_code: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

type Props = {
  maps: MapsConfig;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onSearch: (query: string) => void;
  pending?: boolean;
  placeholder?: string;
  id?: string;
};

export default function AddressAutocomplete({
  maps,
  value,
  onChange,
  onSelect,
  onSearch,
  pending = false,
  placeholder = "17 av. Parmentier, 75011 Paris",
  id,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchSuggestions(maps, query).then((items) => {
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIndex(-1);
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, maps]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(item: AddressSuggestion) {
    onChange(item.label);
    onSelect(item);
    setOpen(false);
    setSuggestions([]);
  }

  function runSearch() {
    setOpen(false);
    onSearch(value.trim());
  }

  return (
    <div className="pdv-search" ref={rootRef}>
      <div className="pdv-search__field">
        <input
          id={id}
          type="text"
          className="pdv-search__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => (index + 1) % suggestions.length);
              return;
            }
            if (event.key === "ArrowUp" && suggestions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (open && activeIndex >= 0 && suggestions[activeIndex]) {
                choose(suggestions[activeIndex]);
                return;
              }
              runSearch();
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <button type="button" className="pdv-search__submit" aria-label="Rechercher" onClick={runSearch}>
          <img src="/icons/pdv/search-md.svg" alt="" width={20} height={20} />
        </button>
      </div>

      {open && suggestions.length > 0 ? (
        <ul id={listId} className="pdv-search__list" role="listbox">
          {suggestions.map((item, index) => (
            <li key={`${item.label}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`pdv-search__option${index === activeIndex ? " is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function fetchSuggestions(maps: MapsConfig, query: string): Promise<AddressSuggestion[]> {
  if (maps.provider === "google" && maps.google_maps_key) {
    return fetchGoogleSuggestions(maps.google_maps_key, query);
  }
  return fetchBanSuggestions(query);
}

async function fetchBanSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`,
    );
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { label?: string; postcode?: string; city?: string };
      }>;
    };
    return (payload.features ?? [])
      .map((feature) => ({
        label: feature.properties?.label ?? "",
        postal_code: feature.properties?.postcode ?? null,
        city: feature.properties?.city ?? null,
        lng: feature.geometry?.coordinates?.[0] ?? null,
        lat: feature.geometry?.coordinates?.[1] ?? null,
      }))
      .filter((item) => item.label !== "");
  } catch {
    return [];
  }
}

async function fetchGoogleSuggestions(apiKey: string, query: string): Promise<AddressSuggestion[]> {
  try {
    await loadGoogleMaps(apiKey, true);
    const service = window.google?.maps?.places?.AutocompleteService
      ? new window.google.maps.places.AutocompleteService()
      : null;
    if (!service) {
      return fetchBanSuggestions(query);
    }

    return await new Promise((resolve) => {
      service.getPlacePredictions(
        { input: query, componentRestrictions: { country: "fr" } },
        (predictions, status) => {
          if (status !== "OK" || !predictions) {
            resolve([]);
            return;
          }
          resolve(
            predictions.map((prediction) => {
              const match = prediction.description.match(/\b(\d{5})\b/);
              return {
                label: prediction.description,
                postal_code: match?.[1] ?? null,
                city: null,
                lat: null,
                lng: null,
              };
            }),
          );
        },
      );
    });
  } catch {
    return fetchBanSuggestions(query);
  }
}
