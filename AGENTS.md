# DUGHU — Workspace Rule

Tu travailles sur le projet Dughu.

`AGENTS.md` est la source principale des règles du projet.

## AVANT DE CODER

Tu dois :

1. Lire `AGENTS.md`.
2. Comprendre la tâche demandée.
3. Identifier les règles `/docs` pertinentes.
4. Lire uniquement les documents pertinents.
5. Inspecter le code existant avant de créer un nouveau composant.
6. Vérifier si une fonctionnalité ou un composant similaire existe déjà.
7. Ne pas créer de duplication inutile.

## ROUTAGE DES DOCUMENTS

### Interface / composant UI

Lire :

* `docs/UI_GUIDELINES.md`
* `docs/RESPONSIVE_GUIDELINES.md`
* `docs/ACCESSIBILITY_GUIDELINES.md`
* `docs/ERROR_HANDLING_GUIDELINES.md`

### Nouvelle fonctionnalité

Lire :

* `docs/ARCHITECTURE.md`
* `docs/BUSINESS_RULES.md`
* `docs/UI_GUIDELINES.md`
* `docs/RESPONSIVE_GUIDELINES.md`
* `docs/ERROR_HANDLING_GUIDELINES.md`
* `docs/TESTING_GUIDELINES.md`

Ajouter `SECURITY_GUIDELINES.md` si la fonctionnalité concerne des données, permissions, authentification ou API.

### Authentification / permissions / données privées

Lire :

* `docs/SECURITY_GUIDELINES.md`
* `docs/PRIVACY_GUIDELINES.md`
* `docs/ERROR_HANDLING_GUIDELINES.md`
* `docs/ARCHITECTURE.md`

### Performance

Lire :

* `docs/PERFORMANCE_GUIDELINES.md`
* `docs/ARCHITECTURE.md`

### PWA

Lire :

* `docs/PWA_GUIDELINES.md`
* `docs/PERFORMANCE_GUIDELINES.md`
* `docs/SECURITY_GUIDELINES.md` si des données privées sont concernées.

### Notifications

Lire :

* `docs/NOTIFICATION_GUIDELINES.md`
* `docs/BUSINESS_RULES.md`
* `docs/UI_GUIDELINES.md`
* `docs/RESPONSIVE_GUIDELINES.md`
* `docs/ERROR_HANDLING_GUIDELINES.md`

### Modération

Lire :

* `docs/MODERATION_GUIDELINES.md`
* `docs/ROLES_AND_PERMISSIONS.md`
* `docs/SECURITY_GUIDELINES.md`
* `docs/PRIVACY_GUIDELINES.md`

### SEO

Lire :

* `docs/SEO_GUIDELINES.md`

### Internationalisation

Lire :

* `docs/I18N_GUIDELINES.md`

### Analytics

Lire :

* `docs/ANALYTICS_GUIDELINES.md`
* `docs/PRIVACY_GUIDELINES.md`

## PENDANT LE DÉVELOPPEMENT

Respecter les règles des documents pertinents.

Ne pas modifier des fichiers sans rapport avec la tâche.

Ne pas réécrire inutilement une architecture existante.

Réutiliser les composants, hooks, types et utilitaires existants lorsqu'ils sont adaptés.

## AVANT DE TERMINER

Vérifier :

* fonctionnalité ;
* responsive ;
* UI ;
* accessibilité ;
* gestion des erreurs ;
* sécurité si nécessaire ;
* tests pertinents ;
* absence de régression.

# DOCUMENTATION DU PROJET

## CAHIER DES CHARGES — OBLIGATOIRE

Le fichier :

`/docs/CAHIER_DES_CHARGES.md`

est le cahier des charges vivant et officiel de Dughu.

Après CHAQUE tâche de développement, l'agent DOIT vérifier si la modification effectuée concerne une fonctionnalité, un comportement, une interface ou une règle du produit.

Si oui, il DOIT mettre à jour :

`/docs/CAHIER_DES_CHARGES.md`

avant de considérer la tâche terminée.

### IMPORTANT

Ne jamais terminer une tâche importante sans avoir vérifié le cahier des charges.

Même si l'utilisateur ne demande pas explicitement de mettre à jour le cahier des charges, cette vérification est obligatoire.

### Avant de modifier le cahier des charges

Comparer :

1. l'état précédent du projet ;
2. les modifications effectuées ;
3. l'état actuel du code.

Le cahier des charges doit représenter la réalité actuelle du projet.

### Ne pas créer de doublon

Toujours modifier :

`/docs/CAHIER_DES_CHARGES.md`

Ne jamais créer :

- CAHIER_DES_CHARGES_V2.md
- CAHIER_DES_CHARGES_NEW.md
- CAHIER_DES_CHARGES_FINAL.md
- CAHIER_DES_CHARGES_UPDATED.md

### Vérification finale

Avant de répondre que la tâche est terminée, effectuer cette vérification :

[ ] Code terminé
[ ] Responsive vérifié
[ ] Gestion des erreurs vérifiée
[ ] Tests/vérifications effectués
[ ] CAHIER_DES_CHARGES.md vérifié
[ ] CHANGELOG.md mis à jour si nécessaire
[ ] ROADMAP.md mise à jour si nécessaire

## RÈGLE ABSOLUE

Ne commence jamais à coder immédiatement.

Commence par comprendre la tâche, lire les règles pertinentes et analyser le code existant.

Ne lis pas tous les documents `/docs` systématiquement.

Lis uniquement ceux qui sont pertinents pour la tâche.
