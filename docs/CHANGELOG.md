# DUGHU — Journal des modifications

Ce fichier conserve l'historique des évolutions importantes du projet.

## Format

Chaque entrée doit contenir :

* date ;
* fonctionnalité ;
* modifications principales ;
* éventuelles corrections importantes.

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
