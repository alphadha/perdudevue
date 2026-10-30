---
name: pdv-domain
description: >-
  Domaine métier Perdues de Vue : statuts de paires, deux codes (assigné vs restitution),
  isolation PII, doublons client, gravure, restitution magasin. À utiliser dès qu’on
  implémente une story, un modèle, une API, un écran ou un test de recette.
---

# Domaine Perdues de Vue

Lire avant de coder : `docs/01-regles-ux-memos-figma.md`, `docs/00-cadrage-et-decisions.md`, ticket dans `docs/03-backlog-technique.md`.

## Statuts paire

`a_graver` | `active` | `perdue` | `inactive` | `a_recuperer` | `livraison_demandee` | `en_livraison` | `archivee`

Ordre liste **client** : à récupérer → en livraison → livraison demandée → perdue → active → inactive.

Après remise magasin ou livraison finalisée : la paire revient **`active`**. Le dossier restitution sort de la liste « en cours ».

## Codes

- `assigned_code` : format **`FR` + 4 chiffres + 2 lettres** (ex. `FR5487OK`), créé avec la paire, **immuable**, **jamais recyclé**.
- `pickup_code` : créé au signalement « retrouvée », présenté pour la remise.

Ne jamais « libérer » un code (Excel LU-07 rejeté).

## Isolation

- Toute requête opticien est scopée `optician_id`.
- Dépositaire ≠ opticien d’origine : **aucune** identité client (nom, email, tél) dans l’API ni l’UI.
- Exception : le propriétaire est déjà client de **cet** opticien.
- Exception envoi à distance **post-paiement + consentement** : nom + adresse étiquette seulement.

## Clients

- Pas d’inscription publique V1. L’opticien crée, le client pose le MDP via invitation.
- Unicité email globale. Doublon : Confirmer (rattacher) / Mettre à jour (OTP) / Annuler.
- OTP email si email change ; OTP SMS si téléphone change.

## Transitions interdites (exemples)

- `inactive` ou `archivee` → retrouvée / perdue
- `a_graver` → `active` uniquement via « indiquer gravée »
- overwrite d’un `assigned_code`

## UI V1

Bootstrap 5 uniquement, pas de CSS custom. Recoller l’IA Figma (modals, tables, badges), pas le pixel.
