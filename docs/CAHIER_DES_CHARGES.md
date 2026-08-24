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

#### Comportement de chargement et d'erreur du profil

* Un squelette de chargement (skeleton) s'affiche pendant le chargement du profil,
  y compris tant que l'utilisateur connecté n'a pas encore été récupéré
  (cas du profil personnel accessible via `/profile`).
* L'écran « Profil introuvable » n'apparaît que lorsque le profil demandé
  n'existe réellement pas ou a quitté Dughu (erreur API / utilisateur absent).
* Aucune requête `/api/profile` n'est envoyée avec un identifiant vide.

### Publications

* Création
* Modification
* Suppression
* Likes
* Commentaires
* Republications
* Médias
* Partage

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
