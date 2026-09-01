# Structure de dossiers — Réseau social (Next.js App Router)

> **Objectif de ce document** : c'est la référence que l'IA (dans l'IDE) et l'équipe doivent suivre à la lettre avant de créer le moindre fichier. Il définit **où** chaque type de code doit vivre, **pourquoi**, et **ce qu'il ne faut jamais faire**. En cas de doute sur "où je mets ce fichier ?", ce document tranche — on ne réinvente pas l'organisation à chaque feature.

Basé sur les conventions officielles Next.js App Router (colocation, private folders `_dossier`, route groups `(groupe)`, répertoire `src/`) — cf. doc officielle : `nextjs.org/docs/app/getting-started/project-structure`.

---

## 0. Principe directeur : séparation stricte routing / logique / UI

Next.js App Router transforme **tout fichier dans `app/`** en route potentielle dès qu'il s'appelle `page.tsx` ou `route.ts`. Conséquence directe :

- `app/` ne contient **que** ce qui est lié au routing : pages, layouts, loading/error states, et des composants **strictement spécifiques à une route** (via des dossiers privés `_components`).
- Tout ce qui est réutilisable, logique métier, appels API, types, hooks → **sort de `app/`** et vit dans des dossiers dédiés à la racine de `src/`.

**Pourquoi** : si on mélange logique métier et routing, chaque refactor de route casse la logique, chaque changement d'API casse les pages, et il devient impossible de tester unitairement quoi que ce soit sans monter tout Next.js.

**À éviter absolument** : mettre un `service.ts`, un `hook.ts` ou une interface TypeScript directement dans `app/profil/[id]/`. Un seul cas toléré : un fichier `_components/` strictement non réutilisable ailleurs (ex : un composant d'illustration unique à une page d'onboarding).

---

## 1. Arborescence cible

```
src/
├── app/
│   ├── (public)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (protected)/
│   │   ├── feed/
│   │   │   ├── page.tsx
│   │   │   └── _components/        (composants 100% spécifiques à cette page)
│   │   ├── profil/[username]/page.tsx
│   │   ├── messages/[conversationId]/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── parametres/page.tsx
│   │   └── layout.tsx              (guarde d'accès, nav commune aux pages connectées)
│   ├── (admin)/
│   │   └── moderation/page.tsx     (routes réservées à un rôle précis)
│   ├── api/                        (Route Handlers = BFF, jamais de logique métier lourde ici)
│   ├── layout.tsx                  (layout racine : providers globaux)
│   ├── error.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   └── globals.css
│
├── components/
│   ├── ui/            → design system pur (Button, Input, Avatar, Modal, Skeleton…)
│   ├── layout/         → Header, Sidebar, Footer, BottomNav
│   ├── feed/           → composants réutilisables liés au feed (PostCard, PostComposer…)
│   ├── post/           → détail d'un post, actions (like, commentaire, partage)
│   ├── profile/        → composants profil (ProfileHeader, FollowButton, StatsBar…)
│   ├── messages/        → composants chat (MessageBubble, ConversationList…)
│   ├── notifications/  → composants notifications (NotificationItem…)
│   └── shared/         → composants transverses à plusieurs features (InfiniteScrollList, ConfirmDialog…)
│
├── services/
│   ├── api-client.ts            (instance Axios unique, ne pas en recréer ailleurs)
│   ├── auth/auth.service.ts
│   ├── posts/posts.service.ts
│   ├── users/users.service.ts
│   ├── messages/messages.service.ts
│   ├── notifications/notifications.service.ts
│   └── comments/comments.service.ts
│
├── hooks/
│   ├── auth/            (useAuth, useLogin, useRegister, useLogout)
│   ├── posts/           (usePosts, usePost, useCreatePost, useLikePost, useInfinitePosts)
│   ├── users/           (useUser, useFollowUser, useSearchUsers)
│   ├── messages/        (useConversations, useSendMessage, useRealtimeMessages)
│   ├── notifications/   (useNotifications, useMarkAsRead)
│   └── common/          (useDebounce, useIntersectionObserver, useMediaQuery, useLocalDraft)
│
├── types/
│   ├── auth/auth.types.ts
│   ├── posts/post.types.ts
│   ├── users/user.types.ts
│   ├── messages/message.types.ts
│   ├── notifications/notification.types.ts
│   └── common/           (ApiResponse<T>, PaginatedResponse<T>, ApiError, Role…)
│
├── contexts/
│   ├── AuthContext.tsx        (utilisateur courant, rôle, statut d'authentification)
│   ├── ThemeContext.tsx
│   └── SocketContext.tsx      (connexion websocket temps réel : messages, notifications live)
│
├── lib/
│   ├── config/
│   │   └── env.ts             (SEUL point d'accès aux variables d'environnement, validées)
│   ├── api/
│   │   ├── axios-instance.ts  (config Axios : baseURL, timeout, headers par défaut)
│   │   ├── interceptors.ts    (refresh token, gestion 401, logging erreurs)
│   │   └── endpoints.ts       (constantes d'URL, jamais de chaîne en dur dans les services)
│   ├── auth/
│   │   └── token-manager.ts   (lecture/écriture des tokens — JAMAIS localStorage, cf. README pratiques)
│   ├── rbac/
│   │   └── permissions.ts     (matrice rôle → permissions, helpers can())
│   ├── constants/
│   ├── validators/            (schémas Zod partagés pour formulaires + validation des réponses API)
│   └── utils/                 (formatDate, cn, slugify… fonctions pures sans dépendance métier)
│
├── store/                     (si state global nécessaire : Zustand/Redux — voir §5)
└── middleware.ts               (protection des routes par rôle, redirections auth)

public/
├── images/
├── icons/
└── fonts/
```

---

## 2. Rôle exact de chaque dossier

### `app/`
Contient **uniquement** : les segments de route, `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `route.ts`. Utiliser des **groupes de routes** `(public)`, `(protected)`, `(admin)` pour organiser sans impacter l'URL, et des **dossiers privés** `_components` pour un composant strictement local à une page (convention officielle Next.js : préfixe `_` = exclu du routing).

*À éviter* : dupliquer un composant dans `_components` alors qu'il est utilisé sur 2 pages → il doit migrer immédiatement dans `components/<feature>/`.

### `components/`
Uniquement de l'**UI présentationnelle**, si possible sans appel réseau direct. Un composant reçoit des props ou consomme un hook — il n'appelle jamais `services/` directement. Sous-dossiers par feature (`post/`, `profile/`…) + `ui/` pour le design system + `shared/` pour le transverse.

*Règle* : un composant qui grossit et mélange logique de fetch + affichage doit être scindé (composant "container" via un hook + composant "présentation" pur).

### `services/`
La **seule** couche autorisée à parler à l'instance Axios. Chaque service exporte des fonctions typées (`getPosts(): Promise<PaginatedResponse<Post>>`), un sous-dossier par groupe de features, aligné avec les ressources backend. Aucun composant ni hook ne doit importer `axios` directement — toujours passer par un service.

*À éviter* : mettre du `fetch`/`axios` dans un composant "pour aller vite" → dette immédiate, impossible à mocker en test, logique dupliquée.

### `hooks/`
Couche de **récupération et gestion d'état des données**, au-dessus des `services/`. C'est ici qu'on utilise React Query / SWR (ou équivalent) pour le cache, le loading, les erreurs, l'invalidation. Sous-dossiers par feature, cohérents avec `services/` et `types/`.

*Règle* : un hook appelle un service, jamais l'inverse. Un composant appelle un hook, jamais un service directement.

### `types/`
Interfaces TypeScript qui **mappent les champs renvoyés par le backend**, un sous-dossier par ressource. Objectif : un seul endroit à modifier si le backend change un champ (`created_at` → `createdAt` par ex., géré ici via un mapper, pas éparpillé dans les composants).

*Règle* : distinguer le **DTO brut** (`PostApiDTO`, snake_case si le backend l'envoie ainsi) du **modèle applicatif** (`Post`, camelCase) et écrire un mapper explicite. Ne jamais utiliser `any` ni désactiver le typing strict pour "avancer plus vite".

### `contexts/`
State global transverse et peu volatile : utilisateur courant, thème, connexion websocket. **Pas un fourre-tout** — si l'état est spécifique à une feature et se resynchronise avec le serveur, il va dans `hooks/` (React Query), pas dans un Context.

### `lib/`
Configuration et utilitaires bas niveau : client Axios, gestion des tokens, RBAC, validation des variables d'env, helpers purs. C'est la fondation technique, sans logique métier de feature.

### `store/` *(optionnel)*
Uniquement si un vrai besoin de state global client-side complexe existe (ex : brouillon de post multi-étapes, UI state partagé). Ne pas l'utiliser comme substitut au cache serveur (`hooks/` + React Query s'en charge déjà).

### `middleware.ts`
Point unique de vérification des rôles/permissions au niveau routing (redirection si non authentifié ou rôle insuffisant sur `(admin)` par ex.), en complément du RBAC applicatif dans `lib/rbac/`.

---

## 3. Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Composant | PascalCase | `PostCard.tsx` |
| Hook | camelCase, préfixe `use` | `usePosts.ts` |
| Service | camelCase, suffixe `.service.ts` | `posts.service.ts` |
| Type/Interface | PascalCase, suffixe `.types.ts` | `post.types.ts` |
| Dossier de feature | kebab-case ou singulier simple | `posts/`, `messages/` |
| Fichier de constantes | camelCase | `endpoints.ts` |

Cohérence stricte entre les noms de sous-dossiers de `services/`, `hooks/`, `types/` pour une même feature (`posts/` partout, pas `post/` d'un côté et `posts/` de l'autre).

---

## 4. Incohérences à trancher **avant** de coder (à statuer en équipe)

Ces points ne sont volontairement pas décidés ici — ils dépendent du contexte projet — mais **doivent être tranchés explicitement** pour éviter que chacun improvise :

1. **Librairie de fetching de données** : React Query, SWR, ou fetch natif + hooks maison ? Impacte directement la structure de `hooks/`.
2. **State manager global** : Zustand, Redux Toolkit, ou Context seul ? À ne choisir que si un vrai besoin transverse existe — ne pas ajouter "par précaution".
3. **Stratégie de rendu** : quelles pages en Server Components (fetch initial côté serveur) vs Client Components (interactions temps réel — feed, messagerie) ? À documenter route par route.
4. **Temps réel** : WebSocket direct, Socket.io, ou SSE pour notifications/messages ? Détermine le contenu de `SocketContext.tsx`.
5. **Validation de schéma** : Zod partagé entre formulaires client et validation des réponses API, ou deux outils distincts ? Un seul outil recommandé pour éviter la duplication de schémas.
6. **Rôles** : liste exacte des rôles (`user`, `moderator`, `admin`…) et matrice de permissions — à formaliser dans `lib/rbac/permissions.ts` avant d'écrire le premier `middleware.ts`.

**Ne jamais laisser l'IA ou un dev trancher ces points silencieusement dans un coin de code** — ce sont des décisions d'architecture qui doivent être visibles et documentées.

---

## 5. Ce qu'il ne faut jamais faire (résumé structurel)

- ❌ Logique métier, appel API ou type dans `app/`.
- ❌ Composant qui importe `axios`/`fetch` directement.
- ❌ Hook qui appelle un autre hook de feature différente en direct plutôt que de composer au niveau composant.
- ❌ Dossier `components/` plat sans sous-dossiers par feature dès que le projet dépasse quelques écrans.
- ❌ Dupliquer une interface de type dans deux features au lieu de la centraliser dans `types/common/`.
- ❌ Créer un nouveau pattern de dossier "juste pour cette feature" sans mettre à jour ce document.

Ce document doit être mis à jour à chaque décision structurante — un document de structure obsolète est pire qu'aucun document.
