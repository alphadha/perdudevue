# Couverture Playwright ↔ cahier de recette

**Audit** : `npm run audit` (génère `coverage-report.json`)

| Métrique | Valeur |
|---|---|
| Cas cahier (`catalog.json`) | **127** |
| IDs couverts dans le code | **127 (100 %)** |
| Suite 1:1 | `specs/cahier-all.spec.ts` → `runners/executeCase.ts` |
| Runners | P01 … P14 (tous présents) |

## Comment lancer

```bash
# backend seed + serve :8000
# frontend :3000
cd e2e
npm run test:cahier    # les 127 cas du cahier
npm run audit          # re-vérifier la couverture ID
```

## Profondeur (honnête)

| Type | Exemples | Qualité |
|---|---|---|
| **UI + API assertés** | P01 guards, P02 login, P05 paires, P06 restitution/PII, P13 IDOR/XSS | Fort |
| **Smoke Filament** | P10–P12 login `/admin` + renvoi Feature PHP | Moyen (BO hors Figma) |
| **Skip / env** | P02-08 blocage, P09-06 MR PDF, P10-05 | Annotés `test.skip` |
| **Délégué Feature PHP** | Lots codes, Qonto, journal notif provider KO | `Lot*.php` |

## Avant / après

- Avant audit : **103 / 127 (81 %)** — manquaient surtout P07-04, P09/P10/P11/P12/P14 partiels, pas de `cahier-all`.
- Après : **127 / 127 (100 %)** IDs + routeur unique.

Les specs `p01-…spec.ts` … `p14-…spec.ts` restent disponibles pour jouer un parcours isolé.
