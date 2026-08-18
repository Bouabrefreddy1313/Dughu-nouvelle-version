# 🏗️ Refonte de la couche API — Guide de migration

> **Objectif** : sortir Prisma des composants/pages, centraliser les appels API avec Axios,
> et organiser le code en 3 couches claires : `types/` → `services/` → `hooks/`.
> Le projet fonctionne déjà en prod : **on refactore la plomberie, pas la maison**.

---

## 1. Le problème actuel (en une image)

Aujourd'hui, dans certaines pages/composants, on fait un peu comme si un **client de restaurant
allait directement en cuisine préparer son plat** : le composant appelle Prisma, va chercher les
données en base, les transforme, gère les erreurs... tout en même temps qu'il affiche l'UI.

Ça marche, mais :
- Si tu changes la recette (la logique de récupération des données), tu dois rouvrir tous les
  composants qui l'utilisent.
- Impossible de réutiliser la même logique ailleurs sans copier-coller.
- Impossible de tester la logique métier sans monter tout un composant React.
- Prisma tourne côté serveur uniquement (Node) : l'appeler depuis un composant qui peut être
  rendu côté client casse le modèle Next.js (ou force du `"use server"` partout, mélangeant les
  responsabilités).

**La bonne pratique Next.js** : les composants **ne parlent jamais directement** à la base de
données ou à une API externe. Ils parlent à des **hooks**, qui parlent à des **services**, qui
parlent à l'API (via Axios) — Prisma restant réservé aux **routes API / server actions**, jamais
au front.

---

## 2. L'architecture cible (analogie du restaurant)

| Dossier | Rôle | Analogie restaurant |
|---|---|---|
| `types/` | Définit à quoi ressemblent les données (interfaces, noms) | **Le menu** : décrit précisément chaque plat, sans le cuisiner |
| `services/` | Fait l'appel HTTP brut (Axios), ne connaît rien à React | **La cuisine** : prépare le plat exactement comme demandé, ne sait pas qui l'a commandé |
| `hooks/` | Orchestre l'appel du service + gère loading/erreur/état React | **Le serveur en salle** : prend la commande, l'apporte en cuisine, revient avec le plat (ou annonce un souci), garde le client informé pendant l'attente |
| Composants/Pages | Affichent l'UI | **Le client** : commande, attend, mange — ne va jamais en cuisine |

Règle d'or : **une flèche dans un seul sens**
```
Composant  →  hook  →  service  →  API (Axios)
```
Un composant n'importe jamais Axios directement. Un service n'importe jamais React.

---

## 3. Détail de chaque couche

### 3.1 `types/` — Le menu

Un fichier par domaine métier. Nom en `PascalCase`, suffixe explicite (`Dto`, `Payload`,
`Response` si utile pour distinguer la forme API de la forme UI).

```ts
// types/user.ts
export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
}
```

**Bonnes pratiques**
- Un type = une seule source de vérité, importé partout où il est utilisé (jamais redéfini localement).
- Séparer le type "tel que renvoyé par l'API" du type "tel qu'utilisé en UI" si une transformation
  a lieu (ex: dates en `string` côté API, en `Date` côté UI).

---

### 3.2 `services/` — La cuisine

Contient uniquement des fonctions pures qui font l'appel HTTP. **Aucun `useState`, aucun `useEffect`,
aucune logique React ici.**

```ts
// services/userService.ts
import { apiClient } from "@/lib/axios";
import type { User, CreateUserPayload } from "@/types/user";

export const userService = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>("/users");
    return data;
  },
  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },
  create: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await apiClient.post<User>("/users", payload);
    return data;
  },
};
```

Une instance Axios centralisée et configurée une seule fois :

```ts
// lib/axios.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

// Intercepteur central pour les erreurs (évite de répéter try/catch partout)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // log, formatage d'erreur uniforme, etc.
    return Promise.reject(error);
  }
);
```

**Bonnes pratiques**
- Un fichier de service par ressource/domaine (`userService`, `orderService`...), pas un
  fichier fourre-tout.
- Les services retournent des données typées (`Promise<User[]>`), jamais la réponse Axios brute.
- Aucun `try/catch` "métier" ici — laisse remonter l'erreur, elle sera gérée dans le hook.

---

### 3.3 `hooks/` — Le serveur en salle

C'est ici que vit l'état React : `loading`, `error`, `data`. Le hook appelle le service et
expose une interface simple au composant.

```ts
// hooks/useUsers.ts
import { useEffect, useState, useCallback } from "react";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";

export function useUsers() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const users = await userService.getAll();
      setData(users);
    } catch (err) {
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, loading, error, refetch: fetchUsers };
}
```

Utilisation dans un composant — **aucune trace d'Axios ni de Prisma** :

```tsx
// app/users/page.tsx
"use client";
import { useUsers } from "@/hooks/useUsers";

export default function UsersPage() {
  const { data, loading, error } = useUsers();

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>{error}</p>;

  return <ul>{data.map((u) => <li key={u.id}>{u.fullName}</li>)}</ul>;
}
```

**Bonnes pratiques**
- Un hook = une responsabilité (`useUsers`, `useUser(id)`, `useCreateUser()`), pas un hook
  géant qui fait tout.
- Si le projet grossit, envisager **React Query / TanStack Query** à la place de `useState`/`useEffect`
  manuel : cache automatique, invalidation, retry — le hook garde la même signature (`data`,
  `loading`, `error`), donc les composants n'ont rien à changer plus tard.

---

## 4. Où reste Prisma ?

Prisma ne disparaît pas : il **reste côté serveur uniquement**, dans les **routes API** (ou
Server Actions) — jamais importé dans un composant ni dans un hook.

```ts
// app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}
```

C'est cette route que `userService.getAll()` appelle via Axios. Le front ne sait même pas
que Prisma existe — exactement comme un client de restaurant ne sait pas ce qui se passe en cuisine.

---

## 5. Stratégie de migration — sans rien casser

Le projet tourne en prod, donc on avance **route par route**, jamais en big-bang.

1. **Geler le périmètre** : lister toutes les pages/composants qui appellent Prisma directement.
2. **Créer les 3 dossiers** (`types/`, `services/`, `hooks/`) s'ils n'existent pas.
3. **Pour chaque appel Prisma direct trouvé** :
   - a. Vérifier/créer la route API correspondante (`app/api/.../route.ts`) qui encapsule Prisma.
   - b. Créer le type dans `types/`.
   - c. Créer la fonction dans `services/`.
   - d. Créer le hook dans `hooks/`.
   - e. Remplacer l'appel direct dans le composant par le hook.
   - f. Tester que le comportement est identique (mêmes données, mêmes états de chargement/erreur).
4. **Commit atomique par ressource** (ex: "refacto: migration users vers services/hooks") —
   facile à review, facile à revert si besoin.
5. **Ne jamais toucher à deux ressources dans le même commit.**
6. Une fois toutes les ressources migrées, supprimer les imports Prisma désormais inutiles dans
   les composants.

**Checklist avant chaque commit**
- [ ] Le composant n'importe plus ni `@prisma/client` ni Axios directement.
- [ ] Le type est dans `types/`, importé (pas dupliqué).
- [ ] Le service ne contient aucune logique React.
- [ ] Le hook gère `loading` + `error` + `data`.
- [ ] Comportement fonctionnel identique à l'avant (mêmes données affichées).

---

## 6. Résumé — les règles à ne jamais casser

1. **Prisma** → uniquement dans `app/api/**/route.ts` (ou Server Actions), jamais côté client.
2. **Axios** → uniquement dans `services/`.
3. **État React (loading/error/data)** → uniquement dans `hooks/`.
4. **Types** → une seule définition par entité, dans `types/`, importée partout.
5. **Composants** → consomment des hooks, point final. Ils n'importent jamais Axios ni Prisma.
6. Migration **incrémentale**, une ressource à la fois, avec vérification fonctionnelle à chaque étape.
