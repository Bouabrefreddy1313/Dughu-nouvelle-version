PERFORMANCE_GUIDELINES.md# DUGHU — Performance Guidelines

## Objectif

Maintenir une application rapide et évolutive.

## Frontend

Éviter :

* composants inutilement lourds ;
* re-renders inutiles ;
* imports inutiles ;
* JavaScript client inutile ;
* appels API répétés.

## Images

Utiliser les mécanismes d'optimisation adaptés à Next.js.

Éviter de charger des images beaucoup plus grandes que leur affichage réel.

## Timeline

Prévoir lorsque nécessaire :

* pagination ;
* infinite scroll ;
* chargement progressif ;
* cache ;
* virtualisation pour les très grandes listes.

## API

Éviter les appels redondants.

Les données doivent être récupérées uniquement lorsque nécessaire.

## Médias

Les vidéos et images doivent être chargées progressivement lorsque cela améliore les performances.

## Règle

Ne pas effectuer une optimisation complexe sans mesurer ou identifier un problème réel.
