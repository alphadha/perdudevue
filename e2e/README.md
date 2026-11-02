# E2E Playwright — Perdues de Vue

Suite alignée sur `docs/Cahier_de_recette_Perdues_de_Vue.xlsx` (parcours P01–P14).

## Prérequis

```bash
# Terminal 1 — API
cd backend
php artisan migrate:fresh --seed
php artisan serve

# Terminal 2 — Front
cd frontend
npm run dev
```

Jeu seed : mot de passe commun `Password1` (voir `DatabaseSeeder`).

## Install

```bash
cd e2e
npm install
npx playwright install chromium
```

## Lancer

```bash
cd e2e
npm run test:cahier      # 127 cas = catalog.json (recommandé)
npm test                 # cahier-all + specs parcours
npm run audit            # couverture ID vs cahier (doit afficher 100%)
npm run test:headed      # navigateur visible
npm run test:p06         # restitution critique
npm run report           # rapport HTML
```

Détail couverture : [`COVERAGE.md`](./COVERAGE.md).

Variables optionnelles :

| Variable | Défaut |
|---|---|
| `PDV_FRONTEND_URL` | `http://localhost:3000` |
| `PDV_API_URL` | `http://localhost:8000/api/v1` |
| `PDV_BACKEND_URL` | `http://localhost:8000` |

## Organisation

| Spec | Parcours cahier |
|---|---|
| `p01-fondations.spec.ts` | Smoke / guards |
| `p02-auth-opticien.spec.ts` | Auth opticien |
| `p03-invitation-client.spec.ts` | Invitation C1 |
| `p04-clients.spec.ts` | Clients magasin |
| `p05-paires.spec.ts` | Paires & codes |
| `p06-restitution.spec.ts` | **Critique** restitution + PII |
| `p07-client-space.spec.ts` | Espace client |
| `p08-notifications.spec.ts` | Inbox |
| `p09-envoi-distance.spec.ts` | Livraison / Stripe |
| `p10-admin-filament.spec.ts` | BO Filament |
| `p11-lots-codes.spec.ts` | Lots codes (renvoi Feature PHP) |
| `p12-facturation.spec.ts` | Facturation |
| `p13-securite.spec.ts` | IDOR / XSS / CORS |
| `p14-e2e-magasin.spec.ts` | Parcours magasin de référence |

Les cas purement Filament / Stripe Checkout / MR PDF sandbox sont annotés `skip` ou renvoient aux Feature PHP — voir `docs/05-audit-cahier-recette.md`.

## GO

Aucun **P0** rouge sur P01, P02, P06, P13, P14. Remise sans PII (OPT-B) et IDOR = NOGO immédiat.
