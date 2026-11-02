# Audit cahier de recette vs app (2026-03-30)

Source Excel : `Cahier_de_recette_Perdues_de_Vue.xlsx` · Seed : `DatabaseSeeder`.

## Verdict

Le cahier couvre bien les **lots 0–10 + sécurité + E2E**. Quelques écarts seed / surface UI à connaître avant exécution (manuel ou Playwright).

## Écarts corrigés / notés

| ID cahier | Problème | Correction |
|---|---|---|
| P06-01 | Seed : `FR5487OK` est déjà `a_recuperer` chez OPT-B — pas besoin de « déclarer perdue » sur P1 | Utiliser une paire **Active** (ex. C2 `FR6001AA`) pour le cas perte ; P1 sert directement aux étapes remise |
| P03 / C1 | `client.c1@example.com` est **pending** (invitation `recette-invitation-c1`) | Activer avant login client ; token one-shot |
| P01-04 / P10 | Admin = **Filament** sur `BACKEND_URL/admin`, pas le Next.js | Base URL Laravel séparée |
| P09 / MR | Sandbox API2 → `10001` | PDF bordereau : prod credentials ou fallback `.txt` |
| P04-10 | Pas d’écran « Utilisateurs » Next | OK — Filament only |
| P11–P12 | Surtout BO Filament | Playwright smoke login + Feature PHP Lot9/Lot10 |

## Jeu seed (Password1)

| ID | Compte |
|---|---|
| ADM | `admin@perduesdevue.fr` |
| OPT-A | `opticien.a@example.com` |
| OPT-A user | `opticien.a.user@example.com` |
| OPT-B | `opticien.b@example.com` |
| C1 | `client.c1@example.com` + invitation `recette-invitation-c1` |
| C2 | `client.c2@example.com` |
| Public | `/r/recette-public-p1` |
| P1 | `FR5487OK` / pickup `KSKKYK` chez B |
| Chez A | `FR5488OK` / pickup `ABCDEF` |

## Automatisation

| Couche | Emplacement |
|---|---|
| E2E Playwright (parcours P01–P14) | `e2e/` |
| Feature PHP (lots API) | `backend/tests/Feature/Lot*.php` |

Voir `e2e/README.md` pour lancer la suite.
