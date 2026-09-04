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
  peut « Annuler » ou confirmer « Se déconnecter ». La déconnexion fonctionne
  depuis **toutes les pages** : toute page ne transmettant pas de handler
  dédié bénéficie du comportement par défaut de `MainLayout` (fermeture de la
  session via `/api/logout` puis redirection vers l'écran de connexion).

i### Profil

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
  sessions » et « Supprimer le compte ». Le changement de mot de passe, les liens
  sociaux et les paramètres de confidentialité sont fonctionnels ; les autres
  entrées affichent une information de disponibilité prochaine.
* « Paramètres de confidentialité » charge les préférences réelles du compte
  depuis `getSpecificUser` et permet de choisir qui peut suivre l'utilisateur,
  lui envoyer des messages, voir ses amis, publier sur son fil et voir son
  anniversaire. L'utilisateur peut également imposer la confirmation de chaque
  nouvelle demande d'abonnement.
* La sauvegarde passe par la route interne `PUT /api/profile/privacy`, qui valide
  strictement les six préférences puis appelle `POST /updatePrivacySettings` en
  JSON. L'identifiant Dughu est toujours résolu depuis la session côté serveur et
  n'est jamais accepté depuis le navigateur. La réponse volumineuse de
  `getSpecificUser` est filtrée : seuls les paramètres de confidentialité sont
  exposés au client.
* L'interface de confidentialité prévoit des états de chargement, d'erreur avec
  nouvelle tentative et d'enregistrement. Les sélecteurs, l'interrupteur de
  confirmation et les actions restent accessibles au clavier et adaptés aux
  écrans mobiles.
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
* Depuis « Paramètres » puis « Compte », l'option « Liens sociaux » ouvre
  directement la section « Réseaux » de `/profile/settings`.
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
* **Mobile / tablette (< `lg`)** : le header principal est **masqué** et la
  partie supérieure du profil est **plein écran** — la photo de couverture
  occupe tout le haut de l'écran (marges négatives sur le conteneur), plus
  haute, sans coins arrondis, avec un **bouton retour** circulaire (flèche,
  fond blanc translucide) superposé en haut à gauche, façon Facebook
  (`router.back()`, repli vers `/home` si aucun historique). Le padding
  supérieur du layout est supprimé (`pt-0`, conservé sur desktop
  `lg:pt-[88px]`).

### Header — responsive mobile / tablette

* Sur mobile et tablette (< `lg`), le header affiche un **bouton « 4 carrés »**
  (icône `LayoutGrid`) : un appui **ouvre la sidebar droite en tiroir
  coulissant** depuis la droite (panneau fixe plein hauteur ~300px, animation de
  translation, overlay sombre derrière, bouton de fermeture dans le tiroir).
  Un second appui (ou un appui sur l'overlay, ou le bouton de fermeture) le
  referme. Le bouton est inactif sur desktop où la sidebar droite est déjà
  visible.
* **Exclusion mutuelle des sidebars mobiles** : ouvrir la **sidebar gauche**
  (hamburger) **ferme automatiquement la sidebar droite**, et ouvrir la
  **sidebar droite** (« 4 carrés ») **ferme automatiquement la sidebar gauche**
  — les deux panneaux ne sont jamais ouverts simultanément (géré dans
  `MainLayout`). Sans impact desktop, où les deux sidebars sont fixes et
  toujours visibles.
* Ce comportement ne concerne pas la page profil sur mobile/tablette : le header
  y est masqué (voir « Responsive de la page profil »).

### Navigation mobile

* La barre de navigation mobile (`MobileBottomNav`) s'affiche en bas de l'écran
  sur les écrans inférieurs à `lg`.
* Les onglets de la barre de navigation mobile sont : **Accueil**, **Capsules**,
  **Akwaplay** et **Vidéos**.
* Les onglets **Flash** et **Profil** ne sont pas présents dans la barre de
  navigation mobile.
* La barre affiche aussi **Fraterniser** (`UsersRound`) et **Réseauter**
  (`BriefcaseBusiness`) : un appui renvoie à `/profile/relations?type=friend`
  ou `?type=network`, avec le filtre de la page des demandes pré-sélectionné.

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
* Médias et Visionneuse immersive (Lightbox) :
  * Un clic sur une image d'une publication ouvre la visionneuse immersive (`PostMediaLightbox`).
  * **Desktop** : l'image est agrandie au maximum en conservant son ratio avec un arrière-plan sombre (`bg-black/95`). Le panneau de commentaires dédié est positionné **à gauche** de l'image (`w-[380px]` à `w-[440px]`), avec sa propre zone de défilement indépendante pour consulter et ajouter des commentaires sans déplacer l'image.
  * **Mobile** : l'image occupe quasiment tout l'écran ; une barre flottante translucide permet de réagir, voir les réactions, partager, et d'ouvrir les commentaires sous forme de **Bottom Sheet** coulissant avec tirette de fermeture et geste tactile de glissement vers le bas (swipe down).
  * L'arrière-plan de la page est verrouillé (`overflow: hidden`) pendant l'ouverture.
  * L'animation d'ouverture donne la sensation d'une image qui sort de la publication pour devenir le contenu principal.
  * Fermeture simple : bouton croix visible, touche Échap, ou clic sur le fond sombre.
* Système de réactions et agrégation :
  * 6 réactions disponibles : 👍 J'aime, ❤️ J'adore, 😂 Haha, 😮 Wow, 😢 Triste, 😡 Grrr.
  * Sélecteur de réactions (`ReactionPicker`) : accessible au survol sur desktop, ou par appui long tactile (~350ms) sur mobile, ainsi qu'au clic.
  * Le bouton affiche clairement la réaction active de l'utilisateur (icône et libellé en marron `#A35A2A`) ou « J'aime » neutre en l'absence de réaction.
  * Un clic sur la même réaction annule la réaction (unlike). Choisir une autre réaction remplace immédiatement la réaction précédente.
  * Agrégation (`ReactionSummary`) : affiche les principales réactions réellement présentes (au maximum 3 sous forme d'icônes empilées `[👍 ❤️ 😮]`) suivies du nombre total de réactions. Aucune réaction fictive n'est inventée.
  * Clic sur le résumé des réactions : ouvre une interface responsive (`ReactionUsersModal` / Bottom Sheet mobile) avec onglets par type (« Toutes », « 👍 », « ❤️ », etc.) et liste des personnes ayant réagi.
  * **Optimistic UI** : mise à jour immédiate des compteurs, du bouton et de l'affichage local sans attendre la réponse serveur, avec synchronisation continue et cohérence absolue entre la carte du fil et la Lightbox.
* **Barre d'actions complète dans la vue détail** (page `/post/[id]` et lightbox du post d'origine) : **J'aime** (+ palette de réactions) · **Gratifier** (100 points, modale de confirmation) · **Republier** (simple ou avec commentaire) · **Partager** (modale interne `SharePostModal` vers WhatsApp, X, Facebook, LinkedIn, Instagram/copie de lien). Ces actions sont centralisées dans `PostMediaLightbox` et fonctionnent directement depuis la page de détail.
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
* **Carte de prévisualisation au survol (Preview Card / Hover Card)** :
  * Au survol du nom d'un **utilisateur**, d'un **espace** ou d'un **groupe** dans le fil d'actualité (sur chaque publication ou publication repartagée) :
  * Un carré flottant élégant (`EntityPreviewCard`, basé sur le composant primitif `@base-ui/react/preview-card` dans `src/components/ui/preview-card.tsx`) s'ouvre de manière fluide avec détection de collision d'écran et temporisation au survol (delay 250ms).
  * Il affiche la **photo de couverture** (ou dégradé chaud Dughu), la **photo de profil / avatar** agrandie en superposition, le nom officiel, le nom d'utilisateur `@username`, les badges (compte vérifié, confidentialité groupe) et les statistiques clés.
  * **Boutons d'action intégrés** :
    * *Utilisateur* : bouton S'abonner / Abonné (`FollowButton`), bouton d'accès direct à la messagerie (`/messages?userId=...`) et lien vers le profil.
    * *Espace* : bouton interactif J'aime / Aimé (`likePage`), et lien « Visiter » (`/espaces/[pageId]`).
    * *Groupe* : bouton Adhérer / Rejoint, et lien « Voir le groupe » (`/groups`).
* **Navigation et interaction sur les posts repartagés (Reposts)** :
  * La carte embarquée de la publication d'origine (`ParentPostCard`) est entièrement interactive : curseur pointeur, survol bordé et ombré, badge distinctif « Repartagé ».
  * Un clic sur le bloc du post repartagé ouvre instantanément la vue immersive dédiée du post original (`ParentPostLightbox` / page `/post/[id]`) sans aucun rechargement de page brut :
    * **Disposition d'affichage** : le **post est affiché à droite** (visuel ou média immersif haute définition, vidéo avec contrôles de lecture, ou carte texte/couleur stylisée) et le **volet des commentaires est affiché à gauche** (identité de l'auteur, date, texte intégral avec hashtags, réactions rapides, fil de commentaires en temps réel avec réponses imbriquées et barre de composition de nouveau commentaire).
    * **Format uniforme des commentaires** : chaque commentaire et réponse affiche le nom complet de l'utilisateur, le badge ambre « Auteur » si la personne est l'auteur de la publication, l'horodatage relatif francisé (« à l'instant », « il y a 2 min », « il y a 3h »...) au lieu de chaînes brutes ISO, et la barre d'actions séparée par des points médians (`👍 • Répondre • Supprimer` ou `Signaler`).
    * L'URL est synchronisée de façon fluide vers `/post/[id]` (`window.history.pushState`), permettant le partage direct du lien et la persistance lors d'un rechargement, tandis que la fermeture de la vue (croix, touche Échap ou clic d'arrière-plan) restaure immédiatement la position dans le fil d'actualité sans perte d'état.
    * Les clics sur les éléments internes du post d'origine (nom d'auteur ouvrant la preview card, hashtags, contrôles vidéo) conservent leur comportement propre sans déclencher intempestivement l'ouverture de la vue complète.
* **Unicité des publications dans le flux (Feed)** :
  * Le flux d'actualité (`HomePage`) intègre une déduplication systématique des publications par leur identifiant unique (`deduplicatePosts`), éliminant tout doublon lors du défilement infini ou de la création de nouvelles publications, garantissant ainsi des clés de rendu stables (`key={`feed-card-${post.id}-${postIndex}`}`).

#### Mini-profil (sidebar droite)

* La carte « mini-profil » de la sidebar droite affiche le solde **total** de points de
  l'utilisateur connecté, chargé via `GET /pointsToday/{userId}` (API Dughu) à travers
  la route interne `/api/pointsToday/[userId]` (champ `total` de la réponse).
* **Vrais compteurs du mini-profil** : la carte affiche les **chiffres réels** de
  l'utilisateur — **Abonnés** (`followersNbr`), **Suivis** (`followingsNbr`) et
  **Interactions** (`NbrPostsTotal`, libellé « Interactions » au lieu de « Posts »,
  même convention que la page profil) — chargés via `GET /api/profile` (hook
  `useProfile` → service frontend `profile.service.ts`, en passant `dughuUserId`
  prioritairement puis `userId`/`slug`). Les compteurs locaux `user._count` ne
  servent que de repli si la requête profil échoue ou n'est pas résolue.
* La **`MiniProfileCard`** a une prop `loading` : pendant la résolution (auth +
  points + profil) elle affiche des **squelettes** (badge points, couverture,
  avatar, identité, stats) au lieu des placeholders (« 0 Points », cover/avatar
  par défaut, « Utilisateur », stats à 0).
* La sidebar droite (mini-profil, posts boostés, groupes, espaces, dernière
  activité, tendances) charge ses données via `/api/suggestions` (+
  `/api/pointsToday/[userId]`) : pendant la résolution, chaque bloc affiche des
  **squelettes** (état `loading` de `RightSidebar`/`GroupCarousel`) et **jamais**
  de repli statique — les jeux de données codés en dur (`GROUPS`, `SPACES`,
  tendances) ne servent de repli que si l'API renvoie réellement une liste vide.
* **Positionnement de la sidebar droite** (une seule instance `RightSidebar`,
  rendu adaptatif — un seul appel à `/api/suggestions`) :
  * **Desktop / grand écran (xl+)** : colonne fixe (`xl:fixed`) de `240px`,
    décalée de **`right-55` (220px du bord droit)**. `MainLayout` réserve un
    espace **constant** à droite (`xl:w-[484px]` = 220px d'offset + 240px de
    sidebar + 24px de respiration) afin que la sidebar reste **collée au card du
    feed sans jamais le chevaucher** au repos.
  * **Ouverture du chat (tous écrans)** : la sidebar droite **ne se déplace
    jamais** (position `right-[220px]` constante) — le panneau de conversation
    (`ConversationSidebar`, fixed, z-40) s'ouvre **en overlay par-dessus** les
    éléments : le card du feed n'est **ni couvert, ni poussé, ni redimensionné**
    sur aucun écran (espace réservé constant `xl:w-[484px]`).
  * **Mobile / petit écran (< xl)** : la sidebar droite s'ouvre en **tiroir
    coulissant** fixe depuis la droite (bouton « 4 carrés » du header, voir
    « Header — responsive mobile / tablette ») : cachée hors écran par défaut
    (`translate-x-full`), elle glisse au-dessus du contenu sans jamais le
    pousser ni réduire la taille des cards du feed, sur tous les écrans.

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
* **Booster son propre post** (endpoint `boostPost`) : réservé à l'auteur de la
  publication, l'action « Booster » du menu envoie `{ post_id, user_id, boost_days }`
  à l'API Dughu (durée bornée 1 à 30 jours, défaut 1 jour) puis rafraîchit le fil.
* Les actions « Bloquer » et « Donner des points » ne s'affichent pas sur ses propres
  publications ; à l'inverse, « Supprimer » et « Booster » ne sont visibles que sur
  ses propres publications (garde côté affichage, la vérification d'autorisation
  reste côté serveur).

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
* Like et dislike sont de **vrais toggles** : cliquer une capsule déjà aimée
  (resp. dislikée) retire la réaction (compteur −1 optimiste, rollback sur
  échec), en cohérence avec les endpoints Dughu `toggleLikeShort` /
  `toggleDislikeShort` qui gèrent nativement l'ajout ET le retrait.
* Compteur de dislikes : le feed `fetchShorts` n'expose pas de champ numérique
  (`dislike_count` absent) — la source est `dislikeBy` (tableau d'ids ou
  chaîne JSON `"[23443,123]"`), dont la longueur est comptée côté client.
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
* Compteurs capsules **pilotés par le serveur** : les nombres de likes, dislikes,
  commentaires et vues affichés dans la visionneuse (et les vignettes) proviennent
  **exclusivement** des données de l'API Dughu portées par le cache React Query
  des queries « capsules » — **aucun compteur n'est stocké dans un état local**
  (les surcharges locales sont supprimées). Après chaque action (like, dislike,
  ajout de commentaire), le cache est patché immédiatement (retour visuel
  instantané) puis **invalidé** : React Query refetch l'API qui renvoie les
  compteurs réels (`like_count`, `comment_count`, `view_count`). Les valeurs
  affichées sont donc correctes et stables à la fermeture/réouverture de la
  visionneuse, y compris lorsque d'autres utilisateurs ont liké/commenté entre-temps.
   Ce refetch ne doit **jamais** se traduire visuellement par un « rechargement » :
   la capsule visionnée est suivie **par son id** (et non par sa position dans la
   liste, l'ordre du feed n'étant pas stable côté API), la lecture de la vidéo en
   cours n'est pas interrompue (le média de la capsule affichée est figé tant que
   son id ne change pas), la visionneuse reste ouverte et, sur `/capsules`, les
   pages déjà chargées au scroll sont conservées (les données refetchées sont
   **fusionnées** dans la liste locale, jamais substituées à la page 1).

* Confidentialité : l'auteur d'un commentaire s'affiche sous **« Utilisateur »**
  lorsqu'il s'agit de l'utilisateur connecté ; les autres commentateurs
  conservent leur nom affiché.
* Contrats Dughu des actions capsules (alignés sur les endpoints officiels) :
  **like / dislike** via `GET /toggleLikeShort/{capsule_id}/{user_id}` et
  `GET /toggleDislikeShort/{capsule_id}/{user_id}` ; **vue** via
  `POST /trackView` avec `user_id` + `capsule_id` + `ip` (l'IP est déduite
  côté serveur des en-têtes proxy) ; **commentaire** via
  `POST /storeComment/capsule` avec `capsule_id` + `text` + `user_id` ;
  **réponse** via `POST /replyCapsuleComment` avec `comment_id` + `text` +
  `user_id` ; **like de commentaire / réponse** via
  `POST /toggleLike/capsule/comment` avec `comment_id` (commentaire racine
  parent) + `user_id` + `CommentReply_id` (id de la réponse, vide pour un
  commentaire racine) ; **signalement** via `POST /capsule/report` avec
  `capsule_id` + `reason` + `reason_id` + `user_id` + `text` ;
  **suppression** via `DELETE /capsule/{id}` (auteur uniquement).
* Compteurs de capsule : les nombres de **j'aime**, **commentaires**, **vues**
  et **dislikes** affichés (rail, visionneuse, profil) sont les compteurs
  **réels** de l'API Dughu. Le mapper lit en priorité les champs numériques
  `like_count` / `comment_count` / `view_count` / `dislike_count`, et ne
  retombe sur la longueur des collections `likes` / `comments` / `views`
  qu'en l'absence de champ numérique. Les compteurs se mettent à jour en
  temps réel côté UI : incrément optimiste au **like** (rollback si l'appel
  échoue) et à l'**ajout de commentaire**, via les endpoints
  `GET /toggleLikeShort/{capsule_id}/{user_id}` et
  `POST /storeComment/capsule`.
* **Persistance des compteurs entre les ouvertures de la visionneuse** :
  chaque like, dislike ou commentaire est aussi répercuté dans le **cache
  React Query** des queries dont la clé commence par `capsules` (feed de
  l'accueil, page `/capsules`, capsules du profil) via un patch
  (`setQueriesData`) du compteur et des flags `isLiked` / `isDisliked` de la
  capsule concernée. Les compteurs optimistes de la visionneuse ne sont donc
  plus perdus à sa fermeture : en rouvrant une capsule, les compteurs et
  l'état aimé / disliké reflètent les actions déjà effectuées (jusqu'au
  prochain rafraîchissement des données distantes, qui fait foi).

### Module « Retrouvailles »

* Cliquer sur **« Retrouvailles »** dans la sidebar gauche ouvre un **modal de
  présentation** : icône dédiée, titre « Retrouvailles », sous-titre
  « Retrouvez ceux qui ont marqué votre vie. », rangée de 5 avatars (de **vrais
  profils Dughu**, les 5 premières suggestions de l'API), texte
  « +12 568 personnes retrouvées sur Dughu », 4 avantages et un bouton
  **« Commencer »** qui redirige vers la page `/retrouvailles`.
  Le modal n'apparaît **qu'une seule fois** : une fois vu, la clé
  `dughu:retrouvailles-seen` est posée dans le localStorage et les clics
  suivants sur « Retrouvailles » mènent **directement** à `/retrouvailles`.
* La page `/retrouvailles` conserve la **sidebar gauche**, masque la **sidebar
  droite**, et affiche 3 onglets alignés à gauche : **Suggestions**,
  **Contacts**, **Anciens**. L'onglet actif est **synchronisé avec l'URL**
  (`/retrouvailles?tab=suggestions|contacts|anciens`) et l'élément
  « Retrouvailles » de la sidebar est actif sur cette page.
* **Suggestions** : `GET /retrouvailles?tab=suggestions&user_id=...` — la
  réponse est un objet de **groupes d'affinité** (amis en commun, amis Dughu,
  même école, même entreprise, même ville, etc.). Chaque personne a un bouton
  « Fraterniser ». États : chargement, liste vide, erreur, succès.
* **Contacts** : import d'un fichier **vCard (.vcf)** de contacts (la forme
  privilégiée — un numéro par champ `TEL`), ou **CSV** en secours (un numéro
  par ligne ou une colonne), puis bouton **« Synchroniser »**. Dès le clic, un
  **chargement progressif circulaire** bien visible (loader en anneau
  `#A35A2A`) indique la synchronisation ; les contacts retrouvés n'apparaissent
  qu'une fois la synchronisation terminée.
  Les numéros sont transmis à la route interne en **POST body JSON** (jamais
  dans l'URL, pour ne pas être rejetés en 431 par le reverse proxy sur les gros
  imports) puis à l'API Dughu sous forme de **tableau JSON**
  (`phone_numbers=["0787…","0123…"]`), traités par **lots de 100** et fusionnés
  côté serveur. La liste des contacts retrouvés s'affiche avec un bouton
  « Fraterniser ». États : chargement, vide, erreur, succès.
* **Anciens** : formulaire **École / Université**, **Promotion : début**,
  **Promotion : fin**, **Ville** →
  `GET /retrouvailles?tab=anciens&user_id=...&ville=...&school=...`
  (la réponse est `data.users`). Résultats avec bouton « Fraterniser ». États :
  chargement, vide, erreur, succès.
* **Bouton « Fraterniser »** (réutilisable dans les 3 onglets) : envoie
  `POST relation/request` (multipart) avec `auth_user_id` + `user_id` +
  `type` — il est **désactivé** pendant l'envoi (« Envoi… » avec spinner), passe
  en état **« Demande envoyée »** au succès (y compris si la même personne
  apparaît dans plusieurs groupes), empêche les envois multiples
  (anti double-clic global) et gère : succès, demande déjà envoyée, relation
  existante, erreur serveur (rollback + message utilisateur). Le bouton utilise
  la **couleur caramel Dughu** (`#A35A2A`, fond caramel/texte blanc, hover
  `#8a4d23` ; état « envoyé » en outline caramel).
* **Persistance des demandes envoyées** : au chargement de la page, les
  demandes de fraternisation **sortantes** de l'utilisateur sont rechargées via
  `POST relation/requests` (clé `outgoing`, type `friend`) — exposées par la
  route interne `GET /api/profile/relations/outgoing` — et pré-remplissent
  l'état `alreadySent` des boutons. L'état « Demande envoyée » survit donc au
  rechargement de la page ; le clic sur un bouton en état « envoyé » reste un
  toggle (confirmation puis annulation de la demande sortante).
* Architecture : composant → hook TanStack Query → service frontend (Axios
  cliente) → route interne `GET /api/retrouvailles` → service serveur (Axios
  serveur) → API Dughu. Normalisation défensive des formes réelles de l'API
  (suggestions = blocs objet, contacts = tableau, anciens = `data.users`).
### Points et activités

La page `/points` (« Points et activités ») est protégée (groupe `(protected)`)
et organisée en 3 onglets accessibles (rôle `tablist`, navigation clavier) :
« Mes gains », « Mes badges » et « Utilisations ». L'utilisateur connecté est
résolu via `useAuth` (ID Dughu numérique) ; à défaut, les routes internes
retombent sur le cookie de session.

* Entrée de navigation : l'item « Points et badges » de la **sidebar gauche**
  (`LeftSidebar`) redirige vers `/points` (état actif quand la page est courante,
  fermeture du menu mobile après le clic).

#### Onglet « Mes gains »

* Bandeau statique « Barème de points sur Dughu ».
* Trois cartes de statistiques : « Points disponibles » (API, format 2
  décimales, label « Utilisables dès maintenant »), « Points convertis »
  (statique, 0.00) et « Mes gains du jour » (statique, 0).
* Section statique « Comment gagner des points » : 6 blocs (Publications,
  Réactions & interactions, Flash, Adhérer & Fraterniser, Invitations &
  connexions, Pénalités) avec icônes ; les pénalités sont en rouge.
* Tableau « Historique des points » : filtres par période (Tous / Aujourd'hui /
  Cette semaine / Ce mois-ci / Cette année), recherche, sélecteur d'entrées par
  page (5/10/25/50), colonnes triables (Date, Type, Description, Points),
  pagination numérotée avec Précédent / Suivant, bouton « Plus
  d'informations ». Couleurs sémantiques : gain en vert, perte en rouge.
* Le filtrage / la pagination sont réalisés côté client (l'API Dughu ne
  garantit pas `page`, `limit`, `search`, `period`) ; les paramètres sont toutefois
  transmis à l'API quand ils existent.

#### Onglet « Mes badges »

* Bloc « Mes badges » : badges obtenus via `GET /api/badge/[userId]` ; état vide
  (icône trophée, « Aucun badge obtenu pour le moment ») si aucun badge.
* Catalogue des badges via `GET /api/badge`, filtres par catégorie dérivés de la
  réponse (Tous / Engagement / Reconnaissance / Fidélité / Création /
  Leadership / Certification si présents), cartes avec icône, nom, tag de
  catégorie coloré, description courte et statut (« Obtenu » avec date ou
  « À débloquer » verrouillé, par croisement avec les badges de l'utilisateur).

#### Onglet « Utilisations » (100 % statique)

* Bandeau d'intro sur les usages des Points DUGHU.
* Section « À quoi servent vos points ? » : 6 items (envoi de points, Dixip,
  booster un post, booster un Espace, certifier un compte, certifier un Espace).
* FAQ en accordéon accessible « Questions fréquentes » (5 items).
* Encadré mentions légales (DUGHU DEALTOO SAS).

#### Architecture HTTP

* Composant → hook TanStack Query (`src/hooks/points`, `src/hooks/badges`) →
  service frontend (Axios cliente) → routes internes `GET /api/pointsHistory`,
  `GET /api/pointsToday/[userId]`, `GET /api/badge`, `GET /api/badge/[userId]` →
  services serveur (Axios serveur, token `X-AppApiToken` côté serveur
  uniquement) → API Dughu.
* Sources de données : le solde « Points disponibles » (ainsi que « Points
  convertis » et « Mes gains du jour ») provient de `GET /pointsToday/{userId}`
  (champs `total`, `converted`, `gain_today`) — la même source que le
  mini-profil ; le tableau « Historique des points » provient de
  `GET /pointsHistory/{userId}` (endpoint paramétré par l'ID Dughu en chemin).
* Normalisation défensive dans `points.mapper.ts` et `badges.mapper.ts`
  (variantes d'enveloppes et de noms de champs, jamais dans les composants).
* Types du domaine dans `src/types/points/points.types.ts` ; composants
  réutilisables dans `src/components/points/` (`StatCard`,
  `PointsHistoryTable`, `BadgeCard`, `FaqAccordion`, `TabNavigation`).
* États de chargement (squelettes) et d'erreur (message + réessayer) gérés
  pour les appels API ; aucun `fetch` natif côté frontend.

### Mes sauvegardes

La page `/sauvegardes` (« Mes sauvegardes ») est protégée (groupe `(protected)`)
et accessible depuis l'item **« Mes sauvegardes » de la sidebar gauche**
(`active="saves"` : l'élément est surligné quand on s'y trouve).

* **Liste des posts sauvegardés** : `GET /get-post-save/{user_id}` (ID Dughu
  de l'utilisateur connecté, résolu via `useAuth`). L'API Dughu **pagine** la
  réponse à 10 posts/page (`data.pagination = { total, per_page, current_page,
  last_page }`) et enveloppe les posts dans `data.posts` : la route interne
  extrait ce tableau, transmet `?page=N` et expose `hasMore` (dédait de
  `current_page < last_page`). Le hook `useSavedPosts` récupère toutes les
  pages successivement (plafond de sécurité : 50) pour reconstruire la liste
  complète dans un cache plat, tri par l'API Dughu (du plus récemment
  sauvegardé au plus ancien si l'API le fournit ainsi).
* **Rendu** : chaque post utilise le **même composant `PostCard` que le fil
  principal** (texte, image/vidéo/audio, auteur, date, réactions, commentaires,
  republications, abonnement) — cohérence visuelle garantie, aucune duplication.
* **Retrait des sauvegardes** : sur chaque carte, le signet est activé
  (`isSaved: true`) ; au clic, le post est retiré de la liste en **optimistic
  update** via `POST /api/store-save` (endpoint **toggle** Dughu : le post étant
  déjà sauvegardé, l'appel le désauvegarde), avec rollback en cas d'échec et
  resynchronisation (`invalidateQueries`). **Aucun retry automatique** (mutation
  non idempotente). ⚠️ Point à confirmer avec le backend : un endpoint de
  désauvegarde dédié (DELETE) pourrait remplacer le toggle `store-save`.
* **Interactions conservées** : like / réactions, commentaires (texte + fichiers),
  republication (directe ou avec texte), abonnement à l'auteur — mêmes services
  et logique optimiste que le fil principal.
* **États** : squelettes de cartes pendant le chargement, état vide (« Vous
  n'avez aucun post sauvegardé pour le moment » + bouton « Explorer le fil »),
  erreur (message français + bouton « Réessayer »), succès.
* **Responsive** : `MainLayout` sans sidebar droite, colonne max `max-w-3xl`,
  paddings adaptés mobile/desktop (même gabarit que la page Points).

#### Architecture HTTP

* Composant `src/components/saved/SavedPage.tsx` → hooks TanStack Query
  (`src/hooks/queries/use-saved-posts.ts` : `useSavedPosts`, `useUnsavePost`)
  → service frontend (`src/services/posts/posts.service.ts`, Axios cliente) →
  route interne `GET /api/get-post-save/[userId]` → lib serveur
  (`src/lib/dughu.ts`, `dughuApi.getSavedPosts`, Axios serveur avec token
  `X-AppApiToken`) → API Dughu (`GET /get-post-save/{user_id}`).
* Les posts sont mappés côté serveur via `mapPosts` (même forme que le fil) et
  marqués `isSaved: true` ; la route retombe sur le cookie de session si
  `userId` est absent de l'URL. Aucun `fetch` natif côté frontend.

### Stop aux arnaques

La page `/stop-arnaques` (« Stop aux arnaques ») est protégée (groupe
`(protected)`) et accessible depuis l'item **« Stop aux arnaques » de la
sidebar gauche** (`active="scam"` : l'élément est surligné quand on s'y
trouve, le clic navigue vers la page et ferme le drawer mobile).

* **Contenu 100 % statique** : les **20 mesures anti-arnaque DUGHU** sont
  codées en dur dans `src/components/scam/anti-scam-data.ts` (tableau JS
  `{ title, description }`). **Aucun appel API**, aucune donnée dynamique.
* **En-tête** : pastille icône bouclier + libellé « Stop arnaque », puis
  titre principal **centré, en orange** (#A35A2A) « 20 mesures anti-arnaque
  DUGHU », et un sous-titre d'introduction gris.
* **Liste numérotée** : sémantique `<ol role="list">` ; chaque item est rendu
  par le composant réutilisable `NumberedTipCard`
  (`src/components/scam/NumberedTipCard.tsx`) — numéro dans une pastille
  arrondie, **titre en gras bleu foncé** (#1E3A8A), **description en gris**
  (#65676B) plus petite. La page est assemblée par
  `src/components/scam/ScamPage.tsx` avec le même gabarit que les pages
  Points / Mes sauvegardes (`MainLayout` sans sidebar droite, colonne
  `max-w-3xl`).
* **Page purement informative** : aucune interaction requise, aucun état
  loading/erreur (contenu statique). Un bouton « Signaler une arnaque »
  pourrait être ajouté plus tard en bas de page (non implémenté).
* **Responsive** : mobile-first, cartes pleine largeur, tailles de texte
  progressives (`text-[15px]` → `text-base`, `sm:`), aucun scroll horizontal.
* **Accessibilité** : liste ordonnée sémantique, icône décorative masquée
  (`aria-hidden`), contrastes conformes (bleu foncé/gris sur blanc).

### Pokes

La page `/pokes` est protégée (groupe `(protected)`) et accessible depuis
l'item **« Pokes » de la sidebar gauche** (`active="pokes"` : l'élément est
surligné quand on s'y trouve, le clic ferme le drawer mobile).

* **3 onglets** réutilisant le composant `TabNavigation` accessible (rôle
  tablist, navigation clavier) : **Pokes reçus / Suggestions / Pokes
  envoyés**.
* **Sémantique de l'API Dughu** (vérifiée sur apitest) :
  * `GET /pokes?user_id=X` → pokes **reçus** par X (`user` = expéditeur) ;
  * `GET /pokes/sent?user_id=X` → pokes **envoyés** par X (`user` =
    destinataire) ;
  * `POST /pokes { user_id, received_user_id }` → envoyer un poke ;
  * `POST /pokes/{pokeId}/poke-back { user_id, received_user_id }` → répondre
    à un poke (`received_user_id` = l'expéditeur ORIGINAL du poke, exigé par
    l'API). ⚠️ `/pokes/{pokeId}?user_id=X` ne renvoie qu'un poke unique —
    inutilisable pour alimenter une liste.
* **Architecture HTTP** (aucun `fetch` natif côté frontend) : composants
  `src/components/pokes/` → hooks TanStack Query (`src/hooks/pokes/
  use-pokes.ts` : `usePokes`, `useSendPoke`, `usePokeBack`) → service
  frontend (`src/services/pokes/pokes.service.ts`, Axios cliente) → routes
  internes `GET/POST /api/pokes` et `POST /api/pokes/[pokeId]/poke-back`
  (user_id résolu depuis le cookie de session, fallback paramètre) → service
  serveur (`src/services/pokes/pokes.server.ts`, instance Axios serveur via
  `dughuServerGet` / `dughuServerForm` — nouveau helper POST form-urlencoded
  sans retry) → API Dughu. La normalisation défensive vit dans
  `src/services/pokes/pokes.mapper.ts` : seuls les champs affichables
  (id, nom, username, avatar, dates) sont renvoyés au navigateur — e-mails,
  tokens et données sensibles de la réponse brute ne sortent jamais du
  serveur.
* **Pokes reçus** : liste (avatar, nom, @username, date relative `timeAgo`)
  avec bouton **« Répondre »** par ligne → poke-back, **mise à jour
  optimiste** (le poke répondu quitte la liste immédiatement, rollback en
  cas d'échec, resynchronisation `invalidateQueries`). Aucun retry
  automatique (mutation non idempotente).
* **Suggestions** : dérivation des pokes reçus — les expéditeurs sont
  dédupliqués par utilisateur (poke le plus récent) et triés du plus récent
  au plus ancien ; bouton **« Poker »** → `POST /api/pokes`. L'API Dughu
  n'expose pas d'endpoint « suggestions » dédié (404/500 sur les variantes
  testées) : cet onglet exploite l'endpoint demandé `/pokes?user_id=X`.
* **Pokes envoyés** : liste des pokes envoyés (`/pokes/sent`), bouton
  secondaire **« Re-poker »**.
* **États** : squelettes de chargement, erreur avec « Réessayer », état vide
  par onglet ; toasts de succès/échec (sonner) ; boutons désactivés pendant
  la mutation en cours.
* **Responsive & accessibilité** : mobile-first, `max-w-3xl`, lignes
  tronquées proprement, boutons avec `aria-label` nominatif, images avec
  fallback `/images/avatar.png`.

### Espaces (Space)

La page `/espaces` est protégée (groupe `(protected)`) et accessible depuis
l'item **« Espaces » de la sidebar gauche** (`active="espaces"` : surligné
quand on s'y trouve, le clic ferme le drawer mobile).

* **Sémantique de l'API Dughu** (vérifiée sur apitest) :
  * `GET /getPage/{id}` **ignore l'id** (résidu Postman) → renvoie le feed
    global des pages paginé (`?page=N`, `searchTerm`) : sert à la découverte ;
  * `POST /userPages {auth_user_id, user_id}` → « Mes espaces » ;
  * `POST /userLikedPages?page=` → espaces aimés ;
  * `POST /suggestPages?page=` → suggestions ;
  * `POST /pageAdminsUser` → espaces administrés ;
  * `POST /show/pages {user_id, page_id}` → **détail** (page + `admins` +
    `is_admin` + `is_like` + `count_like`) ;
  * `GET /getPostPageUser/{id}?page=` → **attend un ID utilisateur** et renvoie
    le feed global des publications des espaces paginé (5/page, auteur = page)
    : alimente l'onglet « Actualité » (`/api/pages/feed`) ; `GET /imagePage/{id}?page=`
    → galerie ; `GET /getPageLikes/{id}` → likes ;
  * `GET /getPageOffers/{page_id}/{user_id}?page=` → offres ;
    `GET /offers/show/{id}` → détail d'offre ; `POST /offers` → création ;
  * `POST /page` → création **et** édition (avec `page_id`) ;
  * `POST /likePage {page_id, user_id}` → like/unlike ;
  * `POST /boostPrice {days}` → prix (`{points, fcfa}`) **avant**
    `POST /boostPage {days, page_id, user_id}` ;
  * `POST /destroyPage/{id} {password}` → suppression (**mot de passe
    obligatoire** ; le doublon « delete Page » est ignoré) ;
  * `POST /page/uploadImage` (multipart `page_id`, `image`, `element` =
    avatar|cover) → avatar/couverture ;
  * `POST /addAdminPage {page_id, user_id}`, `POST /addRemovePageAdmin
    {page_id, member_id}` → ajout/retrait d'admin ;
  * `POST /updatePageAdminPrivileges/{adminId}` → privilèges détaillés
    (checkboxes general, info, social, avatar, design, admins, analytics,
    delete_page) ;
  * `POST /page/requestVerification/{id}` / `POST /page/removeVerification/{id}`
    / `POST /toggleVerificationPage` → vérification ;
  * `POST /page/inviteFriend {user_id, page_id, friend_id}` → invitation
    (l'incohérence « listUserLikeAdmin » sur la même URL est ignorée ; la liste
    des invités passe par `POST /invitePageList {per_page, user_id, page_id}`) ;
  * `POST /page/{page_id}/points-recipient {points_recipient}` → destinataire
    des points (subscriber | owner | none) ;
  * `POST /socialLinksUpdat` (clé `instgram` = typo backend conservée) → liens
    sociaux ; `GET /getPageCategories` → catégories du formulaire.
* **Écrans** : liste à onglets (**Actualité** / Découverte / Mes espaces / Aimés
  / Suggestions / Administrés) avec recherche debouncée (masquée sur
  l'onglet Actualité) ; détail d'espace (`/espaces/[id]`) structuré avec une **sidebar
  gauche d'informations** inspirée de la page profil (carte À propos avec description,
  coordonnées complètes, icônes, liens sociaux et statistiques) et des onglets de
  contenu principal (Galerie, Offres, À propos/gestion, Admins, Stats, Inviter — **aucun
  onglet « Actualité » sur la page de détail**, l'actualité étant centralisée sur `/espaces`) ;
  formulaire de création (`/espaces/creer`) en **assistant guidé par étapes (wizard)**
  demandant dès l'Étape 1 la photo de couverture et la photo de profil avec prévisualisation,
  suivi de l'Étape 2 (nom, titre, description) et de l'Étape 3 (catégorie, coordonnées, permissions) ;
  formulaire d'édition (`/espaces/[id]/edit`) en vue directe pré-remplie.
* **Onglet « Actualité »** (première position, `PagesFeedTab.tsx`) : fil global
  des publications des espaces via `GET /api/pages/feed` (service serveur
  `fetchPagesPostsFeed` → `getPostPageUser/{user_id}`, mapper du fil principal
  `mapPosts`). Chaque publication est rendue avec la **carte `PostCard` du fil**
  et sa barre d'actions complète : **J'aime + palette de 6 réactions**,
  **Commenter** (liste + ajout + fichiers), **Republier** (simple ou avec
  texte), **Partager** (modale interne, lien `shareLink`), menu « 3 points »
  (enregistrer, masquer, bloquer, supprimer si auteur). Les cartes sont
  disposées avec un **espacement généreux et aéré** (`gap-5 sm:gap-6` et marges nettes).
  Mises à jour optimistes avec rollback (réactions via le cache `reactionCache`), abonnement
  à l'auteur pour les publications personnelles (pas de bouton « Suivre » sur
  les publications de Page), chargement automatique au scroll (5 publications
  par page) avec bouton « Charger plus » en cas d'échec de pagination.
  ⚠️ L'API Dughu ne fournit pas de « Je n'aime pas » pour les publications
  (seules les capsules en ont un) ; la palette de réactions (J'aime, J'adore,
  Haha, Wouah, Triste, Énervé) couvre l'ensemble des réactions disponibles.
  L'endpoint répond parfois `success: false` de façon intermittente : la route
  serveur effectue **un seul nouvel essai** (lecture idempotente) avant
  d'afficher un état d'erreur avec « Réessayer ».
* **Règles métier** : suppression **toujours** précédée d'une modale demandant
  le mot de passe (l'API renvoie 401 « Mot de passe incorrect. » → message
  propagé) ; boost avec **affichage du prix** (`boostPrice`) avant validation ;
  like en **mise à jour optimiste** (rollback si échec) ; upload avatar/cover
  réservé aux admins ; privilèges admin éditables par checkboxes.
* **Architecture HTTP** : composants (`src/components/pages/`) → hooks TanStack
  Query (`src/hooks/pages/use-pages.ts`, mutations **sans retry**) → services
  frontend par domaine (`pages.service.ts`, `page-admin.service.ts`,
  `page-offer.service.ts`, `page-stats.service.ts`) → routes internes
  `/api/pages*` et `/api/offers/[id]` (session par cookie) → service serveur
  (`pages.server.ts` + mapper défensif `pages.mapper.ts`) → API Dughu. Seuls
  les champs affichables sortent du serveur (e-mails et tokens de la réponse
  brute filtrés).
* **États** : squelettes, erreur + « Réessayer », vide par onglet, toasts de
  succès/échec ; responsive mobile-first ; accessibilité (labels, aria).

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

### Groupes

* La rubrique « Groupes » de la sidebar gauche ouvre la route protégée `/groups` et conserve un état actif visible.
* La vue propose cinq onglets accessibles et adaptés au tactile : « Actualités », « Mes groupes », « Groupes administrés », « Groupes suggérés » et « Groupes aimés ».
* « Actualités » charge les publications des groupes publics depuis l'endpoint Dughu `POST /actualitePostsGroup` via le flux interne obligatoire (hook TanStack Query → service frontend Axios → `GET /api/groups/feed` → service serveur Axios). L'identifiant Dughu provient du cookie de session côté serveur et n'est pas accepté depuis le navigateur.
* Le service filtre défensivement les publications sur `postType = "group"`, groupe actif et `groupe.privacy = "1"` (public ; `"2"` désigne un groupe privé), puis normalise auteur, groupe, contenu, médias, fond coloré, compteurs et état de réaction avant toute exposition au client.
* Le fil gère la recherche distante (`searchTerm`), la pagination retournée par l'API, la déduplication par identifiant, les squelettes, l'état vide, l'erreur avec nouvelle tentative et le chargement de la page suivante.
* Les publications de groupes réutilisent le composant partagé `PostCard`, enrichi d'un badge de contexte groupe. Les réactions, commentaires, republications, partage, sauvegarde, masquage, blocage et menu d'actions suivent ainsi les mêmes composants et services que le fil principal. Les images disposent d'un cadre responsive spécifique au contexte groupe (`4:3` sur mobile, `16:9` dès la tablette) afin de limiter leur hauteur.
* « Mes groupes » charge les groupes dont l'utilisateur est membre depuis `POST /usergroupes` via le flux interne `useUserGroups` → service frontend Axios → `GET /api/groups/mine` → service serveur Axios. L'identifiant utilisateur est lu exclusivement depuis le cookie de session côté serveur.
* Le volet conserve les groupes publics (`privacy = "1"`) et privés (`privacy = "2"`), écarte les groupes inactifs ou dont `is_member` n'est pas vrai, et gère la recherche distante, la pagination, la déduplication, les squelettes, l'état vide et le réessai sur erreur.
* Les listes de groupes utilisent des cartes avec bannière, avatar, nom, catégorie, nombre de membres et indicateur accessible de confidentialité. Elles s'affichent sur une colonne en mobile, deux en tablette et jusqu'à trois sur grand écran.
* Les suggestions utilisent une variante horizontale et un bouton « Adhérer ». Dans ce premier lot sans API Groupes, l'adhésion est uniquement conservée dans l'état local et signalée comme telle à l'utilisateur.
* La recherche est envoyée au serveur dans « Actualités » et filtre localement les groupes des autres onglets. La vue « Groupes administrés » fournit l'état vide « Aucun groupe trouvé. ».
* La création de groupe, les adhésions persistantes, les données distantes des trois autres onglets et les pages de détail d'un groupe restent à brancher lorsque les contrats API et routes correspondants seront disponibles.

### Navigation principale

* Sur desktop, les accès « Accueil », « Vidéos », « Flash » et « Akwaplay » sont présentés sous forme d'icônes compactes, régulièrement espacées, avec une infobulle accessible au survol et au clavier, tout en conservant leur navigation respective et l'indicateur de page active.
* L'en-tête présente également deux accès statiques distincts « Fraternisés » (icône de groupe) et « Réseautés » (icône de mallette). Ils remplacent l'ancien accès « Abonnés », suivent la même présentation avec infobulle accessible, et n'effectuent aucune navigation tant que leurs vues dédiées ne sont pas disponibles.

### Album

* La page « Album » (`/album`, protégée) est accessible depuis le bouton « L'album »
  de la sidebar gauche, qui est mis en surbrillance lorsque la page est active.
* La liste des albums de l'utilisateur connecté est chargée via l'endpoint Dughu
  `GET /album?user_id={user_id}&page={page}`, à travers la route interne
  `/api/album` (instance Axios serveur côté backend, cliente côté frontend).
* Chaque album est présenté sous forme de carte (grille responsive) avec cover
  (première image ou placeholder), nom, badge de visibilité (Public / Privé) et
  nombre de médias ; un menu contextuel (⋮) permet de supprimer l'album.
* La création d'un album se fait via une modale : nom obligatoire, visibilité
  (Public / Privé) et upload multiple de fichiers (images/vidéos, 20 Mo max par
  fichier, prévisualisation avant envoi). Soumission en multipart/form-data
  (`album_name`, `type`, `albumArray[]`, `user_id`) via `POST /api/album`, avec
  indicateur de progression et rafraîchissement de la liste après succès.
  Contrat API Dughu (vérifié en réel) : le champ fichiers est `albumArray[]`
  (camelCase + crochet) et la visibilité vaut `public` ou `prive` sans accent —
  la route normalise `private`/`privé` → `prive` avant l'envoi, et le badge
  d'affichage traite `prive` (et `private` pour compatibilité) comme privé.
* La suppression d'un album (`DELETE /api/album/{album_id}`) et la suppression
  d'une image dans la vue détail (`DELETE /api/album/image/{image_id}`, endpoint
  Dughu `destroyOneImage/{image_id}`) passent toutes deux par une modale de
  confirmation, appliquent une mise à jour optimiste de la liste et annulent
  celle-ci (rollback + message d'erreur) en cas d'échec.
* La vue détail d'un album affiche tous ses médias en grille, avec bouton retour,
  et met à jour le compteur de fichiers et la cover après suppression d'une image.
* Les états de chargement (skeletons), d'erreur (avec relance), d'état vide
  (invitation à créer son premier album) et de succès sont gérés pour chaque
  appel API.

### Canaux (Module Canal)

* Accessible directement depuis le bouton « Canal » de la barre latérale gauche (état actif `active="canal"`, route protégée `/canal`).
* **Écran 1 — Découverte & Exploration** :
  - En-tête avec icône officielle et titre.
  - Barre d'onglets (style pill) : Explorer (orange actif par défaut), Mes canaux, Canaux rejoints, Favoris.
  - Barre de recherche en temps réel et bouton « + Créer un canal » (fond orange).
  - Sous-filtre catégories horizontalement scrollable avec style de tab actif bleu foncé.
  - Grille responsive de cartes de canaux au format large (2 colonnes sur desktop) : bannière cover panoramique, avatar médaillon superposé 100% visible sans masquage par le fond blanc de la carte, badges membres/visibilité, catégorie, étoile favori et bouton d'action aligné. Sur l'onglet « Canaux rejoints », affichage des informations étendues (statut membre/créateur, type d'accès, date d'adhésion) et bouton « Ouvrir le chat ».
  - Clic sur une carte : ouvre l'Écran 3 sans recharger la page.
* **Écran 2 — Modale de création** :
  - Titre orange centré, modale avec overlay sombre.
  - Zones d'upload côte à côte : logo (requis) et cover (optionnelle) avec prévisualisation.
  - Champs nom, description, catégorie (chargée dynamiquement).
  - Toggles côte à côte avec état actif bleu foncé : Type de canal (Privé par défaut / Public) et Canal actif (Oui par défaut / Non).
  - Soumission multipart/form-data via POST /canal.
* **Écran 3 — Vue Chat plein écran (Thème sombre)** :
  - Overlay sombre plein écran avec bouton de fermeture (✕).
  - Colonne gauche : compteur de membres actifs, liste des canaux appartenant à l'utilisateur (agrégation des canaux créés via `useMyCanals` et rejoints via `useJoinedCanals`) avec surbrillance du canal sélectionné, barre de recherche et suggestions.
  - Colonne centrale : en-tête du canal actif avec bouton « Gérer le canal » (si créateur/admin, avec badge des demandes en attente), zone de messages avec bulles, médias, réactions emoji et suppression ; zone inférieure adaptative : champ de saisie + pièces jointes réservé exclusivement à l'administrateur ou créateur du canal, ou bandeau informatif indiquant que seuls les administrateurs peuvent publier.
  - Colonne droite : grande cover, avatar centré, détails du canal (catégorie, description, visibilité, nombre de membres), bouton « Paramètres & Adhésions » pour l'administrateur, et onglets Médias / Documents / Demandes (liste directe des adhésions avec boutons Accepter/Refuser).
* **Écran 4 — Modale de gestion et paramètres du canal (`CanalSettingsModal`)** :
  - Accessible depuis l'en-tête du chat, la colonne latérale droite et le bouton « Gérer » sur les cartes de l'onglet « Mes canaux ».
  - Onglet « Demandes d'adhésion » : liste des utilisateurs en attente avec avatar, nom, date et boutons en 1 clic « Accepter » (vert) et « Refuser » (rouge) branchés sur `handleJoinRequest`.
  - Onglet « Membres » : liste complète des adhérents du canal avec rôle (Admin / Membre).
  - Onglet « Modifier le canal » : formulaire d'édition complet (nom, description, catégorie, type public/privé, statut actif/inactif, changement interactif du logo et de la couverture avec prévisualisation) branché sur `useCreateOrUpdateCanal` via POST `/canal`.
* **Architecture technique** :
  - Respect strict des deux instances Axios (`dughuServer` côté serveur pour les 32 endpoints Dughu, `apiClient` côté client pour les routes internes `/api/canal/**`).
  - Découverte globale des canaux branchée en `GET /api/canal?scope=all` (avec filtrage catégorie et recherche textuelle `research`).
  - Normalisation défensive dans `canal.mapper.ts` prenant en charge l'enveloppe `result.data` de l'API Dughu, la résolution directe des médias vers le stockage public S3 (`dughuprod.s3.amazonaws.com/storage/...`), l'identifiant auteur `autor_id`, le flag `isRejoind` et le compteur `user_count`. Fallback défensif `onError` sur les cartes.
  - Aucun `fetch` natif côté frontend.
  - Hooks TanStack Query dédiés (`useCanals`, `useMyCanals`, `useJoinedCanals`, `useCanalDetail`, `useCanalMessages`, `useCanalFavorites`, `useCanalPolls`, `useCanalMembers`, `useReceivedNotifications`, `useHandleJoinRequest`, `useCreateOrUpdateCanal`, etc.).

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

---

## 8. Expérience Mobile

### Navigation scroll-aware

* Le **Header (Topbar)** est `fixed` et se masque progressivement (`translateY(-100%)`) lorsque l'utilisateur scrolle vers le bas sur mobile.
* Il réapparaît lors d'un scroll vers le haut ou lorsque l'utilisateur est en haut de la page.
* La **Barre de navigation mobile (Tapbar / MobileBottomNav)** se masque (`translateY(100%)`) lors d'un scroll vers le bas et réapparaît lors d'un scroll vers le haut.
* Ces comportements sont pilotés par le hook `useScrollDirection` (`src/hooks/useScrollDirection.ts`) : `requestAnimationFrame` + passive event listener + seuil de 8px anti-clignotement.
* Les transitions sont GPU-friendly (`transform` uniquement, 300ms ease-in-out).
* Le comportement desktop (lg+) est inchangé : les barres restent toujours visibles.

### Safe Area iOS

* Le viewport est configuré avec `viewport-fit=cover` (dans `app/layout.tsx`) pour activer les variables CSS `env(safe-area-inset-*)`.
* La Tapbar utilise `padding-bottom: max(4px, env(safe-area-inset-bottom))` pour ne jamais chevaucher la barre système iPhone.
* Sa hauteur est dynamique : `calc(58px + env(safe-area-inset-bottom, 0px))`.
* Le Header utilise `padding-top: max(0px, env(safe-area-inset-top))` pour l'encoche / Dynamic Island.

### Posts edge-to-edge sur mobile

* Sur mobile (< sm), les `PostCard` n'ont pas de border-radius, shadow ou bordures latérales.
* Un séparateur subtil `border-b border-gray-100` distingue les publications.
* Sur sm+ (tablette/desktop), le rendu "carte" (rounded-3xl, shadow, border) est préservé.
* Le conteneur `main` dans `MainLayout` est `px-0` sur mobile et `px-4`/`px-6` sur sm+/lg+.
* Le `PostComposer` et le `FlashFeed` ont leur propre padding horizontal (`px-3`) sur mobile.

### Sidebar droite universelle

* La `RightSidebar` est **toujours montée** dans `MainLayout`, quelle que soit la page.
* La prop `hideOnDesktop` (passée automatiquement quand `noRightSidebar={true}`) masque la colonne fixe desktop sans désactiver le tiroir mobile.
* Résultat : le bouton ☷ (LayoutGrid) du Header ouvre correctement la sidebar droite sur **toutes les pages**, y compris le profil, les espaces, les messages.

### Scroll horizontal

* Les rails horizontaux (`FlashFeed`, `GroupCarousel`, onglets `GroupsPage`) utilisent `touch-pan-x` pour améliorer le swipe au doigt sur mobile.
* Les éléments dans ces rails ont `shrink-0` pour rester sur une ligne.
* Les onglets de `GroupsPage` utilisent `flex-nowrap` pour permettre le scroll horizontal réel.

---

## 9. Mise en page Desktop & Laptops (1280px à 1535px)

* **Résolution des écrans compacts (1280x903 à 1417x903)** :
  - Sur le breakpoint `xl` (1280px à 1535px, typique des ordinateurs portables 13" à 15"), la sidebar droite est positionnée à `right-4` (16px du bord droit) et sa réservation d'espace dans `MainLayout` passe de 484px à **264px**.
  - La largeur maximale du feed central s'élargit jusqu'à **780px** (`xl:max-w-[780px]`).
  - Le composer de publication (`PostComposer`) et les cartes de publication (`PostCard`) disposent ainsi d'une largeur confortable de **714px à 780px** (au lieu de 478px à 615px précédemment), supprimant l'effet de tassement excessif.
* **Grands écrans (`2xl`, 1536px+)** :
  - La réservation de 484px et la marge droite aérée de 220px (`2xl:right-[220px]`) sont conservées pour les moniteurs larges de bureau.

---

## 10. Lightbox Immersive & Système de Réactions

### Visualisation Immersive des Médias (`PostMediaLightbox`)

* **Ouverture** : Clic direct sur une image d'une publication (image unique ou vignette dans une grille multi-images). L'image s'ouvre avec une animation fluide d'échelle et de fondu sur fond sombre immersif (`bg-black/95`).
* **Verrouillage du scroll** : Le défilement de la page arrière est automatiquement bloqué (`overflow: hidden` sur `body`).
* **Disposition Desktop (md/lg+)** :
  - **Panneau Commentaires à GAUCHE** (`w-[380px]` à `w-[440px]`, fond blanc, scrollable verticalement de manière autonome) : en-tête du post, texte, hashtags, résumé cliquable des réactions, boutons d'interaction, liste des commentaires avec réponses/likes/suppression/signalement, et barre de saisie sticky en bas (texte, pièces jointes, emojis).
  - **Image à DROITE (dominante)** : zone visuelle principale centrée, préservant son ratio (`object-contain`). Navigation clavier (flèches ← →, Échap) et boutons flottants si plusieurs images.
* **Disposition Mobile (< md)** :
  - Image plein écran centrée avec commandes supérieures discrètes (fermeture ✕, compteur d'images).
  - Barre d'action inférieure semi-transparente avec boutons Réagir, Commentaires et Partager.
  - Bouton Commentaires ouvrant un **Bottom Sheet** fluide coulissant vers le haut, permettant de consulter et saisir des commentaires sans quitter la photo.

### Système de Réactions & Agrégation Réelle

* **6 Réactions officielles Dughu** : `👍 J'aime`, `😍 J'adore`, `🤣 Haha`, `🤩 Wow`, `🥺 Triste`, `😤 Grrr`.
* **Sélecteur de Réactions (`ReactionPicker`)** :
  - Accessible au survol desktop et à l'appui long (long-press 380ms) sur mobile.
  - Micro-animations au survol (`scale-125`, infobulles).
  - Remplacement ou annulation instantanée d'une réaction au clic.
* **Optimistic UI & Compteurs Synchronisés** :
  - Mise à jour instantanée du compteur total, des compteurs par réaction et de l'état du bouton dans l'interface avant confirmation serveur.
  - Synchronisation sans rechargement de page via l'architecture Axios (`POST /api/reactions`).
  - Restauration de l'état précédent en cas d'échec réseau.
* **Agrégation Réelle (`LikesSummary`)** :
  - Affiche uniquement les réactions réellement attribuées au post (jusqu'à 3 icônes distinctes empilées).
* **Consultation des Personnes Ayant Réagi (`ReactionUsersModal`)** :
  - Clic sur le résumé des réactions ouvre une interface dédiée (modale sur desktop, Bottom Sheet sur mobile).
  - Onglets filtrables : `Toutes`, `👍`, `😍`, etc. avec décomptes précis.
  - Liste des utilisateurs avec photo, nom, username et badge de leur réaction.


> **Provenance des données** : la liste des personnes provient UNIQUEMENT de
> l'API Dughu — chargée à la demande à l'ouverture du modal via
> `GET /api/reactions?postId=X&userId=Y` (encapsule
> `GET /getPostReactions/{postId}/{userId}`), avec repli sur les données
> éventuellement embarquées dans le payload du post (`reactions` / `likes`
> extraites par `mapPost` → `reactionUsers`).
> Aucune liste ni réaction factice n'est jamais fabriquée : si l'API ne fournit
> pas le détail utilisateur, l'UI affiche les compteurs agrégés et l'utilisateur
> courant uniquement (avec message explicite dans le modal).
>
> **Détail de profil** : les items de l'endpoint dédié qui identifient un
> utilisateur sans préciser le type de réaction sont affichés comme « 👍 »
> (la valeur par défaut du système Dughu — `reaction=1`) ; un échec
> réseau-affiche « Impossible de charger la liste des réactions », distinct
> de l'absence honnête de données (« liste non disponible »).

---
## Module Akwaplay — Plateforme Vidéo

Le module Akwaplay (route `/akwaplay`) est découpé en 3 écrans, avec une
architecture **types → service frontend → routes BFF(`/api/akwa_*`) → endpoint Dughu**
réutilisant l'instance Axios cliente (`apiClient`) et le proxy serveur
(`X-AppApiToken` côté serveur uniquement, jamais exposé au navigateur).

### 1. Écran Accueil (grille de vidéos)
- Sidebar gauche : Profil, Points, Accueil, Capsules, Musiques libres, Tendances, Favoris.
- Barre de recherche `GET /akwa_akwa_video_search/{user_id}?query={query}`.
- Tabs de catégories dynamiques via `GET /akwa_getCategories` (« Tous » par défaut).
- Grille : `GET /akwa_getAllVideos/{user_id}?page=` ou
  `GET /akwa_getVideosByCategory/{category_id}/{user_id}?page=` selon l'onglet.
- Miniature + durée, titre, avatar + auteur, vues, date relative, pagination.
- Bouton « Publier » → modale `POST /akwa_store_video` (multipart : title,
  description, category_id, video, thumbnail, user_id, privacy ; `video_id`
  présent = édition).

### 2. Écran lecture vidéo
- Détails `GET /akwa_show_video?user_id=&video_id=` ; lecteur via
  `GET /akwa_video_stream/{video_id}`.
- Vue incrémentée au démarrage : `POST /akwa_incrementViews/{video_id}`.
- Progression sauvegardée toutes les X secondes / à la pause :
  `POST /akwa_saveProgress`.
- Actions : like/dislike `POST /akwa_toggleLike/{video_id}`, favoris
  `POST /akwa_toggleFavorite/{video_id}`, partage (natif / copie de lien),
  signalement (`GET /akwa_getReportReasons` puis `POST /akwa_reportVideo`).
- Commentaires : liste `GET /akwaFetchComments/{video_id}/{user_id}`,
  ajout `POST /akwaComment_store`, réponses lazy
  `GET /fetchCommentReplies/{comment_id}/{user_id}`, réponse
  `POST /akwaComment_replyComment`, like
  `POST /akwaComment_toggleLike`, suppression
  `DELETE /akwaDeleteComment/{comment_id}` /
  `DELETE /akwaDeleteReplyComment/{reply_comment_id}`.
- « Voir aussi » : `GET /akwa_trending?page=` ou
  `GET /akwa_getTrendingByCategory/{category_id}/{user_id}`.

### 3. Écran Profil — onglet « Mes Vidéos »
- Liste `GET /akwa_userVideos/{user_id}/{viewer_id}?page=` ; vignettes avec
  crayon (édition → modale préremplie + `POST /akwa_store_video` avec
  `video_id`) et poubelle (`DELETE /akwa_destroy/{video_id}` avec confirmation,
  retrait optimiste de la vignette).

### Flux technique
- `src/types/akwaplay/` : modèles (`AkwaVideo`, `AkwaCategory`, `AkwaComment`,
  `AkwaCommentReply`, `AkwaReportReason`, payloads & réponses paginées).
- `src/services/akwaplay/` :
  - `akwaplayVideo.service.ts` — vidéos (accueil, détail, CRUD, commentaires,
    favoris, abonnements, activités) avec helpers d'extraction défensifs
    (`extractDataArray`, `extractHasMore`) tolérant les formats imbriqués
    (`result.data`, `result.pagination`).
  - `akwaplayChannel.service.ts` — chaînes (liste, détail, CRUD, follow)
  - `akwaplayShort.service.ts` — shorts (liste, like/dislike, commentaires, vues)
  - `akwaplayMusique.service.ts` — musiques libres (liste/recherche, favoris,
    signalement, suppression)

### Fix critique — proxy compression & décodage (ERR_CONTENT_DECODING_FAILED)

L'API Dughu amont (Cloudflare) renvoie les flux compressés en Brotli (`Content-Encoding: br`).
Node.js décompressant automatiquement le corps de réponse en texte brut, la copie aveugle des
en-têtes amont dans la fabrique BFF `akwa-proxy.ts` et `dughu/[...path]/route.ts` provoquait une
erreur `net::ERR_CONTENT_DECODING_FAILED` dans le navigateur. Les en-têtes `content-encoding`,
`content-length` et `transfer-encoding` sont désormais purgés systématiquement après décompression.

### Stabilisation de l'état de chargement accueil (`useAkwaHomeVideos`)

L'identifiant utilisateur est stabilisé (`effectiveUserId`) pour éviter le rechargement parasite provoqué par la résolution différée de `useAuth()`. Lors de l'annulation d'une requête précédente par `AbortController`, le bloc `finally` ne désactive plus prématurément `loading`, éliminant ainsi le flash transitoire du message « Aucune vidéo trouvée » avant l'arrivée des vidéos.

### Espace & Profil Akwaplay (`/akwaplay/profile`)

* La sidebar Akwaplay relie directement le menu « Profil » vers `/akwaplay/profile`.
* La page intègre l'ensemble des endpoints utilisateur :
  - **Mes vidéos** : `GET /akwa_userVideos/{user_id}/{viewer_id}?page={page}` avec suppression (`DELETE /akwa_destroy/{video_id}`) via une **vraie modale de confirmation personnalisée** (aperçu miniature, titre, avertissement d'action irréversible, bouton avec état de chargement et notification Sonner sans aucun confirm() natif), et publication (`POST /akwa_store_video`).
  - **Formulaire de création de vidéo (`AkwaPublishModal`)** :
    - `video` : sélection de fichier vidéo avec calcul automatique de la durée (`duration`, format string `mm:ss` requis par le backend).
    - `thumbnail` : **génération 100% automatique** d'une miniature JPEG 16:9 extraite directement de la vidéo via HTML5 Canvas (avec curseur temporel pour choisir précisément la frame désirée dans la vidéo).
    - `title` : titre de la vidéo (obligatoire).
    - `description` : description de la vidéo.
    - `category_id` : catégorie sélectionnée parmi les catégories actives Akwaplay.
    - `visibility` : sélecteur de visibilité (`public`, `unlisted`, `private`).
    - `chanel` / `channel_id` : sélection dynamique d'une chaîne Akwaplay appartenant à l'utilisateur (`GET /api/akwa_userChannels`) ou publication sous son profil personnel.
    - `user_id` : identifiant de l'utilisateur connecté.
    - Suivi de la progression du téléversement en pourcentage (`onUploadProgress`).
  - **Mes chaînes** : `GET /akwa_userChannels/{user_id}` avec création/mise à jour (`POST /akwa_channel_store` exigeant `user_id`, `name`, `channel_id`, `image` et `banner` : la modale propose en tête la sélection visuelle interactive de la bannière et de l'avatar avec prévisualisation immédiate, puis les champs d'informations nom, identifiant unique et description) et suppression (`DELETE /akwa_channel_destroy/{channel_id}`).
  - **Mes shorts (Capsules)** : `GET /user_shorts?page={page}&user_id={user_id}` affichés via `AkwaShortCard` avec vidéo d'arrière-plan, vues et redirection vers le lecteur plein écran.
  - **Mes activités** : `GET /akwa_get_user_activities?user_id={user_id}` (normalisation `AkwaUserActivity`, affichage de l'avatar utilisateur, texte d'action dynamique, date relative et bouton de redirection vers la vidéo concernée).
  - **Mes favoris** : `GET /akwa_getFavoritesVideos/{user_id}?page={page}`.
* **Module des Capsules / Shorts Akwaplay (`/akwaplay/shorts`)** :
  - **Grille verticale 9:16 interactive** : liste les capsules issues de `GET /short_fetchShorts/{user_id}?page={page}` avec fallback défensif utilisateur, normalisation du flux vidéo `file_path`, cartes `AkwaShortCard` épurées (titre, créateur, likes et survol animé, sans compteur de vues), pagination dynamique et bouton de création.
  - **Visionneuse plein écran 9:16 (`AkwaShortViewerModal`)** : lecture automatique en boucle avec contrôles vidéo (play/pause, mute/unmute), navigation fluide haut/bas au clavier ou au clic, vue comptabilisée (`POST /akwa_track_short_view`), interaction J'aime exclusive (sans bouton dislike) avec persistance du statut `isLiked` au rechargement (`POST /short_toggleLikeDislike`), partage de lien et suppression (`DELETE /short_destroy/{short_id}`).
  - **Volet latéral de commentaires** : récupération des commentaires réels (`GET /short_fetch_comments/{short_id}/{user_id}`), publication (`POST /short_store_comment`), réponses (`POST /short_reply_comment`), likes (`POST /toggleAkwaplayCommentLike`) et suppression (`DELETE /short_delete_comment/{id}`).
  - **Publication de Capsule (`AkwaShortCreateModal`)** : téléversement de fichier vidéo vertical (`POST /short_store`), prévisualisation vidéo, titre / légende et jauge de progression en pourcentage.
* L'onglet « Vidéos » du profil général (`/profile`) est synchronisé avec les vidéos Akwaplay de l'utilisateur via `getUserVideos(authorId, viewerId)`.

### Page de lecture vidéo type YouTube (`/akwaplay/watch?v={video_id}`)

* **Disposition 2 colonnes** :
  - **Colonne principale (gauche)** :
    - Lecteur vidéo HTML5 16:9 (`streamUrl` / `videoUrl`, `poster`), `onPlay` (incrémente `akwa_incrementViews`), suivi régulier de progression (`akwa_saveProgress`).
    - Métadonnées complètes : titre, vues, date, description repliable (`line-clamp-2` / dépliée).
    - Chaîne / auteur : affichage dynamique du créateur qui a publié la vidéo (via clé `uploader`), avatar, statut vérifié, abonnés et composant réutilisable standard `FollowButton` (`isFollowing`, `isLoading`, `onClick`).
    - Actions interactives optimistes : Like / Dislike (`POST /akwa_toggleLike/{video_id}`) avec isolation stricte des compteurs (le backend Dughu agrégeant l'ensemble des réactions dans la colonne `like_count`, le calcul défensif `Math.max(0, like_count - dislikes_count)` garantit qu'un dislike n'incrémente jamais le compteur de likes), affichage dédié des compteurs sur chaque bouton de la pilule (`likesCount` et `dislikesCount`), Favoris (`POST /akwa_toggleFavorite/{video_id}`), Partage de lien (`navigator.clipboard`), Signalement avec motifs réels (`GET /akwa_getReportReasons` et `POST /akwa_reportVideo`).
    - Section commentaires : ajout et modification de commentaire (`POST /akwaComment_store` avec `comment_id?`), liste paginée (`GET /akwaFetchComments/{video_id}/{user_id}`), réponses imbriquées (`POST /akwaComment_replyComment` avec extraction directe de `res.data.comment` pour affichage immédiat, et lazy-loading via `GET /fetchCommentReplies/{comment_id}/{user_id}` avec bouton d'ouverture dynamique `totalReplies`), like de commentaires (`POST /akwaComment_toggleLike`), et suppression (`DELETE /akwaDeleteComment` et `DELETE /akwaDeleteReplyComment`).
  - **Colonne de droite (Suggestions / À suivre)** :
    - Cartes vidéo compactes horizontales (`suggestions`) basées sur la même catégorie ou les tendances (`GET /akwa_getTrendingByCategory` ou `GET /akwa_trending`).
    - Au clic, chargement direct de la vidéo sélectionnée et défilement fluide vers le haut.
  - **Mode Drawer de la sidebar (`drawer={true}`)** : sur `/akwaplay/watch`, la sidebar gauche est masquée par défaut pour maximiser la largeur du lecteur et des commentaires sans superposition ; son ouverture via le menu burger s'affiche sous forme de tiroir superposé (`z-50`) avec un voile sombre d'arrière-plan (`bg-black/60`).

- `src/hooks/akwaplay/` : `useAkwaHomeVideos`, `useAkwaVideoPlayer`,
  `useAkwaVideoComments`, `useAkwaMyVideos` (+ chaînes) avec gestion propre des
  annulations de requêtes (`AbortController`, `ERR_CANCELED`).
- BFF : chaque endpoint Dughu `/akwa_*` est exposé via une route interne
  `/api/akwa_*` produite par la fabrique `src/lib/api/akwa-proxy.ts`
  (proxy qui préserve la méthode, le corps et le content-type).

### 4. Navigation Akwaplay (sidebar gauche)

La sidebar Akwaplay expose les destinations suivantes :

| Item | Route | Endpoint principal |
|---|---|---|
| Accueil | `/akwaplay` | `GET /akwa_getAllVideos/{user_id}` |
| Tendances | `/akwaplay/trending` | `GET /akwa_trending` |
| Shorts | `/akwaplay/shorts` | `GET /short_fetchShorts/{user_id}` |
| Musiques libres | `/akwaplay/musiques` | `GET /akwa_musiques?search` & `GET /akwa_musiques/user_favorites/{user_id}` |
| Favoris | `/akwaplay/favorites` | `GET /akwa_getFavoritesVideos/{user_id}` |
| Profil | `/profile` | — |
| Points | `/akwaplay/points` | `GET /pointsHistory/{user_id}/akwaplay` |

* **Module des Musiques Libres Akwaplay (`/akwaplay/musiques`)** :
  - **Liste & Recherche** : consommation de `GET /akwa_musiques?search={query}`, extraction robuste de `res.data.result.data`, normalisation des champs français du backend (`titre`, `artiste`, `duree`, `chemin_audio_url`).
  - **Favoris** : onglet dédié branché sur `GET /akwa_musiques/user_favorites/{user_id}`, bascule de favoris avec `POST /akwa_musiques/toggle_favoris` (`musique_id`, `user_id`).
  - **Lecteur audio intégré** : lecture HTML5 en direct, barre de lecture globale flottante avec curseur de progression, volume/muet et durée formatée.
  - **Création & Ajout (`AkwaMusiqueCreateModal`)** : téléversement audio MP3/WAV multipart via `POST /akwa_musiques/store` avec titre, artiste, genre et pochette optionnelle.
  - **Suppression** : `DELETE /akwa_musiques/delete/{music_id}` avec confirmation.

* **Module des Points Akwaplay (`/akwaplay/points`)** :
  - Accès via l'item « Points » de la **sidebar gauche Akwaplay** (état actif sur la page courante, fermeture du menu mobile après navigation).
  - **Historique des points obtenus uniquement sur Akwaplay** : endpoint Dughu `GET /pointsHistory/{user_id}/akwaplay` (segment de chemin dédié à la source), encapsulé par la route BFF `GET /api/pointsHistory?source=akwaplay` (instance Axios serveur, token `X-AppApiToken` jamais exposé, repli sur le cookie de session).
  - **Tableau** aux colonnes **Date · Type · Description · Points** (`AkwaplayPointsTable`, thème sombre) : badge vert « Gain » / rouge « Perte », montant signé au format français, date locale `fr-FR`.
  - **États** : squelettes de chargement, erreur (message + « Réessayer ») et état vide (aucun point) gérés ; `userId` résolu depuis la session (`dughu.userId`, replis `dughuUserId` puis `id`).
  - Architecture : composant → hook TanStack `usePointsHistory({ userId, source })` → service frontend `fetchPointsHistory` (Axios cliente) → route `/api/pointsHistory` → service serveur → instance Axios serveur ; normalisation défensive réutilisée (`points.mapper.ts`).

### 5. Endpoints Akwaplay — couverture complète

Tous les endpoints listés dans la spécification Postman sont couverts par des
routes BFF dans `src/app/api/` via `createAkwaProxyRoute` :

**Vidéos** : `getAllVideos`, `getCategories`, `getVideosByCategory`,
`userVideos`, `getFavoritesVideos`, `trending`, `getTrendingByCategory`,
`followingVideos`, `video_stream`, `incrementViews`, `saveProgress`,
`akwa_video_search`, `show_video`, `store_video`, `toggleLike`,
`toggleFavorite`, `getReportReasons`, `reportVideo`, `akwa_destroy`.

**Commentaires vidéo** : `akwaFetchComments`, `fetchCommentReplies`,
`akwaComment_store`, `akwaComment_replyComment`, `akwaComment_toggleLike`,
`akwaDeleteComment`, `akwaDeleteReplyComment`.

**Chaînes** : `akwa_userChannels`, `akwa_channel_show`, `akwa_channel_store`,
`akwa_channel_toggleFollow`, `akwa_channel_destroy`, `user_akwaplay`.

**Shorts** : `short_fetchShorts`, `user_shorts`, `short_store`,
`short_toggleLikeDislike`, `short_destroy`, `short_fetch_comments`,
`short_store_comment`, `short_reply_comment`, `short_delete_comment`,
`short_delete_reply_comment`, `akwa_track_short_view`,
`toggleAkwaplayCommentLike`.

**Musiques** : `akwa_musiques` (recherche), `user_favorites`, `store`,
`toggle_favoris`, `report_musique`, `delete/[music_id]`, `update/[music_id]`.

### Fix critique — chargement des vidéos

Le hook `useAkwaHomeVideos` bloquait le chargement quand `userId` était une
chaîne vide (`""`). La garde a été renforcée pour attendre que l'userId soit
non-vide avant de déclencher les requêtes API.



