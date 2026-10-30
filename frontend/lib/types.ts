export type Space = "client" | "opticien" | "admin";

export type ApiError = {
  field?: string;
  message: string;
  code?: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: Record<string, unknown> | object;
  errors: ApiError[];
};

export type AuthUser = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin_pdv" | "opticien_admin" | "opticien_user" | "client";
  home: string;
  cgu_accepted_at: string | null;
  optician: { uuid: string; name: string } | null;
};

export type ShopClient = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  pairs_count: number;
  pairs_lost_count: number;
  account_pending: boolean;
};

export type ClientPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  consent_email: boolean;
  consent_sms: boolean;
};

export type IdentityChallenge = {
  otp_required: true;
  action_token: string;
  otp_channel: "email" | "sms";
};

export type DuplicatePayload = {
  duplicate: true;
  already_linked: boolean;
  action_token: string;
  client: ShopClient;
};

export function isIdentityChallenge(value: unknown): value is IdentityChallenge {
  return (
    typeof value === "object" &&
    value !== null &&
    "otp_required" in value &&
    (value as IdentityChallenge).otp_required === true
  );
}

export function isDuplicatePayload(value: unknown): value is DuplicatePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "duplicate" in value &&
    (value as DuplicatePayload).duplicate === true
  );
}

export type PairStatus =
  | "a_graver"
  | "active"
  | "perdue"
  | "inactive"
  | "a_recuperer"
  | "livraison_demandee"
  | "en_livraison"
  | "archivee";

export type PairEvent = {
  type: string;
  label: string;
  at: string | null;
};

export type ShopPair = {
  uuid: string;
  title: string;
  type: string;
  brand: string;
  colors: string[];
  description: string | null;
  assigned_code: string;
  status: PairStatus;
  status_label: string;
  registered_at: string | null;
  client: {
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  actions: {
    can_engrave: boolean;
    can_export_code: boolean;
    can_inactivate: boolean;
    can_archive: boolean;
    can_hand_over: boolean;
    can_resend_pickup: boolean;
    can_download_label: boolean;
    can_mark_shipped: boolean;
    can_select_for_labels: boolean;
  };
  events?: PairEvent[];
};

export type ShopRestitution = {
  uuid: string;
  reference: string | null;
  title: string;
  type: string;
  type_label: string;
  brand: string;
  colors: string[];
  assigned_code: string;
  status: PairStatus;
  status_label: string;
  found_at: string | null;
  client: {
    uuid: string;
    first_name: string;
    last_name: string;
  } | null;
  actions: {
    can_hand_over: boolean;
    can_resend: boolean;
    can_download_label: boolean;
    can_mark_shipped: boolean;
    can_select_for_labels: boolean;
  };
  shipment?: {
    uuid: string;
    status: string;
    mode: string;
    carrier: string | null;
    label?: {
      recipient_name: string;
      address_line: string;
      postal_code: string;
      city: string;
      relay_name: string | null;
      carrier: string | null;
      label_ref: string | null;
    };
  } | null;
};

export type FoundPairPreview = {
  uuid: string;
  type: string;
  type_label: string;
  brand: string;
  colors: string[];
  assigned_code: string;
};

export type OpticienDashboard = {
  pairs_count: number;
  found_count: number;
  to_engrave_count: number;
  clients_count: number;
  can_hand_over: boolean;
  waiting_pickup: ShopRestitution[];
};

export type PairCatalog = {
  types: string[];
  brands: string[];
  colors: string[];
};

export const PAIR_STATUS_BADGE: Record<PairStatus, string> = {
  a_graver: "text-bg-warning",
  active: "text-bg-success",
  perdue: "text-bg-danger",
  inactive: "text-bg-secondary",
  a_recuperer: "text-bg-info",
  livraison_demandee: "text-bg-primary",
  en_livraison: "text-bg-info",
  archivee: "text-bg-dark",
};

export function formatFrDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleDateString("fr-FR");
}

export type ClientShop = {
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  maps_url: string;
  waze_url: string;
};

export type ClientPair = {
  uuid: string;
  title: string;
  type: string;
  brand: string;
  colors: string[];
  description: string | null;
  assigned_code: string;
  status: PairStatus;
  status_label: string;
  registered_at: string | null;
  pickup_code: string | null;
  pickup_help: string | null;
  origin_shop: ClientShop | null;
  depositary_shop: ClientShop | null;
  actions: {
    can_declare_lost: boolean;
    can_cancel_lost: boolean;
    can_inactivate: boolean;
    can_archive: boolean;
    can_recover: boolean;
    can_request_delivery: boolean;
    can_track_delivery: boolean;
    can_resend_pickup: boolean;
  };
  shipment?: {
    uuid: string;
    status: string;
    mode: string;
    carrier: string | null;
    destination: string;
    label_ref: string | null;
    tracking_ref?: string | null;
  } | null;
  events?: PairEvent[];
};

export type ClientProfile = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
};

export type ShopInboxNotification = {
  uuid: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string | null;
  actions: {
    can_open_dossier: boolean;
    can_mark_read: boolean;
  };
};

export type MapsConfig = {
  provider: "google" | "maplibre";
  google_maps_key: string | null;
  maplibre_style_url: string | null;
};

export type ShippingRelay = {
  id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  lat: number | null;
  lng: number | null;
};

export type ShippingQuote = {
  price_cents: number;
  currency: string;
  carrier: string;
  carriers?: {
    home: string;
    relay: string;
  };
  eta_label?: string;
  query?: string | null;
  postal_code?: string | null;
  relays: ShippingRelay[];
  maps: MapsConfig;
};

export type ShippingLabelFile = {
  uuid: string;
  filename: string;
  content: string;
  encoding?: "plain" | "base64";
  mime?: string;
};

export type PublicRestitution = {
  title: string;
  pair: {
    type: string | null;
    brand: string | null;
    colors: string[];
    assigned_code: string;
    registered_at: string | null;
  };
  pickup_code: string | null;
  pickup_help: string;
  optician: {
    name: string;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    phone: string | null;
    maps_url: string;
    waze_url: string;
  } | null;
};
