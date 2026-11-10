export type ToastVariant = "success" | "error";

export type ToastState = {
  title?: string;
  message: string;
  variant?: ToastVariant;
};

export const TOAST_DURATION_MS = 4000;

export const DISCARD_TOAST: ToastState = {
  title: "Modifications non enregistrées",
  message: "Les modifications effectuées n’ont pas été prises en compte.",
  variant: "error",
};

export const CODE_RESENT_TOAST: ToastState = {
  title: "Code renvoyé au client",
  message: "Le code de restitution a bien été renvoyé.",
  variant: "success",
};

export const RESEND_LIMIT_TOAST: ToastState = {
  title: "Limite de renvoi atteinte",
  message: "Le code de restitution a déjà été renvoyé plusieurs fois à ce client.",
  variant: "error",
};

export const TEAM_INVITED_TOAST: ToastState = {
  title: "Invitation envoyée",
  message: "Le collaborateur a reçu un email pour activer son accès.",
  variant: "success",
};

export const TEAM_REMOVED_TOAST: ToastState = {
  title: "Collaborateur retiré",
  message: "Il n’a plus accès à l’espace de votre magasin.",
  variant: "success",
};

export const EMAIL_UPDATED_TOAST: ToastState = {
  title: "Adresse e-mail mise à jour",
  message: "Votre nouvelle adresse est maintenant utilisée pour vous connecter.",
  variant: "success",
};

export const CLIENT_UPDATED_TOAST: ToastState = {
  title: "Modifications enregistrée",
  message: "La fiche client a bien été mise à jour. Il a été ajouté à votre espace.",
  variant: "success",
};

export function clientCreatedToast(client: { first_name: string; last_name: string }): ToastState {
  return {
    title: "Client enregistré",
    message: `${client.last_name} ${client.first_name} a bien été ajouté à votre liste de clients.`,
    variant: "success",
  };
}

const BY_MESSAGE: Record<string, ToastState> = {
  "Modifications non prises en compte": DISCARD_TOAST,
  [DISCARD_TOAST.message]: DISCARD_TOAST,
  [CODE_RESENT_TOAST.message]: CODE_RESENT_TOAST,
  "Le code de restitution a été renvoyé au client.": CODE_RESENT_TOAST,
  "La fiche client a bien été mise à jour.": CLIENT_UPDATED_TOAST,
};

const BY_TITLE: Record<string, ToastState> = {
  [DISCARD_TOAST.title ?? ""]: DISCARD_TOAST,
  [CODE_RESENT_TOAST.title ?? ""]: CODE_RESENT_TOAST,
  [RESEND_LIMIT_TOAST.title ?? ""]: RESEND_LIMIT_TOAST,
  [CLIENT_UPDATED_TOAST.title ?? ""]: CLIENT_UPDATED_TOAST,
};

const ERROR_HINT = /impossible|limite|erreur|échec|echec|non enregistr|non prises|atteint/i;

export function normalizeToast(input: {
  title?: string;
  message?: string | null;
  variant?: ToastVariant;
}): { title: string; message: string; variant: ToastVariant } | null {
  const rawMessage = input.message?.trim() ?? "";
  const rawTitle = input.title?.trim() ?? "";
  if (!rawMessage && !rawTitle) {
    return null;
  }

  const known = BY_MESSAGE[rawMessage] ?? BY_TITLE[rawTitle];
  if (known) {
    return {
      title: known.title ?? rawTitle,
      message: known.message,
      variant: input.variant ?? known.variant ?? "success",
    };
  }

  const variant =
    input.variant ?? (ERROR_HINT.test(`${rawTitle} ${rawMessage}`) ? "error" : "success");

  if (rawTitle && rawMessage) {
    return { title: rawTitle, message: rawMessage, variant };
  }

  return { title: rawTitle || rawMessage, message: "", variant };
}
