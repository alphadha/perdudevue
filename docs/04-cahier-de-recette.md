# Cahier de recette — Perdues de Vue

Recette **métier + sécurité**. Chaque lot a un GO/NOGO. Jeu de données minimum en fin de document.

Statuts et règles UX : `01-regles-ux-memos-figma.md`. Tickets : `03-backlog-technique.md`.

Notation : **C** critique (bloque GO) · **M** majeur · **m** mineur.

---

## Environnements

| Env | Usage |
|---|---|
| local | Dev |
| recette | Recette client / PO |
| prod | Réel |

Emails : sink (Mailpit / Mailtrap). SMS : sandbox. Paiement Lot 7 : Stripe test.

---

## Jeu de données recette

| ID | Qui | Notes |
|---|---|---|
| ADM | Admin PDV | |
| OPT-A | Opticien A, user admin + user simple | Client C1 créé ici |
| OPT-B | Opticien B | Dépositaire (trouve la paire de C1) |
| C1 | Client rattaché à A uniquement | Email + téléphone, consentements ON |
| C2 | Client rattaché à A et B | Pour tester l’affichage du nom à la remise |
| P1 | Paire C1, code assigné `FR5487OK` | Cycle complet |
| P2 | Paire à graver | |
| DUP | Tentative doublon email de C1 | |

---

## Lot 0

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R0-01 | Health API | 200 | C |
| R0-02 | Front sans token sur route opticien | Redirect login | C |
| R0-03 | Aucune feuille de style custom hors Bootstrap | Inspection | M |

---

## Lot 1 — Auth

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R1-01 | Login OPT-A OK | Dashboard | C |
| R1-02 | Mauvais MDP | Erreur générique, pas « email inconnu » | C |
| R1-03 | Login C1 avant set password | Refus | C |
| R1-04 | Invitation C1 → set MDP + CGU | Accès espace client | C |
| R1-05 | Invitation sans CGU | Bloqué | C |
| R1-06 | Reset MDP | Code 6 chiffres, puis connexion | C |
| R1-07 | Token invitation réutilisé | Invalide | C |
| R1-08 | OPT-A appelle route admin | 403 | C |
| R1-09 | Lien public restitution (après lot 4) sans session | Page visible, **une** paire | C |
| R1-10 | Lien public tampered | 404 | C |
| R1-11 | Throttle login | Après N essais, 429 | M |

---

## Lot 2 — Clients

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R2-01 | Créer C1 | Toaster, fiche, email bienvenue | C |
| R2-02 | Consentements séparés email/SMS | Persistés | C |
| R2-03 | Doublon email → Confirmer | Rattachement, pas de 2e compte | C |
| R2-04 | Doublon → Mettre à jour | OTP selon canal, puis retour flow | C |
| R2-05 | Doublon → Annuler | Formulaire intact | M |
| R2-06 | Liste OPT-A ne contient pas clients **uniquement** B | Isolation | C |
| R2-07 | Unlink C1 chez A, C1 aussi chez B | B conserve C1 | C |
| R2-08 | Changement email | OTP mail, pas de persist avant | C |
| R2-09 | Changement tél | OTP SMS | C |
| R2-10 | Comptes magasin hors Next | Pas de menu / écran Utilisateurs Next ; `GET/POST /opticien/users` **404** | C |
| R2-11 | Invitation utilisateur magasin | **Filament** fiche opticien ; e-mail d’invitation ; autre magasin 404 service | C |

Tests auto : `backend/tests/Feature/Lot2ClientsTest.php`, `backend/tests/Feature/LotShopAccountUsersTest.php`.

---

## Lot 3 — Paires & codes

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R3-01 | Créer P2 sans code | Statut À graver, code unique `FR`+4 chiffres+2 lettres | C |
| R3-02 | Autocomplete client + marque, Autre marque | Libellé libre persisté | M |
| R3-03 | Types Vue / Soleil / Solaire de Vue | Uniquement ces 3 V1 | M |
| R3-04 | Couleurs multi-select | Persistées | m |
| R3-05 | Depuis fiche client, client prérempli non éditable | MX 7:3480 | M |
| R3-06 | Indiquer gravée | À graver → Active, irréversible | C |
| R3-07 | Associer un code déjà lié | 422, pas d’overwrite | C |
| R3-08 | Inactiver | Plus de « retrouvée » ni « perdue » | C |
| R3-09 | Archive / suppression | Code **non** réutilisable | C |
| R3-10 | Titre fiche = type + marque | MX 32:2014 | m |
| R3-11 | Historique plus récent en haut | MX 32:3752 | M |

Tests auto : `backend/tests/Feature/Lot3PairsTest.php`.

Actions Figma (lot 3) : menus ⋮ et CTAs de fiche selon le statut (Active = inactiver ; À graver = exporter le code + indiquer gravée ; Inactive / Perdue = fiche seule). Remettre / Relancer / bordereau visibles mais désactivés. Pas de « Supprimer » sur la fiche opticien (archive API conservée pour R3-09).

---

## Lot 4 — Restitution magasin (chemin critique)

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R4-01 | OPT-B saisit code assigné P1 (C1 n’est pas client B) | Dossier créé, **pas** de nom/email/tél C1 | C |
| R4-02 | Email C1 + lien public | Code restitution + opticien B | C |
| R4-03 | CTA Remettre disabled si 0 « à récupérer » | Disabled | C |
| R4-04 | Dashboard attente : max 5 | MX 41:2890 | M |
| R4-05 | Remise OPT-B, code restitution OK, C1 inconnu de B | Remise OK, **identité masquée** étape 2 | C |
| R4-06 | Remise OPT-A sur C2 (client local) | Nom prénom visibles | C |
| R4-07 | Mauvais code restitution | Erreur Figma, pas de clôture | C |
| R4-08 | P1 inactive scannée « retrouvée » | Refus | C |
| R4-09 | Après remise, P1 absente liste restitutions, Active chez client | MX 7:3490 | C |
| R4-10 | Code oublié → renvoi mail/SMS | Rate limit | M |
Tests auto : `backend/tests/Feature/Lot4RestitutionsTest.php`.

---

## Lot 5 — Client

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R5-01 | Ordre liste 6 statuts | MX 32:1912 | C |
| R5-02 | Déclarer perdue + confirm | Statut Perdue, event | C |
| R5-03 | Annuler perte | Retour Active | M |
| R5-04 | Déclarer inactive | Irréversible, plus de perte | C |
| R5-05 | Supprimer définitivement | Disparait client + opticien, visible BO tagué | C |
| R5-06 | Page À récupérer : code + Maps | Pas de PII d’autres clients | C |
| R5-07 | Client C1 ne voit pas paires C2 | Isolation | C |
| R5-08 | Préférences notif | SMS off = pas de SMS | M |
| R5-09 | 1re connexion : prompt géoloc | Navigateur, non bloquant si refus | m |

Tests auto : `backend/tests/Feature/Lot5ClientSpaceTest.php`.

Livraison à distance (« Me faire livrer ») : CTA actif si `a_recuperer` (lot 7). « Réactiver la paire » : visible et désactivé (inactive irréversible).

---

## Lot 6 — Notifications

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R6-01 | Chaque envoi a un log (canal, destinataire, type, statut) | invitation, OTP, paire retrouvée, SMS renvoi | C |
| R6-02 | Échec provider | `error` + pas d’exception 500 exposée | M |
| R6-03 | Lien email restitution = token | PDV-104, page `/r/{token}` | C |
| R6-04 | Inbox dépositaire à la confirmation « retrouvée » | titre « Lunettes en attente de retrait » ; nom seulement si déjà client du magasin | C |
| R6-05 | IDOR inbox autre magasin | liste vide / 404 | C |
| R6-06 | NO-03 perte | pas de notification magasin d’origine | C |
| R6-07 | Tout marquer comme lu / Tout supprimer | scoped magasin, onglets Toutes / Non lues / Lues | C |

---

## Lot 7 — Envoi à distance

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R7-01 | Pas de statut livraison_demandee avant paiement OK | Checkout `pending_payment` + URL Stripe ; paire `a_recuperer` jusqu’au retour Stripe OK | C |
| R7-02 | Consentement adresse obligatoire | 422 `consent_address` ; aucun shipment | C |
| R7-03 | OPT-B reçoit bordereau avec nom+adresse **uniquement** | Label + inbox sans email/tél ; OPT-A 404 | C |
| R7-04 | Multi-select : seules Livraison demandée cochables | MX 41:5612 — checkboxes autres statuts disabled ; CTA dès 2 | C |
| R7-05 | Indiquer en livraison | → `en_livraison`, mail client, event « Livraison prise en compte. » | C |
| R7-06 | Pas de date ETA affichée tant que contrat transporteur absent | MX 63:2111 — pas de champ `eta` API ni UI | M |
| R7-07 | Échec Stripe | Retour récap `?paiement=echec` : toast « Échec du paiement » / « Votre paiement n’a pas abouti. Nous vous invitons à réessayer. » ; pas d’inbox | C |
| R7-08 | Code suivi après dépôt | Visible espace client « Suivre ma livraison » ; mail dépôt ; pas d’ETA | C |

Tests auto : `backend/tests/Feature/Lot7RemoteDeliveryTest.php`.

Paiement : **redirection Stripe Checkout** (Figma 25:1894 — aucune carte dans l’app). Parcours : mode (18:1603) → récap (18:1665, CTA « Procéder au paiement ») → Stripe → succès fiche+toast 46:2645 ou échec récap+toast 25:1767. Cartes test **sur la page Stripe** : `4242…4242` OK ; `4000…0002` échec.
Exception PII post-paiement : nom + adresse étiquette seulement.

---

## Lots 8–10 — Admin Filament (hors Figma)

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| R8-01 | Journal notifications BO | `admin_pdv` voit canal / destinataire / type / statut ; opticien **403** `/admin` | C |
| R8-02 | Dashboard KPIs + consultation | Admin : `/admin` KPIs, paires **y compris archivées**, restitutions en cours only, clients ; opticien 403 | C |
| R8-04 | Blocage compte | Opticien bloqué : login 401 générique | C |
| R9-01 | Lot de codes | N codes `FR####AA` uniques, export CSV, jamais recyclés | C |
| R9-02 | Association magasin | Code de lot saisi « déjà gravé » → item `assigned` ; réutilisation 422 ; lot `consumed` si plus aucun dispo | C |
| R9-03 | Consultation BO | `admin_pdv` voit les codes du lot ; opticien **403** | C |
| R10-01 | Tarif réseau + rattachement opticien | CRUD Filament ; opticien sans SIRET/réseau listé au contrôle ; **SIRET doublon** | C |
| R10-02 | Qonto | Sans clé : sync **refusée**, log `skipped` ; avec clé : `queued` **sans** appel HTTP | C |
| R10-03 | Accès BO factu | `admin_pdv` : `/admin/billing-review` et `/admin/qonto-sync` ; opticien **403** | C |
| R10-04 | Préparation mois | Paires du mois + montant **indicatif** si un tarif à la paire ; pas de sync Qonto | M |

Tests auto : `backend/tests/Feature/Lot8AdminBillingCodesTest.php`, `backend/tests/Feature/Lot9CodeLotsTest.php`, `backend/tests/Feature/Lot10BillingTest.php`.

---

## Sécurité transverse (tous lots)

| ID | Cas | Attendu | Sev |
|---|---|---|---|
| S-01 | IDOR : C1 GET paire de C2 | 404 | C |
| S-02 | IDOR : OPT-A GET client seul chez B | 404 | C |
| S-03 | Mass assignment rôle | Rôle inchangé | C |
| S-04 | XSS dans libellé paire | Échappé | C |
| S-05 | SQL injection recherche | Ignorée / paramétrée | C |
| S-06 | Audit présent sur remise et accès fiche | PDV-002 | C |
| S-07 | Mots de passe hashés (bcrypt/argon) | | C |
| S-08 | CORS : seul le front recette | | C |

---

## GO / NOGO par lot

**GO** si : 0 ouvert **C**, et plan d’action daté sur les **M**.  
**NOGO** si : 1 seul **C** ouvert (PII, code réutilisé, IDOR, remise sans code).

Promo d’un lot en recette client = checklist DoD du `02-lotissement.md` + cette feuille au statut GO.
