---
name: pdv-recette
description: >-
  Rédige ou exécute la recette Perdues de Vue (cas C/M, GO-NOGO, PII, IDOR).
  À utiliser pour tests, QA, cahier de recette, recette d’un lot, ou vérification
  avant démo.
---

# Recette PDV

Source : `docs/04-cahier-de-recette.md`.

## Quand on ajoute une feature

1. Ajouter les cas **C** (sécurité, immuabilité, isolation) dans le lot concerné.
2. Prévoir le jeu ADM / OPT-A / OPT-B / C1 / C2.
3. Le chemin heureux magasin (créer client → paire → perdue → trouvé chez B sans PII → remise) ne doit **jamais** régresser.

## GO lot

0 ticket **C** ouvert. Les **M** ont un plan. Un IDOR ou un code réutilisé = NOGO immédiat.

## Sortie attendue

Tableau : ID cas | résultat OK/KO | preuve (test, capture, curl). Pas de « ça marche sur mon écran » sans le cas OPT-B / PII.
