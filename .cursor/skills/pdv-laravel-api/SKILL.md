---
name: pdv-laravel-api
description: >-
  Conventions API Laravel Perdues de Vue : routes /api/v1, Form Requests, policies,
  Resources, tenancy opticien, Sanctum, audit. À utiliser en créant ou modifiant
  du backend PHP, des migrations, controllers, jobs ou tests API.
---

# Laravel API — Perdues de Vue

## Structure

- Routes : `routes/api.php` préfixe `/api/v1`
- Un domaine = dossier clair (`Pair`, `Restitution`, `Client`…) : Model, Policy, FormRequest, Resource, Service, Tests
- Pas de métier dans les controllers : orchestration courte → Service

## Règles

```php
// ❌ BAD — fuite + pas de policy
return Pair::findOrFail($id);

// ✅ GOOD
$this->authorize('view', $pair);
return PairResource::make($pair);
```

- `authorize` sur **chaque** action. 404 si hors tenant (pas 403 révélateur).
- FormRequest obligatoire pour POST/PUT/PATCH.
- Resource : ne jamais inclure PII propriétaire dans un contexte dépositaire (voir skill `pdv-domain`).
- Codes HTTP : 401 / 403 / 404 / 422 / 429. Body `{ data, meta, errors }`.
- Mutations sensibles : `assigned_code` jamais dans `$fillable` updatable ; transition de statut via service dédié (state machine), pas `update(['status' => …])` libre.
- Mots de passe : hash Laravel. Tokens invitation / publics : random, TTL, one-shot si applicable.
- Audit : observer ou action dans le service après succès (login, PII, association, remise, archive).
- Jobs pour email/SMS (outbox). Pas d’envoi synchrone bloquant la requête métier au-delà de l’écriture outbox.

## Tests minimaux par endpoint

1. 401 sans auth  
2. 404 IDOR autre opticien / autre client  
3. 422 validation  
4. Happy path + effet de bord statut / event
