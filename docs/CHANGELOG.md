# DUGHU — Journal des modifications

Ce fichier conserve l'historique des évolutions importantes du projet.

## Format

Chaque entrée doit contenir :

* date ;
* fonctionnalité ;
* modifications principales ;
* éventuelles corrections importantes.

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
