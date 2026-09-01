# DUGHU — Roadmap

## Objectif

La roadmap définit l'ordre général de construction de Dughu.

Elle peut évoluer selon les besoins du projet.

## Phase 1 — Fondation

* 🟢 Architecture Next.js
* 🟢 Configuration générale
* 🟢 Système UI
* 🟢 Responsive
* 🟡 Gestion globale des erreurs
* 🟡 Sécurité frontend

## Phase 2 — Authentification

* 🟢 Inscription
* 🟢 Connexion
* 🟡 Gestion complète de session
* ⚪ Récupération de compte

## Phase 3 — Réseau social

* 🟢 Publications
* 🟢 Likes
* 🟢 Commentaires
* 🟢 Republications
* 🟡 Timeline
* Publications et feed — lot 4 migré : services frontend `posts.service.ts`/`feed.service.ts`/`comments.service.ts`/`composer.service.ts`, types `post.types.ts`, plus aucun `fetch` direct dans le domaine (home, PostCard, GivePointsModal, PostComposer, RightSidebar, use-feed, use-suggestions, posts de profil, hashtags)
* Commentaires et réactions — lot 5 migré : service serveur `comments.server.ts` extrait de la route `/api/comments` (allégée), service frontend unique `comments.service.ts` (doublon retiré de `posts.service.ts`), derniers `fetch` de `ProfilePage`/`HashtagPage` migrés
* 🟡 Profil — lot 3 migré : service frontend `profile.service.ts`, types dédiés, hook `use-profile` (façade transitoire conservée), plus aucun `fetch` direct dans le domaine
* 🟢 Relations (lot 1 migré : services, hooks, types, instances Axios cliente/serveur, routes BFF allégées)

## Phase 4 — Stories

* 🟡 Création
* 🟡 Affichage
* ⚪ Navigation avancée
* ⚪ Interactions
* ⚪ Expiration automatique

> **Migration architecturale** : domaine Stories / Capsules / Flash migré vers l'architecture cible (services frontend `stories.service.ts` et `capsules.service.ts` sur l'instance Axios cliente, hooks `use-stories` / `use-capsules` / `use-flash` déléguant aux services, plus aucun `fetch` direct) — lot 7 terminé.

## Phase 5 — Communication

* 🟡 Notifications
* 🟢 Messages — lot 8 migré : service frontend `messages.service.ts` (8 endpoints sur l'instance Axios cliente), types `types/messages/message.types.ts` (façade `lib/messages.ts` conservée), `MessagesPageClient` / `ConversationPopup` / `ConversationSidebar` débranchés de l'ancien `apiClient` (supprimé, ainsi que son interceptor de redirection globale 401)
* ⚪ Conversations avancées
* ⚪ Appels si prévus

> **Migration architecturale** : la migration frontend fetch → Axios (lots 1 à 8) est terminée — plus aucun `fetch` direct dans les composants, hooks et services frontend ; le navigateur passe exclusivement par les services frontend sur l'instance Axios cliente `/api`. Les seuls `fetch` restants sont des appels serveur légitimes vers des API externes (`lib/dughu.ts`, `lib/utils.ts`).
>
> **Routes** : regroupement `(public)` / `(protected)` effectué (lot 10) — URLs publiques inchangées, `proxy.ts` conservé, build validé. Pas de groupe `(admin)` : aucune route d'administration distincte à ce jour.

## Phase 6 — Recherche

* 🟢 Recherche utilisateurs
* 🟢 Recherche publications
* 🟢 Recherche globale

> **Migration architecturale** : domaine Recherche migré vers l'architecture cible (types dédiés, mapper, services frontend/serveur, Route Handler allégé, instance Axios cliente avec AbortSignal) — lot 6 terminé.

## Phase 7 — Performance

* ⚪ Optimisation timeline
* ⚪ Cache
* ⚪ Lazy loading
* ⚪ Optimisation médias
* ⚪ Monitoring

## Phase 8 — PWA

* ⚪ Installation
* ⚪ Push notifications
* ⚪ Cache
* ⚪ Expérience mobile avancée

## Règle

La roadmap est indicative.

Ne pas implémenter automatiquement une fonctionnalité uniquement parce qu'elle apparaît dans cette roadmap.
