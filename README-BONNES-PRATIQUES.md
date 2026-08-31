# Bonnes pratiques — Réseau social Next.js (App Router)

> Complément du document de structure. Ici : les règles non négociables de sécurité, qualité, performance et maintenabilité. Objectif explicite : **zéro raccourci qui devient une dette technique dans 2 à 6 mois.**

---

## 1. Variables d'environnement — jamais d'appel en dur

**Règle absolue : aucun `process.env.X` dispersé dans les composants, services ou hooks.** Tout passe par un point d'entrée unique et validé.

```ts
// lib/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  API_INTERNAL_SECRET: z.string().min(1),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  API_INTERNAL_SECRET: process.env.API_INTERNAL_SECRET,
});
```

- Le reste du code importe `env` depuis `lib/config/env.ts`, jamais `process.env` directement.
- **Pourquoi** : si une variable est mal orthographiée, absente ou change de nom, l'erreur remonte **au démarrage**, pas en pleine navigation utilisateur trois mois plus tard.
- Seules les variables préfixées `NEXT_PUBLIC_` sont exposées au navigateur (bundle client) — c'est une règle du framework, pas une option. Toute variable sensible (secrets, clés internes) **ne doit jamais** porter ce préfixe.
- `.env.example` versionné avec toutes les clés (valeurs vides/factices). `.env.local` et tout fichier avec de vraies valeurs → dans `.gitignore`, jamais commité.
- Pas de valeurs "hardcodées en fallback" dans le code (`|| "http://localhost:3000"`) qui masquent un oubli de configuration en production.

---

## 2. Authentification et gestion des tokens — jamais de localStorage

**Le token d'authentification ne doit jamais être stocké en `localStorage` ni `sessionStorage`.** Ces deux storages sont accessibles à n'importe quel script JS exécuté dans la page — donc directement volables par une faille XSS (injection dans un commentaire, un post, un profil non échappé correctement : risque réel et classique dans un réseau social où le contenu généré par les utilisateurs est partout).

### Approche recommandée

- **Cookie `httpOnly`, `Secure`, `SameSite=Lax` ou `Strict`**, posé par le backend (ou par un Route Handler Next.js faisant office de BFF). Un cookie `httpOnly` est invisible et inaccessible depuis le JavaScript client → immunisé contre le vol par XSS.
- Le refresh token (longue durée) et l'access token (courte durée) sont **tous deux** en cookies `httpOnly`, jamais l'un des deux "juste pour simplifier le client".
- `middleware.ts` lit le cookie côté serveur pour protéger les routes `(protected)`/`(admin)` avant même que la page ne s'affiche (évite le flash de contenu protégé).
- Le `token-manager.ts` dans `lib/auth/` centralise la logique de refresh (intercepteur Axios sur 401 → tentative de refresh → rejoue la requête ou déconnecte).

### Ce qu'il ne faut jamais faire

- ❌ `localStorage.setItem("token", ...)`.
- ❌ Stocker le token dans un state React global sans persistance sécurisée en parallèle — le token disparaîtrait à chaque refresh de page.
- ❌ Passer le token dans l'URL (query params) — reste dans l'historique navigateur, les logs serveur, les headers `Referer`.
- ❌ Désactiver `Secure`/`SameSite` "pour tester en local plus vite" et oublier de les remettre en prod.

---

## 3. Gestion des rôles (RBAC)

- Une **matrice unique** rôle → permissions dans `lib/rbac/permissions.ts`, jamais de `if (user.role === "admin")` éparpillés dans les composants.
- Double contrôle systématique :
  1. **Frontend** (`middleware.ts` + guards de composants) : expérience utilisateur, évite d'afficher un bouton inutile.
  2. **Backend** : seule source de vérité réelle — le frontend ne fait **jamais** office de barrière de sécurité seule, car il est entièrement inspectable/contournable côté client.
- Ne jamais faire confiance à un rôle déduit du seul payload JWT décodé côté client sans vérification serveur sur les actions sensibles (suppression de compte, modération, etc.).

---

## 4. Couche API — services & hooks

- **Une seule instance Axios** (`lib/api/axios-instance.ts`), avec `baseURL` venant de `env.ts`, timeout défini, intercepteurs pour : ajout automatique des headers, gestion centralisée des erreurs 401/403/500, retry contrôlé (pas de retry infini).
- `services/` = fonctions pures typées, aucune logique de cache/UI. `hooks/` = orchestration (loading, erreur, cache, invalidation) au-dessus des services.
- Toujours typer la réponse (`Promise<PaginatedResponse<Post>>`), jamais `Promise<any>`.
- Gestion d'erreur centralisée et cohérente (format d'erreur unique remonté par les intercepteurs), pas de `try/catch` réinventé différemment dans chaque composant.
- **Annulation des requêtes** : utiliser `AbortController` ou l'annulation native de la lib de fetching pour les recherches (barre de recherche d'utilisateurs, par ex.) — sinon race conditions classiques (résultat d'une requête obsolète qui écrase le résultat le plus récent).

---

## 5. Performance (spécifique réseau social : feed infini, médias, temps réel)

- **Pagination/infinite scroll** géré par la lib de fetching (cache par page, pas de re-fetch complet à chaque scroll).
- Images : toujours `next/image`, jamais de `<img>` brut pour les avatars/médias postés — optimisation automatique, lazy loading.
- Composants lourds (éditeur de post riche, lecteur média) : `dynamic import` avec `ssr: false` si non nécessaire au premier rendu.
- Distinguer explicitement Server Components (fetch initial, SEO, pages profil publiques) et Client Components (`"use client"` uniquement où l'interactivité l'exige : like, composeur de post, chat temps réel). Ne pas mettre `"use client"` "par défaut sur tout" — ça annule les bénéfices du rendu serveur.
- Websocket/temps réel : une seule connexion partagée via `SocketContext`, pas une connexion par composant.

---

## 6. Qualité de code et prévention de la dette technique

- **TypeScript strict** activé (`strict: true`), pas de `any` toléré, pas de `// @ts-ignore` sans commentaire justifiant *pourquoi* et un ticket associé.
- **Un composant = une responsabilité.** Dès qu'un composant dépasse ~150-200 lignes ou mélange fetch + logique + affichage complexe, le découper.
- **Pas de logique dupliquée** : si la même transformation de données apparaît dans deux endroits, elle monte dans `lib/utils/` ou dans le mapper de `types/`.
- **Tests** : au minimum les hooks de données et les fonctions de `lib/` et `services/` (unitaires), plus quelques tests d'intégration sur les parcours critiques (login, publication de post). Ne pas repousser les tests "à plus tard" — c'est le premier sacrifié qui devient de la dette invisible.
- **Linting/formatting imposés** (ESLint + Prettier), CI qui bloque le merge si non conforme — pas une simple recommandation.
- **Revue de code obligatoire**, même en solo via checklist : structure respectée ? typage correct ? pas de token en localStorage ? pas d'appel API hors `services/` ?
- **Documenter les décisions d'architecture** (pourquoi tel choix de lib, tel pattern) dans un `ADR` (Architecture Decision Record) court plutôt que dans la mémoire de l'équipe.

---

## 7. Sécurité complémentaire (contenu généré par les utilisateurs)

- **Échapper/sanitizer tout contenu utilisateur affiché** (posts, bios, commentaires) — ne jamais utiliser `dangerouslySetInnerHTML` sans passer par une librairie de sanitization (DOMPurify ou équivalent) si du HTML enrichi est autorisé.
- Validation des inputs **côté client (UX) ET côté serveur (sécurité réelle)** — jamais l'un sans l'autre.
- Upload de médias : valider type MIME réel (pas juste l'extension), taille max, et ne jamais faire confiance au nom de fichier fourni par le client.
- Rate limiting sur les actions sensibles (login, création de post, follow en masse) — géré côté backend, mais le frontend doit gérer proprement les réponses 429.

---

## 8. Anti-patterns récurrents à bannir explicitement

| Raccourci tentant | Pourquoi c'est une dette | À faire à la place |
|---|---|---|
| Token en `localStorage` "pour aller plus vite" | Vol par XSS trivial | Cookie `httpOnly` + `Secure` |
| `process.env.X` inline partout | Erreurs silencieuses, config éclatée | `lib/config/env.ts` validé par Zod |
| `axios` importé dans un composant | Impossible à tester/mocker, logique dupliquée | Passer par `services/` |
| `any` pour "typer plus tard" | Le "plus tard" n'arrive jamais, bugs runtime | Types stricts dès le départ, mappers DTO → modèle |
| Rôle vérifié uniquement côté client | Contournable en 30 secondes via devtools | Vérification serveur systématique |
| Composant fourre-tout de 500 lignes | Illisible, non testable, régressions fréquentes | Découpage container/présentation |
| Pas de tests "on verra plus tard" | Dette qui s'accumule, régressions non détectées | Tests dès la première feature critique |
| Nouveau pattern de dossier ad hoc par feature | Incohérence, onboarding difficile | Respecter le document de structure, le mettre à jour si besoin réel |

---

## 9. Checklist avant chaque merge

- [ ] Aucun `process.env` en dehors de `lib/config/env.ts`
- [ ] Aucun token stocké en `localStorage`/`sessionStorage`
- [ ] Aucun appel `axios`/`fetch` en dehors de `services/`
- [ ] Types stricts, aucun `any` non justifié
- [ ] Vérification de rôle dupliquée côté serveur pour toute action sensible
- [ ] Composants respectent la séparation `components/` vs `app/_components`
- [ ] Tests ajoutés/mis à jour pour la logique modifiée
- [ ] Pas de secret ni de vraie valeur d'env commité

Ce document n'est pas figé : toute exception doit être **justifiée explicitement en revue de code**, jamais silencieuse.
