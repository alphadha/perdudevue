/** Jeu de données aligné sur `DatabaseSeeder` (Password1). */
export const PASSWORD = "Password1";

export const users = {
  adm: {
    email: "admin@perduesdevue.fr",
    password: PASSWORD,
    role: "admin_pdv" as const,
  },
  optA: {
    email: "opticien.a@example.com",
    password: PASSWORD,
    space: "opticien" as const,
    home: "/opticien",
  },
  optAUser: {
    email: "opticien.a.user@example.com",
    password: PASSWORD,
    space: "opticien" as const,
    home: "/opticien",
  },
  optB: {
    email: "opticien.b@example.com",
    password: PASSWORD,
    space: "opticien" as const,
    home: "/opticien",
  },
  /** Compte invitation pending — activer via token avant login. */
  c1: {
    email: "client.c1@example.com",
    password: PASSWORD,
    space: "client" as const,
    home: "/client",
    invitationToken: "recette-invitation-c1",
  },
  c2: {
    email: "client.c2@example.com",
    password: PASSWORD,
    space: "client" as const,
    home: "/client",
  },
} as const;

export const seed = {
  publicRestitutionToken: "recette-public-p1",
  pairP1AssignedCode: "FR5487OK",
  pairP1PickupCode: "KSKKYK",
  pairAtAPickupCode: "ABCDEF",
  pairAtAAssignedCode: "FR5488OK",
} as const;

export const API_URL = process.env.PDV_API_URL ?? "http://localhost:8000/api/v1";
export const BACKEND_URL = process.env.PDV_BACKEND_URL ?? "http://localhost:8000";
