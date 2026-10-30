"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AddressAutocomplete, { type AddressSuggestion } from "@/components/AddressAutocomplete";
import AppToast from "@/components/AppToast";
import FieldError from "@/components/FieldError";
import RelayMap from "@/components/RelayMap";
import { api, ApiRequestError } from "@/lib/api";
import type { ClientPair, ClientProfile, MapsConfig, ShippingQuote } from "@/lib/types";

type CheckoutShipment = {
  uuid: string;
  status: string;
  checkout_url?: string;
};

type Draft = {
  mode: "home" | "relay";
  relayId: string;
  addressQuery: string;
  consent: boolean;
  form: {
    recipient_first_name: string;
    recipient_last_name: string;
    address_line: string;
    postal_code: string;
    city: string;
  };
};

function draftKey(uuid: string) {
  return `pdv.delivery.${uuid}`;
}

const fallbackMaps: MapsConfig = {
  provider: "maplibre",
  google_maps_key: null,
  maplibre_style_url: null,
};

export default function DeliveryRequestPage() {
  const params = useParams<{ uuid: string }>();
  const searchParams = useSearchParams();
  const [pair, setPair] = useState<ClientPair | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<"mode" | "recap">("mode");
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [mode, setMode] = useState<"home" | "relay">("home");
  const [relayId, setRelayId] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [relaySearchPending, setRelaySearchPending] = useState(false);
  const [relaySearchError, setRelaySearchError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    recipient_first_name: "",
    recipient_last_name: "",
    address_line: "",
    postal_code: "",
    city: "",
  });

  const persistDraft = useCallback(
    (next: Draft) => {
      sessionStorage.setItem(draftKey(params.uuid), JSON.stringify(next));
    },
    [params.uuid],
  );

  const load = useCallback(async () => {
    try {
      const [nextPair, nextProfile] = await Promise.all([
        api<ClientPair>(`/client/pairs/${params.uuid}`),
        api<ClientProfile>("/client/profile"),
      ]);
      setPair(nextPair);
      setProfile(nextProfile);
      setForm((current) => ({
        ...current,
        recipient_first_name: current.recipient_first_name || nextProfile.first_name,
        recipient_last_name: current.recipient_last_name || nextProfile.last_name,
      }));
      if (!nextPair.actions.can_request_delivery) {
        return;
      }
      const nextQuote = await api<ShippingQuote>(`/client/pairs/${params.uuid}/shipping`);
      setQuote(nextQuote);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Impossible de charger la livraison.");
    }
  }, [params.uuid]);

  async function searchRelays(
    query: string,
    postalCode?: string | null,
    city?: string | null,
    lat?: number | null,
    lng?: number | null,
  ) {
    if (!pair) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setRelaySearchError("Saisissez une adresse pour trouver un point relais.");
      return;
    }

    setRelaySearchPending(true);
    setRelaySearchError(null);
    try {
      const paramsQs = new URLSearchParams({ q: trimmed });
      if (postalCode) {
        paramsQs.set("postal_code", postalCode);
      }
      if (city) {
        paramsQs.set("city", city);
      }
      if (typeof lat === "number") {
        paramsQs.set("lat", String(lat));
      }
      if (typeof lng === "number") {
        paramsQs.set("lng", String(lng));
      }
      const nextQuote = await api<ShippingQuote>(
        `/client/pairs/${pair.uuid}/shipping?${paramsQs.toString()}`,
      );
      setQuote(nextQuote);
      if (nextQuote.relays[0]) {
        setRelayId(nextQuote.relays[0].id);
      } else {
        setRelayId("");
        setRelaySearchError(
          nextQuote.postal_code
            ? "Aucun point relais trouvé près de cette adresse."
            : "Indiquez un code postal dans l’adresse (ex. 75017 Paris).",
        );
      }
    } catch (caught) {
      setRelaySearchError(
        caught instanceof ApiRequestError ? caught.message : "Impossible de charger les points relais.",
      );
    } finally {
      setRelaySearchPending(false);
    }
  }

  function onAddressPicked(suggestion: AddressSuggestion) {
    void searchRelays(
      suggestion.label,
      suggestion.postal_code,
      suggestion.city,
      suggestion.lat,
      suggestion.lng,
    );
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const failed = searchParams.get("paiement") === "echec";
    const sessionId = searchParams.get("session_id");
    if (!failed) {
      return;
    }
    setToast({
      title: "Échec du paiement",
      message: "Votre paiement n’a pas abouti. Nous vous invitons à réessayer.",
    });
    try {
      const raw = sessionStorage.getItem(draftKey(params.uuid));
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        setMode(draft.mode);
        setRelayId(draft.relayId);
        setAddressQuery(draft.addressQuery ?? "");
        setConsent(draft.consent);
        setForm(draft.form);
        setStep("recap");
      }
    } catch {
      setStep("mode");
    }
    if (!sessionId) {
      return;
    }
    void api(`/client/pairs/${params.uuid}/shipments/pay`, {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {
      // Session expirée ou déjà failed : le toaster Figma suffit.
    });
  }, [params.uuid, searchParams]);

  function continueToRecap(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    if (mode === "relay" && !relayId) {
      setRelaySearchError("Sélectionnez un point relais sur la carte.");
      return;
    }
    persistDraft({ mode, relayId, addressQuery, consent, form });
    setStep("recap");
  }

  async function pay() {
    if (!pair) {
      return;
    }
    setPending(true);
    setPayError(null);
    setFieldErrors({});
    persistDraft({ mode, relayId, addressQuery, consent, form });
    try {
      const shipment = await api<CheckoutShipment>(`/client/pairs/${pair.uuid}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          consent_address: consent,
          relay_id: mode === "relay" ? relayId : undefined,
          ...form,
        }),
      });
      if (!shipment.checkout_url) {
        setPayError("Le paiement est momentanément indisponible.");
        return;
      }
      window.location.assign(shipment.checkout_url);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const next: Record<string, string> = {};
        caught.errors.forEach((item) => {
          if (item.field) {
            next[item.field] = item.message;
          }
        });
        setFieldErrors(next);
        setPayError(caught.fieldError("payment") ?? caught.fieldError("consent_address") ?? caught.message);
        if (caught.fieldError("consent_address") || caught.fieldError("address_line") || caught.fieldError("relay_id")) {
          setStep("mode");
        }
      }
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <Link href={`/client/lunettes/${params.uuid}/recuperer`}>Revenir à mes lunettes</Link>
        <p className="mt-3">{error}</p>
      </>
    );
  }

  if (!pair || !profile) {
    return <p>Chargement…</p>;
  }

  if (!pair.actions.can_request_delivery) {
    return (
      <>
        <p>
          <Link href={`/client/lunettes/${pair.uuid}/recuperer`}>Revenir à mes lunettes</Link>
        </p>
        <p>
          {pair.actions.can_track_delivery ? (
            <Link href={`/client/lunettes/${pair.uuid}/suivi`}>Suivre ma livraison</Link>
          ) : (
            "La demande d’expédition n’est pas disponible pour cette paire."
          )}
        </p>
      </>
    );
  }

  if (!quote) {
    return <p>Chargement…</p>;
  }

  const maps = quote.maps ?? fallbackMaps;
  const price = (quote.price_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const selectedRelay = quote.relays.find((relay) => relay.id === relayId) ?? null;
  const homeCarrier = quote.carriers?.home ?? quote.carrier ?? "Colissimo";
  const relayCarrier = quote.carriers?.relay ?? "Mondial Relay";
  const activeCarrier = mode === "relay" ? relayCarrier : homeCarrier;
  const destination =
    mode === "relay" && selectedRelay
      ? `${selectedRelay.name} — ${selectedRelay.address}, ${selectedRelay.postal_code} ${selectedRelay.city}`
      : `${form.address_line}, ${form.postal_code} ${form.city}`;

  return (
    <>
      <AppToast
        title={toast?.title}
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
      />
      <div className="d-flex justify-content-between align-items-center mb-3">
        {step === "recap" ? (
          <button type="button" className="btn btn-link p-0" onClick={() => setStep("mode")}>
            Retour
          </button>
        ) : (
          <Link href={`/client/lunettes/${pair.uuid}/recuperer`}>Revenir à mes lunettes</Link>
        )}
        <Link href={`/client/lunettes/${pair.uuid}/recuperer`} className="btn-close" aria-label="Fermer" />
      </div>
      <p className="text-center text-primary fw-medium">Me faire livrer mes lunettes</p>

      {payError ? <p className="text-danger">{payError}</p> : null}

      {step === "mode" ? (
        <form onSubmit={continueToRecap}>
          <h1 className="h4 text-primary">Mode de livraison</h1>

          <div className={`p-3 mb-3 ${mode === "home" ? "bg-info-subtle" : "bg-primary-subtle"}`}>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="mode"
                id="mode-home"
                checked={mode === "home"}
                onChange={() => setMode("home")}
              />
              <label className="form-check-label fw-medium text-primary" htmlFor="mode-home">
                Livraison à domicile — {homeCarrier}
              </label>
            </div>
            <p className="small text-info-emphasis mb-1">Recevez vos lunettes directement chez vous.</p>
            <p className="small text-info-emphasis mb-0">
              Votre adresse est uniquement utilisée pour la livraison et ne sera pas utilisée à des fins commerciales.
            </p>
            {mode === "home" ? (
              <>
                <div className="row g-2 mt-3">
                  <div className="col-6">
                    <label className="form-label" htmlFor="last">
                      Nom
                    </label>
                    <input
                      id="last"
                      className="form-control"
                      value={form.recipient_last_name}
                      onChange={(event) => setForm({ ...form, recipient_last_name: event.target.value })}
                      required
                    />
                    <FieldError message={fieldErrors.recipient_last_name} />
                  </div>
                  <div className="col-6">
                    <label className="form-label" htmlFor="first">
                      Prénom
                    </label>
                    <input
                      id="first"
                      className="form-control"
                      value={form.recipient_first_name}
                      onChange={(event) => setForm({ ...form, recipient_first_name: event.target.value })}
                      required
                    />
                    <FieldError message={fieldErrors.recipient_first_name} />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="form-label" htmlFor="address">
                    N° et nom de la rue
                  </label>
                  <input
                    id="address"
                    className="form-control"
                    value={form.address_line}
                    onChange={(event) => setForm({ ...form, address_line: event.target.value })}
                    required
                  />
                  <FieldError message={fieldErrors.address_line} />
                </div>
                <div className="row g-2 mt-0">
                  <div className="col-6">
                    <label className="form-label" htmlFor="postal">
                      Code Postal
                    </label>
                    <input
                      id="postal"
                      className="form-control"
                      value={form.postal_code}
                      onChange={(event) => setForm({ ...form, postal_code: event.target.value })}
                      required
                    />
                    <FieldError message={fieldErrors.postal_code} />
                  </div>
                  <div className="col-6">
                    <label className="form-label" htmlFor="city">
                      Ville
                    </label>
                    <input
                      id="city"
                      className="form-control"
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                      required
                    />
                    <FieldError message={fieldErrors.city} />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className={`p-3 mb-3 ${mode === "relay" ? "bg-info-subtle" : "bg-primary-subtle"}`}>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="mode"
                id="mode-relay"
                checked={mode === "relay"}
                onChange={() => setMode("relay")}
              />
              <label className="form-check-label fw-medium text-primary" htmlFor="mode-relay">
                Livraison en point relais — {relayCarrier}
              </label>
            </div>
            {mode === "relay" ? (
              <>
                <p className="small text-primary mb-3">Sélectionnez un commerce proche de chez vous</p>
                <label className="visually-hidden" htmlFor="relay-address">
                  Adresse
                </label>
                <AddressAutocomplete
                  id="relay-address"
                  maps={maps}
                  value={addressQuery}
                  onChange={setAddressQuery}
                  onSelect={onAddressPicked}
                  onSearch={(query) => void searchRelays(query)}
                  pending={relaySearchPending}
                  placeholder="17 av. parmentier 75017 Paris"
                />
                {relaySearchError ? <p className="small text-danger">{relaySearchError}</p> : null}
                <FieldError message={fieldErrors.relay_id} />

                {quote.relays.length > 0 ? (
                  <>
                    <RelayMap
                      maps={maps}
                      relays={quote.relays}
                      selectedId={relayId}
                      onSelect={setRelayId}
                    />
                    {selectedRelay ? (
                      <div className="bg-white rounded-3 px-2 py-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <p className="fw-medium text-primary mb-0 small">{relayCarrier}</p>
                          <p className="fw-medium text-primary mb-0 small">{price}</p>
                        </div>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <img src="/icons/building-4-line.svg" alt="" width={16} height={16} />
                          <span className="small text-info-emphasis">{selectedRelay.name}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <img src="/icons/map-pin-2-line.svg" alt="" width={16} height={16} />
                          <span className="small text-info-emphasis">
                            {selectedRelay.address}, {selectedRelay.postal_code} {selectedRelay.city}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="consent"
              checked={consent}
              required
              onChange={(event) => setConsent(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="consent">
              J’autorise l’usage de cette adresse uniquement pour l’expédition de mes lunettes, sans usage commercial.
            </label>
            <FieldError message={fieldErrors.consent_address} />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            Continuer
          </button>
        </form>
      ) : (
        <>
          <h1 className="h4">Récapitulatif de livraison</h1>
          <div className="bg-body-secondary p-3 mb-3">
            <p className="small fw-medium mb-1">Paire de lunette</p>
            <p className="mb-1">{pair.title}</p>
            <p className="small text-secondary mb-0">Type de lunette : {pair.type}</p>
            <p className="small text-secondary mb-0">Marque : {pair.brand}</p>
            <p className="small text-secondary mb-0">Couleurs : {pair.colors.join(", ")}</p>
          </div>
          <div className="bg-body-secondary p-3 mb-3">
            <p className="small fw-medium mb-1">Mode de livraison</p>
            <p className="d-flex justify-content-between mb-1">
              <span>
                {mode === "relay" ? "Livraison en point relais" : "Livraison à domicile"} — {activeCarrier}
              </span>
              <span>{price}</span>
            </p>
            <p className="small text-secondary mb-0">{destination}</p>
          </div>
          <button type="button" className="btn btn-primary w-100" disabled={pending} onClick={() => void pay()}>
            Procéder au paiement
          </button>
        </>
      )}
    </>
  );
}
