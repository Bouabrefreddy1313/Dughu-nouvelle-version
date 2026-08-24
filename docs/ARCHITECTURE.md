# DUGHU — Architecture technique

## 1. Stack

Dughu utilise principalement :

* Next.js
* React
* TypeScript
* Tailwind CSS

Le backend et les API doivent être utilisés conformément à l'architecture actuelle du projet.

Ne pas remplacer une technologie existante sans nécessité.

---

# 2. Principe général

Avant de créer un nouveau fichier ou composant :

1. rechercher une fonctionnalité similaire ;
2. identifier les composants existants ;
3. vérifier les hooks existants ;
4. vérifier les utilitaires existants ;
5. vérifier les types existants ;
6. réutiliser ce qui existe lorsque possible.

---

# 3. Organisation des composants

Privilégier une organisation par fonctionnalité.

Exemple :

```text
components/
├── layout/
├── header/
├── sidebar/
├── posts/
├── stories/
├── comments/
├── messages/
├── notifications/
├── profile/
└── common/
```

Les composants génériques doivent être placés dans une zone appropriée comme `common`.

---

# 4. Composants

Un composant doit avoir une responsabilité claire.

Éviter les composants gigantesques contenant :

* UI ;
* logique métier ;
* appels API ;
* gestion de plusieurs fonctionnalités ;

dans un seul fichier.

Lorsqu'un composant devient trop complexe, envisager de séparer :

* sous-composants ;
* hooks ;
* services ;
* utilitaires.

---

# 5. Server / Client Components

Utiliser les Server Components lorsque possible.

Utiliser `"use client"` uniquement lorsqu'un composant nécessite réellement :

* état React ;
* événements utilisateur ;
* hooks client ;
* APIs navigateur ;
* interactions dynamiques.

Ne pas mettre `"use client"` partout.

---

# 6. Hooks

Les hooks personnalisés doivent être utilisés pour extraire les logiques réutilisables.

Exemple :

```text
hooks/
├── useAuth.ts
├── usePosts.ts
├── useNotifications.ts
└── useMessages.ts
```

Un hook doit avoir une responsabilité claire.

---

# 7. API

Centraliser autant que possible les appels API.

Éviter de répéter la même logique HTTP dans plusieurs composants.

Séparer autant que possible :

```text
UI
↓
Hook
↓
Service/API
↓
Backend
```

---

# 8. Types

Les types partagés doivent être centralisés lorsque cela améliore la cohérence.

Éviter de redéfinir le même type dans plusieurs fichiers.

---

# 9. État

Utiliser l'outil d'état adapté au besoin.

Ne pas introduire une nouvelle bibliothèque d'état sans nécessité.

Pour un état local simple :

```tsx
useState
```

Pour un état partagé complexe, utiliser la solution déjà adoptée par le projet.

---

# 10. Performance

Éviter :

* les appels API répétés ;
* les requêtes inutiles ;
* les re-renders inutiles ;
* les gros composants client ;
* les imports inutiles.

Pour les listes importantes comme la timeline, prévoir une stratégie adaptée lorsque nécessaire :

* pagination ;
* infinite scroll ;
* chargement progressif ;
* cache.

---

# 11. Images

Utiliser les mécanismes d'optimisation d'images de Next.js lorsque compatibles avec l'architecture du projet.

Ne pas charger inutilement des images énormes.

---

# 12. Gestion des erreurs

Les erreurs doivent être traitées proprement.

Éviter :

```tsx
try {
   ...
} catch {}
```

sans traitement.

Prévoir lorsque nécessaire :

* message utilisateur ;
* logging ;
* état d'erreur ;
* possibilité de réessayer.

---

# 13. Nommage

Utiliser des noms explicites.

Exemples :

```text
PostCard
StoryViewer
NotificationItem
MessageList
ProfileHeader
```

Éviter :

```text
Component1
TestComponent
Box
NewComponent
```

lorsqu'un nom métier plus précis est possible.

---

# 14. Modifications

Ne pas modifier plusieurs parties du projet sans rapport avec la tâche.

Si une modification nécessite réellement de toucher plusieurs fichiers :

* identifier les fichiers concernés ;
* expliquer leur rôle ;
* conserver la cohérence globale.

---

# 15. Refactoring

Ne pas effectuer un gros refactoring pendant une petite tâche sans nécessité.

Si un problème architectural important est découvert :

1. identifier le problème ;
2. vérifier son impact ;
3. proposer une amélioration ;
4. effectuer le changement de manière contrôlée.

---

# 16. Règle finale

L'architecture doit rester :

* modulaire ;
* évolutive ;
* maintenable ;
* performante ;
* compréhensible ;
* cohérente avec Next.js ;
* compatible avec le responsive Dughu.
