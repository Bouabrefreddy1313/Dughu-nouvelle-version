# DUGHU — Cahier des charges

## 1. Présentation

Dughu est une plateforme sociale moderne développée avec Next.js, destinée à permettre aux utilisateurs de créer leur profil, publier du contenu, interagir avec d'autres utilisateurs et communiquer au sein d'une expérience moderne et adaptée aux différents écrans.

Dughu doit posséder une identité visuelle propre et ne doit pas être une copie directe d'un réseau social existant.

## 2. Objectifs

* Créer une plateforme sociale moderne.
* Offrir une expérience simple et intuitive.
* Garantir une excellente expérience mobile et desktop.
* Assurer la sécurité des utilisateurs.
* Préparer l'application à une montée en charge progressive.
* Maintenir une architecture facilement évolutive.

## 3. Fonctionnalités principales

### Authentification

* Inscription
* Connexion
* Déconnexion
* Gestion de session
* Récupération de compte
* Sécurisation des accès

#### Déconnexion

* La déconnexion demande une confirmation : une modale « Voulez-vous vraiment
  vous déconnecter de Dughu ? » s'affiche avant de fermer la session. L'utilisateur
  peut « Annuler » ou confirmer « Se déconnecter ».

### Profil

* Profil utilisateur
* Photo de profil
* Photo de couverture
* Informations personnelles
* Modification du profil
* Publications de l'utilisateur

#### Menu du profil personnel

* Sur son propre profil, le bouton à trois points placé à côté de « Modifier le
  profil » ouvre une modale responsive intitulée « Menu du profil ».
* La modale présente les accès « Paramètres », « Mon univers », « Mes activités »,
  « Code QR », « Gestion des relations » et « Autre », chacun accompagné d'une
  courte description.
* « Gestion des relations » ouvre la page dédiée `/profile/relations` et
  « Paramètres » ouvre la page dédiée `/profile/preferences`. Les autres rubriques
  affichent actuellement une information claire indiquant leur disponibilité
  prochaine. Les paramètres généraux sont distincts de la modification du profil
  et ne redirigent donc pas vers `/profile/settings`.
* La modale peut être parcourue au clavier, fermée avec son bouton de fermeture ou
  avec les mécanismes standards de dialogue, et reste contenue dans la hauteur de
  l'écran sur mobile.

#### Paramètres généraux

* La page `/profile/preferences` présente les paramètres généraux sans les
  confondre avec l'édition des informations du profil disponible sur
  `/profile/settings`.
* La navigation regroupe les rubriques « Compléter mon profil », « Compte »,
  « Vérification vitesse internet », « Cache et données mobiles »,
  « Notifications », « Bloquer », « Signaler un problème », « Aide », « À propos »,
  « Déconnexion » et « Déconnexion de tous les comptes ».
* Sur tablette et ordinateur, la liste reste visible à gauche et le détail de la
  rubrique sélectionnée s'affiche à droite sans recharger la page. Sur mobile,
  l'utilisateur ouvre le détail en pleine largeur puis revient à la liste avec une
  action dédiée.
* La vérification de vitesse présente un aperçu réservé aux futures informations
  Fast.com. Aucun service externe n'est encore appelé.
* Cette première version est uniquement visuelle : aucune préférence n'est
  enregistrée, aucun utilisateur n'est bloqué et aucune action de déconnexion
  n'est exécutée. Les actions sensibles sont visuellement différenciées et leur
  caractère inactif est annoncé dans le panneau de détail.
* Le détail « Compte » présente les entrées « Changer le mot de passe », « Liens
  sociaux », « Paramètres de confidentialité », « Vérification », « Liste des
  sessions » et « Supprimer le compte ». Seul le changement de mot de passe est
  actuellement fonctionnel ; les autres entrées affichent une information de
  disponibilité prochaine.
* « Supprimer le compte » est visuellement séparé comme action destructive, mais
  aucune suppression n'est possible tant que le parcours sécurisé et sa
  confirmation ne sont pas implémentés.
* « Changer le mot de passe » ouvre un formulaire demandant le mot de passe actuel,
  le nouveau mot de passe et sa confirmation. Les champs peuvent être affichés ou
  masqués, utilisent les attributs d'autocomplétion adaptés et présentent les
  erreurs de validation à proximité de la saisie concernée.
* Le nouveau mot de passe doit comporter au moins huit caractères, être différent
  de l'ancien et correspondre à sa confirmation. Ces contrôles sont appliqués dans
  l'interface puis répétés par la route serveur.
* La route interne `POST /api/profile/password` résout l'identifiant Dughu depuis
  le cookie de session et appelle `POST /updatePassword` en `multipart/form-data`
  avec `user_id`, `actualPassword`, `password` et `password_confirmation`.
  L'identifiant utilisateur n'est jamais accepté depuis le navigateur.
* L'appel de changement de mot de passe n'est pas rejoué automatiquement en cas
  d'erreur réseau. Les mots de passe ne sont ni journalisés ni mis en cache et les
  champs sont vidés après une réussite.

#### Paramètres du profil

* La modification des informations textuelles s'effectue sur la page dédiée
  `/profile/settings`, et non dans une modale, afin de répartir les informations
  dans trois sections responsives : « Infos », « Réseaux » et « Retrouvailles ».
* Sur mobile et tablette, les trois sections sont présentées dans une navigation
  compacte sans défilement horizontal et les champs sont affichés sur une seule
  colonne. La navigation latérale et les champs sur deux colonnes sont réservés
  aux écrans suffisamment larges. Les actions de sauvegarde occupent toute la
  largeur sur mobile pour rester facilement accessibles au toucher.
* Le nom d'utilisateur est affiché en lecture seule et ne peut pas être modifié.
* La section « Infos » permet de modifier la photo de profil, le nom, les prénoms,
  le téléphone, l'email, le sexe, la date de naissance, le code postal, le pays,
  la ville actuelle, la biographie et la signature.
* La liste des pays provient de `GET /getCountries`. Seuls les pays actifs sont
  proposés ; leur `nom` est affiché et leur `id` est envoyé à Dughu avec
  `country_id`.
* La section « Réseaux » permet de renseigner Facebook, Instagram, Twitter/X,
  LinkedIn, YouTube, Google, un site web, Discord et WeChat.
* Les informations de retrouvailles sont enregistrées via `POST /saveInfos` avec
  l'identifiant de session résolu côté serveur. Cette route gère la ville actuelle,
  la ville d'origine, l'établissement fréquenté, le domaine d'activité, la
  profession, l'entreprise actuelle, les entreprises passées, les centres
  d'intérêt, les compétences et les lieux fréquentés.
* Les entreprises passées, centres d'intérêt, compétences et lieux fréquentés
  sont des listes éditées sous forme d'étiquettes ajoutables et supprimables.
  Elles sont envoyées à Dughu sous forme de tableaux JSON.
* Les valeurs enregistrées sont relues depuis `getSpecificUser` ; `school` est
  normalisé comme établissement fréquenté et `working` comme profession.
* Les informations publiques de retrouvailles sont présentées dans la section
  « À propos » du profil, avec des étiquettes responsives pour les listes.
* Les champs sans contrat backend confirmé restent désactivés et portent la
  mention « Bientôt modifiable ». Aucune clé API de substitution n'est inventée
  et ces champs ne sont pas envoyés à Dughu.
* La mise à jour du profil est liée à l'utilisateur identifié par le cookie de
  session côté serveur, et non à un identifiant utilisateur fourni par le client.

#### Comportement de chargement et d'erreur du profil

* Un squelette de chargement (skeleton) s'affiche pendant le chargement du profil,
  y compris tant que l'utilisateur connecté n'a pas encore été récupéré
  (cas du profil personnel accessible via `/profile`).
* L'écran « Profil introuvable » n'apparaît que lorsque le profil demandé
  n'existe réellement pas ou a quitté Dughu (erreur API / utilisateur absent).
* Aucune requête `/api/profile` n'est envoyée avec un identifiant vide.

#### Relations Fraterniser et Réseauter

La normalisation technique de ces états est documentée dans
`docs/NORMALISATION_RELATIONS.md`.

* Sur le profil d'un autre utilisateur, les relations `friend` et `network` sont
  gérées indépendamment par les boutons « Fraterniser » et « Réseauter ».
* Une demande envoyée affiche respectivement « Fraterniser envoyé » ou
  « Réseauter envoyé ». Un nouveau clic ouvre une confirmation puis rappelle
  `relation/request`, qui fonctionne comme un toggle et annule la demande sortante.
  L'endpoint `relation/decline` reste réservé au refus d'une demande reçue.
* Une demande reçue affiche « Accepter la demande ». Son ouverture permet soit
  de la refuser, soit de l'accepter. Le bouton utilise le marron principal Dughu ;
  dans la modale, « Refuser » utilise une bordure et un texte marron sans fond plein.
* Une demande acceptée affiche « Fraternisé » ou « Réseauté ». Un nouveau clic
  demande confirmation avant la suppression de la relation.
* La suppression d'une relation acceptée est transmise à l'endpoint Dughu
  `relation/request`, qui fonctionne comme un toggle (tout comme pour
  l'annulation d'une demande sortante). Cette transmission passe par le service
  serveur des relations et conserve l'authentification multipart existante.
* Les états acceptés proviennent des champs `is_friend` et `is_network` du profil
  Dughu. Le sens entrant ou sortant d'une demande en attente provient des listes
  `incoming` et `outgoing` de l'endpoint `relation/requests`, filtrées par
  utilisateur ciblé et par type de relation.
* Après rechargement, une demande sortante identifiée conserve l'état « envoyé ».
  Si les appels de vérification échouent, les boutons affichent « Vérification… »
  et restent inactifs afin d'éviter un second toggle accidentel.
* La réponse `relation/requests` est d'abord interprétée du point de vue du profil
  visité : le viewer trouvé dans `incoming` correspond à une demande qu'il a
  envoyée, tandis que le viewer trouvé dans `outgoing` correspond à une demande
  qu'il a reçue. Une lecture orientée viewer reste utilisée en compatibilité.
* Toutes les mutations de relation sont authentifiées côté serveur et transmises
  à l'API Dughu en `multipart/form-data` avec `auth_user_id`, `user_id` et `type`.
* La page `/profile/relations`, accessible depuis le menu du profil personnel,
  affiche les demandes reçues et permet de les filtrer par type : toutes,
  fraternisation (`friend`) ou réseau (`network`).
* Les demandes sont chargées côté serveur depuis `POST /relation/requests` pour
  chacun des deux types. L'identifiant de l'utilisateur connecté provient du
  cookie de session ; les réponses externes sont normalisées avant d'être
  exposées au navigateur et seules les données utiles à l'affichage sont renvoyées.
* Chaque demande peut être acceptée ou refusée avec les routes de mutation déjà
  authentifiées. Après une action réussie, elle disparaît immédiatement de la
  liste et un message confirme le résultat.
* Dans chaque carte, l'action principale « Accepter » utilise un fond marron
  Dughu, tandis que « Refuser » utilise un texte marron avec une bordure orange.
* La page prévoit un squelette de chargement, un état vide adapté au filtre, une
  erreur avec possibilité de réessayer et un avertissement en cas d'indisponibilité
  partielle d'un type de relation.
#### Responsive de la page profil

* Sur mobile et petits écrans (< `lg`), la colonne de gauche (À propos, Photos,
  Vidéos, Capsules, Amis, Groupes & Pages) est masquée. Le contenu principal
  (onglets + publications) s'affiche directement sous l'en-tête de profil.
* Les onglets disponibles sur la page profil sont : **Mes posts**, **Photos**,
  **Vidéos**, **Capsules** et **À propos**.
* L'onglet **Mes posts** est sélectionné par défaut.
* L'onglet **À propos** affiche : les informations personnelles, le résumé
  (statistiques), les photos, vidéos, capsules, amis, et groupes & pages —
  soit tout le contenu de la colonne de gauche habituellement visible sur desktop.
* Sur desktop (`lg` et plus), la colonne de gauche est visible et le layout
  à deux colonnes est conservé.

### Navigation mobile

* La barre de navigation mobile (`MobileBottomNav`) s'affiche en bas de l'écran
  sur les écrans inférieurs à `lg`.
* Les onglets de la barre de navigation mobile sont : **Accueil**, **Capsules**,
  **Akwaplay** et **Vidéos**.
* Les onglets **Flash** et **Profil** ne sont pas présents dans la barre de
  navigation mobile.

### Bouton S'abonner (PostCard)

* Le bouton « S'abonner » affiché dans les cartes de publication est plus compact
  sur mobile (texte `11px`, padding réduit, icône `13px`) et reprend sa taille
  normale sur les écrans `sm` et plus.

### Publications

* Création
* Modification
* Suppression
  * La suppression d'une publication demande une confirmation via un **popup**
    (composant `ConfirmDialog`, pas le `confirm()` natif du navigateur), avec les
    boutons **Annuler** / **Supprimer** et un état de chargement pendant la
    suppression. Il indique que l'action est irréversible.
* Photo de profil de l'auteur :
  * Si l'auteur d'une publication a un **Flash actif**, sa photo de profil est
    entourée d'un **anneau marron** (dégradé du même orange que le rail Flash).
    Un clic sur la photo ouvre le **visualiseur Flash** de cet auteur (survol de
    la photo en indice « Voir ses Flash »). Sans Flash actif, la photo n'est pas
    entourée et n'ouvre pas le visualiseur.
  * Une fois les Flash de l'auteur **consultés**, l'anneau devient **gris**
    (il reste cliquable pour revoir les Flash). Le statut « vu » est partagé
    via le cache du feed Flash et mis à jour immédiatement à l'ouverture du
    visualiseur.
* Confidentialité des publications (niveaux : Public, Abonnés, Réseau, Amis)
  * Chaque niveau possède une icône distincte sur le badge du post et dans le
    sélecteur du compositeur : Public = globe, Abonnés = abonnement (RSS),
    Réseau = réseau (nœuds), Amis = amis validés (utilisateur + coche).
* Post à fond coloré : la liste des couleurs disponibles provient de
  `GET /getPostColors` (chaque couleur expose un `id`, `color_1`, `color_2`,
  `text_color`). À la création d'un post, l'`id` de la couleur choisie est
  transmis à `POST /post` dans le champ `post_color_input` (entier), en plus des
  champs `color_1`/`color_2`/`text_color`. La résolution id → CSS est centralisée
  dans `lib/constants.ts` (`resolvePostColorCss`).
* Likes
* Commentaires
* Republications
  * Au survol du bouton « J'aime », un sélecteur de **réactions** (6 réactions) s'affiche
    au-dessus du bouton ; la sélection change l'emoji du bouton et transmet la
    réaction choisie. Le bouton « Republier » ouvre un menu avec « Republier
    directement » ou « Écrire un commentaire » (republication avec texte).
    Le sélecteur de réactions et le menu de republication s'affichent sans être
    rognés par la barre d'actions.
  * L'enregistrement d'une réaction (like et autres) ne doit pas échouer lorsque
    l'API Dughu répond avec une forme de succès sans champ `success` explicite
    (`{}`, `{done:true}`, `{is_like:1}`…) : seul un `success: false` explicite
    est considéré comme une erreur, et l'état « aimé » est déduit des champs
    `is_like` / `liked`. L'UI applique une mise à jour optimiste du compteur et
    de l'emoji.
  * Les réactions autres que « J'aime » (love, haha, wow, sad, angry) sont
    transmises à l'API Dughu avec **les deux champs** `type` (nom) et `reaction`
    (numéro 1-6), comme pour le like de commentaire — sans `type`, l'API Dughu
    ne traite que le like par défaut.
* Médias
* Partage
* Gratifier : bouton d’action rapide qui envoie **100 points** à l’auteur du post
  en un clic (endpoint `points/give`). Une modale de confirmation (« Voulez-vous
  vraiment offrir 100 points à … ? ») s’affiche avant l’envoi pour éviter les
  erreurs. Le bouton est masqué sur ses propres publications et un spinner de
  chargement apparaît dans la modale pendant l’envoi. Un menu « Donner des
  points » distinct (3 points → « Donner des points ») permet quant à lui de
choisir le montant. La détection du post « sien » se base sur l'identifiant
  Dughu de l'auteur (`user_id`) comparé au `dughu.userId` de l'utilisateur
  connecté ; toute publication d'un tiers (ou dont l'auteur est inconnu : id
  vide ou post de page) affiche le bouton.
#### Mini-profil (sidebar droite)

* La carte « mini-profil » de la sidebar droite affiche le solde **total** de points de
  l'utilisateur connecté, chargé via `GET /pointsToday/{userId}` (API Dughu) à travers
  la route interne `/api/pointsToday/[userId]` (champ `total` de la réponse).
* La **`MiniProfileCard`** a une prop `loading` : pendant la résolution (auth +
  points) elle affiche des **squelettes** (badge points, couverture, avatar,
  identité, stats) au lieu des placeholders (« 0 Points », cover/avatar par
  défaut, « Utilisateur », stats à 0).
* La sidebar droite (mini-profil, posts boostés, groupes, espaces, dernière
  activité, tendances) charge ses données via `/api/suggestions` (+
  `/api/pointsToday/[userId]`) : pendant la résolution, chaque bloc affiche des
  **squelettes** (état `loading` de `RightSidebar`/`GroupCarousel`) et **jamais**
  de repli statique — les jeux de données codés en dur (`GROUPS`, `SPACES`,
  tendances) ne servent de repli que si l'API renvoie réellement une liste vide.

#### Menu d'action « 3 points » d'une publication

* Sauvegarder un post (endpoint `store-save`) : enregistre/retire le post des favoris.
* Bloquer l'auteur d'un post (endpoint `block_user`) : bloque (ou débloque) l'auteur ;
  les publications de l'utilisateur bloqué sont retirées du fil. Le libellé du menu
  bascule entre « Bloquer » et « Débloquer » selon l'état local de la session.
* Donner des points à l'auteur d'un post (endpoint `points/give`) : une modale permet
  de saisir le nombre de points à offrir. `user_id` = l'utilisateur connecté qui offre,
  `user_offer_id` = l'auteur du post (le destinataire, propriétaire de la publication),
  `points` = montant saisi, `post_id` = la publication.
* Copier le lien du post (copie locale, presse-papiers) : utilise le lien de partage
  canonique fourni par l'API (`shareUrl`) ou construit `/home?post={id}` en secours.
* Ces actions ne s'affichent pas sur ses propres publications (garde côté affichage,
  la vérification d'autorisation reste côté serveur).

### Stories

* Création
* Affichage
* Navigation
* Expiration
* Suppression
* Interactions

#### Affichage dans le visualiseur plein écran

* Le visualiseur plein écran (FlashViewer) affiche le nom et la photo de profil
  de la personne qui a publié la story (Flash).
* Si l'API ne renvoie pas les informations de l'auteur dans les stories, le
  profil Dughu de l'utilisateur ciblé est récupéré et rattaché aux stories
  afin que le visualiseur puisse les afficher correctement.

#### Démarrage de la lecture des Stories

* Le visualiseur (FlashViewer) démarre toujours à la première story de
  l'utilisateur ciblé (et non pas à une position de la liste d'amis).
* Une story ne se ferme plus après la première lecture si l'utilisateur en a
  plusieurs : la lecture enchaîne automatiquement les stories suivantes, puis
  se ferme.

#### Stories personnelles (mes Flash)

* Sur sa propre story, l'utilisateur ne voit pas le champ de message
  (« Envoyer un message… ») ni les boutons d'émojis de réaction.
* Sur sa propre story, un bouton **corbeille** permet de supprimer le Flash.
  La suppression demande une confirmation via un **popup** (`ConfirmDialog`,
  pas le `confirm()` natif du navigateur), avec les boutons **Annuler** /
  **Supprimer** et un état de chargement pendant la suppression. Il indique
  que l'action est irréversible.

#### Chargement (skeleton)

* Pendant le chargement des Flash, un squelette (skeleton) reprenant la mise en
  page du visualiseur s'affiche à la place du spinner.
* Le chargement de chaque image affiche également un skeleton à la place du
  spinner.

#### Lecture des vidéos Flash

* Les vidéos Flash sont correctement détectées comme vidéo (et non comme image)
  grâce à l'extension du fichier média, et se lisent automatiquement en lecture
  muette (l'utilisateur peut activer le son via les contrôles).
* À la fin d'une vidéo Flash, la lecture enchaîne automatiquement la story
  suivante.
* Les images Flash avancent automatiquement toutes les 5 secondes.
* La lecture enchaîne les stories une par une sans en sauter (le déclenchement
  de l'avancement est géré en dehors du setter d'état pour éviter un double
  avancement en StrictMode).

#### Vignette des mini-cartes (rail Flash)

* Dans le rail des stories, chaque mini-carte affiche le thumbnail (vignette) de
  la story. Pour une vidéo, c'est la vignette vidéo qui est affichée, sans icône
  ni bouton de lecture.
* L'avatar de la mini-carte porte un **anneau épais** : **orange** tant que les
  Flash de la personne n'ont pas été vus, **gris** une fois consultés (l'anneau
  ne disparaît plus).
* Si l'API ne fournit pas de vignette pour une vidéo, la première image de la
  vidéo (première frame) est utilisée comme vignette.
* Un flash image affiche son image ; un flash en texte coloré affiche le fond
  coloré avec le texte.
* La photo de profil n'est utilisée en fond de carte que lorsqu'aucun média
  (image, vidéo ou vignette) ni texte coloré n'est disponible pour la story.

### Capsules

Les **Capsules** sont les vidéos verticales courtes de Dughu (l'équivalent des
Reels de Facebook). Elles s'appuient sur les 13 endpoints Dughu du dossier
« Capsule » (création, feed, like/dislike, vues, commentaires + réponses
imbriquées, like de commentaire, signalement, suppression), encapsulés dans
`src/lib/capsule-service.ts` (serveur) et exposés au client via les routes
internes `/api/capsules/*` + le hook `useCapsulesFeed`
(`src/hooks/queries/use-capsules.ts`).

#### Sur le profil

* Un onglet **« Capsules »** (avec compteur) est présent dans la barre
  d'onglets du profil, à côté de Photos et Vidéos.
* Un bloc **« Capsules »** (résumé, 6 vignettes 9:16, réutilise `CapsuleCard`)
  figure dans la colonne gauche du profil, avec un lien « Voir toutes les
  capsules » ; l'onglet affiche la liste complète.
* Les capsules proviennent de `GET /api/capsules/user/[userId]` (endpoint
  Dughu `GET /shortsUser/{user_id}`) via le hook `useUserCapsules` ; un clic
  sur une vignette ouvre la visionneuse plein écran (`CapsuleViewer`), qui
  permet notamment la suppression par l'auteur.

#### Dans le fil d'actualité

* Après les **4 premières publications** du fil, un bloc « **Capsules** »
  insère **3 capsules choisies aléatoirement** (tirage stable par liste, sans
  scintillement au re-render), sous forme de vignettes verticales 9:16
  (`CapsuleRail` + `CapsuleCard`).
* Chaque vignette affiche la miniature, le nombre de vues, l'avatar et le nom
  de l'auteur, et la légende. Au **survol** (ou au focus clavier), la **vidéo
  se joue automatiquement en muet** ; au départ du survol, elle est remplacée
  par la miniature.
* Un lien « Voir tout » mène à la page `/capsules`.
* Un clic sur une vignette ouvre la **visionneuse plein écran** (`CapsuleViewer`)
  positionnée sur la capsule cliquée.

#### Page Capsules (`/capsules`)

* Page dédiée (`CapsulesPage`) présentant le feed complet des capsules en
  grille 9:16 (chargement infini au scroll). États gérés : **squeletons** pendant
  la résolution de l'auth et le premier fetch (aucune fausse liste vide au
  rechargement), erreur réessayable, liste réellement vide, et grille.
  Entrées de navigation « Capsules » dans la barre
  de navigation mobile **et la sidebar gauche** (élément
  « Capsule », qui redirige vers `/capsules` et s'active quand la page est
  courante). L'en-tête desktop ne contient pas d'entrée Capsules.
* Un bouton **« Créer »** dans l'en-tête de la page (utilisateur connecté)
  ouvre la modale de création `CapsuleCreator`.
* Au **survol** d'une vignette, la **vidéo de la capsule se joue
  automatiquement** (muet) ; au départ du survol, la miniature réapparaît.

#### Création d'une capsule (CapsuleCreator)

* Modale de création (pattern `FlashCreator`) en deux étapes : sélection d'une
  **vidéo** (MP4/WebM, 100 Mo maximum, validation type + taille côté client) →
  **aperçu** (lecture 9:16) + **légende** (500 caractères maximum) → bouton
  **Publier** avec état de chargement.
* Envoi en multipart vers `POST /api/capsules` (endpoint Dughu
  `POST /store/capsule`) via `createCapsuleClient`
  (`src/hooks/queries/use-capsules.ts`). À la réussite : toast « Capsule
  publiée. », fermeture de la modale et invalidation du cache React Query du
  feed (la nouvelle capsule apparaît immédiatement). Erreurs techniques
  transformées en messages utilisateur (toasts `sonner`).

#### Visionneuse (CapsuleViewer)

* Défilement vertical d'une capsule à l'autre (type Reels) : **molette et flèches
  clavier sur desktop**, **glissement vertical tactile sur mobile / tablette**
  (vers le haut = capsule suivante, vers le bas = capsule précédente — seuil
  60 px, les gestes démarrant sur un bouton, lien ou champ sont ignorés) ;
  vidéo en lecture automatique muette. La carte vidéo occupe l'essentiel de
  l'écran en mobile (`w-[min(86vw,680px)]`).
* Actions : **like / dislike** (mise à jour optimiste), **commentaires**
  (liste, ajout, réponses imbriquées, like de commentaire), **vue**
  enregistrée une seule fois par capsule (`POST /trackView` via la route
  interne), **signalement**, et **suppression** par l'auteur (confirmation via
  le popup `ConfirmDialog`, pas de `confirm()` natif).
* Chaque bouton d'action (J'aime, Je n'aime pas, Commentaires, Vues) affiche
  son compteur **en dessous**, en permanence (y compris `0`) ; le compteur de
  « J'aime » s'incrémente en temps réel au clic (optimiste, rollback sur
  échec) et le compteur de Commentaires s'incrémente à chaque ajout de
  commentaire ou de réponse.
* Commentaires : l'affichage, l'ajout et les réponses utilisent le contrat Dughu réel
  — **affichage** `POST /fetchComments?page=N` : `page` en query string (défaut 1),
  corps `capsule_id` + `user_id`, et **token de session utilisateur**
  (`Authorization: Bearer <dughu_token>` du cookie httpOnly, requis par l'API —
  vérifié en direct : sans token erreur générique, token invalide → `Unauthorized`).
  Réponse Laravel paginée : tableau dans `result.data`, métadonnées
  `current_page / last_page / per_page / total` propagées de bout en bout ;
  le panneau affiche les commentaires **distants**, page 1 au chargement
  + bouton « Charger plus » (bandeau « Réessayer » si la lecture échoue).
  L'**ajout** (`storeComment/capsule`), les **réponses** (`replyCapsuleComment`,
  `replyCapsuleReply`) et le **like de commentaire** (`toggleLike/capsule/comment`)
  envoient `capsule_id` + `text` + `user_id` (vérifiés 201/200). Le **like / dislike**
  de capsule utilise `GET /toggleLikeShort/{capsule_id}/{user_id}` (= `toggleDislikeShort`).
  Les erreurs de validation de l'API sont traduites en messages utilisateur.
* Confidentialité : l'auteur d'un commentaire s'affiche sous **« Utilisateur »**
  lorsqu'il s'agit de l'utilisateur connecté ; les autres commentateurs
  conservent leur nom affiché.

### Communication

* Messages
* Conversations
* Notifications

#### Fenêtres de conversation (popups)

* Cliquer sur une conversation dans la messagerie de l'en-tête ouvre une petite
  fenêtre de conversation ancrée en bas de l'écran (comme Facebook) au lieu de
  rediriger vers la page `/messages`.
* Chaque fenêtre peut être : rabattue (repliée à son en-tête), rouverte,
  fermée, ou agrandie pour ouvrir la conversation dans la page `/messages`
  (`/messages?target={id}`).
* Plusieurs conversations peuvent être ouvertes simultanément (jusqu'à 3,
  alignées côte à côte sur desktop ; sur mobile seule la dernière ouverte est
  affichée en bottom sheet).
* Les messages sont chargés et rafraîchis périodiquement, et l'envoi de message
  est possible directement depuis la fenêtre : texte, image, vidéo et fichier
  (boutons d'envoi de pièces jointes dans la zone de saisie).
* L'en-tête de la fenêtre utilise la couleur du logo Dughu et affiche l'état du
  contact : « En ligne », « Dernière connexion : … » (date et heure) ou
  « Hors ligne ».
* Un menu d'actions (⋯) est disponible sur ses propres messages : **Modifier**
  un message (`POST /updateMessage/{message_id}`, contenu édité dans la bulle)
  ou **Supprimer** un message (`POST /deleteMessage/{message_id}`). La
  suppression demande à l'utilisateur s'il veut supprimer le message
  **pour tout le monde** (le message disparaît chez lui et chez son
  interlocuteur) ou **uniquement pour lui** (il disparaît seulement de sa
  propre vue). Le choix est transmis à l'API Dughu via le paramètre
  `delete_type` (`me` / `all`), qui pilote les champs `deleted_one` /
    `deleted_two` du message. Ces actions ne s'affichent que sur les messages
  que l'on a envoyés.
* **Accusé de lecture** (ticks) sur les messages envoyés, dans la page `/messages`,
  la fenêtre de conversation (popup) **et** la sidebar :
  - **1 coche gris** = message en cours d'envoi (écho local optimiste) ;
  - **2 coches grises** = message délivré au destinataire (stocké côté serveur
    Dughu, pas encore lu) ;
  - **2 coches bleues** = message **lu** par le destinataire.
  La lecture est détectée depuis le champ `seen` (timestamp Unix) renvoyé par
  l'API Dughu sur chaque message : une valeur > 0 signifie que le destinataire
  a ouvert la conversation. Les statuts sont rafraîchis automatiquement grâce
  au polling périodique (5 s) de la messagerie. Le composant partagé
  `ReceiptTicks` (`src/components/messages/ReceiptTicks.tsx`) centralise l'affichage.
* **Messages non lus** dans les listes de conversations (sidebar de messagerie et
  page `/messages`) : une conversation contenant un message **reçu non lu**
  affiche un badge orange avec le nombre de non-lus, le nom du contact et
  l'aperçu du message **en gras**, et un fond légèrement teinté. L'aperçu du
  dernier message est préfixé « Vous : » (avec les coches d'accusé de lecture)
  lorsque ce dernier message a été envoyé par l'utilisateur courant, ce qui
  distingue visuellement un message envoyé d'un message reçu. L'état non lu est
  déduit du champ `seen` du dernier message (l'API Dughu n'exposant pas de
  compteur de non-lus fiable) ; ouvrir la conversation la marque comme lue
  (localStorage partagé entre la sidebar et la page `/messages`), retirant le
  badge immédiatement.
* **Badge de non-lus sur l'icône messagerie du header** : le **total** des
  messages non lus (même logique et même style que les badges de la liste) est
  affiché en orange sur l'icône messagerie de l'en-tête (plafonné à « 99+ »).
  `ConversationSidebar` le calcule et le remonte via `onUnreadCountChange`
  (câblé dans `MainLayout` → `Header`), en chargeant les conversations en
  continu (**même panneau fermé**, polling 5 s). Quand une conversation est lue
  (sidebar ou page `/messages`), l'événement custom `dughu:read-conversations-changed`
  (même onglet) et l'événement `storage` (autre onglet) mettent le badge du
  header à jour immédiatement.
* La fenêtre de conversation (popup) propose également le bouton **Répondre**
  (icône réponse) sur chaque message : une barre « Réponse à … » s'affiche
  au-dessus de la zone de saisie et la citation est envoyée avec le message
  (`reply_doc_id`, `reply_sender`, `reply_text`), comme sur la page `/messages`.
  La citation affichée est **persistée localement** (localStorage) car l'API
  Dughu ne restitue pas la citation d'une réponse dans
  `getConversationMessages` (`reply_id` reste à 0) ; elle est donc visible côté
  utilisateur et réattribuée au message après un rechargement de page.
* Dans la fenêtre de conversation, les actions (Répondre, réaction, menu ⋯
  Modifier/Supprimer) ne sont pas dans la bulle : elles apparaissent **devant**
  (à gauche) de chaque message envoyé et **derrière** (à droite) de chaque
  message reçu, au survol (ou au focus).
* Chaque message peut recevoir une **réaction par emoji** (6 réactions :
  J'aime, J'adore, Haha, Wow, Triste, Grr). Le sélecteur d'emojis s'ouvre à
  côté des actions, l'emoji réagi s'affiche en badge sur la bulle. Les
  réactions sont **persistées localement** (localStorage) car l'API Dughu
  n'expose pas d'endpoint de réaction de message (`reactMessage/{id}` → 404) ;
  elles sont donc visibles seulement côté utilisateur tant qu'un vrai
  endpoint n'est pas disponible.
* Une conversation entière peut être **supprimée** (`POST
  /deleteConversation/{conversation_id}`) depuis l'en-tête de la conversation
  (page `/messages` ou fenêtre de conversation), avec confirmation. La
  suppression est irréversible.

#### Chargement des conversations

* Pendant le chargement de la liste des conversations (page `/messages` et liste
  de la messagerie accessible via l'icône message de l'en-tête), des squelettes
  (skeleton) reproduisant la mise en page d'une conversation (avatar, nom,
  dernier message) s'affichent à la place du spinner.

### Recherche

* La barre située dans l'en-tête effectue une recherche globale à partir de deux caractères via l'endpoint Dughu `searchAll`, avec le terme (`query`) et l'identifiant de l'utilisateur connecté (`user_id`) requis par l'API.
* Les résultats peuvent regrouper les utilisateurs, publications, pages, groupes et hashtags renvoyés par l'API.
* La saisie est temporisée afin de limiter les appels réseau ; une nouvelle saisie annule la requête précédente.
* Le panneau de résultats est disponible sur mobile, tablette et desktop, avec navigation au clavier et états de chargement, résultat vide et erreur compréhensible.
* Les utilisateurs et hashtags ouvrent leur vue Dughu correspondante. Les publications disposant d'un auteur ouvrent son profil ; les types sans route dédiée restent informatifs.

### Navigation principale

* Sur desktop, les accès « Accueil », « Vidéos », « Flash » et « Akwaplay » sont présentés sous forme d'icônes compactes, régulièrement espacées, avec une infobulle accessible au survol et au clavier, tout en conservant leur navigation respective et l'indicateur de page active.
* L'en-tête présente également deux accès statiques distincts « Fraternisés » (icône de groupe) et « Réseautés » (icône de mallette). Ils remplacent l'ancien accès « Abonnés », suivent la même présentation avec infobulle accessible, et n'effectuent aucune navigation tant que leurs vues dédiées ne sont pas disponibles.

## 4. Fonctionnalités futures

Les fonctionnalités non encore développées doivent être placées dans la section "À venir".

## 5. États

* 🔵 À planifier
* 🟡 En cours
* 🟢 Terminé
* 🔴 Bloqué
* ⚪ Reporté

## 6. Critères de fonctionnalité terminée

Une fonctionnalité est terminée lorsqu'elle :

* fonctionne correctement ;
* possède une interface finalisée ;
* est responsive ;
* gère les principales erreurs ;
* respecte les règles de sécurité applicables ;
* respecte l'identité visuelle Dughu ;
* ne provoque pas de régression connue.

## 7. Mise à jour

Ce document doit être mis à jour progressivement pendant le développement.

Il doit représenter l'état réel du projet et non une vision théorique déconnectée du code.
