# DUGHU — Accessibility Guidelines

## Objectif

Rendre Dughu utilisable par le plus grand nombre.

## Règles

Utiliser les éléments HTML adaptés à leur fonction.

Privilégier :

* `button` pour les actions ;
* `a` pour les liens ;
* labels pour les champs ;
* textes alternatifs pour les images importantes.

## Icônes

Une icône qui représente seule une action doit posséder un nom accessible.

Exemple :

```tsx
aria-label="Ouvrir les notifications"
```

## Clavier

Les éléments interactifs importants doivent être utilisables au clavier.

## Focus

Ne pas supprimer inutilement les indicateurs de focus.

## Contraste

Maintenir un contraste suffisant entre le texte et son arrière-plan.

## Mobile

Les zones interactives doivent être suffisamment grandes pour une utilisation tactile.

## Règle

L'accessibilité doit être prise en compte lors de la création d'un nouveau composant et non ajoutée uniquement à la fin.
