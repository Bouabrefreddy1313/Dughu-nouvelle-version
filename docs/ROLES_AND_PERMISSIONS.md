# DUGHU — Roles and Permissions

## Objectif

Définir les droits des différents types d'utilisateurs.

## Utilisateur

Peut effectuer les actions autorisées par son compte.

## Modérateur

Peut disposer de permissions supplémentaires liées à la modération selon les règles du backend.

## Administrateur

Dispose des permissions d'administration définies par le système.

## Principe

Le frontend peut masquer une fonctionnalité mais ne constitue jamais une protection.

Exemple :

```tsx
{user.isAdmin && <AdminButton />}
```

Cela ne remplace pas une vérification serveur.

## Permissions

Chaque action sensible doit être vérifiée côté serveur.

## Règle

Ne jamais attribuer une permission simplement parce qu'elle est nécessaire pour faire fonctionner rapidement une interface.
