---
name: pdv-nextjs-bootstrap
description: >-
  Front Next.js Perdues de Vue : écrans Figma (client, opticien, auth, page
  publique), Bootstrap 5 + tokens Prod UI. Le back-office admin n’est pas dans
  Figma : il est Filament (Laravel), pas Next.js.
---

# Next.js + Bootstrap + Prod UI — Perdues de Vue

## Principes

- App Router, TypeScript.
- **Prod UI BAT validé** = référence visuelle (fichier Figma Prod UI). Fidélité 100 % sur les écrans livrés dans le BAT.
- Bootstrap 5 pour structure / modals JS / forms de base.
- Tokens et composants look : [`frontend/styles/pdv.css`](frontend/styles/pdv.css) + [`frontend/components/pdv/`](frontend/components/pdv/) (`PdvButton`, tags, search, nav). Poppins + couleurs Figma.
- Pas de Tailwind. Pas de CSS ad hoc hors tokens `pdv-*` / écrans non encore dans le BAT.
- Textes FR = copy Figma.

## Espaces

| Prefix | Audience |
|---|---|
| `/login` | public + toggle opticien/client (Figma) |
| `/client` | mobile-first — Figma |
| `/opticien` | desktop, **nav top** Prod UI — Figma |
| `/r/[token]` | page publique restitution — Figma |

Pas d’espace `/admin` dans Next.js. BO plateforme = Filament sur l’API Laravel (`/admin`).

## Composants

- Modals Figma = `bootstrap.Modal`, pas de lib tierce.
- Badges statut : `pdv-tag pdv-tag--{status}` (pills Figma).
- CTA : `PdvButton` (primaire / secondaire / tertiaire).
- CTA « Remettre des lunettes » : `disabled` si aucune paire `a_recuperer`.
- Autocomplete client/marque : `datalist` ou dropdown Bootstrap, sélection obligatoire en liste (sauf Autre marque).
- Toasts pour succès / abandon de pop-in (« Modifications non prises en compte »).
- Icônes : `/public/icons/pdv/*`, logo `/public/brand/logo.svg`.

## Data

- Client API typé. Pas d’`any`. Afficher les `errors` 422 par champ (`invalid-feedback`).
- Ne **jamais** afficher nom/email/tél si l’API ne les envoie pas (dépositaire). Pas de fallback « — » qui impliquerait une donnée manquante vs masquée : simplement omettre le bloc identité.

## Interdit

- Dupliquer 7 pages « fiche paire » : une page, branches par `status`.
- Stocker le token public restitution dans `localStorage` global.
- Inventer un look hors Figma Prod UI / BAT.
- Recréer le back-office admin dans Next.js : le BO est Filament.
