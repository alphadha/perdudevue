# Recette graphique — Prod UI Figma (0 erreur tolérée)

**Source** : [Perdues de vue — Prod UI](https://www.figma.com/design/694o0OsHLXVGdaih9cvSXJ/Perdues-de-vue----Prod-UI?node-id=145-12387) · page **Production UI** (`145:12387`)  
**Réf. UX** : `01-regles-ux-memos-figma.md` (prime sur Excel)  
**Front** : `frontend/` (Next.js + Bootstrap 5 + tokens `pdv-*`)  
**Hors périmètre** : Filament `/admin` (pas dans Figma)

Notation : **KO** = écart vs BAT / mémo · **OK** = conforme · **Partiel** = structure OK, polish restant.

---

## Synthèse GO / NOGO

| Zone | Statut | KO bloquants |
|---|---|---|
| Opticien — Nav / shell | OK | — |
| Opticien — Tableau de bord | **Partiel → correctifs appliqués** | ~~Bouton fantôme~~ · ~~KPI libellé~~ · ~~« Client masqué »~~ |
| Opticien — Clients / Lunettes / Restitution | Partiel | Vérifier copy filtres, pagination visuelle, empty states |
| Opticien — Modals paire / restitution | Partiel | Placeholders marque / typo « est-t-elle » Figma vs code |
| Client — Liste Mes lunettes | **Partiel → correctifs appliqués** | ~~badge Bootstrap vert~~ → tags `pdv-*` |
| Client — Connexion mobile | Partiel | Toggle Figma switch vs btn-group · BrandPanel desktop opticien hors pattern mobile |
| Mémos UX métier | Partiel | Ordre liste client API · PII dépositaire (corrigé waiting cards) |

**Verdict livraison graphique** : **NOGO** tant que les KO restants ci-dessous ne sont pas tous **OK** (règle 0 erreur).

---

## Inventaire écrans Figma (Production UI) à recetter

### A. Espace Opticien (desktop 1440)

| ID Figma | Écran | Route app | Recette |
|---|---|---|---|
| `155:40693` | Tableau de bord | `/opticien` | RG-O-01 |
| `155:45961` | Dashboard empty | `/opticien` | RG-O-02 |
| `155:44821` | Mes clients | `/opticien/clients` | RG-O-03 |
| `172:55073` | Clients empty | `/opticien/clients` | RG-O-04 |
| `155:43113` / `155:43869` | Lunettes | `/opticien/lunettes` | RG-O-05 |
| `155:45640` | Restitution | `/opticien/restitution` | RG-O-06 |
| `155:48403` | Fiche client | `/opticien/clients/[uuid]` | RG-O-07 |
| `155:49431` | Fiche paire À graver | `/opticien/lunettes/[uuid]` | RG-O-08 |
| `155:51286` … `155:50461` | Fiches par statut | idem | RG-O-09 |
| `155:52674` | Notifications | `/opticien/notifications` | RG-O-10 |
| `155:46660` | Paramètres | `/opticien/parametres` | RG-O-11 |
| `145:20643` | Connexion opticien | `/login?space=opticien` | RG-O-12 |
| Modals `172:*` / `145:*` | Nouveau client, paire, remise, gravée, inactive… | modals | RG-O-M* |

### B. Espace Client (mobile 375)

| ID Figma | Écran | Route app | Recette |
|---|---|---|---|
| `145:14907` / `208:7622` | Mes lunettes (6 statuts) | `/client` | RG-C-01 |
| `145:14999` | Connexion client | `/login?space=client` | RG-C-02 |
| `208:7761` | Activation compte | `/invitation/[token]` | RG-C-03 |
| `145:15044`… | Fiches lunettes par statut | `/client/lunettes/[uuid]` | RG-C-04 |
| `174:7940` / `174:8274` / `174:8811` | Livraison | `/client/lunettes/.../livraison` | RG-C-05 |
| `174:9724`… | Paramètres | `/client/parametres/*` | RG-C-06 |
| `145:16086`… | MDP oublié | `/mot-de-passe-oublie/*` | RG-C-07 |
| Page publique | Lunettes retrouvées | `/r/[token]` | RG-C-08 |

---

## Cas de recette graphique (checklist testeur)

### RG-O-01 — Tableau de bord

| # | Contrôle (Figma + mémo) | Attendu | Statut |
|---|---|---|---|
| 1 | Nav : 6 liens + logo + Se déconnecter | Ordre Figma, état `is-active` sur Tableau de bord | OK |
| 2 | Carte bienvenue « Bienvenue sur votre espace » + sync + Rafraîchir | Copy + CTA Signaler… primaire navy | OK |
| 3 | 4 KPI : ajoutées / retrouvées / Codes disponibles / Clients | Libellés **exactement** Figma | **Corrigé** (était « Lunettes enregistrées ») |
| 4 | Barre actions : **3** boutons seulement | Créer client · Enregistrer paire · Remettre… | **Corrigé** (supprimé « Bouton supplémentaire ») |
| 5 | Remettre disabled si 0 `a_recuperer` | Mémo §8 | OK (`can_hand_over`) |
| 6 | Waiting : max **5** paires, 2 colonnes | Mémo §8 + API `waitingPickup(5)` | OK API |
| 7 | Nom client **uniquement** si déjà client magasin | Sinon **omettre** le nom (pas « Client masqué ») | **Corrigé** |
| 8 | Tags statut `pdv-tag--*` | Couleurs tokens Figma | OK |
| 9 | Lien « Gérer les retraits » | → restitution | OK |

### RG-O-03 / 05 / 06 — Tables Clients / Lunettes / Restitution

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| 1 | Titre page + sync + Rafraîchir | Comme Figma | OK |
| 2 | CTA primaire droite (+ Créer / + Enregistrer / Signaler+Remettre) | Icônes + variants | À pixel-check |
| 3 | Search + filtres type/statut | Placeholders Figma | À pixel-check |
| 4 | Colonnes + sort headers | Cohérent BAT | À pixel-check |
| 5 | Pills statut 7 états | Tokens CSS | OK tokens |
| 6 | Pagination | Visuel Figma | À pixel-check |
| 7 | Multi-select lunettes : seules Livraison demandée cochables | Mémo §10 | À vérifier runtime |

### RG-O-08 — Fiche paire À graver

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| 1 | Titre = type + marque | Mémo §3 | OK règle |
| 2 | Tag À graver | Token bleu | OK |
| 3 | CTA Télécharger le code assigné | Visible À graver | À vérifier |
| 4 | Historique plus récent en haut | Mémo §3 | À vérifier API order |

### RG-O-M — Modal Enregistrer une paire (`172:53924`)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| 1 | Titre « Enregistrer une paire de lunettes » | Exact | OK |
| 2 | Client autocomplete obligatoire | Mémo §6 | OK |
| 3 | Types Vue / Soleil / Solaire de Vue | Mémo §6 | OK catalogue |
| 4 | Marque + Couleurs même ligne | Figma | OK row |
| 5 | Oui/Non déjà gravée | Copy info Non | À coller copy Figma |
| 6 | CTA disabled tant que invalide | Figma | OK `canSubmit` |

### RG-C-01 — Mes lunettes (mémo ordre + tags)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| 1 | Ordre : à récupérer → en livraison → livraison demandée → perdue → active → inactive | Mémo §2 | Vérifier API sort |
| 2 | Card blanche, titre, code assigné | Figma | **Corrigé** (plus de `card` Bootstrap nu) |
| 3 | Badge restitution **orange** `À récupérer` + code bold | Pas `badge text-bg-success` | **Corrigé** |
| 4 | Lien « Voir la fiche » + chevron | Figma | **Corrigé** |
| 5 | Header logo + settings | Figma gear | Partiel (bouton « Paramètres ») |

### RG-C-02 — Connexion client

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| 1 | Header vert + logo | Pattern BrandPanel mobile | Partiel (header client vs panel) |
| 2 | Titre « Bienvenue chez Perdues de Vue ! » | Exact Figma | **KO** si copy différente (« Content de vous revoir ») |
| 3 | Toggle Opticien / Client | Figma switch | Partiel (`btn-group`) |
| 4 | Eye show password | Figma | **Corrigé** (toggle Afficher/Masquer) |
| 5 | Box aide inscription opticien | Copy Figma mémo §3 | OK sens |

---

## Mémos UX — contrôles transverses (bloquants)

| ID | Règle | Preuve attendue | Statut |
|---|---|---|---|
| MX-01 | 2 codes distincts (assigné FR####AA ≠ restitution) | UI labels séparés | OK |
| MX-02 | Remettre disabled sans attente | Dashboard + restitution | OK |
| MX-03 | PII dépositaire | Pas de nom si non-client | **Corrigé** waiting |
| MX-04 | Pas d’inscription publique client | Login help | OK |
| MX-05 | Toaster abandon pop-in | « Modifications non prises en compte » | OK code |
| MX-06 | Pas d’ETA tant que contrat transporteur | Pas de date ETA UI | OK cadrage |
| MX-07 | Multi-bordereaux uniquement livraison_demandee | Checkboxes disabled autres | À recetter |

---

## Correctifs déjà poussés dans le code (cette passe)

1. Suppression du **« Bouton supplémentaire »** (hors Figma).
2. KPI **« Lunettes ajoutées »** (aligné Figma).
3. Waiting cards : **plus de « Client masqué »** — nom omis si non-client.
4. Liste client : cards `pdv-client-pair-card` + tag restitution `pdv-tag--a_recuperer`.
5. Login : toggle **afficher/masquer** mot de passe.

---

## KO restants (à traiter pour GO 0 erreur)

| Priorité | Écart | Écran | Action |
|---|---|---|---|
| P0 | ~~Copy login client~~ | Login | **Corrigé** — titre client Figma / opticien « Content de vous revoir » |
| P0 | BrandPanel opticien desktop = texte placeholder, pas le BAT visuel Figma | Login opticien | Refaire panneau gauche selon Prod UI |
| P1 | Toggle espaces = btn-group ≠ switch Figma | Login | Composant switch `pdv-*` |
| P1 | Paramètres client = libellé bouton vs icône seule Figma | Layout client | Icône gear seule |
| P1 | Icône œil MDP : texte Afficher/Masquer vs icône Figma | Login | SVG eye Prod UI |
| P1 | Empty states Clients / Dashboard | Empty frames | Implémenter frames empty Figma |
| P2 | Pixel spacing tables / pagination | Tables | Passer BAT validé page `155:35482` |

---

## Protocole testeur (0 erreur)

1. Ouvrir Figma **Production UI** + app `npm run dev` seedée.
2. Pour **chaque** ligne inventaire : capture app ↔ capture Figma côte à côte.
3. Cocher la checklist RG-* ; tout **KO** = **NOGO** lot UI.
4. Mémos : exécuter MX-01…07 après les écrans.
5. GO graphique **uniquement** si 0 KO P0/P1 ouverts.

Session Figma audit : `22fe249b-8bbe-4b41-a8ba-6d7b372a6bba` · file `694o0OsHLXVGdaih9cvSXJ`.
