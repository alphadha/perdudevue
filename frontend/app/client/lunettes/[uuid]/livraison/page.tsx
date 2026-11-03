"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AddressAutocomplete, { type AddressSuggestion } from "@/components/AddressAutocomplete";
import AppToast from "@/components/AppToast";
import ClientBackLink from "@/components/client/ClientBackLink";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCheckbox from "@/components/pdv/PdvCheckbox";
import PdvField from "@/components/pdv/PdvField";
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
    address_complement: string;
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

function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")}€`;
}

function homeAddress(form: Draft["form"]) {
  return [form.address_line, form.address_complement, `${form.postal_code} ${form.city}`.trim()]
    .filter((part) => part.trim() !== "")
    .join(", ");
}

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
    address_complement: "",
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

  function selectMode(next: "home" | "relay") {
    setMode(next);
    setRelaySearchError(null);
    if (next === "relay" && addressQuery.trim() === "") {
      const fromHome = [form.address_line, form.postal_code, form.city].filter(Boolean).join(" ");
      if (fromHome) {
        setAddressQuery(fromHome);
        void searchRelays(fromHome, form.postal_code, form.city);
      }
    }
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
        setForm({
          address_complement: "",
          ...draft.form,
        });
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
    const nextErrors: Record<string, string> = {};
    if (mode === "home") {
      if (!form.recipient_last_name.trim()) {
        nextErrors.recipient_last_name = "Indiquez le nom.";
      }
      if (!form.recipient_first_name.trim()) {
        nextErrors.recipient_first_name = "Indiquez le prénom.";
      }
      if (!form.address_line.trim()) {
        nextErrors.address_line = "Indiquez l’adresse.";
      }
      if (!form.postal_code.trim()) {
        nextErrors.postal_code = "Indiquez le code postal.";
      }
      if (!form.city.trim()) {
        nextErrors.city = "Indiquez la ville.";
      }
    }
    if (mode === "relay" && !relayId) {
      setRelaySearchError("Sélectionnez un point relais sur la carte.");
    }
    if (!consent) {
      nextErrors.consent_address = "Le consentement à l’usage de l’adresse pour l’expédition est obligatoire.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || (mode === "relay" && !relayId)) {
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
    const addressLine = [form.address_line, form.address_complement].filter((part) => part.trim() !== "").join(", ");
    try {
      const shipment = await api<CheckoutShipment>(`/client/pairs/${pair.uuid}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          consent_address: consent,
          relay_id: mode === "relay" ? relayId : undefined,
          recipient_first_name: form.recipient_first_name,
          recipient_last_name: form.recipient_last_name,
          address_line: addressLine,
          postal_code: form.postal_code,
          city: form.city,
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

  const recupererHref = `/client/lunettes/${params.uuid}/recuperer`;

  if (error) {
    return (
      <div className="pdv-delivery">
        <ClientBackLink href={recupererHref}>Revenir à mes lunettes</ClientBackLink>
        <p className="pdv-client-page-sub">{error}</p>
      </div>
    );
  }

  if (!pair || !profile) {
    return <p className="pdv-client-page-sub">Chargement…</p>;
  }

  if (!pair.actions.can_request_delivery) {
    return (
      <div className="pdv-delivery">
        <ClientBackLink href={recupererHref}>Revenir à mes lunettes</ClientBackLink>
        <p className="pdv-client-page-sub">
          {pair.actions.can_track_delivery ? (
            <Link href={`/client/lunettes/${pair.uuid}/suivi`}>Suivre ma livraison</Link>
          ) : (
            "La demande d’expédition n’est pas disponible pour cette paire."
          )}
        </p>
      </div>
    );
  }

  if (!quote) {
    return <p className="pdv-client-page-sub">Chargement…</p>;
  }

  const maps = quote.maps ?? fallbackMaps;
  const homeCents = quote.prices?.home ?? quote.price_cents;
  const relayCents = quote.prices?.relay ?? quote.price_cents;
  const selectedRelay = quote.relays.find((relay) => relay.id === relayId) ?? null;
  const homeCarrier = quote.carriers?.home ?? quote.carrier ?? "Colissimo";
  const activeCents = mode === "relay" ? relayCents : homeCents;
  const destination =
    mode === "relay" && selectedRelay
      ? `${selectedRelay.address}, ${selectedRelay.postal_code} ${selectedRelay.city}`
      : homeAddress(form);

  return (
    <div className="pdv-delivery">
      <AppToast
        title={toast?.title}
        message={toast?.message ?? null}
        onDismiss={() => setToast(null)}
      />
      <div className="pdv-delivery__bar">
        {step === "recap" ? (
          <button type="button" className="pdv-delivery__icon-btn" aria-label="Retour" onClick={() => setStep("mode")}>
            <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
          </button>
        ) : (
          <Link href={recupererHref} className="pdv-delivery__icon-btn" aria-label="Retour">
            <img src="/icons/pdv/arrow-narrow-left.svg" alt="" width={24} height={24} />
          </Link>
        )}
        <p className="pdv-delivery__bar-title">Me faire livrer mes lunettes</p>
        <Link href={recupererHref} className="pdv-delivery__icon-btn" aria-label="Fermer">
          <img src="/icons/pdv/x-close.svg" alt="" width={24} height={24} />
        </Link>
      </div>

      {payError ? <p className="pdv-delivery__error">{payError}</p> : null}

      {step === "mode" ? (
        <form className="pdv-delivery__stack" onSubmit={continueToRecap}>
          <h1 className="pdv-delivery__title">Mode de livraison</h1>

          <div className={`pdv-ship-card pdv-ship-card--home${mode === "home" ? " is-open" : ""}`}>
            <div className="pdv-ship-card__head" onClick={() => selectMode("home")}>
              <span className="pdv-ship-card__choice">
                <span className="pdv-ship-radio">
                  <input
                    type="radio"
                    name="mode"
                    id="mode-home"
                    checked={mode === "home"}
                    onChange={() => selectMode("home")}
                  />
                  <span className="pdv-ship-radio__mark" />
                </span>
                <label className="pdv-ship-card__label" htmlFor="mode-home">
                  {homeCarrier} à domicile
                </label>
              </span>
              <span className="pdv-ship-card__price">{formatPrice(homeCents)}</span>
            </div>
            {mode === "home" ? (
              <>
                <div className="pdv-ship-card__copy">
                  <p className="pdv-ship-card__lead">Vos lunettes directement chez vous.</p>
                  <p className="pdv-ship-card__hint">
                    Votre adresse est utilisée uniquement pour la livraison et non à des fins commerciales.
                  </p>
                </div>
                <div className="pdv-ship-card__fields">
                  <div className="pdv-ship-card__row">
                    <PdvField
                      id="last"
                      label="Nom*"
                      value={form.recipient_last_name}
                      error={fieldErrors.recipient_last_name}
                      required
                      onChange={(event) => setForm({ ...form, recipient_last_name: event.target.value })}
                    />
                    <PdvField
                      id="first"
                      label="Prénom*"
                      value={form.recipient_first_name}
                      error={fieldErrors.recipient_first_name}
                      required
                      onChange={(event) => setForm({ ...form, recipient_first_name: event.target.value })}
                    />
                  </div>
                  <PdvField
                    id="address"
                    label="N° et nom de la rue*"
                    value={form.address_line}
                    error={fieldErrors.address_line}
                    required
                    onChange={(event) => setForm({ ...form, address_line: event.target.value })}
                  />
                  <div className="pdv-ship-card__row">
                    <PdvField
                      id="postal"
                      label="Code Postal*"
                      value={form.postal_code}
                      error={fieldErrors.postal_code}
                      required
                      onChange={(event) => setForm({ ...form, postal_code: event.target.value })}
                    />
                    <PdvField
                      id="city"
                      label="Ville*"
                      value={form.city}
                      error={fieldErrors.city}
                      required
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                    />
                  </div>
                  <PdvField
                    id="complement"
                    label="Complément d’adresse"
                    placeholder="N° immeuble/bâtiment..."
                    value={form.address_complement}
                    onChange={(event) => setForm({ ...form, address_complement: event.target.value })}
                  />
                </div>
              </>
            ) : (
              <p className="pdv-ship-card__lead">Vos lunettes directement chez vous.</p>
            )}
          </div>

          <div className={`pdv-ship-card${mode === "relay" ? " is-open" : ""}`}>
            <div className="pdv-ship-card__head" onClick={() => selectMode("relay")}>
              <span className="pdv-ship-card__choice">
                <span className="pdv-ship-radio">
                  <input
                    type="radio"
                    name="mode"
                    id="mode-relay"
                    checked={mode === "relay"}
                    onChange={() => selectMode("relay")}
                  />
                  <span className="pdv-ship-radio__mark" />
                </span>
                <label className="pdv-ship-card__label" htmlFor="mode-relay">
                  En point relais
                </label>
              </span>
              <span className="pdv-ship-card__price">{formatPrice(relayCents)}</span>
            </div>
            {mode === "relay" ? (
              <>
                <p className="pdv-ship-card__lead">Un commerce proche de chez vous</p>
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
                  placeholder="17 av. Parmentier, 75011 Paris"
                />
                {relaySearchError ? <p className="pdv-delivery__error">{relaySearchError}</p> : null}
                {fieldErrors.relay_id ? <p className="pdv-field__error">{fieldErrors.relay_id}</p> : null}
                <RelayMap maps={maps} relays={quote.relays} selectedId={relayId} onSelect={setRelayId} />
                {selectedRelay ? (
                  <div className="pdv-relay-pick">
                    <p className="pdv-relay-pick__name">{selectedRelay.name}</p>
                    <div className="pdv-relay-pick__meta">
                      <p className="pdv-relay-pick__row">
                        <img src="/icons/pdv/marker-pin-01.svg" alt="" width={16} height={16} />
                        {selectedRelay.address} {selectedRelay.postal_code} {selectedRelay.city}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="pdv-ship-card__lead">Un commerce proche de chez vous</p>
            )}
          </div>

          <div className="pdv-delivery__consent">
            <PdvCheckbox
              checked={consent}
              aria-label="J’autorise l’usage de cette adresse uniquement pour l’expédition de mes lunettes, sans usage commercial."
              onChange={setConsent}
            />
            <p className="pdv-delivery__consent-label">
              J’autorise l’usage de cette adresse uniquement pour l’expédition de mes lunettes, sans usage commercial.
            </p>
          </div>
          {fieldErrors.consent_address ? <p className="pdv-field__error">{fieldErrors.consent_address}</p> : null}

          <PdvButton type="submit" variant="primary" size="l" block>
            Continuer
          </PdvButton>
        </form>
      ) : (
        <div className="pdv-delivery__stack">
          <h1 className="pdv-delivery__title">Récapitulatif de livraison</h1>
          <section className="pdv-recap-card">
            <p className="pdv-recap-card__label">Paire de lunette</p>
            <div>
              <p className="pdv-recap-card__title">{pair.title}</p>
              <div className="pdv-recap-card__rows">
                <p>Type de lunette : {pair.type}</p>
                <p>Marque : {pair.brand}</p>
                <p>Couleurs : {pair.colors.join(", ")}</p>
              </div>
            </div>
          </section>
          <section className="pdv-recap-card pdv-recap-card--mode">
            <p className="pdv-recap-card__label">Mode de livraison</p>
            <div className="pdv-recap-card__head">
              <div className="pdv-recap-card__shop">
                {mode === "relay" ? (
                  <img src="/icons/pdv/mondial-relay.svg" alt="" width={22} height={22} />
                ) : null}
                <p className="pdv-recap-card__title">
                  {mode === "relay" && selectedRelay ? selectedRelay.name : `${homeCarrier} à domicile`}
                </p>
              </div>
              <p className="pdv-recap-card__price">{formatPrice(activeCents)}</p>
            </div>
            <div className="pdv-recap-card__meta">
              <p>
                <img src="/icons/pdv/marker-pin-01.svg" alt="" width={18} height={18} />
                {destination}
              </p>
            </div>
          </section>
          <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void pay()}>
            Procéder au paiement
          </PdvButton>
        </div>
      )}
    </div>
  );
}
