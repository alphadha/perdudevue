# Cadrage et décisions — Perdues de Vue

Rôle : architecte + PO. Ce document tranche les écarts entre Excel, CDC et Figma (mémos UX).

## Stack figée

| Couche | Choix | Notes |
|---|---|---|
| Front métier | Next.js (App Router) + TypeScript | **Uniquement les écrans Figma** : Client, Opticien, auth, page publique |
| UI Figma V1 | **Bootstrap 5 uniquement** | Pas de CSS custom. Layout `container` / `row` / `col`, `navbar`, `table`, `modal`, `form`, `card`, `badge`, `toast`, `offcanvas`. |
| Back-office admin | **Filament (Laravel)** | Pas de maquette Figma. Rôle `admin_pdv` seulement. |
| Back API | Laravel REST `/api/v1` | Auth Sanctum, policies, Form Requests, Resources |
| BDD | **MySQL (XAMPP local)** | Base `perdues_de_vue`, user `root`. PostgreSQL possible plus tard. UUID exposé. |
| Email / SMS | Provider à confirmer | Transactionnel : bienvenue, codes, restitution, vérif identité |
| Paiement envoi | Stripe (wireframe Figma) | Lot dédié, pas le cœur magasin |
| Facturation opticien | Qonto (CDC) | **Lot 10 Filament** (modèle + contrôle). **Sync Qonto bloquée** sans clés. |

Découpage repo cible :

```
frontend/     Next.js
backend/      Laravel
docs/         cadrage
.cursor/      skills + rules
```

## Acteurs

| Rôle | Accès | Création du compte |
|---|---|---|
| `admin_pdv` | Filament `/admin` | Seed / super-admin |
| `opticien_admin` | Espace opticien + users de l’établissement | Créé par admin PDV (Excel OP-05). Pas d’inscription publique. |
| `opticien_user` | Métier opticien, **sans** gestion des users | Créé par `opticien_admin` (CDC, absent Excel) |
| `client` | Espace client + page publique tokenisée | Créé **par un opticien**. Le client pose le mot de passe via email. |

## Décisions PO (Excel vs Figma vs CDC)

| Sujet | Excel | Figma / mémos | CDC | **Décision V1** |
|---|---|---|---|---|
| Inscription client autonome (EC-04) | Oui | Non (« rapprochez-vous de votre opticien ») | Compte client existant | **Out V1.** L’opticien crée le client. |
| Magic link (AU-04) | Lien magique sans compte | Email d’accès + **set password** | Auth client + jeton public | **Invitation + mot de passe** + **lien public restitution** (AU-05). |
| Libérer un code (LU-07) | Oui, suppression libère le code | Jamais | Association immuable | **Jamais réutilisé.** LU-07 réécrit. |
| Statuts paire | Enregistrée / Restituée | 6+ (dont À graver, livraison) | Cycle CDC plus riche | **Modèle Figma** (voir `01-regles-ux-memos-figma.md`). |
| Types de lunettes | Non précisé | Vue / Soleil / Solaire de Vue | vue, soleil, sport, autre | **Figma V1.** Sport/autre = plus tard ou via « autre » marque seulement. |
| Parc de codes par opticien (LU-03/05) | Stock attribué | Code généré à l’enregistrement, statut À graver | Lots globaux graveur, facturés à l’association | **V1 = génération à la création** (+ saisie d’un code déjà gravé). Lots / parcs admin = Lot Admin. |
| Notif opticien « paire perdue » (NO-03) | Oui | Absent | Non listé dans les cas d’usage principaux | **Out V1.** La découverte se fait par scan du code assigné, chez n’importe quel partenaire. |
| Envoi à distance | Absent Excel | Parcours complet (Stripe redirect, domicile/relais, bordereau, dépôt) | CDC §8.7 / §7 postal | **Lot 7 en app** (Stripe Checkout). Carte relais + PDF transporteur = **bloqué** clés Google/Colissimo/MR. |
| Facturation Qonto / réseaux / tarifs | Absent | Absent | Cœur économique CDC | **Lot 10 socle Filament** (réseaux, tarifs, params opticien, contrôle, page Qonto). Sync API Qonto + barème = **arbitrage / clés client**. |
| SMS | Peu présent | Vérif identité + renvoi code restitution | Canal CDC | **Oui V1** pour vérif identité et renvoi code. |
| Carte intégrée | Page publique + carte | Mémo géoloc + Maps/Waze | GEO-01..08 | **V1 :** nom, adresse, lien Maps/Waze, carte simple. Itinéraire voiture interne = Lot 7/GEO. |
| MFA admin | Non | Non | Exigence CDC | **Lot sécurité avancée.** |
| Scan caméra / douchette | « Scanner » | Saisie + intention scan | CODE-07..11 | **V1 : saisie manuelle** + champ prêt scannelette (entrée clavier). Caméra = lot suivant. |
| Format du code assigné (LU) | Non précisé / parc de codes | Placeholder Figma historique `SJE83738` | Association immuable | **`FR` + 4 chiffres + 2 lettres** (ex. `FR5487OK`). Généré à la création ; saisie d’un code déjà gravé au même format. Jamais réutilisé. |
| Écrans Admin | Stories BO-* | **Aucun wireframe** | Complet | **Filament** (hors Next.js / hors Figma). |

## Modèle de données minimal (V1)

- `networks` (préparé, CRUD admin possible plus tard)
- `opticians` (établissement, isolation tenant)
- `users` (rôles) + `optician_user`
- `clients` (personne globale unique par email ; rattachement N opticiens via `optician_client`)
- `pairs` + `pair_events` (historique)
- `codes` (assignés, unique, jamais recyclés)
- `restitutions` + `pickup_codes`
- `notifications` (log canal / destinataire / statut / erreur)
- `audit_logs` (accès PII et actions sensibles)

## Confidentialité (non négociable)

L’opticien **dépositaire** (celui qui a trouvé la paire) **ne voit pas** nom / email / téléphone du propriétaire, **sauf** si ce propriétaire est déjà **son** client (mémo étape 2/3 + CDC §7.8).

Exception envoi à distance : nom + adresse postale après **consentement** et **paiement**, strictement pour l’étiquette.

## Arbitrages à demander au client (ouverts)

Sans réponse, on **ne branche pas** Qonto / relais réels / tarifs de prod.

1. **Réseaux** — liste des réseaux V1 (indépendants, enseigne…) et **unité de tarif** (à la paire, forfait mensuel, gravure séparée).
2. **Qui est facturé** — l’opticien, le réseau, ou PDV refacture ? IBAN / SIRET obligatoires dès la création magasin ?
3. **Qonto** — compte, clé API, IBAN, fréquence de sync, que faire en cas d’écart (alerte BO vs blocage).
4. **Transporteurs** — Colissimo + Mondial Relay (Figma) ou agrégateur ; **prix client** (Figma 2,99 €) vs achat réel ; compte unique PDV.
5. **Google Maps** — projet Cloud + clé (carte magasin + carte relais) ou OSM gratuit (écart Figma).
6. **Lots graveur** — les codes d’un lot CSV sont-ils les **seuls** autorisés en magasin, ou la génération à l’enregistrement reste possible ?
7. **SMS** — provider (OVH / Twilio / …) ; alerte découverte = e-mail seul (Figma) ou aussi SMS ?

## Qualité de code attendue

Clean, stable, clair, sécurisé : conventions dans `.cursor/rules` et skills `.cursor/skills`. Toute story V1 doit avoir : validation API, policy, test de recette, pas de fuite PII, pas de CSS custom.
