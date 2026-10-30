# Règles UX — mémos Figma

Ces règles priment sur le backlog Excel lorsqu’il y a contradiction. Elles doivent se retrouver dans les tickets, l’API et le cahier de recette.

## 1. Deux codes distincts

- **Code assigné** : identifie la paire. Format **`FR` + 4 chiffres + 2 lettres** (ex. `FR5487OK`). Associé **à la création**, association **définitive**. Jamais réutilisé, même après suppression / inactivation.
- **Code de restitution** : généré **quand la paire est retrouvée**. Envoyé au client. Présenté à l’opticien pour la remise.

## 2. Statuts paire (vocabulaire Figma)

Ordre d’affichage **côté client** (liste « Mes lunettes ») :

1. À récupérer
2. En livraison
3. Livraison demandée
4. Perdue
5. Active
6. Inactive

Transitions métier issues des mémos :

| Depuis | Action | Vers |
|---|---|---|
| (création sans gravure) | Enregistrement → code auto | **À graver** |
| À graver | « Indiquer comme gravée » (irréversible) | **Active** |
| (création avec code déjà gravé) | Association du code saisi | **Active** |
| Active | Client déclare perdue | **Perdue** |
| Perdue | Client annule la déclaration | **Active** |
| Active ou Perdue | Opticien saisit le **code assigné** (paire retrouvée) | **À récupérer** + dossier restitution + code restitution |
| À récupérer | Client paie un envoi à distance | **Livraison demandée** |
| Livraison demandée | Opticien « Indiquer comme en livraison » | **En livraison** |
| À récupérer | Opticien confirme la remise (code restitution) | **Active** (ligne disparait du tableau restitutions) |
| En livraison | Livraison finalisée | **Active** (idem) |
| Active / Perdue | Déclarer inactive (perdue définitive / cassée) | **Inactive** |
| * | Supprimer définitivement | Archivée BO (`supprimé`) — **plus visible** opticien ni client |

Le statut **À graver** est un statut **opticien** (pas dans l’ordre client ci-dessus).

## 3. Compte client

- Pas d’inscription autonome grand public. Copy Figma : *« Rapprochez-vous de votre opticien. Il pourra créer votre compte… »*
- Compte opticien : pas d’auto-inscription. Contact `support@perduesdevue.fr`.
- Création client par l’opticien → toaster → redirection **fiche client** → email de bienvenue avec **lien d’accès**. Infos perso déjà remplies ; le client **ne définit que son mot de passe**.
- Consentement **par canal** (email / SMS), modifiable ensuite.
- Titre de fiche paire = **type + marque** (ex. « Lunettes Vue - Gucci »).
- Historique d’événements : **plus récent en premier**.

## 4. Doublon client (critique)

Si l’opticien saisit un nom / prénom / email **et/ou** téléphone déjà associé à un compte :

1. Pop-in « un compte existe déjà » avec les infos masquées/affichées du compte trouvé.
2. Trois issues :
   - **Confirmer** → fin du flow, client ajouté (rattachement à cet opticien).
   - **Mettre à jour** → pop-in « Modifier la fiche client », puis retour au flow création avec infos à jour.
   - **Annuler** → retour au formulaire, champs conservés, encore modifiables.

## 5. Mise à jour d’identité (vérification)

- Changement **email** (éventuellement avec nom/prénom) → code de vérification **par email**.
- Changement **téléphone** (éventuellement avec nom/prénom) → code de vérification **par SMS**.
- Copy associée : le client a reçu un code mail ou SMS pour valider la mise à jour.

## 6. Enregistrement d’une paire

- Depuis le **tableau de bord** : pop-in, champ client en **autocomplete** (sélection obligatoire dans la liste).
- Depuis la **fiche client** : même pop-in, champ client **prérempli**.
- Types Figma : **Vue / Soleil / Solaire de Vue**.
- Marque : autocomplete + option **« Autre marque »** → saisie libre.
- Couleur(s) : dropdown **multi-select**. À fournir : listes marques et couleurs/motifs.
- Sans gravure : un code unique au format `FR` + 4 chiffres + 2 lettres est attribué à l’enregistrement, à apposer ensuite ; visible dans la fiche. Statut **À graver**.
- Avec gravure : saisie du **code unique assigné** au même format (ex. `FR5487OK`). Statut **Active**.
- CTA **« Indiquer comme gravée »** : confirmation irréversible.

## 7. Suppression / inactivation

- **Inactive** = définitivement perdue ou cassée. Confirmation obligatoire.
- **Supprimer définitivement** (client) : irréversible, plus visible ni chez le client ni chez l’opticien.
- Côté BO : la paire **reste** pour l’historique, tag `supprimé`, traçabilité (client, date, motif).
- **Le code n’est jamais remis à disposition.**
- Côté opticien, pop-in « paire inactive » : même sémantique (cassée / perdue définitive).

## 8. Restitution en magasin

Parcours mémo (3 étapes) :

1. Opticien saisit le **code assigné** (paire retrouvée) → le système identifie la paire, crée le dossier, génère le **code de restitution**, notifie le propriétaire. Avertissement : *vérifier que la paire identifiée est la bonne*.
2. Client se présente avec le **code de restitution**.
3. Opticien saisit ce code, vérifie, confirme la remise. Action **définitive**. La paire redevient active / sort du tableau restitutions.

Règles d’interface :

- Tableau de bord : bloc « Lunettes retrouvées en attente de retrait » → **5 paires max**.
- CTA **« Remettre des lunettes »** : **actif seulement** s’il existe au moins une paire **À récupérer**, sinon disabled.
- Étape 2/3 : **nom + prénom affichés uniquement** si le client a été enregistré **par cet opticien**. Sinon, pas d’identité (aligné CDC confidentialité).
- « Le client a oublié son code » → page **Restitutions**, recherche client, **renvoi mail et/ou SMS**.
- Tableau Restitutions : uniquement les dossiers **en cours**. Disparait dès remise en main propre **ou** livraison finalisée.

## 9. Page publique « lunettes retrouvées »

- Email au client avec **lien**.
- Écran consultable **sans connexion**.
- Contient tout le nécessaire pour récupérer **et** pour **rouvrir / se reconnecter** à son compte.

## 10. Envoi à distance

- Alternative si l’opticien est trop loin : domicile ou point relais.
- Adresse **uniquement** pour la livraison, pas d’usage commercial. Consentement explicite.
- Une fois organisé **et payé** : l’opticien reçoit le **bordereau** (notification), fait le colis, dépose. Le client est informé du dépôt et suit l’avancement.
- Date de livraison estimée : **faisable techniquement mais dépend du contrat transporteur** — ne pas la promettre tant que le contrat n’est pas signé.
- Notif opticien « Nouvel envoi à distance demandé » → ouvre le **détail dossier restitution** au statut **Livraison demandée**.
- Multi-sélection tableau lunettes : **un seul cas** — dès 2 paires **Livraison demandée**, action « Télécharger les bordereaux (X) ». Checkboxes des **autres statuts désactivées**.

## 11. Carte / géoloc (espace client)

- Demander la géoloc **à la 1re connexion**.
- Vue carte / zoom adaptés à la position temps réel.
- Itinéraire interne = **voiture** uniquement. Pour suivre / pied / etc. → lien **Maps ou Waze**.

## 12. Notifications (copy Figma déjà présente)

- Étiquette générée pour le retour à distance de {prénom nom}.
- Lunettes retrouvées + demande de restitution à distance via {transporteur}.
- Toaster abandon pop-in : « Modifications non prises en compte ».
