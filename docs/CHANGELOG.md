# DUGHU — Journal des modifications

Ce fichier conserve l'historique des évolutions importantes du projet.

## Format

Chaque entrée doit contenir :

* date ;
* fonctionnalité ;
* modifications principales ;
* éventuelles corrections importantes.

## 2026-09-08
### Événements — Implémentation complète du module Événements
* **Demande utilisateur** :
  - Créer le module Événements accessible depuis le bouton « Événements » de la barre latérale gauche avec 4 écrans/modales : liste, création/édition, détail (structuré en 3 zones), modale d'invitation.
  - Intégrer les endpoints backend `GET /events`, `GET /show/event/{event_id}/{user_id}`, `POST /events` (multipart/form-data), `DELETE /destroyEvent/{event_id}/{user_id}`, `POST /event_inscription`, `POST /event_interest`, `GET /getPostEvents/{event_id}/{user_id}`, `POST /userInvitedRegisteredEvents`, `POST /listInvitedEvents`.
* **Modifications effectuées** :
  - `src/components/sidebar/LeftSidebar.tsx` : activation du bouton « Événements » avec redirection vers `/events` et état actif (`active === "events"`).
  - `src/types/events/events.types.ts` : modèles complets (`DughuEvent`, `EventOrganizer`, `CreateEventInput`, `EventInviteInput`, `EventsListResponse`, `EventDetailResponse`, `EventToggleResponse`, `EventInvitedListResponse`).
  - `src/services/events/events.mapper.ts` : mappers défensifs normalisant les structures d'événements, dates, organisateurs, statuts (`isPassed`, `isGoing`, `isInterested`) et listes d'invités ; résolution complète des chemins relatifs d'images vers les URLs S3 absolues (`https://dughuprod.s3.amazonaws.com/...`) pour `cover` et `coverPath`.
  - `src/components/events/EventCard.tsx` & `EventDetailPage.tsx` : fiabilisation de l'affichage des images de couverture avec priorité à `coverPath`, mode `unoptimized` et gestion d'erreur `onError` avec repli propre.
  - `src/services/events/events.server.ts` : service serveur sécurisé avec instances Axios serveur (`dughuServerGet`, `dughuServerMultipart`, `dughuServerJson`, `dughuServerDelete`).
  - `src/app/api/events/route.ts` & sous-routes : Route Handlers Next.js pour `/api/events`, `/api/events/[id]`, `/api/events/[id]/inscription`, `/api/events/[id]/interest`, `/api/events/[id]/posts`, `/api/events/[id]/invite`, `/api/events/[id]/invited`.
  - `src/services/events/events.service.ts` : service client utilisant `apiClient` sans `fetch` natif conformément à `AGENTS.md`.
  - `src/hooks/queries/use-events.ts` : hooks TanStack Query avec gestion de cache (`useEventsList`, `useEventDetail`, `useCreateEventMutation`, `useUpdateEventMutation`, `useDeleteEventMutation`, `useToggleEventInscriptionMutation`, `useToggleEventInterestMutation`, `useEventPosts`, `useInviteUserToEventMutation`, `useInvitedUsers`).
  - `src/components/events/EventCountdown.tsx` : compte à rebours en 4 pastilles arrondies (Jours, Heures, Min, Sec) mis à jour chaque seconde côté client avec indicateurs clairs.
  - `src/components/events/EventShareDropdown.tsx` : menu de partage social multi-plateformes et copie de lien avec bouton vert « PARTAGER ».
  - `src/components/events/EventInviteModal.tsx` : modale d'invitation avec recherche debouncée (~400ms), liste d'amis, pré-cochage des invités via `POST /listInvitedEvents`, envoi d'invitation optimiste via `POST /userInvitedRegisteredEvents` et bouton fermer.
  - `src/components/events/EventCard.tsx` : carte d'événement responsive avec ratio 16:9, badge date flottant, localisation, organisateur, compteurs, et badge distinctif vert « À venir » avec puce pulsante (ou « Passé »).
  - `src/components/events/EventListPage.tsx` & `events.mapper.ts` : tri prioritaire systématique positionnant tous les événements à venir en tête de liste (par date croissante), suivis des événements passés ; messages et actions adaptés pour l'onglet « À venir ».
  - `src/components/events/EventFormPage.tsx` : formulaire de création et modification avec upload de couverture 16:9, validation stricte, sélecteurs date/heure et intégration du composant `LocationAutocomplete`.
  - `src/components/events/LocationAutocomplete.tsx` & `src/app/api/places/autocomplete/route.ts` : autocomplétion intelligente des adresses et lieux Google Maps avec recherche en temps réel (debounce ~300ms), support Google Places API si configurée et fallback haute précision OSM/Photon mondial, navigation au clavier et sélection instantanée.
  - `src/components/events/EventDetailPage.tsx` : page détail structurée en 3 zones (bandeau du haut avec couverture et countdown + actions, colonne gauche avec infos/maps interactive/description, colonne droite avec PostComposer et publications de l'événement).
  - `src/app/(protected)/events/page.tsx`, `src/app/(protected)/events/create/page.tsx`, `src/app/(protected)/events/[id]/page.tsx`, `src/app/(protected)/events/[id]/edit/page.tsx` : routes Next.js avec métadonnées SEO.
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour du cahier des charges avec les spécifications du module Événements.

### Finances — Implémentation complète du module de financement participatif
* **Demande utilisateur** :
  - Créer le module Finances complet connecté au bouton « Finance » de la barre latérale gauche.
  - Implémenter les 3 écrans (Liste `/finance`, Création/Édition `/finance/create` et `/finance/[id]/edit`, Détail `/finance/[id]`) identiques aux spécifications et maquettes.
  - Intégrer les endpoints backend `GET /finance`, `GET /financeUser/{user_id}`, `GET /showFinance/{id}`, `POST /finance` (multipart), `DELETE /finance/{id}`, `POST /finance/don`.
* **Modifications effectuées** :
  - `src/components/sidebar/LeftSidebar.tsx` : activation de l'entrée « Finance » avec redirection `/finance` et gestion de l'état actif ; connexion du bouton « Dealtoo » vers `https://dealtoo.co/` (ouverture sécurisée dans un nouvel onglet).
  - `src/lib/api/server/dughu-instance.ts` : ajout de l'utilitaire `dughuServerDelete` pour les suppressions idempotentes protégées côté serveur.
  - `src/types/finance/finance.types.ts` : typage complet des modèles du domaine Finances (`FinanceCampaign`, `FinanceAuthor`, `FinanceQueryParams`, `CreateFinanceInput`, `FinanceDonationInput`, réponses API).
  - `src/services/finance/finance.mapper.ts` : mappers défensifs avec gestion de tous les formats numériques, des dates, des avatars et du calcul du pourcentage de progression.
  - `src/services/finance/finance.server.ts` : service serveur avec instances Axios protégées appelant les routes backend Dughu.
  - `src/services/finance/finance.service.ts` : service frontend centralisé appelant les Route Handlers `/api/finance`.
  - `src/hooks/queries/use-finance.ts` : hooks TanStack Query pour les listes (globale et utilisateur), le détail, et les mutations (création/édition, suppression, don).
  - `src/app/api/finance/route.ts`, `src/app/api/finance/user/[userId]/route.ts`, `src/app/api/finance/[id]/route.ts`, `src/app/api/finance/don/route.ts` : Route Handlers Next.js avec validation stricte et sécurité de session.
  - `src/components/finance/FinanceCard.tsx` : carte de financement avec image 16:9, menu contextuel ⋮ (Modifier/Supprimer) pour le créateur, ligne auteur, montant en orange et barre de progression.
  - `src/components/finance/FinanceListPage.tsx` : page principale avec barre de recherche rapide (debounce ~400ms), onglets « Parcourir » et « Mes demandes », bouton pill « + CRÉER » (#8B5E34) et grille responsive 2 colonnes.
  - `src/components/finance/FinanceFormPage.tsx` : écran de création et d'édition avec bandeau marron en dégradé, champs requis, zone de dépôt d'image avec aperçu et bouton « 🖼 Choisir une image ».
  - `src/components/finance/FinanceDetailPage.tsx` : écran détail en 2 colonnes avec image plein format, bloc auteur, description complète, carte de progression avec indicateurs colorés, bandeau vert « ✓ Objectif atteint ! », modal de don et menu déroulant de partage.
  - `src/components/finance/FinanceDonationModal.tsx` & `FinanceShareDropdown.tsx` : modal de don en points et menu déroulant de partage multi-plateformes (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn, copie de lien).
  - `src/app/(protected)/finance/page.tsx`, `src/app/(protected)/finance/create/page.tsx`, `src/app/(protected)/finance/[id]/page.tsx`, `src/app/(protected)/finance/[id]/edit/page.tsx` : routes protégées Next.js avec métadonnées SEO.
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour avec la documentation complète du module Finances.

### Notifications — Implémentation du système complet In-App & Web Push
* **Demande utilisateur** :
  - Mettre en place un système complet de notifications In-App (bannières interactives en direct) et Push (notifications système / arrière-plan).
* **Modifications effectuées** :
  - `public/sw.js` : création du Service Worker pour la gestion des événements Web Push et du clic sur notification (`notificationclick` focalisant la fenêtre Dughu ou ouvrant l'URL de l'interaction).
  - `src/lib/audio/notification-sound.ts` : synthétiseur Web Audio API émettant un carillon discret et harmonique (C5 -> E5) lors de l'arrivée d'une notification In-App sans ressource externe.
  - `src/lib/notifications/notification-preferences.ts` : gestionnaire de préférences locales (`inAppEnabled`, `pushEnabled`, `soundEnabled`, `promptDismissed`).
  - `src/hooks/notifications/use-push-notifications.ts` : hook gérant l'enregistrement du Service Worker, la demande de permission `Notification.requestPermission()` et l'envoi de notifications système quand l'onglet est masqué.
  - `src/hooks/notifications/use-in-app-notifications.ts` : hook surveillant les nouvelles notifications non lues en continu (polling 15s) avec queue de bannières in-app au premier plan et bascule vers les notifications push système en arrière-plan (`document.hidden`).
  - `src/components/notifications/InAppNotificationBanner.tsx` : composant de bannière flottante interactive avec avatar, icône de type, titre, texte, minuteur visuel de 6s avec barre de progression, bouton fermer et redirection directe au clic.
  - `src/components/notifications/PushPermissionPrompt.tsx` : bandeau non-bloquant invitant à activer les notifications push avec bénéfices clairs.
  - `src/components/notifications/NotificationManager.tsx` : composant coordinateur global monté dans `MainLayout.tsx` pour couvrir l'ensemble des pages connectées.
  - `src/components/profile/NotificationSettingsPanel.tsx` & `ProfilePreferencesPage.tsx` : intégration des interrupteurs de contrôle des notifications In-App, Push et Sonores dans les paramètres du profil.
  - `src/app/api/notifications/push-subscription/route.ts` : Route Handler BFF pour synchroniser les souscriptions Web Push avec la session utilisateur.
  - `src/app/globals.css` : ajout de l'animation `@keyframes inapp-progress` pour la barre de temporisation de la bannière In-App.
  - `docs/CAHIER_DES_CHARGES.md` : documentation complète de la section Notifications In-App & Push.

### Notifications — Synchronisation exacte du compteur de la cloche (non lues du jour et réinitialisation à 00h00) & Masquage du mode sombre
* **Demande utilisateur** :
  - Masquer la fonctionnalité de mode sombre dans l'interface.
  - Corriger le compteur de notifications affiché sur la cloche du Header : il doit correspondre au nombre réel de notifications non lues reçues durant la journée en cours et se réinitialiser automatiquement à 0 chaque jour à minuit (00h00:00).
* **Modifications effectuées** :
  - `src/components/layout/Header.tsx` : utilisation de `unreadCount` sur le badge rouge de l'icône cloche et l'attribut `aria-label` ; retrait du bouton de bascule `<ThemeToggle variant="icon" />`.
  - `src/hooks/queries/use-notifications.ts` :
    - Filtrage strict des notifications non lues (`seen === 0` et non masquées localement) reçues depuis 00h00 aujourd'hui (`ts >= startOfToday`).
    - Programmation d'un timer précis ciblant minuit (00h00:00) pour provoquer une réévaluation et un refetch instantané, garantissant un passage automatique à 0 chaque jour sans nécessiter de rechargement manuel.
  - `src/components/layout/ProfileMenu.tsx` : masquage de `<ThemeToggle variant="menu" />` et de son séparateur dans le menu déroulant du profil.
  - `src/components/profile/ProfilePreferencesPage.tsx` : retrait de l'élément « Affichage et thème » de la liste des paramètres généraux et du panneau de sélection segmenté.
  - `src/app/layout.tsx` & `src/components/theme/ThemeProvider.tsx` : neutralisation de l'activation automatique du mode sombre afin d'initialiser l'application en mode clair standard.
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour des sections Notifications et Mode Sombre.

### Mode Sombre — Inversion des textes noirs/sombres et conteneurs des capsules
* **Demande utilisateur** :
  - En mode sombre, tous les textes écrits en noir doivent devenir blancs.
  - La carte/conteneur des 3 capsules du fil d'actualité est blanche en mode sombre, la rendre sombre/noire.
* **Modifications effectuées** :
  - `src/app/globals.css` : ajout d'une règle globale CSS sous `.dark` ciblant les classes de couleur de texte noir/sombre (`text-[#050505]`, `text-[#1C1E21]`, `text-[#1F1F1F]`, `text-[#2D2D2D]`, `text-[#212121]`, `text-[#111827]`, `text-[#0f1419]`, `text-black`, `text-gray-900`, `text-zinc-900`, `text-neutral-900`, etc.) qui ne disposent pas d'une classe `dark:text-` explicite (`:not([class*="dark:text-"])`) afin de les convertir en `#F3F4F6`.
  - `src/components/capsule/CapsuleRail.tsx` : passage du conteneur des 3 capsules du fil d'actualité (squelette et carte principale) en `bg-white dark:bg-[#1E1E1E] border-gray-100 dark:border-white/10` avec titre `text-[#2D2D2D] dark:text-white`.
  - `src/components/feed/PostCard.tsx` : ajout explicite de `dark:text-[#F3F4F6]` sur le texte principal de la publication et le bloc de publication parente repartagée (`dark:bg-[#252525] dark:border-white/10`).
  - `src/components/feed/CommentBody.tsx`, `FeedBody.tsx`, `FeedCard.tsx` : conversion des textes noirs et pills de fichiers joints en mode sombre (`dark:text-[#F3F4F6]`, `dark:bg-[#2A2A2A]`).
  - `src/components/capsule/CapsuleSidebar.tsx`, `CapsulesPage.tsx`, `CapsulePointsView.tsx`, `CapsulePointsTable.tsx` : uniformisation complète des arrière-plans (`dark:bg-[#1E1E1E]`), bordures (`dark:border-white/10`) et typographies (`dark:text-white`, `dark:text-zinc-400`).
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour de la documentation du mode sombre.

### Tendances — Épuration de la page (suppression du conteneur d'en-tête, filtres et badges de classement)
* **Demande utilisateur** :
  - Supprimer le conteneur en haut de la page `/tendances` (titre « Tendances », badge « En direct », sous-titre explicatif et filtres).
  - Supprimer également les badges de classement au-dessus de chaque publication (« #1 Tendance Dughu », « #2 Tendance », compteur d'interactions).
  - Présenter directement les cartes de publications de façon fluide et épurée.
* **Modifications effectuées** :
  - `src/components/trending/TrendingPage.tsx` : suppression du conteneur d'en-tête et des badges de rang/interactions (`#1 Tendance Dughu`, `#2 Tendance`, etc.) situés au-dessus des cartes ; tri direct par score d'engagement ; nettoyage des imports et fonctions devenus superflus (`getInteractionScore`, `Flame`, `Trophy`, `activeFilter`, `refreshing`).
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour de la documentation de la section Tendances.

### Capsules — Retrait de l'indicateur de vues sur les vignettes (feed et page /capsules)
* **Demande utilisateur** :
  - Supprimer le badge de nombre de vues affiché en haut à droite des 3 capsules dans le fil d'actualité ainsi que sur les cartes de la page `/capsules`.
  - Conserver l'affichage des vues exclusivement au moment où l'utilisateur visionne/lit la capsule dans la visionneuse.
* **Modifications effectuées** :
  - `src/components/capsule/CapsuleCard.tsx` : retrait de l'icône `Eye` et du badge de vues superposé en haut à droite (`capsule.viewsCount`), composant partagé par `CapsuleRail` (bloc des 3 capsules du feed) et `CapsulesPage` (grille de la page dédiée).
  - `src/components/capsule/CapsuleViewer.tsx` : l'affichage des vues lors de la lecture dans la visionneuse plein écran reste actif sur la barre d'actions latérale.
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour de la documentation du module Capsules.

### Fil d'actualité — Distribution aléatoire des publications d'espaces (pages / groupes)
* **Demande utilisateur** :
  - Éviter que les publications provenant des espaces (pages / groupes) ne s'accumulent systématiquement tout en haut du fil d'actualité.
  - Distribuer ces publications à des positions aléatoires réparties à travers le flux de posts classiques.
* **Modifications effectuées** :
  - `src/app/api/posts/route.ts` :
    - Détection unifiée des publications d'espaces via `isSpacePost` (tag `isSpacePost`, `post.page`, `post.author.pageId`, `post.group`).
    - Marquage explicite des publications issues de `dughuApi.getPostPageUser` avec `isSpacePost: true`.
    - Réécriture de `mergeFeedPosts` : séparation des publications classiques (triées chronologiquement) et des publications d'espaces (mélangées via Fisher-Yates), puis insertion à des positions aléatoires évitant le monopole du tout premier élément lorsque d'autres publications sont disponibles.
  - `docs/CAHIER_DES_CHARGES.md` : mise à jour de la section Publications avec la règle de distribution aléatoire des publications d'espaces.

## 2026-09-07
### Mode Sombre (Dark Mode) — Implémentation complète de la plateforme avec bascule manuelle et automatique
* **Demande utilisateur** :
  - Implémenter un mode sombre (dark mode) complet sur toute la plateforme Dughu avec possibilité de bascule manuelle par l'utilisateur.
  - Système de thème : `ThemeProvider` gérant 3 états (`light`, `dark`, `system`), persistance `localStorage` (`dughu-theme`), classe `dark` sur `<html>`, script inline anti-FOUC dans `<head>`.
  - Boutons de bascule : Header (icône animée soleil/lune), Menu utilisateur du profil, Paramètres généraux (`/profile/preferences`).
  - Transition douce, palette soignée adaptée à l'identité visuelle Dughu (préservation de l'accent marron `#985810`).
* **Modifications effectuées** :
  - **Gestionnaire de thème (`src/components/theme/ThemeProvider.tsx`)** :
    - Contexte `ThemeProvider` et hook `useTheme` avec typages `Theme` (`light` | `dark` | `system`) et `ResolvedTheme` (`light` | `dark`).
    - Initialisation résiliente depuis `localStorage` (`dughu-theme`) et synchronisation réactive avec `window.matchMedia("(prefers-color-scheme: dark)")`.
    - Bascule instantanée de la classe `.dark` sur `document.documentElement`.
  - **Bouton et sélecteur de thème (`src/components/theme/ThemeToggle.tsx`)** :
    - 3 variantes : `icon` (pour le header avec animation de rotation), `menu` (pour le dropdown de profil) et `segmented` (pour les paramètres de préférences).
  - **Configuration globale Tailwind CSS v4 & Variables (`src/app/globals.css`)** :
    - Définition de `@custom-variant dark (&:where(.dark, .dark *));`.
    - Définition des variables de couleurs `:root` et `.dark` (`--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, etc.).
    - Transitions douces de couleurs `transition-colors duration-200`.
  - **Disposition racine & Anti-FOUC (`src/app/layout.tsx`)** :
    - Injection du script JavaScript inline synchrone dans `<head>` pour appliquer `.dark` avant le premier rendu visuel.
    - Ajout de `suppressHydrationWarning` sur `<html>`.
    - Enveloppement de l'arbre applicatif dans `<ThemeProvider>`.
  - **Composants de base et de mise en page** :
    - `Card.tsx` : arrière-plan surélevé `dark:bg-[#1E1E1E]` et bordures `dark:border-white/10`.
    - `MainLayout.tsx` : fond principal `dark:bg-[#121212]`.
    - `Header.tsx` : intégration du `ThemeToggle` (variante icône), barres de recherche, notifications et boutons adaptés en mode sombre.
    - `ProfileMenu.tsx` : intégration du sélecteur de thème `menu` et adaptation des liens/modale de déconnexion.
    - `GlobalSearch.tsx` : champ de saisie, popover de résultats, filtres et historique en mode sombre.
    - `LeftSidebar.tsx` & `RightSidebar.tsx` : navigation, cartes de tendances, suggestions de groupes et activités récentes.
    - `MobileBottomNav.tsx` : barre de navigation mobile `dark:bg-[#1A1A1A]/95` avec icônes contrastées.
  - **Fil d'actualité & Compositeur** :
    - `PostComposer.tsx` : champ replié, fenêtre modale, zone de texte, sélecteurs d'espaces et de confidentialité, et palette de couleurs en mode sombre.
    - `PostCard.tsx` : carte de publication, menu à 3 points, actions de réaction/partage, liste et formulaire de commentaires, bulles de réponses.
  - **Messagerie & Notifications** :
    - `NotificationDropdown.tsx` & `NotificationCard.tsx` : onglets, squelettes, badges et cartes de notifications.
    - `ConversationSidebar.tsx` & `ConversationPopup.tsx` : liste de conversations, bulles de messages et champ d'envoi.
  - **Paramètres de préférences (`src/components/profile/ProfilePreferencesPage.tsx`)** :
    - Ajout de l'entrée « Thème de l'application » avec le sélecteur `ThemeToggle` en variante segmentée.
* **Vérification** :
  - Compilation TypeScript (`npx tsc --noEmit`) : 0 erreur.
  - Cahier des charges (`docs/CAHIER_DES_CHARGES.md`) mis à jour.

* **Demande utilisateur** :
  - Pouvoir ajouter / créer des posts d'espaces directement depuis le fil (`ok dans le feed je veux pouvoir ajouter les pots des espace`).
* **Modifications effectuées** :
  - **Compositeur de publication (`src/components/composer/PostComposer.tsx`)** :
    - Prise en charge des espaces administrés (`spaces: ComposerSpace[]`, `selectedSpaceId`, `onSpaceSelect`).
    - Sélecteur d'identité déroulant dans le compositeur permettant de basculer entre le profil personnel et chacun des espaces administrés (avec avatar et nom d'espace).
    - Mise à jour du déclencheur compact affichant l'identité et le placeholder de l'espace sélectionné.
    - Transmission du champ `pageId` lors de la soumission (`onSubmit`).
  - **Onglet Actualité des espaces (`src/components/pages/PagesFeedTab.tsx`)** :
    - Récupération des espaces possédés et administrés via `usePagesList("administered")` et `usePagesList("mine")`.
    - Intégration du `PostComposer` en tête de fil avec sélecteur d'espace pour les administrateurs/propriétaires d'espace.
    - Gestion de la publication avec transmission de `page_id` vers l'API `POST /post` et rafraîchissement immédiat du flux.
    - Rendu du compositeur même si le fil ne contient encore aucun post (permettant la première publication).
  - **Détail d'espace (`src/components/pages/SpaceDetailPage.tsx`)** :
    - Ajout du compositeur `PostComposer` dans l'onglet « Posts » pour les administrateurs de l'espace (`isAdmin`), permettant de publier directement sous l'identité de l'espace.
  - **Fil d'accueil principal (`src/app/(protected)/home/page.tsx`)** :
    - Chargement des espaces administrés de l'utilisateur et transmission au `PostComposer` d'accueil.
    - Prise en charge de `pageId` dans `handlePostSubmit` pour publier en tant qu'espace depuis le fil d'accueil.
    - Prise en charge des publications d'espaces sur les cartes `PostCard` du fil d'accueil (bouton J'aime d'espace interactif).
  - **Route API posts (`src/app/api/posts/route.ts`)** :
    - Fusion chronologique des publications des espaces (`getPostPageUser`) avec les publications d'utilisateurs (`getPostAll` / `getPostAllRepost`) via `mergeFeedPosts`, garantissant que les posts des espaces apparaissent aussi dans le fil d'accueil.
* **Vérification** :
  - TypeScript vérifié (`npx tsc --noEmit`) sans aucune erreur.
  - Cahier des charges vivant (`docs/CAHIER_DES_CHARGES.md`) mis à jour.

### Espaces — Correction du Like d'un espace (état du bouton J'aime et message de toast)
* **Demande utilisateur** :
  - Lors du clic sur le bouton « J'aime » d'un espace, le message « Like retiré » s'affichait au lieu de confirmer l'ajout du like (« Espace aimé ! ❤️ »).
  - Le bouton restait sur l'état « J'aime » au lieu de passer à « Aimé », permettant de réappuyer indéfiniment sans mise à jour visible.
* **Cause identifiée** :
  - L'API backend Dughu renvoie `{ success: true, message: "...", active: true|false }` pour `POST /likePage`.
  - Le service serveur `pages.server.ts` ne testait que `raw?.is_like`, qui était `undefined`. `isLike` était donc évalué à `false` à chaque like, provoquant l'affichage du toast « Like retiré. » et la réinitialisation de l'état du bouton à non-aimé (`isLiked = false`).
  - Dans le flux des publications (`PagesFeedTab`), l'état initial `initialPageLiked` n'était pas extrait depuis le champ `p.page.is_like` dans `mapPost`.
* **Modifications effectuées** :
  - **Service serveur (`src/services/pages/pages.server.ts`)** : extraction robuste du statut de like lisant `active` (retourné par l'API), ainsi que `is_like`, `isLike`, `liked` (valeurs booléennes, numériques 1/0 et textuelles).
  - **Service client (`src/services/pages/pages.service.ts`)** : support du passage optionnel de `userId` tout en préservant `signal`.
  - **Mappeur de publication (`src/lib/dughu.ts`)** : mappage de `isLiked` sur `pageAuthor` et `page` depuis `p.page.is_like` pour que les cartes du flux d'actualité démarrent avec le bon statut.
  - **Hook (`src/hooks/pages/use-pages.ts`)** : synchronisation optimiste et confirmation de l'état `isLiked` dans le cache de détail TanStack Query (`onSuccess`).
  - **Composants UI (`SpaceDetailPage.tsx`, `PagesFeedTab.tsx`, `PostCard.tsx`, `PageLikeButton.tsx`)** : transmission de `userId`, affichage du toast approprié (« Espace aimé ! ❤️ ») et disparition automatique du bouton « J'aime » dès que l'espace est aimé (`!isPageLiked`), aligné sur le comportement du bouton « Suivre ».
* **Vérification** :
  - TypeScript vérifié (`npx tsc --noEmit`) sans aucune erreur.
  - Test en direct sur l'API backend validant la bascule `active: true` puis `active: false`.
  - Documentation mise à jour (`CAHIER_DES_CHARGES.md`).

### Canaux — Intégration complète des endpoints de notifications de canal (reçues, traitées, suppression et adhésion)
* **Demande utilisateur** :
  - Intégrer les endpoints spécifiques aux notifications de canal :
    - Réception des notifications : `GET /receivedNotifications?user_id={user_id}&canal_id={canal_id}&page={page}`.
    - Suppression d'une notification : `DELETE /delecteNotifications/{id}` avec `user_id` et `canal_id`.
    - Notifications de demandes d'adhésion traitées : `GET /processedNotifications?user_id={user_id}&canal_id={canal_id}`.
    - Transmission systématique des paramètres `user_id` et `canal_id`.
* **Modifications effectuées** :
  - **Mappeur (`src/services/canal/canal.mapper.ts`)** :
    - Déballage défensif des conteneurs `raw.receivedNotifications` et `raw.processedNotifications` dans `mapCanalNotifications` (`data`, pagination, `has_more`).
    - Normalisation enrichie dans `mapCanalNotification` (`senderAvatar` résolu via `normalizeCanalMediaUrl`, support de `text`/`body`/`content`, etc.).
  - **Services Serveur & Route Handlers (`src/services/canal/canal.server.ts`, `src/app/api/canal/**`)** :
    - `getReceivedNotifications` et `getProcessedNotifications` : support de la pagination (`page`) et passage de `user_id` et `canal_id`.
    - `deleteNotification` : appel vers `/delecteNotifications/{id}` avec `user_id` et `canal_id` en query params.
    - `handleJoinRequest` : transmission de `canal_id` avec `user_id` et `accept` (1 ou 0).
  - **Hooks & Composants UI (`use-canal-notifications.ts`, `CanalSettingsModal.tsx`)** :
    - Dans la modale de gestion du canal (`CanalSettingsModal`), onglet « Notifications & Adhésions » enrichi de deux sous-onglets : « En attente » (`useReceivedNotifications`) et « Traitées » (`useProcessedNotifications`).
    - Ajout du bouton de suppression d'une notification branché sur `useDeleteNotification(canal.id)`.
    - Invalidation réactive du cache `["canal", "notifications"]` lors des actions d'acceptation/refus/suppression.
  - **Documentation** :
    - Mise à jour de `docs/CAHIER_DES_CHARGES.md` et `docs/CHANGELOG.md`.
* **Vérification** :
  - `npx tsc --noEmit` validé avec 0 erreur.
  - Tests des endpoints en direct sur l'API backend (`DELETE /delecteNotifications/{id}`, `GET /receivedNotifications`, `GET /processedNotifications`).
* **Demande utilisateur** :
  - Corriger le bug de catégorisation où certaines catégories affichaient un contenu vide en raison d'un mapping incomplet/incorrect entre les types API et les catégories du front.
  - Créer une table de correspondance centralisée type (+ type2 optionnel) -> catégorie d'affichage pour les 15 catégories du front.
  - Intégrer les correspondances confirmées : `join_group` -> Groupe, `reaction_post` -> Réactions, `invite_page` (`type2: notification`) -> Espaces, `points_bonus_inc` -> Points, `gain` (`type2: points_gain`) -> Points.
  - Structure extensible pour toutes les autres catégories, sans correspondance devinée par texte arbitraire.
  - L'onglet « Tout » affiche toutes les notifications sans distinction.
  - Règle Satrivium : regrouper toutes les notifications issues de Satrivium dans l'onglet « Satrivium IA ».
  - Exploitation des champs de pagination renvoyés par l'API (`total`, `current_page`, `per_page`, `last_page`, `has_more`) et accumulation progressive sans écrasement.
  - Affichage informatif de `unread_count` côté back (« • X non lues ») sans modifier la règle des 24h glissantes du badge du header.
* **Modifications effectuées** :
  - **Mappeur (`src/services/notifications/notifications.mapper.ts`)** :
    - Définition et exportation de `NOTIF_TYPE_TO_CATEGORY` répertoriant les correspondances confirmées et les types réels identifiés en base.
    - Création de `resolveNotificationCategory(type, type2, notifierName, text)` et de `BACKEND_SUPPORTED_FILTERS`.
    - Refactorisation de `filterNotificationItemByCategory` pour baser le filtrage strictement sur la table de correspondance sans déduction textuelle parasite.
    - Inclusion de toutes les notifications de Satrivium dans la catégorie « Satrivium IA ».
  - **Hooks (`src/hooks/queries/use-notifications.ts`)** :
    - Exposition de `apiUnreadCount` (valeur brute retournée par l'API).
  - **Page Notifications (`src/components/notifications/NotificationsPage.tsx`)** :
    - Délégation automatique au backend pour les filtres nativement supportés (`points`, `poke`, `capsules`, `event`, `akwaplay`, `group`) et requête `all` avec filtrage front strict pour les autres.
    - Accumulation des notifications au fil des pages (`loadedNotifications`), réinitialisée au changement de catégorie.
    - Affichage de `apiUnreadCount` dans l'en-tête.
  - **Documentation** :
    - Mise à jour de `docs/CAHIER_DES_CHARGES.md` et `docs/CHANGELOG.md`.
* **Vérification** :
  - `npx tsc --noEmit` validé avec 0 erreur.
  - Script de test unitaire validé sur les 5 exemples réels : `join_group` (Groupe), `reaction_post` (Réactions), `invite_page` (Espaces), `points_bonus_inc` (Points + Satrivium), `gain` (Points + Satrivium), aucune fuite dans Commentaires.

### Notifications — Titre « Satrivium » obligatoire pour toutes les notifications d'attribution et de retrait de points
* **Demande utilisateur** :
  - Pour toute notification relative à une attribution ou un retrait de points, le titre affiché doit impérativement être « Satrivium ».
* **Modifications effectuées** :
  - **Mappeur (`src/services/notifications/notifications.mapper.ts`)** :
    - Élargissement de la fonction de détection `isPointNotification` pour couvrir l'ensemble des attributions et retraits de points (`gain`, `retrait`, déductions, bonus).
    - Normalisation systématique du champ `title` et de `notifier.fullName` à `"Satrivium"` pour toute notification de points ou relative à l'IA Satrivium.
    - Conservation de l'icône fixe `/images/logoSat/souriire.png`.
  - **Types (`src/types/notifications/notification.types.ts`)** :
    - Ajout de la propriété `title?: string` sur l'interface `NotificationItem`.
  - **Composant UI (`src/components/notifications/NotificationCard.tsx`)** :
    - Affichage du titre en gras (`displayTitle`) au-dessus du message de la notification pour toutes les notifications de points et Satrivium.
  - **Documentation** :
    - Mise à jour de `docs/CAHIER_DES_CHARGES.md` et `docs/CHANGELOG.md`.
* **Vérification** :
  - `npx tsc --noEmit` validé avec 0 erreur.
  - Test de l'endpoint local `/api/notifications?filter=points` vérifié : `title` et `notifierName` valent tous deux `"Satrivium"`.

### Akwaplay — Carte spéciale vidéo AkwaplayPostCard dans le fil d'actualité et le profil utilisateur
* **Demande utilisateur** :
  - Affichage automatique des vidéos publiées sur Akwaplay sous forme de carte spéciale dans deux endroits :
    1. Le fil d'actualité général (`/home`).
    2. Le profil de l'utilisateur qui a posté (onglet des publications).
  - Design de la carte adapté aux couleurs de Dughu :
    - En-tête : logo `akp.png` circulaire, texte contextuel (« Akwaplay · Suggestion pour vous » ou « Akwaplay · Nouvelle publication »), bouton « ✕ » pour masquer/fermer la carte.
    - Zone vidéo : miniature en grand format (coins arrondis), bouton Play circulaire centré en superposition, badge de durée en bas à droite (ex. « 00:05 »).
    - Zone infos : titre de la vidéo en gras, description en texte gris, ligne de statistiques (icône pouce + likes, icône œil + vues).
    - Bouton CTA en bas : pleine largeur, icône play + « Regarder sur Akwaplay », couleur principale Dughu (`#A35A2A`), redirection vers `/akwaplay/watch?v={id}`.
  - Détection automatique basée sur le type de post ou la présence de données Akwaplay.
  - Statistiques réelles (likes, vues) synchronisées.
* **Modifications effectuées** :
  - **Composant UI (`src/components/feed/AkwaplayPostCard.tsx`)** :
    - Composant réutilisable `AkwaplayPostCard` conforme aux maquettes et à la charte Dughu.
    - Format 16:9 élégant avec Play circulaire au hover, badge de durée, statistiques en direct et bouton CTA `#A35A2A`.
  - **Normalisation des données (`src/lib/dughu.ts`)** :
    - Extension de `mapPost` pour détecter les posts Akwaplay (`postType === "akwaplay"`, `postType === "akwaplay_video"`, `p.akwaplay`).
    - Extraction et formatage de `akwaplayData` (`videoId`, `title`, `description`, `thumbnail`, `duration`, `likesCount`, `viewsCount`).
  - **Fil d'actualité (`src/app/(protected)/home/page.tsx`)** :
    - Rendu conditionnel de `AkwaplayPostCard` lors de la présence d'une vidéo Akwaplay.
    - Gestion du masquage de la carte au clic sur « ✕ » via mise à jour du state local.
  - **Page de profil (`src/components/profile/ProfilePage.tsx`)** :
    - Rendu des cartes `AkwaplayPostCard` dans l'onglet des publications (« Mes posts »).
    - Fusion réactive avec `userAkwaVideos` pour que toute vidéo Akwaplay publiée apparaisse immédiatement sans attendre la création différée de post.
  - **Documentation** :
    - Mise à jour de `docs/CAHIER_DES_CHARGES.md` et `docs/CHANGELOG.md`.
* **Vérification** :
  - `npx tsc --noEmit` exécuté avec 0 erreur.
  - Test de l'API locale vérifié : détection réussie de `isAkwaplayVideo: true` et extraction correcte de `akwaplayData`.

### Notifications — Page dédiée « Toutes les notifications » et compteur de badge 24h glissant
* **Demande utilisateur** :
  - **Page « Toutes les notifications » (`/notifications`)** : accessible depuis le nouveau lien « Voir plus de notifications » du dropdown de notifications du header.
  - Système d'onglets de catégories horizontaux (15 catégories : Tout, Relation, Points, Badges, Pokes, Commentaire, Réactions, Capsules, Événement, Akwaplay, Finances, Groupe, Espaces, Canaux, Satrivium IA) avec « Tout » actif par défaut.
  - Appel dynamique à `GET /getNotifications/{user_id}?filter={valeur}` selon la catégorie cliquée.
  - Règle spéciale Satrivium IA : affichage obligatoire de l'icône fixe `/images/logoSat/souriire.png` à la place de l'avatar pour toute notification relative à Satrivium.
  - Pagination / défilement par catégorie et redirection vers l'URL cible (avec redirection sécurisée vers `/points` pour les notifications de points) en marquant la notification comme lue.
  - **Badge du Header (fenêtre glissante 24h)** :
    - Le badge sur l'icône de cloche du header affiche le nombre de notifications dont `created_at > now() - 24h`, indépendamment du statut `seen`.
    - Réinitialisation dynamique sans intervention utilisateur et mise à jour périodique via polling 30s.
* **Modifications effectuées** :
  - **Types (`src/types/notifications/notification.types.ts`)** :
    - Définition de `NotificationCategory` et de la constante `NOTIFICATION_CATEGORIES` (15 catégories).
    - Extension du type `NotificationFilter` pour supporter l'ensemble des filtres de catégories.
  - **Mappeur (`src/services/notifications/notifications.mapper.ts`)** :
    - Fonction `parseNotificationDate` pour l'analyse cross-browser des horodatages MySQL et ISO.
    - Règle Satrivium IA intégrée (`isSatriviumNotification`) : affectation automatique de l'avatar `/images/logoSat/souriire.png`.
  - **Hooks (`src/hooks/queries/use-notifications.ts`)** :
    - Calcul de `badgeCount24h` dans `useNotificationUnreadCount` basé sur `created_at > now() - 24h`.
  - **Composants UI** :
    - Nouveau composant partagé `NotificationCard` (`src/components/notifications/NotificationCard.tsx`) gérant l'icône fixe pour Satrivium et pour toutes les notifications d'attribution de points (`/images/logoSat/souriire.png`), les badges d'icônes thématiques, le texte, la date relative et la puce d'état.
    - Filtrage strict des catégories (`filterNotificationItemByCategory`) : exclusion catégorique des attributions de points (ex. bonus de points pour premier commentaire/flash) de la catégorie « Commentaire », « Réactions » et des autres catégories pour éviter toute pollution des flux thématiques.
    - Mise à jour de `NotificationDropdown.tsx` : utilisation de `NotificationCard` et ajout du bouton « Voir plus de notifications » menant à `/notifications`.
    - Mise à jour de `Header.tsx` : badge branché sur `badgeCount24h`.
    - Nouvelle page `NotificationsPage.tsx` (`src/components/notifications/NotificationsPage.tsx`) avec barre d'onglets défilable, rafraîchissement, marquage global, états vides par catégorie et pagination.
    - Route Next.js protégée `src/app/(protected)/notifications/page.tsx`.
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur. Route protégée vérifiée via curl (HTTP 307 vers /login si non connecté).

### Notifications — Module complet d'affichage et d'envoi de notifications
* **Demande utilisateur** :
  - **Affichage (icône cloche du header)** :
    - Appel à `GET /getNotifications/{user_id}?filter={filter}` avec filtre dynamique (`all`, `poke`, `unread`).
    - Panneau déroulant / popover responsive listant les notifications avec avatar, nom de l'expéditeur (`notifier.fullName`), texte explicatif, date relative (`timeAgo`) et distinction visuelle lu / non lu (`seen === 0` vs `seen === 1`).
    - Badge dynamique sur la cloche du header affichant le nombre de notifications non lues.
    - Clic sur une notification : redirection vers la ressource ciblée (`url` ou `full_link`) et marquage comme lu (synchronisé en localStorage et route API prête).
    - Icône distincte par type de notification (pokes, réactions de post, commentaires de post, likes de page, adhésions de groupe, demandes d'amitié, bonus de points).
    - Pagination (« Charger plus »), squelettes de chargement, état vide et rafraîchissement automatique toutes les 30 secondes.
  - **Envoi (suite à une action)** :
    - Endpoint `POST /sendCustomNotification` avec payload `{ receiver_user_id, title, description, typeNotif, url }`.
    - Service réutilisable centralisé (`sendNotification`) et fonctions spécialisées pour les actions déclenchantes (réaction sur un post, commentaire, poke, demande de relation, etc.).
* **Modifications effectuées** :
  - **Types (`src/types/notifications/notification.types.ts`)** :
    - Définition de `NotificationNotifier`, `NotificationItem`, `NotificationsResponse`, `NotificationFilter`, `SendNotificationPayload`, `SendNotificationResponse`.
  - **Mappeur (`src/services/notifications/notifications.mapper.ts`)** :
    - Normalisation des réponses du backend Dughu (`result.data` et `result.unread_count`).
    - Résolution sécurisée des avatars via `resolveMediaUrl`.
    - Normalisation des URLs (`normalizeNotificationUrl`) pour transformer les identifiants numériques de posts en `/post/{id}`, les URLs de profils API en `/profile/{username}`, etc.
  - **Service Serveur (`src/services/notifications/notifications.server.ts`)** :
    - `getNotificationsServer` : appel à `GET /getNotifications/{userId}?filter={filter}&page={page}` via l'instance Axios serveur `dughuServerGet`.
    - `sendCustomNotificationServer` : appel à `POST /sendCustomNotification` via `dughuServerJson` avec transmission du token Bearer de session utilisateur.
  - **Routes BFF internes (`/api/notifications`)** :
    - `GET /api/notifications` : résolution de la session utilisateur via `dughu-user`, validation des query params `filter` et `page`.
    - `POST /api/notifications/send` : envoi sécurisé de notification avec payload validé.
    - `POST /api/notifications/read` : route de marquage comme lu.
  - **Service Frontend & Hooks TanStack Query (`src/services/notifications/notifications.service.ts` & `src/hooks/queries/use-notifications.ts`)** :
    - Service frontend utilisant l'instance Axios cliente `apiClient`.
    - Fonctions spécialisées : `notifyPostReaction`, `notifyPostComment`, `notifyPoke`, `notifyRelationRequest`, `notifyGroupJoin`, `notifyPageLike`.
    - Hook `useNotifications` avec suivi local des notifications lues (`localStorage`), filtre par onglet (« Toutes », « Pokes », « Non lues »), pagination « Charger plus ».
    - Hook `useNotificationUnreadCount` avec polling automatique toutes les 30 secondes.
    - Mutations `useMarkNotificationRead` et `useSendNotification`.
  - **Composants UI (`src/components/notifications/NotificationDropdown.tsx` & `src/components/layout/Header.tsx`)** :
    - `NotificationDropdown` : popover moderne avec en-tête, onglets de filtre, liste avec badge de type coloré, bouton « Tout marquer comme lu », pagination, état vide et squelettes.
    - `Header` : badge dynamique relié à `unreadCount`, ouverture/fermeture au clic sur la cloche, fermeture au clic extérieur et lors d'une navigation.
  - **Intégration des déclencheurs d'actions** :
    - Publications dans le fil d'accueil (`home/page.tsx`) et tendances (`TrendingPage.tsx`) : envoi automatique de notification lors de l'ajout d'une réaction (`notifyPostReaction`) et lors de l'ajout d'un commentaire (`notifyPostComment`).
    - Pokes (`use-pokes.ts`) : envoi automatique de notification lors d'un poke initial ou en retour (`notifyPoke`).
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur. Route `/api/notifications` testée et sécurisée.

### Publications — Affichage du nombre de vues (`views_count`) à côté des commentaires et partages
* **Demande utilisateur** : afficher les vues de chaque post avec le champ `views_count`, placé à côté des icônes du nombre de commentaires et de partages.
* **Modifications effectuées** :
  - **Normalisation des données (`src/lib/dughu.ts`)** :
    - Extraction de `views_count` (avec replis défensifs sur `viewsCount`, `views`, `view_count`, `count_views`) dans la fonction `mapPost`.
    - Exposition de `views_count`, `viewsCount` et `_count.views` dans l'objet post normalisé.
  - **Composant UI (`src/components/feed/PostCard.tsx`)** :
    - Prise en charge des props `viewsCount` et `views_count`.
    - Affichage de l'icône d'œil (`Eye` de `lucide-react`) avec le nombre de vues formaté via `formatNumber` (notation compacte `1.4k`, `2.5M` ou décompte exact) et info-bulle détaillée au survol (« X vue(s) »).
    - Positionnement élégant dans la rangée de compteurs à côté des boutons de commentaires et de partages.
  - **Intégration dans les flux applicatifs** :
    - `src/app/(protected)/home/page.tsx` (fil d'actualité principal)
    - `src/components/trending/TrendingPage.tsx` (page des tendances)
    - `src/components/saved/SavedPage.tsx` (page des sauvegardes)
    - `src/components/profile/ProfilePage.tsx` (profil utilisateur)
    - `src/components/pages/PagesFeedTab.tsx` & `SpaceDetailPage.tsx` (espaces / pages)
    - `src/components/hashtags/HashtagPage.tsx` (hashtags)
    - `src/components/groups/GroupsPage.tsx` (groupes)
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur.

### Tendances — Page dédiée `/tendances` liée au bouton de la sidebar gauche
* **Demande utilisateur** : création de la page « Tendances » liée au bouton « Tendances » dans la sidebar gauche, affichant les publications avec le plus d'interactions (J'aime, commentaires et partages).
* **Modifications effectuées** :
  - **Sidebar gauche (`src/components/sidebar/LeftSidebar.tsx`)** :
    - Activation de l'élément « Tendances » avec `onClick={() => { router.push("/tendances"); onCloseMobile?.() }}`, état actif `active={active === "tendances"}`.
  - **Page Tendances (`src/app/(protected)/tendances/page.tsx` & `src/components/trending/TrendingPage.tsx`)** :
    - Calcul du score d'interaction global : `score = likes + commentaires + partages`.
    - Tri dynamique des publications par ordre décroissant de popularité.
    - Filtres de classement : « Toutes les interactions » (par défaut), « Plus aimées », « Plus commentées », « Plus partagées ».
    - Badges visuels de classement pour chaque publication (#1 Tendance Dughu avec flamme animée et dégradé doré, #2 et #3 Tendance avec trophées, #4+).
    - Affichage du détail chiffré des interactions pour chaque publication.
    - Utilisation complète du composant `PostCard` avec gestion optimiste des likes/réactions, ajout de commentaires, republications (directes et avec texte), sauvegardes, menu 3 points et modale de confirmation de suppression.
    - Squelettes de chargement, état vide avec redirection vers le fil d'actualité, et bouton de rafraîchissement manuel.
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur. Route HTTP testée avec succès (200 OK).

### Affiliation & Parrainage — Page dédiée `/affiliation` connectée à la sidebar gauche
* **Demande utilisateur** : création de la page « Affiliation » connectée au bouton « Affiliation » de la sidebar gauche, reprenant fidèlement le design avec l'en-tête utilisateur, le bloc promotionnel jaune « Gagnez 100 Points », le champ de lien avec bouton copier, le bloc de partage multi-réseaux et la liste paginée des utilisateurs inscrits avec gestion des états (chargement, erreur, vide).
* **Modifications effectuées** :
  - **Types du domaine (`src/types/affiliate/affiliate.types.ts`)** :
    - Définition de `AffiliateUser`, `AffiliatePagination`, `AffiliateDetails`, `AffiliateInfoResponse` et `AffiliateUsersResponse`.
  - **Mappeur de données (`src/services/affiliate/affiliate.mapper.ts`)** :
    - Extraction défensive du lien de promotion `shareLink` et des données utilisateur depuis `GET /getSpecificUser/{userId}/{userId}`.
    - Normalisation des utilisateurs inscrits et pagination Laravel depuis `GET /getAffiliateUsers/{userId}?page={page}` (avec formatage des dates en français).
  - **Services Serveur & Client (`src/services/affiliate/`)** :
    - Service serveur (`affiliate.server.ts`) utilisant l'instance Axios serveur `dughuServerGet` (token `X-AppApiToken` protégé).
    - Service client (`affiliate.service.ts`) utilisant l'instance Axios cliente `apiClient` (/api/affiliate et /api/affiliate/users).
  - **Route Handlers (`src/app/api/affiliate/`)** :
    - `GET /api/affiliate` : résolution de l'utilisateur connecté via cookie/paramètre et renvoi des détails de parrainage.
    - `GET /api/affiliate/users` : récupération paginée des personnes référées.
  - **Hook TanStack Query (`src/hooks/queries/use-affiliate.ts`)** :
    - `useAffiliateInfo` et `useAffiliateUsers` avec gestion du cache, du rafraîchissement et des états de chargement.
  - **Composant UI (`src/components/affiliate/AffiliatePage.tsx`)** :
    - En-tête avec avatar de l'utilisateur, nom et sous-titre « Lien de promotion ».
    - Bloc promotionnel jaune vif `#F5C33B` : accroche « Gagnez 100 Points », champ avec sélection automatique au clic, bouton de copie interactif avec retour visuel (toast, fond vert `#25D366`, icône coche) et illustration mégaphone avec badge `+100 pts`.
    - Bloc « Partager sur » avec icônes officielles Facebook, X (Twitter), WhatsApp, Pinterest et LinkedIn ouvrant les fenêtres de partage.
    - Section « Utilisateurs inscrits via votre lien » : état vide soigné, liste avec avatars, noms et dates d'inscription, et pagination Précédent/Suivant.
  - **Navigation (`src/components/sidebar/LeftSidebar.tsx`)** :
    - Liaison du bouton « Affiliation » avec `router.push('/affiliation')`, état actif `active === 'affiliation'`, et fermeture automatique sur mobile.
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur.

### Publications — Affichage dynamique des icônes de réactions par type distinct sous chaque post
* **Demande utilisateur** : correction du bug où quelle que soit la réaction choisie (cœur ❤️, grrr 😠, pouce 👍, etc.), l'icône affichée sous le post était toujours un pouce codé en dur. Afficher désormais une icône par type distinct présent côte à côte avant le nombre total de réactions (ex. `❤️ 😠 👍 12`), de façon dynamique et réactive.
* **Modifications effectuées** :
  - **Constantes et mapping de réactions (`src/lib/constants.ts`)** :
    - Ajout des fonctions utilitaires exportées `normalizeReactionType` et `getReactionMeta`.
    - Prise en charge exhaustive des variantes (IDs numériques `1` à `6` et extensions Dughu `11`..`15`, noms anglais/français `love`/`jadore`/`heart`/`coeur`, `angry`/`grrr`/`colere`, `haha`/`rire`, `sad`/`triste`, `wow`, `like`/`pouce`, et objets `{ reaction, name }`).
  - **Extraction des réactions dans l'API Dughu (`src/lib/dughu.ts`)** :
    - Amélioration de `extractReactionSummary` pour lire la structure Dughu native `p.reaction = [{ post_id, reaction, count }]`, ainsi que `p.reactions`, `p.likes`, et `p.reaction_counts`.
    - Détection et normalisation automatique des types de réactions avec `toReactionTypeName`.
    - Calcul du nombre de likes basé sur la somme des réactions détaillées si `p.likes` est absent ou nul.
    - Normalisation de `myReaction` avec `toReactionTypeName`.
  - **Composant d'affichage des réactions (`src/components/feed/ReactionSummary.tsx`)** :
    - Élimination du fallback forcé vers `[{ type: "like" }]`.
    - Déduplication et regroupement par type distinct de réaction (`normalizeReactionType`).
    - Tri par fréquence décroissante et affichage des icônes distinctes côte à côte (jusqu'à la totalité des types distincts présents), suivies du nombre total de réactions.
    - Info-bulle détaillée affichant la répartition par emoji et décompte (`❤️ 4 • 😠 2 • 👍 6`).
  - **Composants PostCard, PostMediaLightbox et ReactionUsersModal** :
    - Utilisation cohérente de `normalizeReactionType` et `getReactionMeta` pour garantir la mise à jour optimiste immédiate dès qu'un utilisateur ajoute ou change de réaction.
    - Les onglets et les rangées d'utilisateurs de `ReactionUsersModal` affichent l'emoji exact correspondant à leur réaction enregistrée.
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur.

### Page Capsules — Sidebar de navigation, filtres (Suivis, Mes capsules) et points Capsule (`/pointsHistory/{userId}/capsule`)
* **Demande utilisateur** : ajout d'une sidebar sur la page des capsules avec des boutons pour voir les points de l'utilisateur obtenus dans capsule avec l'endpoint `/pointsHistory/{userId}/capsule`, voir ses propres capsules et voir les capsules des personnes dont il est abonné.
* **Modifications effectuées** :
  - **Composant Sidebar (`src/components/capsule/CapsuleSidebar.tsx`)** :
    - Sidebar desktop dédiée (sticky, cartes modernes aux coins arrondis) avec identité visuelle `#985810`.
    - Bouton principal « + Créer une capsule ».
    - 4 boutons de navigation : « Pour vous » (toutes les capsules), « Suivi(e)s » (abonnements), « Mes capsules » (créations personnelles avec badge de nombre), et « Mes points Capsule » (historique et gains avec badge de solde).
    - Mini-carte récapitulative des points Capsule en bas de sidebar avec accès direct à l'historique.
  - **Vue Points Capsule (`src/components/capsule/CapsulePointsView.tsx`)** :
    - Intégration de l'endpoint `/pointsHistory/{userId}/capsule` via `usePointsHistory({ userId, source: "capsule" })` et la route interne `/api/pointsHistory?source=capsule`.
    - Cartes d'indicateurs (Solde de points Capsule, Nombre de récompenses, Date du dernier mouvement).
    - Intégration du tableau dédié `CapsulePointsTable` avec 4 colonnes soignées : Date, Type (badge Gain/Perte), Description et Point (montant signé), avec barre de recherche et pagination.
    - États de chargement (skeletons), gestion des erreurs avec bouton de nouvelle tentative et état vide bienveillant.
  - **Gestion des capsules suivies (`fetchFollowingCapsules`)** :
    - Ajout du filtrage et de la récupération des capsules des personnes suivies dans `src/lib/capsule-service.ts`, `src/app/api/capsules/route.ts`, et `src/services/capsules/capsules.service.ts` (`GET /api/capsules?filter=following`).
  - **Page principale (`src/components/capsule/CapsulesPage.tsx`)** :
    - Intégration du layout 2 colonnes avec `CapsuleSidebar` sur desktop.
    - Barre de navigation défilante d'onglets pour mobile et tablette.
    - Gestion fluide des 4 vues sans rechargement de page.
    - Visionneuse `CapsuleViewer` synchronisée avec chacune des listes actives.
* **Vérification** : validation TypeScript (`npx tsc --noEmit`) avec 0 erreur.

### Capsules — Lecture avec son par défaut, double-clic Like et animation de pouce flottant
* **Demande utilisateur** : les capsules jouaient sans son. Activation du son par défaut et ajout d'une interaction au double-clic/double-tap simultané sur la capsule qui équivaut à un Like avec une animation d'un pouce levé flottant.
* **Modifications effectuées** :
  - **Visionneuse de capsules (`src/components/capsule/CapsuleViewer.tsx`)** :
    - Remplacement de l'attribut statique `muted` par l'état `isMuted` initialisé à `false` pour que le son se joue par défaut.
    - Ajout d'un bouton de contrôle du son (`Volume2` / `VolumeX`) en haut à droite avec infobulle explicite.
    - Mécanisme de rattrapage automatique si les règles d'autoplay du navigateur bloquent l'audio sans interaction préalable.
    - Détection intelligente du double-clic (souris) et double-tap (tactile) avec seuil de 300-320 ms et déduplication touch/souris.
    - Action de Like idempotent (aime la capsule si non aimée, sans la désaimer si déjà likée) avec pulsation d'agrandissement du bouton latéral (`likePulse`).
    - Animation visuelle de pouce levé flottant (`@keyframes capsuleFloatThumb`) avec accentuation `#985810`, halo doux, badge `+1` et élévation avec fondu ascendant à l'emplacement exact du clic/tap.
    - Simple clic réservé à la bascule play/pause avec indicateur visuel en superposition.
  - **Visionneuse de shorts Akwaplay (`src/components/akwaplay/shorts/AkwaShortViewerModal.tsx`)** :
    - Synchronisation du même comportement de double-clic/double-tap like avec animation de pouce flottant (`akwaFloatThumb`), pulsation du bouton like et gestion robuste du son/repli autoplay.
* **Vérification** : `npx tsc --noEmit` validé avec 0 erreur.

### Harmonisation des couleurs — Canal, Capsule et Akwaplay (`#985810`)
* **Demande utilisateur** : remplacement des accents orange (`#f5821f`, `#e5530a`, `#EA580C`, etc.) par la couleur de marque `#985810` (avec ses variantes de survol `#7d480d` et teintes douces `#985810]/20`, `#985810]/10`) dans les modules **Canal**, **Capsule** et **Akwaplay**.
* **Modifications effectuées** :
  - **Module Canal (`src/components/canal/`)** :
    - `CanalCard.tsx` : badge catégorie, bouton d'action principal et anneau d'avatar basculés vers `#985810`.
    - `CanalPage.tsx` : onglet actif « Explorer », bouton « + Créer un canal », anneau et focus de recherche harmonisés vers `#985810`.
    - `CreateCanalModal.tsx` : titre, bouton de soumission et focus des champs vers `#985810`.
    - `CanalMessageBubble.tsx` : fond des bulles de messages envoyés et surbrillance vers `#985810`.
    - `CanalPollCard.tsx` : barre de progression des sondages et bouton de vote vers `#985810`.
    - `CanalSettingsModal.tsx` : onglet actif, bouton d'enregistrement et focus vers `#985810`.
    - `CanalChatView.tsx` : bouton d'envoi et éléments d'accentuation vers `#985810`.
  - **Module Capsule (`src/components/capsule/`)** :
    - `CapsulesPage.tsx` : bouton « Créer », badges et états actifs basculés vers `#985810`.
    - `CapsuleCard.tsx` : badge créateur, cœur like actif, icône play et bordure survol vers `#985810`.
    - `CapsuleRail.tsx` : indicateurs du carrousel et boutons d'action vers `#985810`.
    - `CapsuleCreator.tsx` : bouton de publication, zone de glisser-déposer au survol et barre de progression vers `#985810`.
    - `CapsuleComments.tsx` : bouton commenter et likes de commentaires vers `#985810`.
  - **Module Akwaplay (`src/components/akwaplay/` et `src/app/(protected)/akwaplay/`)** :
    - `AkwaHeader.tsx` : logo `Akwa<span style={{ color: "#985810" }}>play</span>`, bouton publier, focus recherche et anneau avatar.
    - `AkwaSidebar.tsx` : icône active et bouton publier mobile vers `#985810`.
    - `AkwaVideoCard.tsx` : fallback play, badge de chaîne, survol du titre et anneau avatar vers `#985810`.
    - `AkwaVideoGrid.tsx` & `AkwaPromoCard.tsx` : bouton d'action vide, bouton réessayer et étiquette promo vers `#985810`.
    - `AkwaPublishModal.tsx` : icône d'en-tête, bordure d'upload, curseur de moment de capture, focus champs, barres de progression et bouton publier.
    - `AkwaShortCard.tsx`, `AkwaShortCreateModal.tsx`, `AkwaShortViewerModal.tsx` : bouton play, gradient d'upload, boutons d'interaction (like, commentaires), anneaux et focus champs.
    - `AkwaMusiqueCreateModal.tsx` : icône musique, zones d'upload, focus champs, progression et bouton de création.
    - `AkwaProfilePage.tsx` : onglet actif, boutons de création de chaîne et publication, anneaux et modale de chaîne vers `#985810`.
    - `AkwaWatchPage.tsx` & `AkwaCommentsSection.tsx` : icônes play, boutons like/dislike/favori, champ de saisie de commentaire, boutons répondre et modale de signalement.
    - Pages Akwaplay (`/watch`, `/trending`, `/shorts`, `/profile`, `/points`, `/musiques`, `/favorites`) : bannières dégradées (`linear-gradient(135deg, #985810, #7d480d)`), spinners de chargement, boutons réessayer et boutons de création.
    - `ProfilePage.tsx` : bouton play de la section des vidéos Akwaplay sur le profil utilisateur basculé vers `#985810`.
* **Vérification** : `npx tsc --noEmit` validé avec succès (code de sortie 0, aucune erreur de type).

### Sidebar droite — Flash de données statiques au rechargement (correction)
* **Symptôme** : au rechargement de la page, avant que les informations ne chargent dans la sidebar droite, des données statiques par défaut (« Utilisateur », « 0 Points », « Startups Afrique », « Espace Tech », tendances par défaut, etc.) s'affichaient brièvement avant de basculer vers les squelettes ou les vraies données de l'API.
* **Cause** : 
  - Dans `RightSidebar.tsx`, lorsque `user` n'était pas encore résolu par l'authentification (`!userId && !dughhuUserId`), le hook déclenchait immédiatement `setLoading(false)` au lieu de maintenir l'état de chargement jusqu'à la résolution de l'auth.
  - La carte `MiniProfileCard` affichait des replis statiques par défaut (« Utilisateur », `@utilisateur`, « 0 Points », stats à 0) dès que `loading` passait à `false`, même si `user` était `null`/`undefined`.
  - `totalPoints` était initialisé à `0` (écrasant `user.points` en cas d'évaluation par coalescence nulle).
* **Correctif** :
  - `RightSidebar.tsx` : intègre `useAuth()` pour coordonner `authLoading` avec `loading`. Tant que l'authentification est en cours (`authLoading`), `loading` reste strictement à `true` et ne retombe plus prématurément à `false`.
  - `isAnyLoading` (`loading || authLoading`) protège désormais l'ensemble des blocs asynchrones (MiniProfileCard, posts boostés, carrousels groupes et espaces, activité, tendances).
  - `MiniProfileCard.tsx` : affiche le squelette pendant le chargement (`loading || isAnyLoading || profileLoading || !user`), et ne rend rien (`return null`) si aucun utilisateur n'est connecté au lieu d'afficher une carte fictive (« Utilisateur, 0 Points »). `totalPoints` dans `RightSidebar` est initialisé à `undefined` pour laisser la priorité au solde réel.
* **Vérification** : validation TypeScript (`npx tsc --noEmit`) sans erreur.

## 2026-09-04
### Build — Limite Suspense globale pour `useSearchParams()` (correction)
* **Symptôme** : `next build` échouait avec `useSearchParams() should be wrapped in a suspense boundary at page "/groups"`.
* **Cause** : dans Next.js App Router, l'utilisation du hook client `useSearchParams()` lors du pré-rendu statique sans frontière `<Suspense>` parente provoque une erreur bloquante au build.
* **Audit & Correctif** :
  - `src/app/(protected)/groups/page.tsx` : enveloppe `<GroupsPage />` dans un `<Suspense>` avec spinner `Loader2` centré sur fond clair (`#F7F8FA`, couleur de marque `#A35A2A`), identique aux autres pages Dughu (`/retrouvailles`, `/profile/relations`, `/profile/settings`).
  - `src/app/(protected)/akwaplay/profile/page.tsx` : enveloppe `<AkwaProfilePage />` dans un `<Suspense>` avec spinner `RefreshCw` centré sur fond sombre (`#141414`, couleur de marque `#f5821f`), cohérent avec Akwaplay.
  - `src/app/(protected)/akwaplay/watch/page.tsx` : enveloppe `<AkwaWatchPage />` dans un `<Suspense>` avec spinner `RefreshCw` centré sur fond sombre.
  - Audit complet de l'ensemble de la codebase : les autres usages de `useSearchParams()` (`/retrouvailles`, `/profile/relations`, `/profile/settings`, `/messages`, `/otp`, `/akwaplay/shorts`) disposaient déjà d'une frontière Suspense conforme.
* **Vérifié** : `next build` réussit avec succès sans avertissement ni erreur de prérendu (79 pages statiques et dynamiques générées).

### Fonctionnalité — Historique des points Akwaplay (`/akwaplay/points`)
* **Nouvelle page Akwaplay `/akwaplay/points`** accessible depuis l'item « Points » de la sidebar gauche (l'item ne pointe plus vers `/points` mais vers `/akwaplay/points`), au thème sombre Akwaplay (`AkwaHeader` + `AkwaSidebar`).
* **Endpoint dédié** `GET /pointsHistory/{user_id}/akwaplay` : l'historique est désormais restreint aux points obtenus sur Akwaplay uniquement. Le service serveur (`points.server.ts`) accepte un paramètre `source` ajouté en **segment de chemin**, la route BFF `GET /api/pointsHistory` relaie `?source=…`, le service frontend et le hook TanStack `usePointsHistory({ userId, source })` le transmettent (clé de requête isolée par source).
* **Tableau `AkwaplayPointsTable`** (thème sombre) aux colonnes **Date · Type · Description · Points** : badge vert « Gain » / rouge « Perte », montant signé formaté `fr-FR`, date locale ; squelettes de chargement, état d'erreur avec « Réessayer » et état vide.
* `userId` résolu depuis la session (`dughu.userId`, replis `dughuUserId` puis `id`) — l'identifiant n'est jamais codé en dur.
* Conformité HTTP : composant → hook → service frontend (Axios cliente) → route `/api/pointsHistory` → service serveur (Axios serveur, token `X-AppApiToken` côté serveur uniquement) → API Dughu ; normalisation défensive réutilisée (`points.mapper.ts`), aucun `fetch` natif côté frontend.

### Fonctionnalité — Booster un post depuis le menu « 3 points »
* **Nouvelle route `POST /api/boostPost`** (route handler BFF) qui encapsule l'appel à l'API Dughu `POST /boostPost` avec les champs `post_id`, `user_id`, `boost_days` :
  - validation des paramètres (`postId`/`userId`), durée de boost bornée 1 à 30 jours (défaut 1) ;
  - `user_id` transmis à Dughu = identifiant Dughu de session (cookie en repli), jamais l'identifiant interne ;
  - erreurs normalisées en messages compréhensibles (pas de stack trace exposée).
* **Bouton « Booster » dans le menu « 3 points » de `PostCard`** : réservé à l'auteur de la publication (`canBoost`), icône fusée, ouverture directement sur `/api/boostPost` puis rafraîchissement du fil.
* Extension de `dughuApi.boostPost` dans `src/lib/dughu.ts` et du service frontend `boostPost` (`posts.service.ts`) avec le champ `boostDays`.

### Correction — Ouverture des posts repartagés (Lightbox immersive)
* **Résolution de la boucle infinie « Too many re-renders »** à l'ouverture du post d'origine d'un repost (`ParentPostLightbox`) : dans `PostMediaLightbox`, la synchronisation d'état pendant le rendu comparait la prop `reactions` par référence. Quand cette prop était absente, la valeur par défaut `[]` était recréée à **chaque rendu**, rendant la comparaison toujours vraie → `setState` pendant le rendu → boucle infinie.
  - Introduction d'une constante de module `EMPTY_REACTIONS` (référence stable entre les rendus) utilisée comme valeur par défaut de la prop `reactions`.
  - Comparaison des listes de réactions par **contenu** (helper `sameReactions` : type + count) au lieu de la référence : plus aucun re-rendu parasite même si un parent fournit un nouveau tableau équivalent à chaque rendu.
  - L'état local `localReactions` est initialisé et synchronisé via cette liste normalisée.
* **Chargement des commentaires du post d'origine rendu stable** : l'effet de `ParentPostLightbox` dépend désormais de `parentPost.id` (et non de l'objet `parentPost`, recréé à chaque rendu du parent du fil) grâce à une `ref` mise à jour uniquement dans un effet — suppression des re-fetch de commentaires et des push d'historique redondants pendant que la lightbox est ouverte.

### Correction — Boost : propagation du message d'erreur upstream
* La route `POST /api/boostPost` masquait le message métier de l'API Dughu derrière un générique « Erreur lors du boost. » : un HTTP 400 avec corps `{ status, message: "Points insuffisants pour un boost de X jour(s."` (levé par `dughuFetch` en `DughuApiError`) retombait dans le `catch` générique. La route détecte désormais `DughuApiError` et **remonte le message upstream** (même pattern que `/api/reactions`), avec `upstreamStatus`. L'utilisateur voit désormais la vraie raison (« Points insuffisants… ») au lieu d'une erreur technique brute。
* Suite du routage des erreurs : `posts.service.ts` (`boostPost`) propage déjà le message frontend via `ApiError` (message français approuvé, jamais de détail technique brut..

### Correction — Like inopérant dans la lightbox immersive
* **Like des réactions dans la vue immersive** (`ParentPostLightbox` et page `/post/[id]`) : le clic « J'aime » échouait silencieusement car `addReaction` était appelé **sans `dughuUserId`**, contrairement au fil `/home` — la route `/api/reactions` (en repli sur le cookie de session) peut alors répondre 404 « ID Dughu requis. », et le `catch` silencieux (rollback sans message) donnait l'illusion d'un bouton inopérant. Les deux appels transmettent désormais `dughuUserId` (même contrat fiableque le fil) et affichent un toast « Impossible de réagir à cette publication. » en cas d'échec**(conformément aux guidelines d'erreur)**。
* Le type de réaction transmis utilise désormais le mapping réel `REACTION_ID_TO_TYPE` (et non plus un « like » en dur), pour aligner le contrat avec les réactions autres que « J'aime » sélectionnables dans la lightbox.



### Correction — Barre d'actions complète sur la page de détail du post (`/post/[id]` et lightbox)
* La vue détail d'une publication (`PostMediaLightbox`, partagée par la page `/post/[id]` et la lightbox du post d'origine `ParentPostLightbox`) n'exposait que « J'aime » et « Partager » — et le bouton **Partager** n'était même **pas câblé** (`onShare` non fourni) : rien ne s'ouvrait « sur la page ». Les boutons **Gratifier** et **Republier** étaient totalement absents.
* La barre d'actions de la vue détail affiche désormais **J'aime · Gratifier · Republier · Partager** :
  * **Gratifier** (100 points, `POST /api/points/give`) avec modale de confirmation ; masqué sur ses propres publications.
  * **Republier** (simple via `createPost` avec `parentId`, ou avec commentaire via `rePost`) avec menu déroulant et modale de commentaire.
  * **Partager** : ouvre désormais la `SharePostModal` interne (au lieu de ne rien faire) ; si un `onShare` est fourni par le parent (ex. `PostCard`), il reste prioritaire.
* Implémentation centralisée dans `src/components/feed/PostMediaLightbox.tsx` (modales + services via `givePoints` / `createPost` / `rePost`), avec nouvelles props optionnelles `postId`/`shareUrl` propagées depuis la page `/post/[id]`, `ParentPostLightbox` et `PostCard`.
* Détail technique : la confirmation « Gratifier » est rendue en overlay simple `z-[9999]` (et non par le `Dialog` shadcn, porté dans `<body>` à `z-50`, qui serait invisible sous la lightbox `z-[9999]`).

## 2026-09-03
## 2026-09-03
### Module Akwaplay — Plateforme Vidéo (3 écrans)
* **Écran Accueil** : grille de vidéos, recherche (`akwa_akwa_video_search`), tabs de catégories (`akwa_getCategories`), grille « Tous »/par catégorie, pagination, bouton « Publier » (modale multipart `akwa_store_video`).
* **Écran lecture vidéo** : détails (`akwa_show_video`), lecteur stream (`akwa_video_stream`), vues (`akwa_incrementViews`), progression (`akwa_saveProgress`), like/dislike, favoris, signalement, commentaires + réponses lazy + suppression.
* **Création et publication de vidéo (`POST /api/akwa_store_video`)** :
  - Formulaire complet de publication intégrant tous les champs exigés : `user_id`, `title`, `description`, `thumbnail`, `category_id`, `visibility` (`public`, `unlisted`, `private`), `duration` (string `mm:ss`), `chanel` / `channel_id` (sélection de chaîne), et `video`.
  - **Génération automatique de la miniature (Thumbnail)** : extraction 100% automatique côté client de la frame vidéo via HTML5 Canvas dès la sélection du fichier (sans téléversement manuel), conversion en Blob/File JPEG et aperçu 16:9 dynamique avec curseur temporel pour choisir précisément la frame désirée dans la vidéo.
  - Détection automatique de la durée vidéo envoyée au format requis par le backend Dughu.
  - Sélection des chaînes Akwaplay créées par l'utilisateur (`GET /api/akwa_userChannels`) ou publication personnelle.
* **Identité visuelle Akwaplay** :
  - **Nouveau logo Akwaplay** : Remplacement de l'icône de lecture générique par l'image officielle `/images/akp.png` dans l'en-tête principal `AkwaHeader` avec effet d'agrandissement doux au survol.
* **Module Capsules (Shorts) Akwaplay (`/akwaplay/shorts`)** :
  - **Résolution du non-affichage des capsules (`GET /short_fetchShorts` & `GET /user_shorts`)** : L'API Dughu encapsule la pagination dans un objet `shorts: { current_page, data: [...] }`. Le service cherchait `Array.isArray(res.data.shorts)` qui échouait, retournant une liste vide. Extraction désormais directe de `res.data?.shorts?.data`.
  - **Prise en charge de la clé vidéo réelle `file_path`** : Les fichiers vidéo MP4 des shorts étant délivrés sous `file_path` avec `thumbnail_path: null`, normalisation défensive et affichage dynamique des capsules via `AkwaShortCard` avec prévisualisation vidéo en direct et animation au survol.
  - **Suppression du badge de vues** : Retrait complet de l'affichage du compteur de vues sur les cartes de capsules pour une interface épurée centrée sur le contenu et le créateur.
  - **Résolution du flash « La requête a été annulée »** : Lors du chargement initial et de la résolution de `useAuth()`, la première requête avortée par `AbortController` était capturée par le bloc d'erreur au lieu d'être ignorée silencieusement (`ApiError` avec message français). Prise en charge défensive de tous les types d'annulation (`isAbort`) et protection du bloc `finally` pour ne jamais afficher l'écran d'erreur transitoire.
  - **Suppression du bouton Dislike** : Retrait définitif du bouton Dislike sur les capsules conformément à la demande utilisateur (seul le bouton J'aime est conservé).
  - **Persistance et synchronisation du statut Like** :
    - Détection stricte et normalisation de `isLiked` (support boolean, integers `1`/`0`, strings `"1"`/`"0"` renvoyés par l'API backend).
    - Persistance du `userId` de session (évite d'appeler `short_fetchShorts` avec un identifiant de repli au premier render d'un rechargement complet).
  - **Création de Capsule (`AkwaShortCreateModal`)** : Modale dédiée pour téléverser une vidéo verticale avec prévisualisation, légende/titre et jauge de progression d'upload (`POST /api/short_store`).
* **Module Musiques Libres Akwaplay (`/akwaplay/musiques`)** :
  - **Résolution du non-affichage des musiques (`GET /api/akwa_musiques`)** : L'API Dughu renvoie la liste sous `result.data`. L'ancien service ne vérifiait que `res.data` ou `res.data.musiques`, retournant une liste vide. Extraction désormais directe de `res.data?.result?.data`.
  - **Prise en charge des clés en français du backend** : Normalisation défensive des champs réels (`titre`, `artiste`, `chemin_audio_url`, `duree` formatée convertie en secondes).
  - **Onglet Mes Favoris (`GET /api/akwa_musiques/user_favorites/{user_id}`)** : Récupération des morceaux favoris de l'utilisateur avec bascule instantanée via `POST /api/akwa_musiques/toggle_favoris` (paramètre `musique_id`).
  - **Lecteur audio interactif** : Piste audio HTML5 avec écoute en direct, barre flottante inférieure avec curseur temporel, bouton lecture/pause et contrôle du son.
  - **Création et ajout de musique (`AkwaMusiqueCreateModal`)** : Modale de téléversement multipart (`POST /api/akwa_musiques/store`) pour ajouter un morceau avec titre, artiste, genre, fichier audio et pochette.
  - **Suppression** : `DELETE /api/akwa_musiques/delete/{music_id}` avec confirmation.
* **Correctif d'affichage des vidéos (`/akwa_getAllVideos`)** :
  - **Résolution du bug `ERR_CONTENT_DECODING_FAILED`** : L'API externe Dughu (Cloudflare) renvoie les réponses compressées en Brotli/gzip (`Content-Encoding: br`). Le runtime Node.js décompressait le flux en texte brut, mais le proxy BFF ([akwa-proxy.ts](file:///c:/Users/HP/dughu/src/lib/api/akwa-proxy.ts) et `dughu/[...path]/route.ts`) relayait aveuglément l'en-tête `Content-Encoding: br` au navigateur. Le navigateur tentait alors de décompresser du texte clair et échouait avec `net::ERR_CONTENT_DECODING_FAILED`. Les en-têtes `content-encoding`, `content-length` et `transfer-encoding` sont désormais systématiquement purgés après décompression par le proxy.
  - Résolution de l'erreur « Impossible de contacter le serveur » : l'intercepteur Axios client (`axios-instance.ts`) ne prenait pas en compte les annulations de requête (`ERR_CANCELED` / `AbortSignal`) et les transformait à tort en fausse erreur réseau (`isNetwork`). Les annulations sont désormais correctement typées et ignorées lors des changements d'état/re-renders.
  - Normalisation défensive des réponses API : le backend Dughu encapsulant les données dans `result.data` avec `result.pagination.has_more`, ajout des helpers `extractDataArray` et `extractHasMore` dans `akwaplayVideo.service.ts` pour extraire fiablement vidéos, catégories et pagination.
  - Support des clés de médias réelles : prise en compte de `signed_thumbnail_path`, `thumbnail_path`, `signed_video_path`, conversion de la durée formatée (ex. `"00:10"`) en secondes et mapping complet du profil auteur (`profile_photo_url`, `avatar`, nom complet).
  - Normalisation et affichage complet des activités utilisateur (`/akwa_get_user_activities`) : typage `AkwaUserActivity`, extraction de `activities.data`, affichage des cartes avec avatar, action (`act.text`), heure relative et redirection vers la vidéo (`/akwaplay/watch?v={id}`).
  - Résolution du flash de l'état vide (« Aucune vidéo trouvée ») à l'accueil : stabilisation de `effectiveUserId` et protection des requêtes avortées (`AbortController`) pour que l'état `loading` ne soit jamais désactivé prématurément avant l'arrivée effective des vidéos.
* **Page de lecture vidéo YouTube (`/akwaplay/watch?v={video_id}`)** :
  - Lecteur vidéo HTML5 immersif responsive 16:9 avec incrémentation des vues (`akwa_incrementViews`) et sauvegarde de progression (`akwa_saveProgress`).
  - Bloc métadonnées avec profil créateur publié (extraction de la clé API `uploader` : nom, avatar, abonnés) et intégration du composant réutilisable de l'application `FollowButton` (`src/components/common/FollowButton.tsx`) pour s'abonner/se désabonner.
  - Like/Dislike avec mise à jour optimiste (`akwa_toggleLike`), favoris (`akwa_toggleFavorite`), partage et modale de signalement (`akwa_getReportReasons` et `akwa_reportVideo`).
  - Résolution de la persistance et de l'affichage du like au rechargement : normalisation des clés réelles du backend Dughu (`like_count`, `liked`, `disliked`, `favorited`, `comment_count`), transmission du champ `reaction: action` dans `POST /api/akwa_toggleLike/{video_id}` et notification toast Sonner de confirmation.
  - Séparation et affichage dédié des compteurs Like et Dislike : le bouton pouce en bas (`ThumbsDown`) dispose désormais de son propre badge dynamique `dislikesCount`.
  - Résolution de l'incrémentation parasite du compteur de likes lors d'un dislike : le backend Dughu stockant dans la colonne SQL `like_count` le total agrégé de toutes les réactions (`likes + dislikes`), la formule défensive `Math.max(0, like_count - dislikes_count)` isole désormais strictement les mentions J'aime pour qu'un dislike n'incrémente plus jamais le compteur de likes.
  - Section commentaires : fil interactif, résolution de l'erreur d'envoi en transmettant le champ `text` attendu par le backend Dughu pour `POST /akwaComment_store` (avec support de `comment_id` pour modification) et `POST /akwaComment_replyComment`, extraction de `res.data.comment` dans `replyComment` garantissant l'insertion et l'affichage instantanés des réponses, synchronisation du bouton d'ouverture (`totalReplies`), pagination (`akwaFetchComments`), réponses imbriquées dépliables (`fetchCommentReplies`), likes et suppression.
  - Barre latérale de suggestions : flux compact horizontal de vidéos suggérées issues des tendances et de la catégorie.
  - Disposition ergonomique de la barre latérale : affichée sur grand écran (`≥ 1024px`) avec décalage fluide du corps de page (`lg:ml-[220px]`) pour ne jamais superposer le contenu.

### Expérience des publications — Lightbox immersive & Réactions enrichies

#### Lightbox Immersive (`PostMediaLightbox.tsx`)
* **Ouverture plein écran** : Clic direct sur une image ou vignette d'une publication, avec transition douce et fond sombre immersif (`bg-black/95`).
* **Verrouillage du scroll** : Blocage automatique du défilement de l'arrière-plan (`document.body.style.overflow = "hidden"`).
* **Disposition Desktop (md/lg+)** : Panneau de commentaires autonome positionné **à GAUCHE** (`w-[380px]` à `w-[440px]`) et image dominante **à DROITE** avec conservation de ratio (`object-contain`).
* **Disposition Mobile (< md)** : Image plein écran avec barre d'action inférieure flottante et ouverture des commentaires en **Bottom Sheet** coulissant avec tirette de fermeture et geste tactile de glissement vers le bas (swipe down).
* **Support multi-images** : Navigation par boutons latéraux et touches fléchées (← →) du clavier.

#### Système de Réactions & Sélecteur (`ReactionPicker.tsx`, `ReactionSummary.tsx`, `ReactionUsersModal.tsx`)
* **Emojis standardisés** : 👍 J'aime, ❤️ J'adore, 😂 Haha, 😮 Wow, 😢 Triste, 😡 Grrr.
* **Sélecteur interactif (`ReactionPicker.tsx`)** : Affichage des 6 réactions Dughu avec micro-animations (`scale-125`), protection contre les débordements sur petits écrans, retour haptique léger (`navigator.vibrate`), accessible au survol (desktop) et à l'appui long tactile (mobile).
* **Composant partagé `ReactionSummary.tsx`** : Agrégation des 3 réactions les plus utilisées (`[👍 ❤️ 😮] 19`), synchronisé entre la carte du fil et la Lightbox sans aucune donnée artificielle.
* **Optimistic UI & Compteurs Synchronisés** : Mise à jour immédiate du compteur total, des compteurs par réaction et du bouton utilisateur sans rafraîchissement de la page.
* **Modale des réactions (`ReactionUsersModal`)** : Consultation des personnes ayant réagi avec onglets filtrables par émoji (modale desktop et Bottom Sheet mobile).
* **Liste réelle des réacteurs** : la liste des personnes s'affiche désormais en ouvrant le modal des réactions — elle est chargée à la demande via `GET /api/reactions?postId=X&userId=Y` (encapsule `GET /getPostReactions/{postId}/{userId}` de l'API Dughu), avec repli sur les données éventuellement embarquées dans le payload du post (`mapPost` → `reactionUsers`). Mise à jour optimiste lors d'une réaction/retrait/changement. Aucune donnée factice : si l'API ne fournit pas le détail utilisateur, l'UI affiche les compteurs agrégés et l'utilisateur courant uniquement, avec message explicite dans le modal.
* **Liste des réacteurs — tolérance au format & diagnostic** : le mapping gère les conteneurs imbriqués (`{ data: { reactions: [...] } }`) et les items retournés sans champ `reaction` explicite (traités comme « 👍 », défaut Dughu `reaction=1`). Le chargement ne dépend plus de l'ID client (le serveur résout l'utilisateur via le cookie de session). Un échec réseau affiche désormais « Impossible de charger la liste des réactions » (distinct de l'absence honnête « liste non disponible »), et les onglets du modal reflètent les types réellement fetchés quand ils sont disponibles.

### Optimisation de la largeur du feed sur petits écrans (1280x903 à 1417x903)

* Ajustement de la réservation d'espace de la sidebar droite dans `MainLayout` : passage de 484px à **264px** sur `xl` (1280px à 1535px) avec un positionnement de la sidebar à `right-4` (16px).
* Augmentation de la largeur maximale du feed (`PostComposer` + `PostCard`) de 750px à **780px** (`xl:max-w-[780px]`) sur les écrans `xl`.
* Les cartes de publication et de composition gagnent ainsi entre +165px et +236px de largeur utile sur les laptops et petits écrans (passant de 478px–615px à **714px–780px**).

### Optimisation complète de l'expérience Mobile

#### Hook `useScrollDirection` (`src/hooks/useScrollDirection.ts`)

* Nouveau hook léger et performant : `requestAnimationFrame` + passive event listener + seuil de 8px anti-clignotement.
* Ne déclenche un re-render React que lorsque la direction change réellement (up/down).
* Utilisé par le Header et la MobileBottomNav.

#### Header (Topbar) scroll-aware

* Le Header se masque (`translateY(-100%)`) lors d'un scroll vers le bas sur mobile.
* Il réapparaît lors d'un scroll vers le haut ou en haut de la page.
* Transition GPU-friendly 300ms ease-in-out.
* Safe-area iOS : `padding-top: max(0px, env(safe-area-inset-top))` pour l'encoche / Dynamic Island.
* Desktop (lg+) inchangé.

#### MobileBottomNav (Tapbar) scroll-aware + safe-area iOS

* La barre de navigation mobile se masque (`translateY(100%)`) lors d'un scroll vers le bas.
* Hauteur dynamique : `calc(58px + env(safe-area-inset-bottom, 0px))`.
* Padding bottom : `max(4px, env(safe-area-inset-bottom))` pour éviter le chevauchement avec la barre système iPhone.

#### Posts edge-to-edge sur mobile

* Sur mobile (< sm), les `PostCard` sont edge-to-edge : pas de border-radius, shadow ou bordures latérales.
* Séparateur subtil `border-b border-gray-100` entre les publications.
* Sur sm+ (tablette/desktop), rendu "carte" (rounded-3xl, shadow, border) préservé.
* Le conteneur `main` de `MainLayout` est `px-0` sur mobile et `px-4`/`px-6` sur sm+/lg+.
* `space-y-0` sur mobile, `space-y-3/4` préservé sur sm+.
* Squelette de chargement mis à jour en cohérence.
* `PostComposer` et `FlashFeed` ont leur propre padding `px-3 sm:px-0` sur mobile.

#### Sidebar droite universelle

* La `RightSidebar` est désormais **toujours montée** dans `MainLayout`, quelle que soit la page.
* Nouvelle prop `hideOnDesktop` : masque la colonne fixe xl+ sans désactiver le tiroir mobile.
* Le bouton ☷ (LayoutGrid) du Header ouvre correctement la sidebar droite sur toutes les pages.

#### Viewport safe-area iOS

* `app/layout.tsx` : ajout de l'export `viewport` Next.js avec `viewport-fit: "cover"`.
* Active `env(safe-area-inset-*)` sur les appareils iOS avec encoche.

#### CSS global

* `body` : `overflow-x: hidden` pour éviter le débordement horizontal involontaire.
* `html` : `-webkit-overflow-scrolling: touch` pour un scroll iOS fluide.

#### Scroll horizontal

* `FlashFeed` : `touch-pan-x` pour le swipe au doigt + `px-3 sm:px-0` pour le padding mobile.
* `GroupCarousel` : `touch-pan-x` pour améliorer le swipe.
* `GroupsPage` onglets : `flex-nowrap` + `shrink-0` sur les boutons pour corriger le scroll horizontal.

---

## 2026-09-02

### Module « Groupes » — première vue responsive

* Ajout de la route protégée `/groups`, accessible depuis le bouton « Groupes » de la sidebar gauche avec état actif et fermeture du tiroir mobile.
* Ajout des cinq vues « Actualités », « Mes groupes », « Groupes administrés », « Groupes suggérés » et « Groupes aimés », avec onglets accessibles et recherche locale.
* Ajout de cartes de groupe responsive (bannière, avatar, catégorie, membres), d'une variante horizontale pour les suggestions et d'un état vide dédié aux groupes administrés.
* Ajout d'un fil statique de publications de groupes conforme à la maquette fonctionnelle, avec retour local pour le like et l'adhésion. Aucun appel API Groupes ni navigation de détail/création n'est simulé dans ce premier lot.

### Groupes — connexion API du volet « Actualités »

* Remplacement des publications statiques de l'onglet « Actualités » par les données de `POST /actualitePostsGroup`, via la route interne `GET /api/groups/feed` et l'architecture Axios client/serveur du projet.
* L'identifiant utilisateur est lu dans le cookie de session côté serveur. Les réponses sont normalisées et limitées aux publications de groupes actifs et publics (`privacy = "1"`) ; les groupes privés (`privacy = "2"`) sont exclus.
* Ajout de la recherche serveur, de la pagination « Afficher plus », de la déduplication, des squelettes, de l'état vide et du réessai sur erreur. Les médias et fonds colorés issus de l'API sont pris en charge.
* Les publications réutilisent désormais `PostCard` avec un badge groupe optionnel, au lieu d'une carte dédiée. Les interactions existantes (réactions, commentaires, republication, partage, sauvegarde, masquage et blocage) sont conservées, et les images du contexte groupe sont cadrées en `4:3` sur mobile puis `16:9` sur les écrans plus larges.

### Groupes — connexion API du volet « Mes groupes »

* Remplacement des groupes statiques par les données de `POST /usergroupes`, via la route interne `GET /api/groups/mine`, le service serveur Axios, le service frontend et un hook TanStack Query paginé.
* L'identifiant Dughu provient du cookie serveur. Le mapper conserve les groupes actifs dont l'utilisateur est membre, qu'ils soient publics (`privacy = "1"`) ou privés (`privacy = "2"`).
* Ajout de la recherche serveur, de la pagination « Afficher plus », de la déduplication, des squelettes, de l'état vide, du réessai sur erreur et d'un indicateur accessible public/privé dans les cartes.

### Module « Canal » — intégration complète (32 endpoints)

* **Intégration complète du module Canal** avec respect strict de l'architecture Axios à deux instances :
  - **Types (`src/types/canal/canal.types.ts`)** : modélisation complète (`Canal`, `CanalMember`, `CanalMessage`, `CanalReaction`, `CanalPoll`, `CanalMedia`, `CanalDocument`, `CanalNotification`, génériques `ApiResponse<T>`, `PaginatedResponse<T>`, formulaires et payloads).
  - **Helpers & Mapper (`src/services/canal/canal.helpers.ts`, `src/services/canal/canal.mapper.ts`)** : construction multipart (`FormData`) pour uploads de logo/cover et médias de messages, normalisation défensive et gestion de pagination.
  - **Service serveur (`src/services/canal/canal.server.ts`)** : implémentation exhaustive des 32 endpoints Dughu via `dughuServerGet`, `dughuServerForm`, `dughuServerMultipart`.
  - **Service frontend (`src/services/canal/canal.service.ts`)** : fonctions consommant l'instance Axios cliente `apiClient` sans aucun `fetch` natif, gestion d'erreurs normalisée en `ApiError` et prise en charge d'`AbortSignal`.
  - **Route Handlers Next.js (`src/app/api/canal/**`)** : routes internes couvrant l'ensemble du cycle de vie des canaux, messages, membres, sondages, médias, notifications et signalements.
  - **Hooks TanStack Query (`src/hooks/canal/**`)** : `useCanals`, `useCanalDetail`, `useMyCanals`, `useJoinedCanals`, `useSuggestCanals`, `useCanalMessages`, `useCanalFavorites` (avec mise à jour optimiste du toggle favori), `useCanalPolls`, `useCanalNotifications`.
  - **Composants UI (`src/components/canal/**`)** :
    - Écran 1 (thème clair) : liste de canaux avec onglets Explorer, Mes canaux, Canaux rejoints, Favoris, barre de recherche, filtres catégories scrollables et grille de cartes responsive jusqu'à 6 colonnes.
    - Écran 2 (thème clair) : modale de création d'un canal avec upload de logo et cover, champs descriptifs et sélecteurs de type et statut.
    - Écran 3 (thème sombre) : vue chat 3 colonnes plein écran avec liste des canaux de l'utilisateur (canaux créés + rejoints), zone de messagerie en temps réel, vérification des droits de publication et panneau latéral détaillant le canal et ses médias/documents.
  - **Liaison Navigation** : bouton « Canal » de la sidebar gauche (`LeftSidebar.tsx`) désormais actif et relié à la page `/canal` (`src/app/(protected)/canal/page.tsx`).
  - **Correctif Endpoints & Mappeur** : alignement de `fetchAllCanals` sur `GET /api/canal?scope=all`, déballage correct de l'enveloppe Laravel `result.data` dans `canal.mapper.ts` pour toutes les listes (Explorer, Mes canaux, Canaux rejoints, Suggestions), et intégration des URLs de médias complètes (`logo_url`, `cover_url`), du créateur (`autor_id`) et du statut membre (`isRejoind`).
  - **Résolution Conflit de Slugs Next.js (`canalId` vs `id`)** : uniformisation de tous les segments dynamiques du module Canal sous `[canalId]` (`src/app/api/canal/[canalId]`, `src/app/api/canal/messages/[canalId]`, `src/app/api/canal/notifications/[canalId]`), éliminant l'erreur `You cannot use different slug names for the same dynamic path`.


### Espaces — onglet « Actualité » avec boutons d'action sur chaque publication (ajout)

* **Onglet « Actualité » en première position** de la page `/espaces`, avant
  « Découverte » (`PagesPage.tsx`, icône `Newspaper`) : il affiche le fil global
  des publications des espaces. La recherche d'espaces est masquée sur cet
  onglet (elle ne concerne que les listes d'espaces).
* **Nouveau composant `PagesFeedTab`** (`src/components/pages/PagesFeedTab.tsx`)
  : réutilise la **carte `PostCard` du fil principal** — chaque publication des
  espaces affiche désormais la barre d'actions complète : **J'aime + palette de
  6 réactions** (optimiste + cache `reactionCache`, rollback sur échec),
  **Commenter** (liste chargée par la carte, ajout texte/fichiers),
  **Republier** (simple et avec texte d'accompagnement), **Partager** (modale
  interne avec `shareLink` fourni par l'API) et le **menu « 3 points »**
  (enregistrer, masquer, bloquer, supprimer avec `ConfirmDialog` si auteur).
  Auteur = la Page (nom + avatar de l'espace) ; pas de bouton « Suivre » sur
  les publications de Page (le like de l'espace reste sur sa page) ;
  abonnement conservé pour les publications personnelles.
* **Chaîne HTTP conforme au système Axios** : `PagesFeedTab` → service frontend
  `fetchPagesPostsFeed` (`pages.service.ts`, instance cliente) → nouvelle route
  `GET /api/pages/feed?page=N` → service serveur `fetchPagesPostsFeed`
  (`pages.server.ts`, instance Axios serveur) → API Dughu
  `getPostPageUser/{user_id}` → mapper `mapPosts` (même forme que le fil).
  Aucun `fetch` natif côté frontend.
* **Sémantique API vérifiée en direct sur apitest** : `getPostPageUser/{id}`
  attend un **ID utilisateur** et renvoie le **feed global des publications des
  espaces** (5/page, paginateur Laravel, auteur = page, `is_like`/`typeLike`/
  `count_likes`/`comment_count`/`repost_count`/`shareLink`). L'endpoint répond
  parfois `success: false` (« Utilisateur non trouvé ») de façon intermittente :
  la route serveur retente **une fois** (lecture idempotente) puis l'état
  d'erreur avec « Réessayer » est affiché.
* **Détail d'espace** (`SpaceDetailPage.tsx`) : l'onglet interne « Actualité »
  réutilise `PagesFeedTab` — les publications gagnent les mêmes boutons
  d'action (l'ancienne liste simple sans actions est remplacée ; l'API ignorant
  l'id de page, le feed affiché est le feed global des espaces).
* **Pagination** : chargement automatique au scroll (IntersectionObserver,
  comme le fil d'accueil), dédoublonnage des posts, bouton « Charger plus »
  en cas d'échec de pagination (les publications déjà chargées sont conservées).
* **Limitation documentée** : l'API Dughu ne propose pas de « Je n'aime pas »
  pour les publications (seules les capsules ont `toggleDislikeShort`) ; la
  palette de réactions (J'aime, J'adore, Haha, Wouah, Triste, Énervé) couvre
  l'ensemble des réactions disponibles pour les posts.

### Section « Espaces » / Space (ajout)

* **Nouvelle section complète** connectée au bouton « Espaces » de la sidebar
  gauche (`/espaces`, état actif `active="espaces"`) : liste à onglets
  (Découverte / Mes espaces / Aimés / Suggestions / Administrés) avec recherche
  debouncée, détail d'espace à onglets (Actualité, À propos, Galerie, Offres,
  Admins, Stats, Inviter — onglets de gestion masqués aux non-admins),
  formulaire de création (`/espaces/creer`) et d'édition (`/espaces/[id]/edit`).
* **Sémantique API vérifiée sur apitest** : `GET /getPage/{id}` ignore l'id et
  renvoie le feed global de découverte ; le détail passe par
  `POST /show/pages` ; suppression unique via `POST /destroyPage/{id}` avec
  **mot de passe obligatoire** (doublon « delete Page » ignoré) ; boost en deux
  temps (`POST /boostPrice` → affichage prix points/FCFA → `POST /boostPage`) ;
  like avec **mise à jour optimiste** ; upload avatar/cover en multipart
  (`element` = avatar|cover) ; privilèges admins granulaires via
  `/updatePageAdminPrivileges/{adminId}` (checkboxes general, info, social,
  avatar, design, admins, analytics, delete_page) ; liens sociaux via
  `/socialLinksUpdat` (typo backend `instgram` conservée et documentée) ;
  destinataire des points via `/page/{id}/points-recipient`.
* **Architecture** : types (`src/types/pages/`), mapper défensif
  (`src/services/pages/pages.mapper.ts`), service serveur
  (`pages.server.ts`), services frontend par domaine (`pages.service.ts`,
  `page-admin.service.ts`, `page-offer.service.ts`, `page-stats.service.ts`),
  22 routes API internes (`/api/pages*`, `/api/offers/[id]`), hooks TanStack
  Query (`use-pages.ts`, mutations sans retry, like optimiste avec rollback).
* **Composants réutilisables** : PageCard, TabNavigation (réutilisé), modale de
  suppression avec mot de passe, modale de boost avec prix, uploader
  avatar/cover, panneaux Admins/Offres/Inviter/Stats/À propos, états partagés
  (squelettes/erreur/vide).
* **Vérifié de bout en bout sur apitest** : listes (feed 12, mine 10, liked 10),
  catégories (22), détail page 682 (likes, admins, is_admin/is_like), posts (5),
  images, likes, offres, invitations (15 amis), prix de boost (7000 pts /
  7000 FCFA), création de page (page 683 créée), suppression avec mauvais mot
  de passe → « Mot de passe incorrect. » propagé, stats non-admin → 403 avec
  message français ; `next build` passe (routes `○ /espaces`, `ƒ /espaces/[id]`,
  `ƒ /espaces/[id]/edit`, `○ /espaces/creer`) ; `tsc --noEmit` sans erreur.

### Build — limite Suspense pour `useSearchParams()` (correction)

* **Symptôme** : `next build` échouait avec « useSearchParams() should be
  wrapped in a suspense boundary at page "/profile/relations" ».
* **Cause** : les pages client lisant l'URL via `useSearchParams()`
  (`/profile/relations` : filtre `?type=`, `/retrouvailles` : onglet `?tab=`)
  n'étaient pas enveloppées dans une limite `<Suspense>`, ce qui est
  incompatible avec le pré-rendu statique.
* **Correctif** : les pages parentes `src/app/(protected)/profile/relations/
  page.tsx` et `src/app/(protected)/retrouvailles/page.tsx` enveloppent
  désormais leur composant client dans `<Suspense>` (fallback : spinner
  `Loader2` centré, même motif que la page messages). Audit complet du
  projet : les 2 autres usages (`/messages`, `/otp`) étaient déjà protégés.
* **Vérifié** : `next build` passe sans erreur ; les deux pages sont
  pré-rendues en statique (○).

### Page « Pokes » (ajout)

* **Nouvelle page `/pokes`** (protégée, `MainLayout` sans sidebar droite,
  `active="pokes"` dans la sidebar gauche) avec **3 onglets** réutilisant le
  composant `TabNavigation` : **Pokes reçus / Suggestions / Pokes envoyés**.
* **Sémantique API Dughu vérifiée sur apitest** : `GET /pokes?user_id=X`
  renvoie les pokes **reçus** (`user` = expéditeur), `GET /pokes/sent?user_id=X`
  les pokes **envoyés** (`user` = destinataire), `POST /pokes
  { user_id, received_user_id }` envoie un poke, `POST
  /pokes/{pokeId}/poke-back { user_id, received_user_id }` répond à un poke
  (`received_user_id` = expéditeur original, champ exigé par l'API). Le détail
  `GET /pokes/{pokeId}` ne renvoie qu'un poke unique : les listes passent donc
  par les endpoints de liste.
* **Pokes reçus** : bouton « Répondre » par ligne (poke-back) avec **mise à
  jour optimiste** (retrait immédiat, rollback si échec, resynchronisation) ;
  **Suggestions** : expéditeurs dédupliqués des pokes reçus + bouton « Poker »
  (`POST /pokes`) — l'API n'expose pas d'endpoint « suggestions » dédié ;
  **Pokes envoyés** : liste + bouton secondaire « Re-poker ».
* **Architecture HTTP** : composants (`src/components/pokes/`) → hooks TanStack
  Query (`src/hooks/pokes/use-pokes.ts`, mutations **sans retry**) → service
  frontend (`src/services/pokes/pokes.service.ts`, Axios cliente) → routes
  internes `GET/POST /api/pokes` et `POST /api/pokes/[pokeId]/poke-back`
  (session par cookie, fallback paramètre) → service serveur
  (`src/services/pokes/pokes.server.ts` + mapper défensif) → API Dughu.
  Nouveau helper serveur `dughuServerForm` (POST form-urlencoded, mutation
  sans retry) dans `src/lib/api/server/dughu-instance.ts`. Seuls les champs
  affichables sortent du serveur (e-mails et tokens de la réponse brute
  filtrés par le mapper).
* **Vérifié de bout en bout sur apitest** : listes reçus (7) / envoyés (7),
  envoi de poke (poke 266 créé), poke-back (poke 267 créé), rendu de la page
  (3 onglets, accents corrects), `tsc --noEmit` sans erreur.

### Page « Stop aux arnaques » (ajout)

* **Nouvelle page `/stop-arnaques`** (protégée, `MainLayout` sans sidebar
  droite, gabarit identique aux pages Points / Mes sauvegardes) : contenu
  **100 % statique** — les **20 mesures anti-arnaque DUGHU** codées en dur
  dans `src/components/scam/anti-scam-data.ts`, aucun appel API.
* **En-tête** : pastille bouclier « Stop arnaque » + titre principal centré
  en orange « 20 mesures anti-arnaque DUGHU ».
* **Composant réutilisable `NumberedTipCard`** (`src/components/scam/`) :
  numéro + titre gras bleu foncé + description grise, monté 20 fois dans une
  liste ordonnée sémantique (`<ol role="list">`) pour l'accessibilité.
* **Sidebar gauche** : le bouton « Stop aux arnaques » navigue désormais vers
  `/stop-arnaques` (et ferme le drawer mobile) ; il passe en état actif/
  surligné sur cette page (`active="scam"`).
* **Responsive & accessibilité** : mobile-first, cartes pleine largeur,
  hiérarchie typographique claire, icônes décoratives `aria-hidden`,
  contrastes conformes. Page purement informative (aucun état
  loading/erreur nécessaire).

### Page « Mes sauvegardes » — correctif « aucun post affiché » (correction)

* **Cause** : l'API Dughu `GET /get-post-save/{user_id}` enveloppe les posts
  dans `data.posts` (avec `data.pagination = { total, per_page, current_page,
  last_page }`), mais la route interne passait l'objet brut à `mapPosts` qui
  ne reconnaît pas cette forme → tableau vide → page « Mes sauvegardes »
  systématiquement vide.
* **Correctif** : la route `GET /api/get-post-save/[userId]` extrait désormais
  `data.posts` (formes aplaties tolérées), transmet la pagination `?page=N` à
  l'API Dughu (10 posts/page) et expose `hasMore` déduit de `data.pagination`.
* **Pagination** : le hook `useSavedPosts` récupère toutes les pages
  successivement (plafond de sécurité : 50 pages) — le cache TanStack Query
  reste un tableau plat, aucune modification de la page ni des mises à jour
  optimistes.
* **Vérifié** : convention d'appel confirmée auprès de l'API de test
  (`user_id` en **segment de chemin** + `?page=` en query ; POST et
  `?user_id=` renvoient 404) ; `tsc --noEmit` sans erreur.

### Page « Mes sauvegardes » (ajout)

* **Nouvelle page `/sauvegardes`** (protégée, `MainLayout` sans sidebar droite) :
  liste de tous les posts sauvegardés par l'utilisateur via l'API Dughu
  `GET /get-post-save/{user_id}` (ID Dughu résolu depuis la session `useAuth`).
  L'item « Mes sauvegardes » de la sidebar gauche est désormais **cliquable** et
  passe en état actif/surligné sur cette page (`active="saves"`).
* **Cohérence visuelle** : chaque post est rendu avec le **même composant
  `PostCard` que le fil principal** (chargé en `dynamic` comme sur le home) —
  texte, médias, auteur, date, réactions, commentaires, reposts et abonnement
  fonctionnent directement depuis cette page.
* **Désauvegarde avec mise à jour optimiste** : le signet de chaque carte est
  activé ; au clic, le post est retiré immédiatement de la liste puis
  `POST /api/store-save` (toggle Dughu) est envoyé — rollback si l'appel échoue,
  resynchronisation après coup, `retry: 0` (mutation non idempotente).
* **Architecture** respectée : page/composant → hook TanStack Query
  (`src/hooks/queries/use-saved-posts.ts`) → service frontend
  (`posts.service.ts`, nouvelle fonction `fetchSavedPosts` sur l'instance Axios
  cliente) → route interne `GET /api/get-post-save/[userId]` (posts mappés via
  `mapPosts`, marqués `isSaved: true`, fallback cookie de session) →
  `dughuApi.getSavedPosts` (`src/lib/dughu.ts`, instance Axios serveur) → API
  Dughu. Aucun `fetch` natif côté frontend.
* **États** : squelettes de cartes (chargement), état vide avec incitation à
  explorer le fil, erreur (message français + « Réessayer »), succès. Mises à
  jour optimistes (likes, commentaires, reposts, abonnement) écrites directement
  dans le cache TanStack Query (pas d'état local dupliqué).
* **Limitation connue** : l'API `get-post-save` ne documente ni pagination ni
  endpoint de désauvegarde dédié — la liste est chargée en une fois et le
  désauvegarde passe par le toggle `store-save` (à confirmer avec le backend).


## 2026-09-01

### Retrouvailles — UI du chargement contacts et bouton « Fraterniser » (ajustements)

* **Chargement circulaire bien visible** : pendant la synchronisation des contacts, le petit spinner est remplacé par un **loader en anneau** (`RetrouvaillesCircleLoader`, cercle tournant `#A35A2A` sur piste `#F0E2D4`) avec libellé « Synchronisation de vos contacts… » ; les résultats n'apparaissent qu'une fois terminé.
* **Bouton « Fraterniser » marron caramel** : le bouton utilisait `variant="default"` du thème (qui rend **noir**, `--primary`), il utilise désormais la couleur Dughu `#A35A2A` (fond caramel, texte blanc, hover `#8a4d23`). L'état « Demande envoyée » passe en outline caramel (bordure `#A35A2A/30`, fond `#F5EFE8`).

### Retrouvailles — erreur « 431 Request Header Fields Too Large » à la synchronisation des contacts (correction)

* **Constat** : après import d'un fichier de contacts puis « Synchroniser », une erreur « Une erreur est survenue. Veuillez réessayer. 431 » s'affichait.
* **Cause** : les numéros étaient envoyés dans la **query string** (`GET /api/retrouvailles?...&phone_numbers=["07…","01…",…]`). Avec un fichier VCF volumineux, l'URL devient très longue et le **reverse proxy (nginx) rejette la requête avec 431** (« Request Header Fields Too Large ») — confirmé : l'API Dughu accepte jusqu'à 500 numéros en direct, c'est bien le proxy de notre app qui bloquait.
* **Correctifs** :
  * les contacts passent désormais par **`POST /api/retrouvailles` avec les numéros en body JSON** (`{ tab, userId, phoneNumbers }`) — plus rien dans l'URL du navigateur → plus de 431 ;
  * le service serveur traite les numéros par **lots de 100** (`MAX_CONTACTS_PER_REQUEST`) vers l'API Dughu, fusionne les résultats et **déduplique par id** ;
  * `RetrouvaillesContactsTab` simplifié : plus d'état `syncing` parasite ni de `refetch()` redondant — le `queryKey` inclut les numéros, React Query relance automatiquement le POST (`isFetching` pilote bouton + loader).

### Module « Retrouvailles » — précisions (VCF, modal unique, vrais profils)

* **Import de contacts en vCard (.vcf)** : l'onglet Contacts accepte désormais un fichier **VCF** de contacts (un numéro par champ `TEL`, formes `TEL;TYPE=CELL:+225…`, `item1.TEL:…`, dédupliqués) via `parseVcf` ; le CSV reste accepté en secours (`parseCsv`). `accept=".vcf,.vcard,…"` sur le sélecteur, libellés adaptés.
* **Modal affiché une seule fois** : dès que le modal de présentation est ouvert, la clé `dughu:retrouvailles-seen` est posée en `localStorage`. Aux clics suivants sur « Retrouvailles » dans la sidebar, l'utilisateur est **redirigé directement vers `/retrouvailles`** (vérification dans `openRetrouvailles` de `LeftSidebar`).
* **Vrais profils Dughu dans le modal** : la rangée d'avatars affiche les **5 premières suggestions réelles** de l'API Dughu (`/api/retrouvailles?tab=suggestions`) chargées via le hook TanStack Query — fin des avatars fictifs pravatar.

### Module « Retrouvailles » (ajout)

* **Modal de présentation** : cliquer sur « Retrouvailles » dans la sidebar gauche ouvre un modal (icône `HandHeart`, titre « Retrouvailles », sous-titre « Retrouvez ceux qui ont marqué votre vie. », rangée de 5 avatars, texte « +12 568 personnes retrouvées sur Dughu », 4 avantages et bouton « Commencer » qui mène à la page `/retrouvailles`). Composant `src/components/retrouvailles/RetrouvaillesModal.tsx`, monté depuis `LeftSidebar`.
* **Page `/retrouvailles`** : `MainLayout` avec sidebar gauche conservée et **sidebar droite masquée** (`noRightSidebar`), 3 onglets alignés à gauche — **Suggestions / Contacts / Anciens** — synchronisés avec l'URL (`/retrouvailles?tab=...`), état actif conservé (`active="retrouvailles"` dans la sidebar).
* **Onglet Suggestions** : liste de groupes d'affinité (amis en commun, même école, même ville…) via `GET /retrouvailles?tab=suggestions&user_id=...` (endpoint Dughu réel, normalisé) ; états chargement / vide / erreur / succès.
* **Onglet Contacts** : import d'un fichier CSV (numéros par ligne ou colonne) puis bouton **« Synchroniser »** avec état de progression ; les numéros sont envoyés sous forme de tableau JSON `phone_numbers=[...]` ; liste des contacts retrouvés avec bouton Fraterniser ; états loading / empty / error.
* **Onglet Anciens** : formulaire **École / Université**, **Promotion début / fin**, **Ville** → `GET /retrouvailles?tab=anciens&user_id=...&ville=...&school=...` ; résultats avec bouton Fraterniser ; états loading / empty / error / succès.
* **Bouton « Fraterniser » réutilisable** (`src/components/retrouvailles/FraterniserButton.tsx`) : envoie `POST relation/request` via le service existant des relations (`auth_user_id` + `user_id` + `type: friend`), désactive le bouton pendant l'envoi, affiche « Demande envoyée » au succès, gère demande déjà envoyée (état persistant côté runtime), relation existante et erreur serveur (rollback + message). Déduplication anti double-clic globale.
* **Architecture** respectée : page/composant → hook TanStack Query (`src/hooks/retrouvailles/use-retrouvailles.ts`) → service frontend (`src/services/retrouvailles/retrouvailles.service.ts`, instance Axios cliente) → route interne `GET /api/retrouvailles` → service serveur (`src/services/retrouvailles/retrouvailles.server.ts`, instance Axios serveur) → API Dughu. Normalisation défensive dans `src/services/retrouvailles/retrouvailles.mapper.ts` (formats réels vérifiés en direct : suggestions = blocs objet, contacts = tableau, anciens = `data.users`).

### Déconnexion — le bouton « Se déconnecter » de la modale reste inerte sur certaines pages (correction)

* **Constat** : la modale de confirmation s'affiche, mais appuyer sur « Se déconnecter » ne fait rien (pas de fermeture de session, pas de redirection).
* **Cause** : la modale de déconnexion vit dans `ProfileMenu` (Header), qui reçoit `onLogout` **de la page courante** via `MainLayout`. Plusieurs pages ne transmettent pas `onLogout` (ex. `/capsules`, messagerie, réglages…) → le bouton appelait `onLogout?.()` sur `undefined` : silence total, sans erreur.
* **Correctif** (`src/components/layout/MainLayout.tsx`) : `MainLayout` fournit désormais une **déconnexion par défaut** quand la page ne passe pas `onLogout` — appel du service auth `logout()` (route interne `/api/logout`, cookies httpOnly) puis redirection vers `/login` (même contrat que le `handleLogout` existant du profil). Les pages qui passent leur propre `onLogout` le conservent ; toutes les autres sont réparées d'un coup.

### Capsules — bouton « Je n'aime pas » totalement inerte (correction)

* **Constat** : appuyer sur dislike ne changeait ni le bouton ni le compteur.
* **Causes (diagnostiquées en direct sur l'API de test)** :
  * **le feed `fetchShorts` n'expose AUCUN compteur de dislikes numérique** (pas de `dislike_count` ; `dislikeBy` est renvoyé sous forme de **chaîne JSON** `"[23443]"`, que le normalisateur `readCount` ne savait pas compter) → `dislikesCount` valait toujours 0 : le +1 optimiste du clic était écrasé par le 0 du refetch, donnant l'impression qu'aucune action ne se produisait ;
  * **garde silencieux dans `toggleDislike`** (`dislikedIds.has(id) → return`) : cliquer une capsule déjà dislikée (état remonté par le serveur via `isDislikedByUser`) ne faisait strictement rien — pas de un-dislike possible.
* **Correctifs** :
  * `src/lib/capsule-service.ts` : nouveau helper `readDislikeCount` — compte les dislikes depuis `dislikeBy` (tableau natif, chaîne JSON `"[23443,123]"`, ids séparés par virgules) en privilégiant les champs numériques s'ils apparaissent un jour ; validé par 11 cas de test (y compris les 2 formes réelles observées : `"[23443]"` et `""`) ;
  * `src/components/capsule/CapsuleViewer.tsx` : **like et dislike sont de vrais toggles** — cliquer une capsule déjà aimée/dislikée retire la réaction (optimiste −1 puis `toggleLikeShort`/`toggleDislikeShort` qui gèrent nativement le retrait), avec rollback complet en cas d'échec ; protection anti double-clic par `reactingRef` (jamais lu pendant le rendu).

### Capsules — like / commentaire ne « rechargent » plus la capsule (correction)

* **Constat** : à chaque like/dislike ou ajout de commentaire, la capsule en cours de lecture « disparaissait » et était remplacée par une autre (vidéo repartant de zéro, commentaires différents) ; sur `/capsules`, la page semblait se réinitialiser.
* **Causes** :
  * **l'API Dughu ne renvoie pas le feed dans un ordre stable** (ordre différent à chaque appel) : chaque action réussie invalide le cache React Query `["capsules"]` → refetch → la liste est réordonnée → la capsule située à l'**index** suivi par la visionneuse était une **autre capsule** ;
  * le refetch renvoie de **nouveaux objets** capsules (URL média S3 parfois régénérée) : l'attribut `src` de la `<video>` changeait et le navigateur **rechargeait la vidéo** ;
  * `CapsulesPage` **remplaçait** sa liste locale par la page 1 refetchée (`setCapsules(data.capsules)`) : les pages chargées au scroll disparaissaient et la visionneuse ouverte sur une capsule des pages ≥ 2 était **démontée**.
* **Correctif** :
  * `src/components/capsule/CapsuleViewer.tsx` : la capsule affichée est désormais **suivie par son id** (état `viewingId`) et non plus par un index — sa position est recalculée dans la liste à jour (`resolvedIndex`), donc un réordonnancement du feed ne change plus la capsule visionnée ; navigation (swipe, molette, flèches, chevrons) et suppression pilotent `viewingId` ; repli sur la dernière position valide si la capsule suivie disparaît de la liste ;
  * `src/components/capsule/CapsuleViewer.tsx` : le **média de la capsule affichée est figé tant que son id ne change pas** (état `mediaState`, pattern React « adjusting state when props change ») — les compteurs restent à jour via l'objet frais du refetch, mais `src`/`poster` ne changent plus ; l'effet de changement de capsule (fermeture menu/commentaires) dépend désormais de l'id de la capsule et non de sa position ;
  * `src/components/capsule/CapsulesPage.tsx` : les données refetchées sont désormais **fusionnées** dans la liste locale (pages suivantes conservées, existantes rafraîchies sans changer de position, nouvelles capsules insérées en tête) au lieu de remplacer la liste par la page 1.

### Capsules — compteurs 100 % pilotés par le serveur (correction finale)

* **Constat** : même avec le patch du cache React Query, les compteurs affichés restaient des **surcharges locales** (`likeCounts` / `commentCounts` dans l'état de `CapsuleViewer`) : le serveur n'était jamais re-interrogé après une action, donc un compteur pouvait rester faux (ex. 2 commentaires en base, « 1 » affiché) et revenir à l'ancienne valeur à la réouverture.
* **Correctif** (`src/components/capsule/CapsuleViewer.tsx`) :
  * **suppression des états locaux** `likeCounts` / `commentCounts` — l'affichage lit **uniquement** `capsule.likesCount` / `capsule.commentsCount`… issus du cache React Query, lui-même alimenté par l'API Dughu (`like_count`, `comment_count`, `view_count` vérifiés en direct) ;
  * après chaque **like**, **dislike** ou **commentaire** réussi : patch instantané du cache (retour visuel immédiat) puis **`invalidateQueries({ queryKey: ["capsules"] })`** → React Query refetch le feed et remplace les compteurs par les **valeurs réelles du serveur** ;
  * rollback propre en cas d'échec (compteur + état `isLiked`/`isDisliked` restaurés depuis la valeur précédente capturée avant le patch).
* Résultat : like ou commentaire → le compteur s'actualise aussitôt **puis** se verrouille sur le chiffre serveur ; fermeture/réouverture de la capsule, changement d'onglet ou rechargement → toujours le vrai chiffre.

### Capsules — compteurs réinitialisés à la réouverture de la visionneuse (correction)

* **Cause** : les compteurs optimistes (likes, commentaires) vivaient uniquement dans l'état local de `CapsuleViewer`, **démonté à la fermeture** — les incréments n'étaient jamais répercutés dans le cache React Query (`["capsules", …]`) qui alimente l'accueil, la page `/capsules` et le profil. En rouvrant une capsule, les compteurs revenaient aux valeurs du feed (souvent `0`).
* **Correctif** (`src/components/capsule/CapsuleViewer.tsx`) :
  * nouveau helper `patchCapsulesCache` qui patche la capsule concernée dans **toutes** les queries dont la clé commence par `capsules` (`setQueriesData`) — gère les formes `{ capsules: [...] }` (feed) et tableau brut (capsules d'un utilisateur) ;
  * chaque **like** réussi patche `likesCount + 1` + `isLiked: true` (rollback sur échec), chaque **dislike** patche `dislikesCount` + `isDisliked`, chaque **commentaire / réponse** ajouté patche `commentsCount + 1` ;
  * les aimants initiaux (`likedIds` / `dislikedIds`) sont désormais **initialisés depuis les flags `isLiked` / `isDisliked` du cache**, donc le cœur reste rempli à la réouverture d'une capsule déjà aimée.
* Les données distantes restent la source de vérité au prochain rafraîchissement du feed.

### Capsules — alignement des contrats API Dughu (endpoints officiels)

* Alignement de toutes les actions capsules sur les contrats Dughu confirmés :
  * **Vue** (`POST /trackView`) : envoi de `user_id` + `capsule_id` + **`ip`** — l'IP du client est déduite côté serveur des en-têtes `x-forwarded-for` / `x-real-ip` (route `/api/capsules/[id]/view`) ; le champ obsolète `short_id` est retiré.
  * **Réponse à un commentaire** (`POST /replyCapsuleComment`) : envoi de `comment_id` + `text` + `user_id` (le champ `capsule_id` superflu est retiré).
  * **Like de commentaire / réponse** (`POST /toggleLike/capsule/comment`) : envoi de `comment_id` (commentaire racine parent) + `user_id` + **`CommentReply_id`** (id de la réponse lorsqu'on like une réponse, vide pour un commentaire racine). Le composant `CapsuleComments` transmet désormais le parent pour les likes de réponses.
  * **Signalement** (`POST /capsule/report`) : envoi des 5 champs `capsule_id` + `reason` + `reason_id` + `user_id` + `text` (retire `short_id`).
  * **Like / dislike de capsule** (`GET /toggleLikeShort/{id}/{user_id}`, `GET /toggleDislikeShort/{id}/{user_id}`) et **suppression** (`DELETE /capsule/{id}`) : déjà conformes.
* Chaîne complète respectée : composant → hook → service frontend (Axios cliente) → route `/api/capsules/*` → `capsule-service` (serveur) → API Dughu.

### Capsules — compteurs de likes / commentaires à 0 (correction)

* **Cause** : l'API Dughu (`POST /fetchShorts`) renvoie pour chaque capsule à la fois les **collections** `likes` (objet), `comments` / `views` (tableaux) **et** les **compteurs numériques** `like_count` / `comment_count` / `view_count`. Le mapper de `src/lib/capsule-service.ts` lisait la collection en premier → `Number(objet ou tableau)` = `NaN` → **0**, d'où des compteurs figés à 0 même après un like (`GET /toggleLikeShort/{id}/{user_id}`) ou un commentaire (`POST /storeComment/capsule`), alors que l'API enregistrait bien l'action.
* **Correctif** : nouveau helper `readCount` qui privilégie les champs numériques (`like_count`, `comment_count`, `view_count`, `dislike_count`…) puis retombe sur la longueur de la collection seulement si nécessaire. Vérifié sur le feed réel : capsule 132 → `like_count: 1`, `comment_count: 3`, `view_count: 3` désormais affichés.
* Les mises à jour **temps réel** existantes restent actives : incrément optimiste du compteur de likes au clic (avec rollback si l'appel échoue) et incrément à l'ajout d'un commentaire dans la visionneuse.

### Sidebars mobiles — exclusion mutuelle (gauche ⇄ droite)

* Sur **mobile/tablette (< `lg`)**, l'ouverture de la **sidebar gauche** (hamburger) **ferme automatiquement la sidebar droite** (tiroir « 4 carrés »), et inversement : ouvrir la **sidebar droite** ferme automatiquement la sidebar gauche. Les deux panneaux ne peuvent plus jamais être ouverts en même temps. Implémenté dans `MainLayout` (chaque handler d'ouverture ferme l'autre état). Aucun impact desktop : les deux sidebars y sont fixes et toujours visibles.

### Mini-profil (sidebar droite) — vrais compteurs (abonnés, suivis, interactions)

* La carte mini-profil de la sidebar droite affichait les compteurs locaux `user._count` (souvent vides ou obsolètes). Elle charge désormais les **vrais chiffres** via `GET /api/profile` (`stats` : `followersNbr`, `followingsNbr`, `NbrPostsTotal` de l'API Dughu) à travers le hook `useProfile` (flux obligatoire : `RightSidebar` → `useProfile` → `profile.service.ts` → Axios cliente → route `/api/profile`). `MiniProfileCard` reçoit une nouvelle prop `stats` (prioritaire sur `user._count`, qui reste le repli en cas d'échec) ; le compteur « Posts » devient **« Interactions »** (même convention que la page profil). Le squelette de la carte couvre désormais aussi le chargement du profil (`loading || profileLoading`).

### UI/Responsive — header : bouton « 4 carrés » + profil en couverture plein écran

* **Header mobile/tablette (< `lg`)** : le bouton **« 4 carrés »** (`LayoutGrid`, déjà présent mais sans action et invisible sur téléphone) est désormais affiché et câblé : un appui **ouvre la sidebar droite en tiroir coulissant** depuis la droite (état actif `bg-[#DBEAFE]`, `aria-expanded`).
* **`RightSidebar` en tiroir** : sur mobile/tablette elle devient un **panneau fixe plein hauteur** (~300px, `max-w-[85vw]`, z-50, fond `#f7f8fa`) glissant par `translate-x` (caché hors écran + `invisible` sinon, avec barre de fermeture « Découvertes » + X) ; sur desktop **xl+** elle reste une **colonne fixe immobile à `right-[220px]`** (`xl:translate-x-0`, z-30) — comportement desktop inchangé (cards du feed jamais poussées/redimensionnées, conversation en overlay z-40).
* **`MainLayout`** : état `mobileRightSidebarOpen` + overlay mobile (z-40, `lg:hidden`) derrière le tiroir ; nouvelle prop `hideHeaderOnMobile` (padding du layout `pt-0` sous `lg`, `lg:pt-[88px]` sinon).
* **Profil mobile/tablette (profilure)** : sur `< lg`, le header principal est **masqué** (`hideHeaderOnMobile` dans `ProfileShell`), la **couverture prend tout le haut de l'écran** (marges négatives `-mx-2 sm:-mx-4 lg:mx-0`, carte sans coins arrondis sous `lg`, hauteur portée à `h-64 sm:h-80`) avec un **bouton retour** circulaire façon Facebook (flèche `ChevronLeft`, fond blanc translucide, `router.back()` → `/home` en repli).


### Sidebar droite — posts boostés (correction) + navigation mobile

* **Posts boostés** : le chargement des suggestions pouvait rester **bloqué en squelettes** (« Chargement des posts boostés… » affiché à l'infini) quand aucun identifiant n'était disponible (`user?.id` vide → l'effet se terminait sans jamais retirer `loading`). Désormais l'effet utilise aussi `user.dughu.userId`/`dughhuUserId`, se termine proprement (`loading=false`) si aucun identifiant, et `fetchSuggestions` transmet explicitement `dughhuUserId` à `/api/suggestions` — la route l'attend pour générer les posts populaires sans dépendre du seul cookie.
* **Tab bar mobile** : ajout des icônes **Fraterniser** (`UsersRound`) et **Réseauter** (`BriefcaseBusiness`) → `/profile/relations?type=friend|network` ; la page des demandes pré-sélectionne le filtre selon `?type=`.

### UI/Responsive — sidebar droite en `right-55`, visible sur tous les écrans

* **Desktop (xl+)** : la `RightSidebar` est fixée à **`right-55`** (220px du bord droit, Tailwind v4) au lieu de `right-6`.
* **Taille des cards du feed constante** : l'espace réservé dans `MainLayout` est **fixe** (`xl:w-[484px]` = 220px d'offset + 240px de sidebar + 24px de respiration), quel que soit l'état du chat — les cards du feed ne rétrécissent jamais, sur aucun écran.
* **Conversation en overlay, sidebar droite immobile** : l'ouverture du chat ne déplace plus la sidebar droite (position `xl:right-[220px]` constante, prop `chatOpen` retirée du composant) — elle ne couvre jamais le card du feed (l'ancien glissement `right-[520px]` est supprimé) ; la `ConversationSidebar` (fixed, z-40) s'ouvre par-dessus les éléments, sans pousser ni redimensionner les cards du feed sur aucun écran.
* **Mobile / petit écran (< xl)** : la sidebar droite s'ouvre en **tiroir coulissant** depuis la droite via le **bouton « 4 carrés » du header** (panneau fixe plein hauteur, `translate-x`, overlay sombre, bouton de fermeture) — elle glisse par-dessus le contenu sans jamais le pousser ni réduire la taille des cards du feed.
* **Instance unique** : la sidebar n'est rendue qu'une fois (plus de doublon fixe/flux), donc un seul appel à `/api/suggestions` et `/api/pointsToday/[userId]`.
* Validation : `tsc --noEmit` ; vérification responsive 320/375/768/1024/1280/1440/1920 (aucun scroll horizontal, aucune variation de taille des cards du feed à l'ouverture du chat).

### UI/Responsive — ajustement du layout du feed (desktop)

* Rétrécissement de la colonne centrale du feed : `max-w-[800px]` → `max-w-[680px]` (cartes de posts et composer plus compacts, conforme à `docs/RESPONSIVE_GUIDELINES.md` — remise en page par colonnes indépendantes, sans écrasement du contenu à deux colonnes).
* Rapprochement de la sidebar droite du feed : conteneur MainLayout élargi (`xl:w-[240px]` → `xl:w-[264px]`, `xl:w-[540px]` → `xl:w-[564px]` quand le chat est ouvert) et RightSidebar décollée du bord droit (`right-0` → `right-6`) pour créer un espace visible entre la sidebar et le bord de la page.
* Comportements conservés : visibilité `xl:` uniquement (desktop large), repositionnement animé quand le chat est ouvert, aucun changement mobile/tablette.
* Validation : `tsc --noEmit` exit 0 ; ESLint sans nouvelle erreur (les 10 problèmes remontés sont préexistants, lignes non touchées).

### Architecture — lot 10 : regroupement des routes App Router
## 2026-09-01

### Architecture — lot 10 : regroupement des routes App Router

* Création des groupes de routes `(public)` (accueil, login, register, otp, forgot-password) et `(protected)` (home, profile, messages, capsules, onboarding, hashtags) — les URLs publiques restent strictement identiques (les groupes Next.js ne font pas partie des chemins).
* Aucun groupe `(admin)` créé : aucune route d'administration distincte n'existe actuellement dans le projet.
* `proxy.ts` conservé tel quel (convention de la version Next.js installée, validée par le build) ; layouts, métadonnées et imports relatifs vérifiés.
* Validation : `tsc --noEmit` exit 0 et `next build` exit 0 avec toutes les routes résolues.

### Architecture — lot 8 : messagerie

* **Migration du domaine Messagerie** (flux vertical complet) :
  * service frontend `services/messages/messages.service.ts` (8 endpoints : chats, contacts, recherche, conversation, envoi, édition, suppression message/conversation) sur l'instance Axios cliente ;
  * types déplacés vers `types/messages/message.types.ts`, `lib/messages.ts` réduit à une façade de types + helpers purs ;
  * `MessagesPageClient`, `ConversationPopup` et `ConversationSidebar` n'importent plus Axios ni l'ancien `apiClient` ;
  * **suppression de `src/lib/apiClient.ts`** (0 importeur restant) — l'ancienne instance et son interceptor de redirection globale 401 disparaissent ;
  * erreurs normalisées via `ApiError` + helper `getApiErrorMessage` étendu (message français approuvé prioritaire).
* **Jalon** : fin de la migration frontend fetch → Axios (lots 1 à 8) — plus aucun `fetch` direct dans les composants/hooks/services frontend.

### Architecture — lot 7 : stories, capsules et flash

* **Migration du domaine Stories / Capsules / Flash** (flux vertical complet) :
  * service frontend `src/services/stories/stories.service.ts` (rail, flash utilisateur, like, suppression, vues, viewers, création multipart) ;
  * service frontend `src/services/capsules/capsules.service.ts` (feed, like, participation) ;
  * hooks `use-stories` / `use-capsules` / `use-flash` déléguant aux services, plus aucun `fetch` direct (les hooks conservent l'orchestration TanStack Query : keys, invalidations, mises à jour optimistes) ;
  * composants `CapsulesPage` et `FlashCreator` branchés sur les services ; `catch (err: any)` remplacé par `ApiError`/`userMessage` ;
  * plus aucun `fetch` frontend hors modules serveur (`dughu.ts` API externe, `utils.ts` ipapi.co).

### Architecture — lot 6 : recherche

* **Migration du domaine Recherche** (flux vertical complet) :
  * types dédiés `src/types/search/search.types.ts` (`GlobalSearchResult`, `SearchApiResponse`) — le DTO brut Dughu reste `unknown` et l'incertitude est confinée au mapper ;
  * mapper `src/services/search/search.mapper.ts` : normalisation défensive déplacée depuis `lib/global-search.ts` (façade transitoire de réexport conservée) ;
  * service serveur `src/services/search/search.server.ts` : `searchAll` + `isSearchEnabled`, Route Handler `/api/search` allégé (lecture → validation → session → service → NextResponse) ;
  * service frontend `src/services/search/search.service.ts` avec `AbortSignal` (annulation d'une saisie remplacée via Axios, code `ERR_CANCELED` ignoré côté composant) ;
  * `GlobalSearch.tsx` n'importe plus `fetch` : debounce 350 ms, annulation et messages utilisateurs conservés à l'identique.
* Vérifications : `tsc --noEmit` exit 0 ; ESLint du lot exit 0 ; zéro `fetch` direct restant dans le domaine recherche/hashtags.

### Architecture — lot 5 : commentaires et réactions

* **Finalisation du domaine Commentaires/Réactions** (flux vertical complet) :
  * service serveur `src/services/posts/comments.server.ts` créé : la logique lourde Dughu (pagination complète avec déduplication, résolution du commentaire racine pour les réponses, normalisation des médias) est extraite de la Route Handler `src/app/api/comments/route.ts`, désormais légère (lecture → validation → service → NextResponse) ;
  * service frontend `comments.service.ts` : point d'entrée unique des commentaires (suppression du doublon `addComment` dans `posts.service.ts`) ;
  * migration des derniers `fetch` directs : `ProfilePage.tsx` (commentaires, réactions, publications du profil) et `HashtagPage.tsx` (import centralisé) ;
  * comportements conservés : réponses plates sous le commentaire racine (contrainte API Dughu), multipart pour les pièces jointes, messages d'erreur existants.
* Vérifications : `tsc --noEmit` exit 0 ; ESLint du lot sans nouvelle erreur (les erreurs restantes de `ProfilePage`/`HashtagPage` sont préexistantes : typages faibles, setState-in-effect).

### Architecture — lot 4 : publications et feed

* **Migration architecturale du domaine Publications/Feed** vers les couches cibles :
  * services frontend `src/services/posts/` (`posts.service.ts` : CRUD posts, réactions, pin, hide, block, save, boost, follow, hashtags ; `feed.service.ts` : points, suggestions ; `comments.service.ts` et `composer.service.ts` pour commentaires et composition) — seuls modules autorisés à utiliser l'instance Axios cliente ;
  * types dédiés `src/types/posts/post.types.ts` ;
  * migration des appels `fetch` restants : `home/page.tsx` (feed, création, réactions, commentaires, repost, rePost), `PostCard`, `GivePointsModal`, `PostComposer`, `BackgroundPicker`, `RightSidebar`, `use-feed.ts`, `use-suggestions.ts`, `ProfilePage` (posts du profil, création), `HashtagPage` (posts, réactions) ;
  * comportements conservés : optimisme sur réactions, `isAbortError` pour garder « Chargement trop long, reessayez. », messages d'erreur existants, pas de retry sur mutations, `AbortSignal` sur les lectures ;
  * erreur d'annulation normalisée via `ApiError`/`ERR_CANCELED` côté instance cliente.
* Vérifications : `tsc --noEmit` exit 0 ; ESLint du lot sans nouvelle erreur.

### Architecture — lot 1 : domaine des relations

* **Migration architecturale du domaine des relations** vers les couches cibles (services, hooks TanStack Query, types dédiés, mapper, routes BFF allégées) :
  * création de `src/lib/api/client/axios-instance.ts` (instance Axios cliente, baseURL interne `/api`, `withCredentials`, timeout, header `Accept`, `AbortSignal`, erreurs → `ApiError`) ;
  * création de `src/lib/api/server/dughu-instance.ts` (instance Axios serveur, config validée `src/lib/config/env.ts`, `X-AppApiToken`, retry limité sur lectures idempotentes uniquement, jamais exposée au navigateur) ;
  * déplacement de la normalisation relations dans `src/services/relations/relation.mapper.ts` (`normalizeProfileRelations`, `normalizeIncomingRelationRequests`, règles d'action/état) ;
  * services `relations.service.ts` (frontend, uniquement les routes internes `/api`) et `relations.server.ts` (serveur, multipart/form-data vers Dughu, aucun retry sur mutation) ;
  * hooks `useRelation` et `useRelationRequests` (TanStack Query, cache optimiste, invalidation de `["profile", …]`) ;
  * allègement des Route Handlers `/api/profile/relation` et `/api/profile/relations/requests` (lire la requête → vérifier la session → valider → service serveur → `NextResponse`) ;
  * type d'erreur commun `ApiError` (`src/lib/api/api-error.ts`, messages français, aucun détail technique/stack trace exposé) ;
  * façades temporaires de compatibilité conservées (`src/hooks/useRelation.ts`, `src/lib/profile-relations.ts`, `src/lib/relation-requests.ts`) en attendant la fin des imports non migrés.



**Correction fonctionnelle** : la suppression d'une relation acceptée (`remove`) est désormais transmise à l'endpoint Dughu `relation/request` (toggle) et autorisée par la route interne. Le domaine relations compile de nouveau (`tsc --noEmit` : 0 erreur contre 12 avant le lot).

### Architecture — lot 2 : domaine de l'authentification

* Création de `src/services/auth/auth.service.ts` (service frontend : `login`, `register`, `logout`, `me`, `forgotPassword`, `resetPassword`, `verifyOtp`, `resendOtp` via l'instance Axios cliente — plus aucun `fetch` dans les pages login/register/otp/forgot-password ni dans `GoogleSignInButton`) ;
* Création de `src/hooks/auth/use-auth.ts` (hook TanStack Query `useAuth`, remplace `src/hooks/queries/use-auth.ts` conservé en façade transitoire) ;
* Création de `src/types/auth/auth.types.ts` (types `AuthUser`, payloads et réponses du domaine) ;
* Routes internes d'authentification inchangées (contrats `/api/login`, `/api/register`, `/api/logout`, `/api/auth/*`, `/api/otp/*`, `/api/password/*` préservés).

### Architecture — lot 3 : domaine du profil

* Création de `src/services/profile/profile.service.ts` (service frontend : `fetchProfile`, `updateProfile`, `updateProfileInfos`, `uploadProfileImage` — FormData laissé à Axios pour le Content-Type/boundary, `changePassword`, `fetchCountries`, `submitVerification`, `fetchVerificationRequests`, `toggleFollow`) ;
* Création de `src/types/profile/profile.types.ts` (`ProfileUser`, `ProfileInfo`, `ProfileStats`, `ProfileApiResponse`, payloads et réponses typés) ;
* Création de `src/hooks/profile/use-profile.ts` (hook TanStack Query, remplace `src/hooks/queries/use-profile.ts` conservé en façade transitoire) ;
* Migration des composants du domaine : `ProfilePage` (follow), `ProfileSettingsPage` (profil, infos, pays, avatar), `EditProfileModal`, `ImageEditModal`, `ChangePasswordPanel`, `ProfileShell` et `ProfileHeader` (vérification), `onboarding/profile` (avatar/couverture) — plus aucun `fetch` direct dans le domaine profil ; messages d'erreur utilisateurs préservés via `userMessage`/`ApiError`.
* Comportement et UI inchangés (`tsc --noEmit` : 0 erreur ; ESLint : seuls des problèmes préexistants hors lot subsistent).

## 2026-08-28

### Ajouts

* Recherche globale de l'en-tête : connexion à `POST /searchAll` via une route serveur sécurisée, normalisation des utilisateurs, publications, pages, groupes et hashtags, panneau de résultats responsive, temporisation des requêtes et navigation au clavier.
* Correction du contrat de `searchAll` après validation sur la réponse réelle de l'API : envoi des champs obligatoires `query` et `user_id`, et prise en charge de `result.{posts,pages,groups,users}.data` ainsi que du champ de publication `postText`.
* Navigation de l'en-tête : remplacement du bouton statique « Abonnés » par les boutons accessibles « Fraternisés » et « Réseautés », avec infobulles au survol et au clavier ainsi qu'une icône de mallette pour « Réseautés ».
* Harmonisation des accès « Accueil », « Vidéos », « Flash » et « Akwaplay » avec les boutons relationnels : format compact, infobulles accessibles et focus clavier visible.
## 2026-08-31

### Corrections

* Capsules — **affichage des commentaires réparé (contrat réel `POST /fetchComments`)** : diagnostic API en direct + Postman → `fetchComments` est un endpoint **authentifié par utilisateur** (token de session `dughu_token` en `Authorization: Bearer` ; avec un token invalide l'API répond `Unauthorized`, sans token elle renvoie une erreur générique). Le client Dughu ne transmettait jamais ce token sur les endpoints Capsules : `dughu.get` / `dughu.form` acceptent désormais un `authToken` optionnel, et la route interne `GET /api/capsules/[id]/comments` lit `dughu_token` (cookie httpOnly, via `getDughuTokenFromCookies`) et le transmet à `fetchCapsuleComments`.
* Capsules — **pagination des commentaires réelle** : le serveur pagine via `result.current_page / last_page / per_page / total` avec **`page` en query string** (`/fetchComments?page=N`) et le tableau dans `result.data`. `fetchCapsuleComments` envoie `page` en query (défaut 1, borné ≥ 1), normalise `result.data` (auteur imbriqué `user` **ou** à plat, `replies` récursives) et renvoie la **pagination** de bout en bout : route interne → hook client → panneau `CapsuleComments` (chargement page 1, bouton **« Charger plus de commentaires »** qui appelle `page + 1` et fusionne la liste). Plus de repli cache-navigateur : le panneau affiche **uniquement les commentaires distants** de l'API Dughu.
* Capsules — **message d'erreur des commentaires (transparence)** : la route interne `GET /api/capsules/[id]/comments` ne masque plus la cause derrière un 500 générique. Sans session Dughu elle répond **401 « Connectez-vous pour afficher les commentaires. »** ; avec un token invalide/expiré, `dughuErrorMessage` traduit les **401/403/Unauthorized/« connectez-vous. »** en « Votre session Dughu semble expirée ou invalide. Reconnectez-vous puis réessayez. » — et l'erreur réelle (déjà traduite par le service) est propagée au lieu du bandeau générique. Le panneau affiche ce message précis avec un bouton Réessayer.
* Capsules — **like / dislike (correction de messages)** : endpoint confirmé en direct `GET /toggleLikeShort/{capsule_id}/{user_id}` (= `toggleDislikeShort`) — fonctionne avec un `user_id` valide ; l'erreur « connectez-vous. » (session inconnue/expirée) est désormais traduite en message utilisateur clair (« Votre session Dughu semble expirée. Reconnectez-vous puis réessayez. ») et affichée par la visionneuse au lieu du message générique.
* Capsules — **ajout de commentaire confirmé** : `POST /storeComment/capsule` avec `capsule_id` + `text` + `user_id` → succès (201) ; la route `POST /storeComment` seule n'existe pas côté Dughu.
* Visionneuse Capsules — **glissement tactile (mobile) réparé** : sur téléphone/tablette le panneau ne permettait aucune navigation (ni swipe ni bouton — la molette, les flèches clavier et les chevrons ‹‹ lg ›› n'existaient qu'en desktop). Ajout de la navigation par **glissement vertical** dans `CapsuleViewer` : vers le haut = capsule suivante, vers le bas = précédente (seuil 60 px, geste quasi vertical) ; les gestes démarrant sur un élément interactif (bouton, lien, champ…) sont ignorés pour ne pas gêner le tap. `touch-action: none` sur la zone de balayage + `overscroll-none` sur le conteneur pour bloquer le scroll parasite / pull-to-refresh iOS, et carte vidéo élargie en mobile (`w-[min(86vw,680px)]` au lieu de 59vw) pour un rendu Reels plein écran.
* Page Capsules — **fausse liste vide au chargement (correction)** : au rechargement de `/capsules`, « Aucune capsule pour l'instant. » s'affichait brièvement avant la grille. Cause : la query `useCapsulesFeed` est désactivée (`enabled: !!userId`) tant que `useAuth` n'a pas résolu, et React Query renvoie alors `isLoading: false` avec `data` absent → la branche « liste vide » était atteinte. La page affiche désormais des **squeletons** tant que l'auth ou le feed n'est pas résolu (`authLoading` / `isLoading`), n'affiche « Aucune capsule » que lorsque la donnée est réellement vide, et rend la **1ʳᵉ page de React Query directement** (`displayCapsules`, état `hydrated`) pour ne jamais avoir de fenêtre vide entre l'arrivée de `data` et la recopie dans l'état local (suppressions optimistes incluses).
* Sidebar droite — **fausses infos statiques au chargement (correction)**, y compris la **carte mini-profil** : au rechargement, les blocs affichaient d'abord les **replis statiques codés en dur** (`GROUPS`/`SPACES` — « Startups Afrique », « Espace Tech »…, tendances `#TechCI/#Abidjan/#Dughu`, « 0 Points », « Aucun post boosté », cover/avatar par défaut et « Utilisateur ») le temps que `/api/suggestions`, `/api/pointsToday/{id}` et l'auth répondent, puis basculaient sur les données réelles. `RightSidebar` a maintenant un état **`loading`** (relancé à chaque changement de session, levé seulement quand la session est résolue **et** que suggestions **et** points sont chargés) et affiche des **squelettes** sur tous les blocs asynchrones ; la **`MiniProfileCard` accepte une prop `loading`** et rend des squelettes (badge points, cover, avatar, identité, stats) à la place des placeholders ; les données statiques ne servent plus de repli que si l'API renvoie réellement vide. `GroupCarousel` accepte une prop `loading` (squelettes à la place des cartes).
* Header — **badge de messages non lus sur l'icône messagerie (ajout)** : le nombre de messages non lus, jusqu'ici visible uniquement dans la **sidebar de conversations**, s'affiche désormais aussi sur l'**icône messagerie du header** (badge orange `#A35A2A`, identique au style des badges de la liste, plafonné à « 99+ »). `ConversationSidebar` calcule le total (même logique `isUnread` que les badges de la liste) et le remonte via un nouveau callback `onUnreadCountChange` ; elle charge aussi les conversations **en continu même panneau fermé** (polling 5 s) pour garder le badget à jour. Synchronisation des lectures : événement `storage` (autre onglet) + nouvel événement custom `dughu:read-conversations-changed` broadcasté dans le **même onglet** quand une conversation est lue (sidebar ou page `/messages`) → le badge du header se retire immédiatement. Le câblage passe par `MainLayout` (état `messageUnreadCount`), et l'icône reçoit aussi un `aria-label` informatif (« Messagerie (N messages non lus) »).

## 2026-08-28 (8)

### Corrections

* Capsules — **compteur de commentaires vivant** : le nombre affiché sous le bouton Commentaires de la visionneuse ne s'actualisait pas quand on postait un commentaire (il restait figé sur la valeur du feed). Le panneau `CapsuleComments` remonte désormais un évènement (`onCommentAdded`) à `CapsuleViewer`, qui incrémente un compteur local par capsule (`commentCounts`, même pattern que le like). Le compteur sous le bouton monte donc d'un cran immédiatement après l'ajout d'un commentaire ou d'une réponse.

## 2026-08-28 (7)

### Ajouts

* Capsules — **compteurs sous les boutons d'action** (`CapsuleViewer.tsx`) : dans la visionneuse, les boutons J'aime, Je n'aime pas, Commentaires et Vues affichent désormais **en permanence** leur nombre (y compris `0`) sous l'icône, au lieu de ne l'afficher qu'à partir de 1. Le compteur de **« J'aime » se met à jour en temps réel** (incrément optimiste au clic, rollback en cas d'échec) via un état local par capsule.

## 2026-08-28 (6)

### Corrections

* Avatars (correction visuelle) : un **carré** apparaissait derrière la photo de profil dans les capsules (page `/capsules`, rail du fil, profil) lorsqu'une bordure était appliquée à l'avatar. Le conteneur de `Avatar` (`src/components/common/Avatar.tsx`) n'était pas arrondi : une bordure passée via `className` (ex. `border-2 border-white/80` dans `CapsuleCard`) se dessinait sur ce conteneur carré derrière la photo ronde. Le conteneur externe est désormais `rounded-full`, la bordure épouse donc la forme ronde de la photo (aucun carré résiduel).

## 2026-08-28 (5)

### Ajouts

* Capsules — **lecture au survol** (`CapsuleCard.tsx`) : dans la page `/capsules`, le rail du fil d'actualité et la grille du profil, la **vidéo d'une capsule se joue automatiquement (en muet)** lorsque le curseur survole la vignette (et au focus clavier), puis s'arrête au départ du survol où la miniature réapparaît. Si une capsule n'a pas de miniature, sa vidéo sert toujours de fond et se joue au survol.
* Capsules — **confidentialité des commentaires** (`CapsuleComments.tsx`) : l'auteur d'un commentaire (ou d'une réponse) s'affiche sous **« Utilisateur »** lorsqu'il s'agit de l'utilisateur connecté ; les autres commentateurs conservent leur nom. Le libellé « Répondre à … » utilise aussi « Utilisateur » pour ses propres commentaires.

## 2026-08-28 (4)

### Corrections

* Capsules — **liste des commentaires (amélioration)** : l'endpoint Dughu `POST /fetchComments` étant en panne (HTTP 500 systématique, toutes variantes de format testées : urlenc, JSON, multipart), le panneau de commentaires n'affichait qu'un bandeau « Impossible de charger les commentaires… Réessayer ». Il affiche désormais les commentaires **connus de ce navigateur** (nouveau cache local par capsule `src/lib/capsuleCommentsCache.ts`, clés `dughu:capsule-comments:{capsuleId}`, même pattern que les réactions de messagerie / les non-lus) : au chargement la liste locale s'affiche immédiatement, la lecture distante est tentée en arrière-plan et reprend la main dès qu'elle répond avec des données. L'**ajout, les réponses et les likes restent fonctionnels** (écrits côté Dughu en HTTP 201/200) et sont persistés localement — ils restent donc visibles au rechargement tant que `fetchComments` est indisponible. Un indicateur discret « Affichage des commentaires connus de ce navigateur » est montré quand la liste provient du cache. Limite documentée : liste locale au navigateur.

## 2026-08-28 (3)

### Corrections

* Capsules — **commentaires (correction)** : l'ajout d'un commentaire échouait avec « Dughu API 422 sur storeComment/capsule ». Le code envoyait `short_id` + `comment`/`content` mais l'API Dughu attend **`capsule_id` + `text` + `user_id`** (contrat vérifié en direct : `storeComment/capsule` → 201, `replyCapsuleComment` → 201, `replyCapsuleReply` → 201, `toggleLike/capsule/comment` → 200 avec `is_liked`/`likes_count`). Les fonctions de `src/lib/capsule-service.ts` sont corrigées, la route interne `POST /api/capsules/[id]/comments/[commentId]` propage désormais le `capsuleId`, et la normalisation d'un commentaire gère l'auteur imbriqué (`user`/`avatar`) **ou** à plat (`user_id`/`username`/`avatar`, forme renvoyée par l'API). Le like restitue maintenant `is_liked` et `likes_count`. Vérifié de bout en bout : `POST /api/capsules/5/comments` (ajout) → 200, action « reply » → 200, action « like » → 200 `{liked:true, likesCount:1}`.
* Capsules — **messages d'erreur (correction)** : les erreurs techniques brutes (« Dughu API 422… ») ne sont plus affichées telles quelles. Nouveau helper `dughuErrorMessage` dans `src/lib/capsule-service.ts` qui traduit les erreurs de validation Dughu en message utilisateur (ex. « Le texte du commentaire est obligatoire. ») ; sinon fallback en français (ex. « Impossible d'ajouter votre commentaire. Veuillez réessayer. »).
* Capsules — **liste des commentaires indisponible** : l'endpoint Dughu `POST /fetchComments` renvoie un HTTP 500 systématique (11 variantes de champs testées — bug côté API Dughu, pas du client). Le panneau `CapsuleComments` (`src/components/capsule/CapsuleComments.tsx`) affiche désormais un **bandeau inline** « Impossible de charger les commentaires pour le moment. » avec bouton « Réessayer », sans bloquer l'ajout de commentaires ni les réponses.

## 2026-08-28 (2)

### Corrections

* Capsules (correction) : **vignettes et vidéos invisibles** sur les capsules. La réponse Dughu de `POST /fetchShorts` expose le média via `file_path` (vidéo, URL S3 absolue) et `thumbnail_path` (vignette) — clés que le normalisateur ne lisait pas (il cherchait `video`, `file`, `thumbnail`…) : toutes les capsules apparaissaient « Capsule sans média » et sans miniature. `normalizeCapsule` (`src/lib/capsule-service.ts`) lit désormais `file_path` (vidéo), `thumbnail_path` (vignette) et `isDislikedByUser` (état « je n'aime pas », non restitué auparavant). Vérifié en direct : `/api/capsules` renvoie désormais `video` et `thumbnail` renseignés.

### Modifications

* Navigation : l'entrée **« Capsules » est retirée de l'en-tête desktop** (`Header.tsx`). Les capsules restent accessibles via la sidebar gauche et la barre de navigation mobile, ainsi que par le rail « Capsules » du fil d'actualité.

## 2026-08-28

### Corrections

* Bouton « Gratifier » (don de points) sur les publications texte : la détection du post « sien » (`ownPost` dans `src/components/feed/PostCard.tsx`) est renforcée — elle compare désormais l'identifiant Dughu de l'auteur au `dughu.userId` de l'utilisateur connecté, normalisé (`String().trim()`), et ne masque plus le bouton lorsque l'auteur du post est inconnu (id vide) ou qu'il s'agit d'un post de page : le bouton reste donc visible sur les posts de tiers. Un diagnostic de développement (`console.debug`) signale tout post sans bouton alors que l'auteur semble être un tiers.
* Menu d'action « ⋯ » d'une publication : le menu est désormais limité en hauteur et défilable (`max-h-[70vh] overflow-y-auto`) afin que l'option « Donner des points » reste accessible même lorsqu'elle est en bas de la liste (ex. posts texte colorés de grande hauteur).
* Publications (correction) : la barre d'actions d'une publication n'utilise plus `overflow-x-auto` (`src/components/feed/PostCard.tsx`). `overflow-x: auto` impose `overflow-y: auto`, ce qui **rogne le sélecteur de réactions** (positionné au-dessus du bouton, au survol) et le **menu « Republier »** (positionné en dessous) : les emojis de réaction ne s'affichaient plus au survol et le bouton « Republier » semblait ne plus fonctionner. Les enfants flexibles de la barre reçoivent désormais `min-w-0` pour se réduire au lieu de déborder (les libellés sont déjà masqués sous `sm`), donc aucun débordement horizontal ne subsiste sans ce remplissage.
* Réactions (correction) : le **like / les réactions sur une publication** échouaient systématiquement avec « Erreur de réaction (API Dughu). » car la route `POST /api/reactions` exigeait un champ `success: true` explicite dans la réponse de `toggleLikePost`. Or l'API Dughu renvoie souvent une forme de succès sans ce champ (`{}`, `{done:true}`, `{is_like:1}`…). Comme pour `toggleLikeStory` / `deleteMessage` / `points/give`, la route ne considère plus l'échec que sur `success === false` explicite, et déduit l'état « aimé » de `is_like` / `liked` (booléen, `1`, ou `"1"`) et l'identifiant de réaction de `reaction.reaction` / `reaction_id` / `reactionId` (`src/app/api/reactions/route.ts`).
* Réactions (correction) : choisir une **réaction autre que « J'aime »** (love, haha, wow, sad, angry) sur une publication échouait alors que le simple like passait. La route `POST /api/reactions` n'envoyait à l'API Dughu que le champ `reaction` (numéro), alors que le like de commentaire — même contrat Dughu — transmet aussi le champ `type` (nom lisible). Sans `type`, l'API ne savait traiter que le like par défaut (`reaction=1`). La route joint désormais `type` au formData (`src/app/api/reactions/route.ts`), et fait remonter le détail réel de l'erreur upstream sur échec au lieu d'un message générique.
* Publications (ajout) : la **suppression d'une publication** demande désormais confirmation via un **vrai popup** (composant réutilisable `ConfirmDialog`, `src/components/common/ConfirmDialog.tsx`) au lieu du `confirm()` natif du navigateur. Le popup affiche un message clair (« Cette action est irréversible… »), les boutons **Annuler** / **Supprimer**, et un état de chargement sur le bouton pendant la suppression. Intégré dans le fil d'accueil (`/home`), la page hashtag (`HashtagPage`) et le profil (`ProfilePage`).
* Flash (ajout) : la **suppression d'un Flash** demande désormais confirmation via le même popup `ConfirmDialog` au lieu du `window.confirm()` natif, dans `FlashViewer.tsx`.
* Publications en lien avec les Flash (ajout) : si l'auteur d'un post a un **Flash actif**, sa **photo de profil** dans la carte du post s'affiche avec un **anneau marron** (dégradé `#E08543` → `#A35A2A`) ; un clic sur la photo ouvre le **visualiseur Flash** de cet auteur. La liste des auteurs ayant un Flash est dérivée du feed Flash (`useFlashFeed`) partagé via le cache React Query (aucune requête supplémentaire côté accueil, où le rail existe déjà). Appliqué dans `PostCard` (nouvelles props `hasActiveFlash` / `onOpenAuthorFlash`) et câblé dans le fil d'accueil (`/home`), la page hashtag (`HashtagPage`) et le profil (`ProfilePage`).
* Flash vus (ajout) : une fois les Flash d'un utilisateur **consultés**, l'anneau autour de son avatar passe en **gris** — à la fois dans les **cartes de posts** (`PostCard`, nouvelle prop `flashViewed`) et dans les **mini-cartes du rail Flash** (`FlashStoryCard`, l'anneau ne disparaît plus mais devient gris). Le statut « vu » est propagé immédiatement via le cache React Query : au moment où `FlashViewer` enregistre une vue (`logView`), le helper `markFlashFeedUserViewed` (`src/hooks/queries/use-flash.ts`) bascule `allViewed: true` pour cet utilisateur dans le cache du feed Flash, sans attendre le rafraîchissement de l'API Dughu.
* Messagerie (ajout) : **distinction des messages reçus / envoyés et badge de non-lus** dans la liste des conversations. L'API Dughu n'exposant pas de compteur de non-lus fiable sur la liste des conversations, `normalizeChats` (`src/lib/messages.ts`) déduit désormais le non-lu du dernier message du fil : s'il vient du contact et n'est pas marqué « vu » (champ `seen`), la conversation compte un message non lu. Dans la sidebar de messagerie (`ConversationSidebar`), une conversation non lue affiche un **badge orange** avec le nombre, le **nom et l'aperçu en gras**, un **fond légèrement teinté**, et l'aperçu est préfixé « Vous : » (avec coches) lorsque le dernier message est le mien. Ouvrir une conversation (sidebar ou popup) la marque comme **lue** (localStorage partagé avec la page `/messages`, clé `dughu:read-conversations`), retirant le badge immédiatement partout.
* Capsules : l'élément « Capsule » de la **sidebar gauche** (`LeftSidebar`) redirige désormais vers la page `/capsules` (état actif quand la page est courante, fermeture du menu mobile après le clic).
* Capsules — **création connectée** (ajout) : les 2 derniers maillons du dossier « Capsule » sont désormais consommés côté client. **1)** `POST /store/capsule` : nouvelle modale `CapsuleCreator` (`src/components/capsule/CapsuleCreator.tsx`, pattern `FlashCreator` : sélection vidéo MP4/WebM ≤ 100 Mo, aperçu 9:16, légende ≤ 500 caractères, bouton avec état de chargement, toasts `sonner`), accessible via le bouton **« Créer »** de la page `/capsules` ; envoie en multipart vers la route interne `POST /api/capsules` via le nouveau hook `createCapsuleClient` (`src/hooks/queries/use-capsules.ts`) et invalide le cache React Query du feed pour afficher la capsule immédiatement. **2)** `GET /shortsUser/{user_id}` : nouveau hook `useUserCapsules` + composant `ProfileCapsules` (`src/components/profile/ProfileCapsules.tsx`, grille 9:16 réutilisant `CapsuleCard`, visionneuse `CapsuleViewer` au clic, suppression optimiste locale) ; le profil gagne un onglet **« Capsules »** (avec compteur) et un bloc résumé dans la colonne gauche (6 vignettes + « Voir toutes les capsules »), via la route interne `GET /api/capsules/user/[userId]`.
* Capsules (ajout) : mise en place des **Capsules**, les vidéos verticales courtes de Dughu (l'équivalent des Reels), couvrant les 13 endpoints du dossier « Capsule » de l'API. Nouveau service serveur `src/lib/capsule-service.ts` (feed `fetchShorts`, capsules d'un utilisateur, like/dislike, vues, commentaires + réponses imbriquées, like de commentaire, signalement, suppression, création), routes internes `src/app/api/capsules/*`, hook client `useCapsulesFeed` (`src/hooks/queries/use-capsules.ts`) et composants `src/components/capsule/` : dans le fil d'actualité, un bloc « Capsules » insère **3 capsules aléatoires après les 4 premiers posts** (`CapsuleRail`, vignettes 9:16, lien « Voir tout ») ; une **page dédiée `/capsules`** (grille du feed complet, entrée « Capsules » dans l'en-tête desktop et la nav mobile) ; une **visionneuse plein écran** (`CapsuleViewer`, défilement vertical type Reels, vidéo autoplay muette, like/dislike optimiste, commentaires avec réponses et like, vue trackée, signalement, suppression par l'auteur avec popup de confirmation `ConfirmDialog`).

## 2026-08-26

### Ajouts

* Déconnexion : le menu du profil affiche désormais une modale de confirmation « Voulez-vous vraiment vous déconnecter de Dughu ? » avant de fermer la session, avec les boutons « Annuler » / « Se déconnecter » (composant `Dialog` existant, dans `src/components/layout/ProfileMenu.tsx`).
* Messagerie : le chargement de la liste des conversations utilise désormais des squelettes (skeleton) au lieu du spinner, dans la liste de la messagerie de l'en-tête (`ConversationSidebar`) et dans la page `/messages` (`MessagesPageClient`).
* Messagerie : cliquer sur une conversation dans la messagerie de l'en-tête ouvre désormais une petite fenêtre de conversation ancrée en bas de l'écran (comme Facebook) au lieu de rediriger vers `/messages`. La fenêtre est rabattable, fermable et dispose d'un bouton pour ouvrir la conversation complète dans la page `/messages` (nouveau composant `ConversationPopup`, état géré dans `MainLayout`, jusqu'à 3 fenêtres côte à côte sur desktop ; bottom sheet sur mobile). L'en-tête du popup utilise la couleur du logo Dughu (`#D26F23`), affiche la dernière connexion du contact (ou « En ligne »), et permet d'envoyer des images, vidéos et fichiers depuis la zone de saisie.
* Messagerie : ajout d'un menu d'actions (⋯) sur ses propres messages (page `/messages` et fenêtres de conversation) avec **Modifier** (encapsule `POST /updateMessage/{message_id}`) et **Supprimer** (encapsule `POST /deleteMessage/{message_id}`, avec confirmation). Ajout de la **suppression d'une conversation entière** (encapsule `POST /deleteConversation/{conversation_id}`) depuis l'en-tête de la conversation, avec confirmation. Nouvelles routes internes `src/app/api/messages/update/[messageId]`, `src/app/api/messages/delete/[messageId]` et `src/app/api/messages/delete-conversation/[conversationId]` (résolution de l'ID Dughu via le cookie de session en fallback, token `dughu_token` transmis à la messagerie Dughu).
* La fenêtre de conversation (popup) dispose désormais du bouton **Répondre** sur chaque message, avec barre « Réponse à … » au-dessus de la zone de saisie et envoi de la citation (`reply_doc_id`, `reply_sender`, `reply_text`), au même titre que la page `/messages`.
* Messagerie : dans la fenêtre de conversation, les actions (Répondre, réagir, menu ⋯ Modifier/Supprimer) ne sont plus à l'intérieur de la bulle : elles s'affichent **devant** (à gauche) de mes messages envoyés et **derrière** (à droite) des messages reçus, au survol. Ajout des **réactions par émojis** (6 réactions : J'aime, J'adore, Haha, Wow, Triste, Grr) sur chaque message : sélecteur d'emojis à côté des actions, badge d'emoji sur la bulle, persistance via `POST /api/reactions` adapté pour gérer les messages (encapsule `POST /reactMessage/{message_id}`, token `dughu_token` transmis).
* Messagerie (correction) : les erreurs des actions de messagerie (réaction, envoi, modification, suppression, suppression de conversation) remontent désormais un message utilisateur propre (ex. détail renvoyé par l'API Dughu) au lieu d'une erreur technique brute « Request failed with status code 502 ». La route `POST /api/reactions` transmet le statut et la donnée de l'API Dughu (`upstreamStatus`/`upstream`) et garde un message générique lisible pour l'utilisateur.
* Messagerie (correction) : la suppression d'un message et d'une conversation ne plantait plus (« L'API Dughu a refusé la suppression ») car on exigeait `success: true` — les routes `deleteMessage` / `deleteConversation` / `updateMessage` acceptent désormais toute réponse non explicitement `success: false` (l'API renvoie souvent `{}` ou `{done:true}`), transmettent `target_user_id`, et incluent le détail de l'erreur upstream.
* Messagerie (correction) : la citation (« réponse à ») s'affiche désormais sur le message envoyé dans le popup et la page `/messages` (écho local + réattachement après rechargement). La normalisation des messages (`normalizeMessages`) lit désormais la citation sous de nombreuses formes (`reply`, `reply_to`, `quoted`, `parent`, champs aplatis `reply_*`/`parent_*`/`quoted_*`…). De plus, `loadMessages` préserve désormais les citations locales que le serveur ne renvoie pas, pour qu'elles ne disparaissent plus au prochain rafraîchissement.
* Messagerie (correction) : les routes `deleteMessage` / `deleteConversation` / `updateMessage` utilisent désormais **form-urlencoded** (`chatForm`) au lieu de multipart (`chatMultipart`) — les opérations sans fichiers ne doivent pas utiliser multipart, qui provoquait une erreur « Undefined variable $request » (500) côté contrôleur Laravel Dughu. Les paramètres `message_id`/`conversation_id`, `sender_id` et `target_user_id` sont transmis dans le corps.
* Messagerie (correction) : les **réactions par emoji** sur les messages sont désormais **persistées localement** (localStorage) car l'API Dughu ne dispose pas d'endpoint de réaction de message (`reactMessage/{id}` renvoie 404 « route not found »). Les réactions restent visibles côté utilisateur ; un vrai endpoint Dughu pourra être câblé ultérieurement.
* Messagerie (correction) : un message envoyé sans réponse n'affiche plus de citation fantôme (« Message / Pièce jointe »). L'API Dughu renvoie toujours le champ `reply_id` avec la valeur `0` pour un message qui ne répond à rien ; la normalisation (`normalizeReply`) neutralise désormais `0` et `isMeaningfulReply` l'exclut, de sorte que seul un vrai `reply` (id, texte ou expéditeur non vide) affiche l'encart de citation.
* Messagerie (correction) : la citation d'une réponse (« Réponse à … ») ne disparaît plus après un rechargement de la page. L'API Dughu ne renvoie pas la citation dans `getConversationMessages` (`reply_id` reste à 0), donc la citation est désormais **persistée localement** (localStorage, clé `dughu:message-replies`) et réattribuée au message au chargement — sur la fenêtre de conversation (popup) comme sur la page `/messages`. Nouveaux utilitaires partagés dans `src/lib/messages.ts` (`readPersistedReplies`, `persistMessageReply`, `mergeLocalReplies`), et nettoyage de la citation persistée lors de la suppression d'un message.
* Messagerie : la suppression d'un message propose désormais deux choix — **« Supprimer pour tout le monde »** (le message disparaît chez l'expéditeur et le destinataire) et **« Supprimer pour moi »** (le message disparaît uniquement de sa propre vue). La route interne `POST /api/messages/delete/[messageId]` transmet le choix à l'API Dughu via le paramètre `delete_type` (`me` / `all`), qui pilote les champs `deleted_one` / `deleted_two` du message. Appliqué à la page `/messages` et à la fenêtre de conversation (popup).
* Messagerie : ajout de l'**accusé de lecture** (ticks) sur les messages envoyés — 1 coche gris (en cours d'envoi), 2 coches grises (délivré au destinataire), 2 coches bleues (lu). Détecté depuis le champ `seen` (timestamp Unix) de l'API Dughu, rafraîchi via le polling périodique. Affiché dans la page `/messages`, la fenêtre de conversation (popup) et la sidebar grâce au composant partagé `ReceiptTicks` (`src/components/messages/ReceiptTicks.tsx`) et aux champs `receipt`/`lastMessageReceipt` normalisés dans `src/lib/messages.ts`.
* Bouton « Gratifier » sur les publications : un clic ouvre une **modale de confirmation** (« Voulez-vous vraiment offrir 100 points à [auteur] ? ») avant d'envoyer 100 points à l'auteur du post via `POST /api/points/give`. La modale utilise le composant `Dialog` Dughu (même pattern que la confirmation de déconnexion), avec un spinner de chargement sur le bouton « Confirmer » pendant l'envoi. Le bouton est masqué sur ses propres publications et reste de couleur neutre (pas de style marron) pour s'intégrer naturellement aux autres actions du post.
* Correction de l'erreur « Erreur lors du don de points » : la route `POST /api/points/give` capture désormais les `DughuApiError` et extrait le message d'erreur spécifique de l'API Dughu (champs `message`/`error`/`msg`), au lieu du message générique qui masquait la cause réelle.
* Correction de l'erreur « Le destinataire doit être le propriétaire du post » : la fonction `normalizeUser` (`src/lib/dughu.ts`) priorise désormais le champ `user_id` sur `id` pour l'identifiant utilisateur. L'API Dughu renvoie parfois un objet `user` contenant à la fois un `id` générique et un `user_id` numérique (le vrai ID Dughu) — `normalizeUser` prenait le premier champ rencontré, ce qui causait l'envoi d'un mauvais `user_id` à l'endpoint `points/give`.
* Correction définitive de l'erreur « Le destinataire doit être le propriétaire du post » sur le don de points : le mapping des champs de `POST /points/give` était inversé. Le backend Dughu lit le **destinataire** dans `user_offer_id` (et vérifie qu'il est bien le propriétaire du post), tandis que `user_id` porte l'utilisateur connecté qui offre les points. La route `POST /api/points/give` (`src/app/api/points/give/route.ts`) envoie désormais `user_offer_id = authorId` (l'auteur du post) et `user_id = dughuUserId` (l'utilisateur connecté).
* Publications à fond coloré (alignement documentation API) : la liste des couleurs est désormais chargée via `GET /getPostColors` (repli sur l'ancien endpoint `GET /colored_posts` si indisponible). À la création, l'`id` de la couleur sélectionnée est transmis à `POST /post` dans le champ `post_color_input` (entier), en plus de `color_1`/`color_2`/`text_color`, conformément au nouveau contrat API — dans `src/app/api/colors/route.ts`, `src/app/api/posts/route.ts` et `src/lib/dughu.ts`.

## 2026-08-24

### Corrections

* L'API Dughu (`POST /post`) attend `postPrivacy` en base 1 : 1=Public, 2=Abonnés, 3=Réseau, 4=Amis. La route `POST /api/posts` convertit `privacyInt + 1` (l'app utilise la base 0 en interne).
* **Modale de création de post** : suppression du `scrollbarGutter: "stable"` qui créait une barre verticale (gouttière de scroll) inutile sur le côté droit du modal.

### Ajouts

* Menu « 3 points » d'une publication : ajout des actions « Bloquer » / « Débloquer » l'auteur du post (encapsule `POST /block_user`) et « Donner des points » (nouvelle modale `GivePointsModal` et route `POST /api/points/give` qui encapsule `POST /points/give`, avec saisie du nombre de points). Les nouvelles routes API `src/app/api/block_user` et `src/app/api/points/give` suivent le même schéma que `store-save` / `hidePost` (résolution de l'ID Dughu via le cookie de session en fallback). Les actions bloquer / donner des points sont masquées sur ses propres publications. Ajout de l'action « Copier le lien » dans le menu 3 points (copie du lien de partage dans le presse-papiers).
* Sidebar droite : la carte « mini-profil » affiche désormais le solde total de points de l'utilisateur connecté via le nouvel endpoint interne `GET /api/pointsToday/{userId}` (encapsule `GET /pointsToday/{userId}` de l'API Dughu, champ `total`).
* Correction du bug de confidentialité : l'API Dughu (`POST /post`) stocke `postPrivacy` en base 1 (envoyé → stocké moins 1) alors que l'app utilise une base 0. « Public » tombait toujours sur « Abonnés » et « Amis » sur « Réseau ». La route `POST /api/posts` envoie désormais `privacyInt + 1` pour réaligner les deux bases. La modale de création de post est également centrée verticalement (`items-center` au lieu de `items-start`).

### Corrections

* Publications : les posts texte créés avec un fond coloré via l'API (Postman) affichent désormais correctement leur fond coloré. La résolution des couleurs accepte maintenant les IDs numériques Dughu (`color_id` / `bg_color`, ex. « 17 »), en plus des dégradés CSS et des codes hexadécimaux, de manière centralisée dans `lib/constants.ts`.

* Confidentialité des posts : les 4 niveaux de confidentialité Dughu (Public, Abonnés, Réseau, Amis) sont désormais supportés et correctement transmis à l'API. L'envoi de l'entier `postPrivacy` (0-3) remplace l'ancienne limitation Public/Amis (0/1) qui causait une erreur 422 de l'API. Le badge de confidentialité s'affiche désormais sur tous les posts.
* Confidentialité des posts : chaque niveau dispose désormais d'une icône distincte (Public = globe, Abonnés = RSS, Réseau = nœuds réseau, Amis = utilisateur validé), centralisée dans `lib/constants.ts` (`POST_PRIVACY_OPTIONS`), utilisées par le badge des publications et le sélecteur du compositeur (auparavant Abonnés / Réseau / Amis partageaient tous la même icône « groupe »).

* Page « Profil » : plus d'écran « Profil utilisateur introuvable » affiché avant le chargement du profil personnel. Un squelette (skeleton) s'affiche pendant le chargement ; « Profil introuvable » n'apparaît plus que si le profil demandé n'existe réellement pas.
* FlashViewer (visualiseur plein écran des stories) : le nom et la photo de profil de la personne ayant publié le Flash sont désormais affichés. Si l'API stories n'inclut pas ces informations, le profil Dughu de l'utilisateur ciblé est récupéré et rattaché aux stories.
* FlashViewer : la lecture ne démarre plus à la position de l'ami dans le rail (le viewer sautait des stories puis se fermait après la première), il démarre désormais toujours à la première story et enchaîne automatiquement les suivantes.
* FlashViewer : le champ « Envoyer un message… » et les boutons d'émojis sont masqués sur sa propre story.
* FlashViewer : la lecture enchaîne désormais les stories image une par une sans en sauter (correction du double déclenchement d'avancement causé par l'appel de `goNext` dans un setter d'état, qui sautait le flash 2 avec React StrictMode).
* FlashViewer : le spinner de chargement est remplacé par un squelette (skeleton) cohérent avec l'interface Dughu (pendant le chargement initial et pendant le chargement des images).
* FlashViewer : les vidéos Flash sont désormais correctement détectées (le champ `file`/`postFile`/`media` n'est plus confondu avec une image) et se lisent automatiquement ; la lecture enchaîne la story suivante à la fin de la vidéo, tandis que les images avancent toutes les 5 secondes.
* Rail Flash (mini-cartes) : une story vidéo affiche désormais sa vignette/thumbnail (sans icône ni bouton de lecture) au lieu de la photo de profil de l'utilisateur ; si aucune vignette n'est fournie par l'API, la première frame de la vidéo sert de vignette. Les flashs image et texte coloré s'affichent tels quels.

## 2026-08-22

### Développement

* Mise en place des règles générales du projet.
* Mise en place de la documentation technique.
* Mise en place des règles responsive.
* Mise en place des règles UI.
* Mise en place de la gestion personnalisée des erreurs.

## Règle

Ne pas enregistrer chaque petite modification de code.

Le changelog doit principalement conserver les évolutions importantes et compréhensibles du produit.
