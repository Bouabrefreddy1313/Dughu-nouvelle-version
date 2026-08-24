# DUGHU — Business Rules

## Objectif

Ce document décrit le comportement fonctionnel de Dughu.

Les règles métier ne doivent pas être déterminées uniquement à partir de l'interface.

## Utilisateurs

Un utilisateur doit disposer des droits nécessaires pour effectuer une action.

## Publications

Un utilisateur peut créer une publication lorsqu'il est authentifié.

Un utilisateur ne peut modifier ou supprimer que les publications pour lesquelles il possède les droits nécessaires.

## Commentaires

Un utilisateur authentifié peut commenter lorsqu'il dispose des permissions nécessaires.

La suppression d'un commentaire doit respecter les règles de propriété et de modération.

## Likes

Un utilisateur ne doit pas pouvoir créer plusieurs likes identiques sur la même publication si le système prévoit un seul like par utilisateur.

## Stories

Une story possède une durée de vie définie par les règles du produit.

Une story expirée ne doit plus être présentée comme une story active.

## Messages

Un utilisateur ne peut accéder qu'aux conversations auxquelles il a accès.

## Notifications

Une notification doit être créée uniquement lorsqu'un événement correspondant aux règles métier se produit.

## Blocage

Un utilisateur bloqué ne doit pas pouvoir interagir avec l'utilisateur qui l'a bloqué lorsque les règles du produit l'interdisent.

## Règle générale

Les règles métier doivent être appliquées côté serveur.

Le frontend ne doit jamais être considéré comme une protection suffisante.
