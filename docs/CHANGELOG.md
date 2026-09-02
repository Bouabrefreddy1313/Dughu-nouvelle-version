# DUGHU — Journal des modifications

Ce fichier conserve l'historique des évolutions importantes du projet.

## Format

Chaque entrée doit contenir :

* date ;
* fonctionnalité ;
* modifications principales ;
* éventuelles corrections importantes.

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
