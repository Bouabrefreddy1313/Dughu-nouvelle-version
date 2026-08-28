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
* « Gestion des relations » ouvre la page dédiée `/profile/relations`. Les autres
  rubriques, y compris « Paramètres », affichent actuellement une information
  claire indiquant leur disponibilité prochaine. L'accès « Paramètres » de ce
  menu est distinct de la modification du profil et ne redirige donc pas vers
  `/profile/settings`.
* La modale peut être parcourue au clavier, fermée avec son bouton de fermeture ou
  avec les mécanismes standards de dialogue, et reste contenue dans la hauteur de
  l'écran sur mobile.

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
  de la refuser, soit de l'accepter.
* Une demande acceptée affiche « Fraternisé » ou « Réseauté ». Un nouveau clic
  demande confirmation avant la suppression de la relation.
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

### Publications

* Création
* Modification
* Suppression
* Confidentialité des publications (niveaux : Public, Abonnés, Réseau, Amis)
  * Chaque niveau possède une icône distincte sur le badge du post et dans le
    sélecteur du compositeur : Public = globe, Abonnés = abonnement (RSS),
    Réseau = réseau (nœuds), Amis = amis validés (utilisateur + coche).
* Likes
* Commentaires
* Republications
* Médias
* Partage

#### Mini-profil (sidebar droite)

* La carte « mini-profil » de la sidebar droite affiche le solde **total** de points de
  l'utilisateur connecté, chargé via `GET /pointsToday/{userId}` (API Dughu) à travers
  la route interne `/api/pointsToday/[userId]` (champ `total` de la réponse).

#### Menu d'action « 3 points » d'une publication

* Sauvegarder un post (endpoint `store-save`) : enregistre/retire le post des favoris.
* Bloquer l'auteur d'un post (endpoint `block_user`) : bloque (ou débloque) l'auteur ;
  les publications de l'utilisateur bloqué sont retirées du fil. Le libellé du menu
  bascule entre « Bloquer » et « Débloquer » selon l'état local de la session.
* Donner des points à l'auteur d'un post (endpoint `points/give`) : une modale permet
  de saisir le nombre de points à offrir. `user_id` = l'auteur du post,
  `user_offer_id` = l'utilisateur connecté, `points` = montant saisi, `post_id` = la publication.
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
* Si l'API ne fournit pas de vignette pour une vidéo, la première image de la
  vidéo (première frame) est utilisée comme vignette.
* Un flash image affiche son image ; un flash en texte coloré affiche le fond
  coloré avec le texte.
* La photo de profil n'est utilisée en fond de carte que lorsqu'aucun média
  (image, vidéo ou vignette) ni texte coloré n'est disponible pour la story.

### Communication

* Messages
* Conversations
* Notifications

### Recherche

* Recherche d'utilisateurs
* Recherche de contenus
* Recherche selon les fonctionnalités disponibles

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
