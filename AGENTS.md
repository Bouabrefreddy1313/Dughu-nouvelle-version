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
Réutiliser les composants, hooks, types et utilitaires existants lorsqu'ils sont adaptés.

## SYSTÈME HTTP — AXIOS (OBLIGATOIRE)

Le projet a migré vers un système HTTP centralisé basé sur **deux instances Axios distinctes**. Ce système fait référence : **tout nouveau code réseau DOIT passer par lui**. Aucun `fetch` natif ne doit être utilisé côté frontend.

### 1. Instance Axios cliente (navigateur)

Fichier : `src/lib/api/client/axios-instance.ts`

- baseURL interne `/api`, `withCredentials: true`, timeout explicite, header `Accept` ;
- erreurs transformées en `ApiError` (`src/lib/api/api-error.ts`, messages français approuvés via `userMessage`) ;
- prise en charge d'`AbortSignal` ;
- **interdits** : secret, clé API, token en localStorage/sessionStorage, toast, redirection 401 globale, composant React.

Utilisée **exclusivement** par les services frontend (`src/services/**\*.service.ts`).

### 2. Instance Axios serveur

Fichier : `src/lib/api/server/dughu-instance.ts`

- marquée server-only ; token `X-AppApiToken` ajouté côté serveur uniquement ;
- configuration validée par `src/lib/config/env.ts` ; erreurs normalisées ;
- retry limité uniquement sur les lectures idempotentes ;
- jamais importable dans un composant client.

Utilisée **exclusivement** par les services serveur (`src/services/**\*.server.ts`), eux-mêmes appelés par les Route Handlers `/api`.

### 3. Flux obligatoire pour toute fonctionnalité

```
Composant/page
→ hook TanStack Query (src/hooks/<domaine>/)
→ service frontend (src/services/<domaine>/<domaine>.service.ts)
→ instance Axios cliente → Route Handler /api
→ service serveur (src/services/<domaine>/<domaine>.server.ts)
→ instance Axios serveur → API externe Dughu
```

### 4. Interdictions permanentes

- **Jamais** de `fetch` natif dans un composant, un hook, une page ou un service frontend ;
- **Jamais** d'import d'Axios, de l'instance cliente ou d'un service directement dans un composant ou un hook ;
- **Jamais** d'import d'un module serveur (`.server.ts`, `dughu-instance`) dans du code client ;
- **Jamais** d'exposition de secret, de `DUGHU_API_KEY` ou de réponse backend brute à l'utilisateur ;
- **Jamais** de retry automatique sur une mutation non idempotente.

Les types sont organisés par domaine dans `src/types/<domaine>/`. Les normalisations défensives vivent dans les mappers (`<domaine>.mapper.ts`) ou les services serveur — jamais dans les composants.


## AVANT DE TERMINER

Vérifier :

* fonctionnalité ;
* responsive ;
* UI ;
* accessibilité ;
* gestion des erreurs ;
* sécurité si nécessaire ;
* tests pertinents ;
* absence de régression ;
* appels HTTP conformes au système Axios (aucun `fetch` natif côté frontend, instances cliente/serveur utilisées correctement).

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
