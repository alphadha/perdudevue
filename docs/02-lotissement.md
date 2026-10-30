# Lotissement — découpage proposé (catalogue)

Référence à valider : **`docs/BacklogFinal.xlsx`** (onglet `08_Lotissement`). Catalogue : `03-backlog-technique.md`.

11 lots de **livraison produit** (pas un état d’avancement technique).

| Lot | Nom | Objectif |
|---|---|---|
| 0 | Fondations | Environnements, rôles, journal, isolation |
| 1 | Accès | Login, reset, invitation client, page publique, CGU |
| 2 | Clients magasin | CRUD, doublon, OTP, users magasin (BO) |
| 3 | Paires & codes | Création ± code, À graver, immuabilité |
| 4 | Restitution magasin | Trouvé → code restitution → remise, PII |
| 5 | Espace client | Liste, fiches, perte, inactive, paramètres |
| 6 | Notifications | Email, SMS, gabarits, journal |
| 7 | Envoi à distance | Relais, paiement client, étiquette, dépôt, suivi |
| 8 | Admin plateforme | KPIs, réseaux, opticiens, transverse |
| 9 | Gravure & lots | Lots CSV, statuts de codes |
| 10 | Facturation | Tarifs, évaluation, Qonto, FACT / TARIF CDC |

Parcours magasin de référence (onglet `09_Parcours`) : créer un opticien → un client → une paire → déclarer perdue → trouver chez un autre magasin **sans** afficher l’identité → remettre avec le **code de restitution** → paire **Active** · code assigné **non** réutilisable.
