# Cahier de recette — Perdues de Vue V1

Version **Markdown** (lisible dans Cursor / GitHub).

- Excel : [`Cahier_de_recette_Perdues_de_Vue.xlsx`](./Cahier_de_recette_Perdues_de_Vue.xlsx)
- CSV (Tests) : [`Cahier_de_recette_Tests.csv`](./Cahier_de_recette_Tests.csv)
- Index compact : [`04-cahier-de-recette.md`](./04-cahier-de-recette.md)

## Mode d'emploi

### Cahier de recette — Perdues de Vue V1

### Principe de test

- **Parcours continus** — Chaque parcours se joue dans l’ordre N°1 → N°2 → N°3… Ne pas sauter d’étape : chaque action part de l’écran atteint à l’étape précédente.
- **Rôles l’un après l’autre** — Ordre recommandé : Fondations → Auth opticien → Invitation client → Clients → Paires → Restitution (critique) → Espace client → Notifications → Envoi à distance → Admin → Lots codes → Facturation → Sécurité → E2E magasin.
- **Respect de l’app** — Suivre les routes / écrans réels (opticien Next, client Next, Filament /admin, page publique /r/{token}). Utiliser la navigation de l’app, pas des deep-links fantaisistes.
### Colonnes (feuille Tests)

- **Parcours** — Nom du scénario fluide (P01, P02…).
- **N°** — Ordre strict dans le parcours.
- **Priorité** — P0 bloquant · P1 important métier · P2 confort / non-régression.
- **Rôle** — Qui exécute l’étape (OPT-A, OPT-B, C1, ADM, QA…).
- **Page / écran** — Où tu es (ou dois arriver) pour cette étape.
- **Action** — Ce que tu fais maintenant — suite logique de l’étape d’avant.
- **Résultat attendu** — Ce qui doit être vrai pour cocher OK.
- **Réf.** — ID cahier md (R4-01…), mémo Figma, ticket.
- **Statut** — OK / KO / N/A / Reporté / À retester.
- **Commentaire testeur** — Preuve (capture, curl, n° mail sink) — obligatoire si KO ou cas P0.
### Priorités

- **P0** — Bloquant livraison / GO lot. IDOR, PII, code réutilisé, remise sans code = NOGO.
- **P1** — Important métier. Plan d’action daté si ouvert.
- **P2** — Confort / non-régression visuelle.
### Jeux de données

- **ADM** — Admin PDV (Filament admin_pdv).
- **OPT-A** — Opticien A — magasin d’origine de C1 / P1.
- **OPT-B** — Opticien B — dépositaire (trouve la paire de C1).
- **C1** — Client rattaché à A uniquement (email + tél, consentements ON).
- **C2** — Client rattaché à A et B (affichage nom à la remise).
- **P1** — Paire C1, code assigné type FR5487OK — cycle complet.
- **P2** — Paire À graver (création sans code).
- **DUP** — Tentative doublon email de C1.
### Environnements

- **local** — Dev — Mailpit, Stripe test, MR selon .env.
- **recette** — Recette client / PO.
- **prod** — Réel — ne pas exécuter les cas destructifs sans plan.
### GO / NOGO

- **GO lot** — 0 ticket P0/C ouvert. Les P1/M ont un plan. Un IDOR ou un code réutilisé = NOGO immédiat.
- **Sources** — docs/04-cahier-de-recette.md · 01-regles-ux-memos-figma.md · 02-lotissement.md · 03-backlog-technique.md · Figma Prod UI BAT.
## Parcours

| Ordre | Parcours | Rôle principal | Nb étapes | Objectif |
| --- | --- | --- | --- | --- |
| 1 | P01 — Fondations & smoke | QA / Visiteur | 6 | Env, health, guards, config transporteurs |
| 2 | P02 — Auth opticien | OPT-A | 8 | Login, reset, throttle, isolation rôles |
| 3 | P03 — Invitation & auth client | C1 | 7 | Invitation, CGU, set password, reset client |
| 4 | P04 — Clients magasin | OPT-A / OPT-B / ADM | 12 | CRUD clients, doublons, OTP, tenancy, users BO |
| 5 | P05 — Paires & codes | OPT-A | 14 | Création paires, gravure, inactive, immuabilité codes |
| 6 | P06 — Restitution magasin (critique) | OPT-B / C1 | 14 | Chemin critique trouvé → remise + PII |
| 7 | P07 — Espace client | C1 | 9 | Liste, perte, inactive, à récupérer, prefs |
| 8 | P08 — Notifications & inbox | OPT / ADM / C1 | 6 | Journal, inbox, IDOR notif, liens token |
| 9 | P09 — Envoi à distance | C1 / OPT-B | 11 | Stripe, bordereau, multi-select, suivi |
| 10 | P10 — Admin Filament plateforme | ADM | 7 | Filament KPIs, journal, blocage, réseaux |
| 11 | P11 — Lots de codes (gravure admin) | ADM / OPT-A | 6 | Lots CSV, assignation, non-réutilisation |
| 12 | P12 — Facturation & Qonto | ADM | 7 | Tarifs, mois, Qonto, accès billing |
| 13 | P13 — Sécurité transverse | QA | 10 | IDOR, XSS, SQLi, audit, secrets, CORS |
| 14 | P14 — Parcours magasin de référence (E2E) | Tous | 10 | E2E magasin de référence (DoD lotissement) |

## P01 — Fondations & smoke

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | QA | API /api/v1/health | Appeler GET health (local / recette) | HTTP 200, payload santé OK. | R0-01 |
| 2 | P0 | Visiteur | Front opticien (non connecté) | Ouvrir une route opticien protégée sans session | Redirect login. Aucune donnée métier visible. | R0-02 |
| 3 | P0 | Visiteur | Front client (non connecté) | Ouvrir /client (ou équivalent) sans session | Redirect login client. Pas de liste de paires. | R0-02 |
| 4 | P0 | Visiteur | Filament /admin | Ouvrir /admin sans session | Redirect login Filament. Pas de KPIs. | R8-02 |
| 5 | P1 | QA | Front opticien | Inspecter styles : classes pdv-* + Bootstrap 5 | Pas de feuille CSS custom hors tokens Prod UI / Bootstrap. | R0-03 |
| 6 | P0 | QA | Env recette | Vérifier sink mail (Mailpit/Mailtrap) + Stripe test + MR MODE | Emails capturés ; Stripe test ; MR sandbox ou prod documenté. | ENV |
## P02 — Auth opticien

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | OPT-A | /login opticien | Se connecter avec email + MDP valides OPT-A | Accès dashboard / home opticien. | R1-01 |
| 2 | P0 | OPT-A | /login opticien | Se déconnecter puis se reconnecter avec mauvais MDP | Erreur générique (pas « email inconnu »). Pas de session. | R1-02 |
| 3 | P0 | OPT-A | /login opticien | Répéter N échecs login (throttle) | Après N essais → 429 / message rate-limit. Pas d’énumération. | R1-11 |
| 4 | P0 | OPT-A | Mot de passe oublié | Demander reset avec email OPT-A | Email sink avec code 6 chiffres ; pas de leak si email inconnu. | R1-06 |
| 5 | P0 | OPT-A | Reset MDP | Saisir le code + nouveau MDP conforme et valider | MDP changé ; connexion OK avec le nouveau MDP. | R1-06 |
| 6 | P0 | OPT-A | API admin | Avec session OPT-A, appeler une route admin / Filament data | 403. Opticien n’accède pas au BO plateforme. | R1-08 |
| 7 | P1 | OPT-A user simple | /login opticien | Se connecter avec compte magasin non-admin (si existant) | Accès magasin OK ; pas d’actions réservées admin magasin / BO. | R2-10 |
| 8 | P0 | OPT-A bloqué | /login opticien | Après blocage ADM (P10), tenter login OPT-A bloqué | 401 / erreur générique. Aucun accès. | R8-04 |
## P03 — Invitation & auth client

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | C1 | Email invitation | Ouvrir le lien d’invitation reçu (création client P04 ou seed) | Page set password + CGU affichée. Token valide. | R1-04 |
| 2 | P0 | C1 | Set password | Choisir un MDP sans cocher CGU et valider | Bloqué. Compte non activé. | R1-05 |
| 3 | P0 | C1 | Set password | Cocher CGU + MDP conforme et valider | Compte activé. Accès espace client. | R1-04 |
| 4 | P0 | C1 | Lien invitation | Réutiliser le même lien d’invitation | Invalide / déjà utilisé. Pas de 2e activation. | R1-07 |
| 5 | P0 | C1 | /login client | Tenter login avant set password (compte seed non activé) | Refus. Message clair. | R1-03 |
| 6 | P0 | C1 | Reset client | Mot de passe oublié → code email → nouveau MDP | Reset OK ; connexion espace client. | R1-06 |
| 7 | P1 | C1 | Préférences | 1re connexion : observer prompt géoloc navigateur | Prompt non bloquant si refus. App utilisable. | R5-09 |
## P04 — Clients magasin

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | OPT-A | Home / Clients | Ouvrir la liste clients OPT-A | Liste scoped magasin A. Pas de clients uniquement B. | R2-06 |
| 2 | P0 | OPT-A | Nouveau client | Créer C1 (email + tél + consentements email/SMS ON) | Toaster succès ; fiche C1 ; email bienvenue en sink. | R2-01 |
| 3 | P0 | OPT-A | Fiche C1 | Vérifier consentements email / SMS séparés | Les deux persistés indépendamment. | R2-02 |
| 4 | P0 | OPT-A | Nouveau client | Recréer un client avec le même email que C1 → Confirmer rattachement | Pas de 2e compte. C1 rattaché / flow doublon respecté. | R2-03 |
| 5 | P0 | OPT-A | Doublon | Sur doublon, choisir « Mettre à jour » (OTP selon canal) | OTP reçu ; après validation, retour flow OK. | R2-04 |
| 6 | P1 | OPT-A | Doublon | Sur doublon, cliquer Annuler | Formulaire intact. Aucune création. | R2-05 |
| 7 | P0 | OPT-A | Fiche C1 | Changer l’email → OTP mail | Pas de persist email avant OTP OK. | R2-08 |
| 8 | P0 | OPT-A | Fiche C1 | Changer le téléphone → OTP SMS (sandbox) | OTP SMS ; tél mis à jour après validation. | R2-09 |
| 9 | P0 | OPT-A | Clients | Unlink / détacher C1 chez A alors que C1 aussi chez B (préparer C2 ou rattachement B) | B conserve le client. Isolation unlink. | R2-07 |
| 10 | P0 | OPT-A | Navigation | Chercher un menu « Utilisateurs magasin » dans Next | Absent. Comptes magasin = Filament fiche opticien uniquement. | R2-10 |
| 11 | P0 | ADM | Filament opticien | Inviter un user magasin depuis fiche opticien Filament | Email invitation ; autre magasin ne voit pas cet user (404 service). | R2-11 |
| 12 | P0 | OPT-B | Clients | Liste clients OPT-B : C1 uniquement A n’apparaît pas | Isolation tenancy. C1 invisible chez B. | R2-06 |
## P05 — Paires & codes

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | OPT-A | Enregistrer une paire | Créer P2 sans code (client C1, type Vue, marque) | Statut À graver ; code auto format FR + 4 chiffres + 2 lettres. | R3-01 |
| 2 | P1 | OPT-A | Modal paire | Tester autocomplete client + marque + « Autre marque » | Libellé libre marque persisté. | R3-02 |
| 3 | P1 | OPT-A | Modal paire | Choisir type Vue / Soleil / Solaire de Vue uniquement | Seuls ces 3 types V1 proposés. | R3-03 |
| 4 | P2 | OPT-A | Modal paire | Sélectionner plusieurs couleurs et enregistrer | Couleurs multi-select persistées. | R3-04 |
| 5 | P1 | OPT-A | Fiche client → Nouvelle paire | Ouvrir création paire depuis fiche C1 | Client prérempli non éditable (MX 7:3480). | R3-05 |
| 6 | P0 | OPT-A | Fiche P2 À graver | Exporter le code à graver | Code visible / exportable. Format FR5487OK-like. | R3-01 |
| 7 | P0 | OPT-A | Fiche P2 | Indiquer comme gravée (confirmation) | → Active. Action irréversible. | R3-06 |
| 8 | P0 | OPT-A | Enregistrer paire | Créer paire avec code déjà lié à une autre | 422. Pas d’overwrite. Message clair. | R3-07 |
| 9 | P0 | OPT-A | Paire Active | Déclarer inactive (confirmation) | Inactive. Plus de « retrouvée » ni « perdue » possibles. | R3-08 |
| 10 | P0 | OPT-A / ADM | Archive | Archiver / supprimer une paire (API ou BO) puis retenter le même code | Code non réutilisable. | R3-09 |
| 11 | P2 | OPT-A | Fiche paire | Vérifier titre = type + marque | Conforme MX 32:2014. | R3-10 |
| 12 | P1 | OPT-A | Fiche paire · Historique | Créer plusieurs events puis ouvrir l’historique | Plus récent en haut (MX 32:3752). | R3-11 |
| 13 | P0 | OPT-A | Liste / fiche À graver | Vérifier CTAs : exporter + indiquer gravée ; Remettre/Relancer/bordereau disabled | Menus ⋮ conformes Figma lot 3. | FIG-L3 |
| 14 | P0 | OPT-A | Seed P1 | S’assurer d’une paire Active P1 code FR5487OK (ou équivalent seed) pour P06 | P1 Active prête pour cycle restitution. | DATA |
## P06 — Restitution magasin (critique)

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | C2 | Espace client | Sur une paire Active (ex. seed FR6001AA), déclarer perdue + confirmer. Note : seed P1 FR5487OK est déjà a_recuperer chez B. | Statut Perdue. Event créé. Pas de notif magasin d’origine (NO-03). | R5-02 · R6-06 |
| 2 | P0 | OPT-B | Signaler retrouvé | Saisir le code assigné P1 FR5487OK (déjà en dépôt seed) OU une paire perdue de C1 ; C1 n’est PAS client de B | Dossier restitution / détail sans nom/email/tél C1. | R4-01 |
| 3 | P0 | C1 | Email sink | Ouvrir l’email « paire retrouvée » | Lien public token + code restitution + magasin B. Pas de PII tiers. | R4-02 · R6-03 |
| 4 | P0 | Visiteur | /r/{token} | Ouvrir le lien public sans session | Page visible ; une seule paire ; infos magasin B. | R1-09 |
| 5 | P0 | Visiteur | /r/{token} | Modifier le token (tamper) et recharger | 404. Pas de dump. | R1-10 |
| 6 | P0 | OPT-B | Home opticien | Observer le bandeau / liste d’attente (à récupérer) | P1 visible. Max 5 sur dashboard (MX 41:2890). | R4-04 |
| 7 | P0 | OPT-B | CTA Remettre | Si 0 paire à récupérer (autre magasin / empty) | CTA Remettre disabled. | R4-03 |
| 8 | P0 | OPT-B | Remettre P1 | Lancer remise : mauvais code restitution | Erreur Figma. Pas de clôture. Statut inchangé. | R4-07 |
| 9 | P0 | OPT-B | Remettre P1 | Code restitution OK (C1 inconnu de B) → confirmer | Remise OK. Identité masquée à l’étape 2. Paire → Active côté client. | R4-05 |
| 10 | P0 | OPT-B | Liste restitutions | Après remise, vérifier liste | P1 absente des restitutions en cours. | R4-09 |
| 11 | P0 | OPT-A | Remise C2 | Préparer C2 client A+B ; paire à récupérer chez A ; remettre | Nom prénom visibles (déjà client local). | R4-06 |
| 12 | P0 | OPT-B | Signaler retrouvé | Scanner / saisir une paire Inactive | Refus. Pas de dossier. | R4-08 |
| 13 | P1 | C1 / OPT-B | Code oublié | Demander renvoi code restitution (mail puis SMS) | Renvoi OK + rate-limit après N essais. | R4-10 |
| 14 | P0 | OPT-B | Inbox | À la confirmation « retrouvée », vérifier notification inbox | Titre « Lunettes en attente de retrait » ; nom seulement si déjà client. | R6-04 |
## P07 — Espace client

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | C1 | Mes lunettes | Ouvrir la liste des paires | Ordre : à récupérer → en livraison → livraison demandée → perdue → active → inactive. | R5-01 |
| 2 | P0 | C1 | Fiche Active | Déclarer perdue + confirmer | → Perdue. Event. CTA conformes. | R5-02 |
| 3 | P1 | C1 | Fiche Perdue | Annuler la perte (si proposé) | Retour Active. | R5-03 |
| 4 | P0 | C1 | Fiche Active | Déclarer inactive + confirmer | Irréversible. Plus de déclaration perte. « Réactiver » visible mais disabled. | R5-04 |
| 5 | P0 | C1 | Fiche | Supprimer définitivement une paire (parcours prévu) | Disparaît client + opticien ; visible BO taguée archivée. | R5-05 |
| 6 | P0 | C1 | À récupérer | Ouvrir page / section À récupérer (après P06) | Code restitution + Maps magasin. Pas de PII d’autres clients. | R5-06 |
| 7 | P0 | C1 | Liste | Vérifier isolation : C1 ne voit aucune paire de C2 | Isolation stricte. | R5-07 |
| 8 | P1 | C1 | Préférences notif | Couper SMS puis déclencher un événement SMS | Aucun SMS envoyé (log skipped / absent). | R5-08 |
| 9 | P0 | C1 | À récupérer | CTA « Me faire livrer » si a_recuperer | CTA actif (entrée lot 7 / P09). | R7 |
## P08 — Notifications & inbox

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | QA / ADM | Journal notif | Pour invitation, OTP, paire retrouvée, renvoi SMS : vérifier log | Chaque envoi : canal, destinataire, type, statut. | R6-01 |
| 2 | P1 | QA | Provider KO | Simuler échec provider (clé invalide / mock) | Statut error en log ; pas de 500 exposé au front. | R6-02 |
| 3 | P0 | OPT-B | Inbox magasin | Ouvrir inbox après signalement retrouvé | Notification présente ; scoped magasin. | R6-04 |
| 4 | P0 | OPT-A | Inbox | OPT-A tente d’accéder inbox / notif d’OPT-B (IDOR) | Liste vide / 404. Pas de fuite. | R6-05 |
| 5 | P0 | OPT-B | Inbox | Tout marquer comme lu puis Tout supprimer (onglets Toutes / Non lues / Lues) | Actions scoped magasin. Onglets OK. | R6-07 |
| 6 | P0 | C1 | Email | Lien email restitution = token public | URL /r/{token} fonctionne (PDV-104). | R6-03 |
## P09 — Envoi à distance

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | C1 | À récupérer | Démarrer « Me faire livrer » sans cocher consentement adresse | 422 consent_address. Aucun shipment créé. | R7-02 |
| 2 | P0 | C1 | Parcours livraison | Choisir mode (relais / domicile) → récap → Procéder au paiement | Checkout Stripe pending_payment ; paire reste a_recuperer jusqu’au retour OK. | R7-01 |
| 3 | P0 | C1 | Stripe test | Payer avec 4242…4242 (succès) | Retour succès ; toast succès ; statut livraison_demandee ; inbox dépositaire. | R7-01 · R7-03 |
| 4 | P0 | C1 | Stripe test | Refaire un parcours et payer avec 4000…0002 (échec) | Retour récap ?paiement=echec ; toast échec ; pas d’inbox ; pas livraison_demandee. | R7-07 |
| 5 | P0 | OPT-B | Inbox / bordereau | Ouvrir notification bordereau après paiement OK | Nom + adresse uniquement (pas email/tél). OPT-A ne peut pas télécharger (404). | R7-03 |
| 6 | P0 | OPT-B | Télécharger bordereau | Télécharger le label (MR sandbox ou prod selon env) | PDF si credentials OK ; sinon .txt fallback documenté. Pas de crash. | MR |
| 7 | P0 | OPT-B | Liste lunettes | Multi-sélection : seules « Livraison demandée » cochables ; CTA dès 2 | Autres checkboxes disabled (MX 41:5612). | R7-04 |
| 8 | P0 | OPT-B | Fiche / action | Indiquer en livraison | → en_livraison ; mail client ; event « Livraison prise en compte. » | R7-05 |
| 9 | P1 | C1 / OPT-B | Suivi | Vérifier absence d’ETA tant que contrat transporteur incomplet | Pas de champ eta API ni UI (MX 63:2111). | R7-06 |
| 10 | P0 | OPT-B | Dépôt | Saisir / confirmer dépôt avec code suivi | Mail dépôt ; suivi visible côté client « Suivre ma livraison » ; pas d’ETA fantôme. | R7-08 |
| 11 | P0 | C1 | Espace client | Ouvrir suivi livraison | Statut / tracking visibles selon data. Isolation C1 only. | R7-08 |
## P10 — Admin Filament plateforme

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | ADM | /admin login | Se connecter admin_pdv | Dashboard Filament accessible. | R8-02 |
| 2 | P0 | OPT-A | /admin | Tenter /admin avec compte opticien | 403 / redirect. Pas de KPIs. | R8-02 |
| 3 | P0 | ADM | Dashboard | Vérifier KPIs + consultation paires (y compris archivées) + restitutions en cours + clients | Données présentes. Restitutions = en cours only. | R8-02 |
| 4 | P0 | ADM | Journal notifications | Ouvrir journal notif BO | Canal / destinataire / type / statut visibles. | R8-01 |
| 5 | P0 | ADM | Opticiens | Bloquer un compte opticien test | Login opticien → 401 générique ensuite. | R8-04 |
| 6 | P1 | ADM | Réseaux / opticiens | CRUD réseau + rattacher opticien ; tester SIRET doublon | Doublon SIRET refusé. Opticien sans SIRET/réseau listé au contrôle. | R10-01 |
| 7 | P1 | ADM | Brand / UI | Vérifier logo PDV + couleurs / CTA sombre Filament | Conforme charte BO (hors Figma). | UI-BO |
## P11 — Lots de codes (gravure admin)

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | ADM | Lots de codes | Générer un lot de N codes | Codes uniques FR####AA ; export CSV ; jamais recyclés. | R9-01 |
| 2 | P0 | OPT-A | Enregistrer paire | Saisir un code du lot comme « déjà gravé » | Item lot → assigned ; paire Active. | R9-02 |
| 3 | P0 | OPT-A | Enregistrer paire | Retenter le même code du lot | 422. Pas de réutilisation. | R9-02 |
| 4 | P0 | ADM | Lot | Consommer tous les codes dispos → statut lot | Lot consumed si plus aucun dispo. | R9-02 |
| 5 | P0 | OPT-A | BO lots | Opticien tente d’ouvrir consultation codes lot BO | 403. | R9-03 |
| 6 | P0 | ADM | Consultation BO | admin_pdv voit les codes du lot | Liste complète + statuts. | R9-03 |
## P12 — Facturation & Qonto

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | ADM | Tarifs | Créer / éditer un tarif réseau (à la paire) | CRUD OK. Montant indicatif cohérent. | R10-01 |
| 2 | P1 | ADM | Préparation mois | Lancer préparation mois de facturation | Paires du mois + montant indicatif si tarif à la paire ; pas de sync Qonto auto. | R10-04 |
| 3 | P0 | ADM | Qonto sync | Sans clé Qonto : tenter sync | Sync refusée ; log skipped. Pas d’appel HTTP. | R10-02 |
| 4 | P1 | ADM | Qonto sync | Avec clé : sync → statut queued sans appel HTTP réel (V1) | queued documenté. Pas d’erreur 500. | R10-02 |
| 5 | P0 | ADM | Billing review | Ouvrir /admin/billing-review et /admin/qonto-sync | Accessible admin_pdv. | R10-03 |
| 6 | P0 | OPT-A | Billing BO | Opticien tente billing-review / qonto-sync | 403. | R10-03 |
| 7 | P1 | ADM | Tables billing Filament | Vérifier lisibilité tables issues / previews | Colonnes claires ; pas de PII inutile. | UI-BO |
## P13 — Sécurité transverse

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | C1 | API paire | GET paire appartenant à C2 | 404 (IDOR). | S-01 |
| 2 | P0 | OPT-A | API client | GET client uniquement chez B | 404. | S-02 |
| 3 | P0 | OPT-A | API PATCH profil | Tenter mass-assignment role=admin | Rôle inchangé. | S-03 |
| 4 | P0 | OPT-A | Libellé paire | Saisir <script>alert(1)</script> dans marque / libellé | Échappé. Pas d’exécution XSS. | S-04 |
| 5 | P0 | OPT-A | Recherche | Injecter ' OR 1=1 -- dans recherche clients | Ignorée / paramétrée. Pas de dump. | S-05 |
| 6 | P0 | QA | Audit | Après une remise, vérifier entrée audit | Audit présent (remise + accès fiche sensibles). | S-06 |
| 7 | P0 | QA | DB users | Vérifier MDP hashés (bcrypt/argon) — pas de clair | Hash only. | S-07 |
| 8 | P0 | QA | CORS | Origine non autorisée → API | CORS refuse hors front recette. | S-08 |
| 9 | P0 | QA | Logs | Déclencher OTP / code restitution / login | Pas de codes / MDP / OTP en clair dans laravel.log. | SEC |
| 10 | P0 | QA | Tokens publics | Vérifier tokens restitution / invitation | Aléatoires, TTL, non séquentiels. | SEC |
## P14 — Parcours magasin de référence (E2E)

| N° | Prio | Rôle | Page | Action | Résultat attendu | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | ADM | Filament | Créer / vérifier opticien A et B + users | Deux magasins opérationnels. | PARCOURS |
| 2 | P0 | OPT-A | Clients | Créer client C1 chez A | C1 OK + invitation. | PARCOURS |
| 3 | P0 | C1 | Invitation | Activer compte (MDP + CGU) | Espace client OK. | PARCOURS |
| 4 | P0 | OPT-A | Paires | Créer paire (avec ou sans gravure) → Active | Code assigné unique FR… | PARCOURS |
| 5 | P0 | C1 | Client | Déclarer la paire perdue | Perdue. | PARCOURS |
| 6 | P0 | OPT-B | Retrouvé | Signaler retrouvée avec code assigné | Dossier sans PII propriétaire. | PARCOURS |
| 7 | P0 | C1 | Email + /r/token | Récupérer code restitution | Code + magasin B. | PARCOURS |
| 8 | P0 | OPT-B | Remettre | Valider code restitution → confirmer remise | Remise OK ; identité masquée si non client B. | PARCOURS |
| 9 | P0 | C1 | Mes lunettes | Vérifier paire Active à nouveau | Active. Code assigné non réutilisable ailleurs. | PARCOURS |
| 10 | P0 | QA | GO | Aucun cas P0 KO sur P01–P13 bloquant | GO livraison possible si P0 = 0 ouvert. | GO |

## Synthèse

| Parcours | Nb étapes | P0 | P1 | P2 |
| --- | --- | --- | --- | --- |
| P01 — Fondations & smoke | 6 | 5 | 1 | 0 |
| P02 — Auth opticien | 8 | 7 | 1 | 0 |
| P03 — Invitation & auth client | 7 | 6 | 1 | 0 |
| P04 — Clients magasin | 12 | 11 | 1 | 0 |
| P05 — Paires & codes | 14 | 8 | 4 | 2 |
| P06 — Restitution magasin (critique) | 14 | 13 | 1 | 0 |
| P07 — Espace client | 9 | 7 | 2 | 0 |
| P08 — Notifications & inbox | 6 | 5 | 1 | 0 |
| P09 — Envoi à distance | 11 | 10 | 1 | 0 |
| P10 — Admin Filament plateforme | 7 | 5 | 2 | 0 |
| P11 — Lots de codes (gravure admin) | 6 | 6 | 0 | 0 |
| P12 — Facturation & Qonto | 7 | 4 | 3 | 0 |
| P13 — Sécurité transverse | 10 | 10 | 0 | 0 |
| P14 — Parcours magasin de référence (E2E) | 10 | 10 | 0 | 0 |
| TOTAL | 127 | 107 | 18 | 2 |
| Règle GO |  |  |  |  |
| GO si 0 P0 ouvert et plan daté sur les P1. NOGO si 1 P0 (PII, IDOR, code réutilisé, remise sans code). |  |  |  |  |
