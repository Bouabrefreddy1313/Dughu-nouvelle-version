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
* Confidentialité des publications (niveaux : Public, Abonnés, Réseau, Amis)
  * Chaque niveau possède une icône distincte sur le badge du post et dans le
    sélecteur du compositeur : Public = globe, Abonnés = abonnement (RSS),
    Réseau = réseau (nœuds), Amis = amis validés (utilisateur + coche).
* Likes
* Commentaires
* Republications
* Médias
* Partage
* Gratifier : bouton d’action rapide qui envoie **100 points** à l’auteur du post
  en un clic (endpoint `points/give`). Une modale de confirmation (« Voulez-vous
  vraiment offrir 100 points à … ? ») s’affiche avant l’envoi pour éviter les
  erreurs. Le bouton est masqué sur ses propres publications et un spinner de
  chargement apparaît dans la modale pendant l’envoi. Un menu « Donner des
  points » distinct (3 points → « Donner des points ») permet quant à lui de
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
