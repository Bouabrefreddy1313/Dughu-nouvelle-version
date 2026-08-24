# DUGHU — Security Guidelines

## 1. Principe général

La sécurité doit être prise en compte lors de toute fonctionnalité impliquant :

* authentification ;
* utilisateurs ;
* sessions ;
* API ;
* fichiers ;
* publications ;
* messages ;
* notifications ;
* permissions ;
* données personnelles.

Ne jamais faire confiance aux données provenant du navigateur.

---

# 2. Authentification

Ne jamais considérer l'utilisateur comme authentifié uniquement parce qu'une donnée existe dans :

* localStorage ;
* sessionStorage ;
* cookie contrôlé côté client ;
* état React.

L'authentification doit être validée côté serveur.

---

# 3. Tokens

Ne jamais exposer inutilement :

* access tokens ;
* refresh tokens ;
* secrets ;
* clés privées ;
* credentials backend ;

dans le code frontend.

Ne jamais placer de secret dans une variable `NEXT_PUBLIC_*`.

---

# 4. Variables d'environnement

Les secrets doivent rester dans les variables d'environnement appropriées.

Ne jamais écrire directement dans le code :

```text
API keys privées
JWT secrets
passwords
database credentials
private tokens
```

Les variables publiques et privées doivent être clairement distinguées.

---

# 5. API

Le frontend ne doit jamais être considéré comme une couche de sécurité.

Toute validation importante doit également être effectuée côté backend.

Exemples :

* permissions ;
* ownership d'une publication ;
* suppression ;
* modification ;
* rôles ;
* accès aux données.

---

# 6. Validation

Toutes les données utilisateur doivent être validées.

Cela concerne notamment :

* formulaires ;
* publications ;
* commentaires ;
* messages ;
* profils ;
* fichiers ;
* paramètres d'URL.

Ne jamais faire confiance à une valeur provenant directement de l'utilisateur.

---

# 7. XSS

Ne jamais injecter directement du HTML utilisateur sans nécessité et sans protection.

Éviter l'utilisation inutile de :

```tsx
dangerouslySetInnerHTML
```

Si son utilisation est indispensable, le contenu doit être correctement nettoyé et contrôlé.

---

# 8. Fichiers

Pour les uploads :

* vérifier le type ;
* vérifier la taille ;
* vérifier le format ;
* ne pas faire confiance uniquement à l'extension ;
* contrôler les permissions ;
* utiliser le système de stockage prévu par l'architecture.

---

# 9. Autorisations

Le frontend peut masquer une fonctionnalité, mais cela ne constitue pas une sécurité.

Exemple :

```tsx
{user.isAdmin && <AdminButton />}
```

Cela améliore l'interface mais ne remplace jamais la vérification backend.

---

# 10. Données sensibles

Ne pas afficher inutilement dans le frontend :

* informations privées ;
* tokens ;
* secrets ;
* données internes ;
* informations appartenant à d'autres utilisateurs.

Ne récupérer que les données nécessaires.

---

# 11. Cookies et sessions

Respecter les mécanismes sécurisés définis par l'architecture d'authentification du projet.

Ne pas modifier le système d'authentification existant sans analyser ses conséquences.

---

# 12. CSRF / CORS

Respecter la configuration actuelle du backend.

Ne pas désactiver une protection de sécurité simplement pour résoudre rapidement une erreur.

Ne jamais utiliser :

```text
Access-Control-Allow-Origin: *
```

comme solution automatique pour une application authentifiée sans comprendre les implications.

---

# 13. Logs

Ne jamais écrire dans les logs :

* mots de passe ;
* tokens ;
* cookies ;
* secrets ;
* données personnelles inutiles.

---

# 14. Dépendances

Avant d'ajouter une nouvelle bibliothèque :

* vérifier si une solution existe déjà ;
* éviter les dépendances inutiles ;
* utiliser des versions maintenues ;
* vérifier les risques connus lorsque nécessaire.

---

# 15. Erreurs

Ne pas afficher à l'utilisateur des informations internes telles que :

* stack traces ;
* chemins système ;
* secrets ;
* détails de base de données ;
* configuration serveur.

Afficher un message utilisateur approprié et conserver les détails techniques dans les logs sécurisés.

---

# 16. Principe de moindre privilège

Chaque utilisateur, composant ou service doit avoir uniquement les permissions nécessaires.

Ne pas donner des permissions supplémentaires simplement pour simplifier le développement.

---

# 17. Règle finale

Toute nouvelle fonctionnalité doit être analysée sous l'angle :

```text
Authentification
↓
Autorisation
↓
Validation
↓
Protection des données
↓
API sécurisée
↓
Frontend sécurisé
```

La sécurité ne doit jamais être sacrifiée pour accélérer le développement.
