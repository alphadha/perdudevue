---
name: pdv-implementer-ticket
description: >-
  Méthode pour implémenter un ticket du backlog Perdues de Vue (PDV-xxx) : lire
  sources, découper F/B, respecter mémos UX, recette. À utiliser quand l’utilisateur
  demande de développer une story, un lot, ou un ID PDV / Excel (AU-, OP-, CL-…).
---

# Implémenter un ticket PDV

## Workflow

1. Identifier l’ID (`PDV-xxx` ou Excel `AU-01`…). Lire la carte dans `docs/03-backlog-technique.md`.
2. Lire les règles UX liées dans `docs/01-regles-ux-memos-figma.md` et les décisions `docs/00-cadrage-et-decisions.md`.
3. Appliquer les skills `pdv-domain`, `pdv-laravel-api`, `pdv-nextjs-bootstrap`.
4. Implémenter **Back d’abord** (contrats + policies + tests IDOR) puis Front Bootstrap.
5. Ajouter / cocher les cas du `docs/04-cahier-de-recette.md` du lot.
6. Ne pas sortir du lot : pas de Stripe si on est au lot 4, pas de CSS custom.

## Hors scope à refuser dans le code

- Libérer un code assigné
- Inscription client publique (EC-04)
- Notifier l’opticien d’origine d’une déclaration de perte (NO-03)
- Facturation Qonto avant lot 10

## Definition of Done

- [ ] Policy + 404 tenant
- [ ] Transitions de statut via service
- [ ] Aucune PII en trop dans la Resource
- [ ] Écran Bootstrap, copy Figma
- [ ] Cas C du cahier de recette du lot couverts (test auto ou scénario écrit)
- [ ] Pas de CSS custom
