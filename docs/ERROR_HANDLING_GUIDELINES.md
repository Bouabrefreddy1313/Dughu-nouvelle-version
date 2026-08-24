# DUGHU — Error Handling & User Feedback Guidelines

## 1. Objectif

Dughu ne doit jamais afficher directement à l'utilisateur les erreurs techniques provenant de :

* Next.js ;
* React ;
* navigateur ;
* fetch ;
* Axios ;
* API ;
* serveur ;
* base de données ;
* TypeScript ;
* exceptions JavaScript ;
* bibliothèques externes.

Les erreurs techniques doivent être interceptées, traitées et transformées en messages compréhensibles pour l'utilisateur.

---

# 2. Principe fondamental

L'utilisateur ne doit jamais voir une erreur technique brute.

Ne jamais afficher directement :

```text
TypeError: Cannot read properties of undefined
```

```text
500 Internal Server Error
```

```text
Failed to fetch
```

```text
NetworkError
```

```text
NEXT_NOT_FOUND
```

```text
Unhandled Runtime Error
```

```text
AxiosError
```

ou toute autre erreur technique.

---

# 3. Messages utilisateur

Les messages affichés doivent être :

* simples ;
* courts ;
* compréhensibles ;
* professionnels ;
* adaptés au contexte ;
* en français ;
* sans détails techniques inutiles.

Exemple :

Mauvais :

```text
Error: POST /api/posts returned 500
```

Bon :

```text
Une erreur est survenue lors de la publication.
Veuillez réessayer.
```

---

# 4. Types de notifications

Dughu doit utiliser plusieurs types de feedback.

## Success

Pour confirmer une action réussie.

Exemples :

```text
Publication créée avec succès.
Commentaire ajouté.
Publication supprimée.
Profil mis à jour.
Photo de profil mise à jour.
Message envoyé.
```

## Error

Pour signaler qu'une action n'a pas fonctionné.

Exemples :

```text
Impossible de publier votre contenu.
Impossible de supprimer cette publication.
Une erreur est survenue.
La connexion au serveur a échoué.
```

## Warning

Pour attirer l'attention avant une action ou lorsqu'une situation nécessite une intervention.

Exemples :

```text
Votre session arrive bientôt à expiration.
Votre connexion semble instable.
```

## Info

Pour fournir une information.

Exemple :

```text
Cette fonctionnalité sera bientôt disponible.
```

---

# 5. Système global de notifications

Ne pas créer un système de notification différent dans chaque composant.

Créer un système centralisé réutilisable.

Exemple :

```text
components/
└── ui/
    ├── Toast.tsx
    ├── ToastContainer.tsx
    ├── Alert.tsx
    ├── Modal.tsx
    └── ErrorMessage.tsx
```

Le système doit permettre d'afficher :

```text
success
error
warning
info
```

---

# 6. API et erreurs backend

Les réponses API doivent être transformées en messages utilisateur.

Exemple technique :

```text
HTTP 500
```

Ne doit jamais être affiché directement.

Afficher :

```text
Une erreur interne est survenue.
Veuillez réessayer dans quelques instants.
```

Pour une erreur réseau :

```text
Impossible de contacter le serveur.
Vérifiez votre connexion Internet et réessayez.
```

---

# 7. Erreurs de validation

Les erreurs de validation doivent être affichées à proximité du champ concerné lorsque cela est pertinent.

Exemple :

```text
Email
[.........................]

Adresse email invalide.
```

Pour un formulaire :

```text
Mot de passe
[.........................]

Le mot de passe doit respecter les exigences demandées.
```

Ne pas afficher uniquement une erreur générale lorsque l'utilisateur peut facilement identifier le champ concerné.

---

# 8. Erreurs générales

Lorsqu'une erreur ne peut pas être précisément identifiée :

```text
Une erreur est survenue.
Veuillez réessayer.
```

Ne jamais inventer une cause technique.

---

# 9. Erreurs réseau

Si le serveur est inaccessible :

```text
Impossible de contacter Dughu.
Vérifiez votre connexion Internet puis réessayez.
```

Si une requête expire :

```text
La requête prend trop de temps.
Veuillez réessayer.
```

---

# 10. Erreurs d'authentification

Ne jamais afficher les détails techniques.

Exemples :

```text
Votre session a expiré.
Veuillez vous reconnecter.
```

```text
Email ou mot de passe incorrect.
```

```text
Vous devez être connecté pour effectuer cette action.
```

---

# 11. Erreurs de permissions

Ne pas afficher les détails backend.

Afficher :

```text
Vous n'avez pas l'autorisation d'effectuer cette action.
```

---

# 12. Erreurs 404

Pour une page inexistante :

```text
Cette page n'existe pas.
```

Prévoir une interface Dughu personnalisée avec :

* illustration ;
* message ;
* bouton retour ;
* bouton retour à l'accueil.

Ne jamais afficher la page 404 par défaut de Next.js si une interface personnalisée est prévue.

---

# 13. Erreurs 500

Créer une interface personnalisée.

Exemple :

```text
Oups...

Dughu rencontre momentanément un problème.

Veuillez réessayer dans quelques instants.

[ Réessayer ]
```

Ne jamais afficher le stack trace ou les détails internes au public.

---

# 14. Error Boundary

Utiliser les mécanismes d'Error Boundary de React/Next.js pour intercepter les erreurs inattendues.

Prévoir notamment les fichiers Next.js adaptés lorsque nécessaire :

```text
error.tsx
global-error.tsx
not-found.tsx
```

Ces interfaces doivent respecter le design Dughu.

---

# 15. Logging

Les erreurs techniques doivent être conservées uniquement dans les logs appropriés lorsque cela est nécessaire au développement ou au monitoring.

Les logs peuvent contenir les détails techniques nécessaires au développeur.

Ils ne doivent jamais exposer de :

* mot de passe ;
* token ;
* secret ;
* donnée sensible inutile.

---

# 16. Production

En production :

* ne pas exposer les stack traces ;
* ne pas afficher les erreurs internes ;
* ne pas afficher les chemins de fichiers ;
* ne pas afficher les requêtes SQL ;
* ne pas afficher les détails du serveur ;
* ne pas afficher les secrets.

L'utilisateur reçoit uniquement un message convivial.

---

# 17. Développement

Même en développement, lorsqu'une erreur est destinée à l'utilisateur, utiliser le système de messages Dughu.

Les détails techniques peuvent rester visibles dans la console développeur lorsque cela est nécessaire au debugging.

Ne pas supprimer les logs utiles au développeur uniquement pour masquer les erreurs à l'utilisateur.

---

# 18. Actions sensibles

Pour les actions importantes comme :

* suppression d'une publication ;
* suppression d'un commentaire ;
* suppression d'un compte ;
* déconnexion de tous les appareils ;

utiliser une confirmation personnalisée.

Exemple :

```text
Supprimer cette publication ?

Cette action est irréversible.

[Annuler] [Supprimer]
```

---

# 19. Messages cohérents

Utiliser une formulation cohérente dans toute l'application.

Préférer :

```text
Une erreur est survenue.
```

plutôt que d'utiliser alternativement :

```text
Erreur !
Oups erreur
Error
Something went wrong
Problème
```

Les messages destinés à l'utilisateur doivent être en français.

---

# 20. Règle obligatoire pour l'agent IA

À chaque création ou modification d'une fonctionnalité :

1. Identifier les erreurs possibles.
2. Identifier les erreurs réseau.
3. Identifier les erreurs de validation.
4. Identifier les erreurs d'authentification.
5. Prévoir les états loading/error/success lorsque nécessaire.
6. Transformer les erreurs techniques en messages utilisateur.
7. Ne jamais afficher directement une exception technique.
8. Respecter le système de notifications Dughu.
9. Respecter le design Dughu.
10. Respecter le responsive.

Une fonctionnalité n'est pas considérée comme terminée si elle fonctionne uniquement dans le scénario idéal.

Elle doit également gérer proprement les erreurs et les cas inattendus.
