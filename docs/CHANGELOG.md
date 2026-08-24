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
