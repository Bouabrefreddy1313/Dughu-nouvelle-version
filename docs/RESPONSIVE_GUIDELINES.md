# DUGHU — Responsive Design Guidelines

## 1. Objectif

Tous les composants Dughu doivent fonctionner correctement sur :

* petits smartphones ;
* smartphones ;
* tablettes ;
* ordinateurs portables ;
* ordinateurs desktop ;
* grands écrans.

Le responsive est obligatoire pour chaque composant.

---

# 2. Breakpoints

Utiliser prioritairement les breakpoints Tailwind déjà présents dans le projet.

Référence :

* Mobile : moins de 768px
* Tablette : 768px à 1023px
* Desktop : 1024px à 1439px
* Grand écran : 1440px et plus

Ne pas créer inutilement de nouveaux breakpoints.

---

# 3. Mobile First

Privilégier une approche mobile-first.

Le style de base doit fonctionner sur mobile.

Puis utiliser les breakpoints pour enrichir progressivement l'interface :

```text
Mobile
↓
sm
↓
md
↓
lg
↓
xl
↓
2xl
```

---

# 4. Largeurs

Éviter les largeurs fixes inutiles.

Mauvais exemple :

```tsx
w-[900px]
```

Préférer lorsque cela est pertinent :

```tsx
w-full max-w-4xl
```

ou :

```tsx
w-full max-w-[900px]
```

---

# 5. Hauteurs

Éviter les hauteurs fixes importantes lorsqu'elles peuvent provoquer :

* coupure de contenu ;
* débordement ;
* problèmes sur mobile.

Privilégier :

```tsx
min-h
max-h
h-auto
```

lorsque cela est approprié.

---

# 6. Images et vidéos

Les images et vidéos doivent être responsives.

Éviter qu'elles dépassent leur conteneur.

Utiliser lorsque nécessaire :

```tsx
w-full
max-w-full
object-cover
```

ou :

```tsx
object-contain
```

selon le besoin.

---

# 7. Texte

Les textes longs ne doivent jamais provoquer de débordement horizontal.

Prévoir :

* retour à la ligne ;
* troncature lorsque nécessaire ;
* adaptation des tailles ;
* gestion des noms longs ;
* gestion des URLs longues.

---

# 8. Layout Dughu

## Desktop

```text
Header

Sidebar gauche | Timeline principale | Sidebar droite
```

## Tablette

```text
Header

Sidebar réduite | Timeline principale
```

## Mobile

```text
Header

Timeline principale

Navigation mobile
```

La sidebar droite peut être masquée ou déplacée selon le contexte.

La sidebar gauche peut devenir un drawer/menu mobile.

---

# 9. Navigation mobile

La navigation mobile doit :

* rester accessible ;
* être adaptée au tactile ;
* ne pas recouvrir le contenu important ;
* rester cohérente avec le reste de Dughu.

---

# 10. Grilles

Les grilles doivent s'adapter automatiquement.

Exemple :

```tsx
grid-cols-1
md:grid-cols-2
lg:grid-cols-3
```

Adapter les colonnes selon le contenu réel.

---

# 11. Flexbox

Utiliser :

```tsx
flex
flex-col
sm:flex-row
```

lorsqu'un élément doit changer d'orientation selon l'écran.

---

# 12. Modales

Les modales doivent être utilisables sur mobile.

Elles ne doivent pas dépasser l'écran.

Prévoir lorsque nécessaire :

```tsx
w-[calc(100%-2rem)]
max-w-lg
max-h-[90vh]
overflow-y-auto
```

---

# 13. Dropdowns

Les menus déroulants doivent rester visibles et accessibles sur les petits écrans.

Éviter les positions absolues qui provoquent des éléments hors écran.

---

# 14. Touch

Les boutons et éléments interactifs doivent être suffisamment faciles à utiliser avec le doigt.

Éviter les zones de clic trop petites.

---

# 15. Aucun scroll horizontal

Un composant ne doit pas provoquer de scroll horizontal global.

Après chaque modification, rechercher les problèmes de :

* overflow ;
* largeur excessive ;
* éléments positionnés hors écran ;
* textes non cassables ;
* images trop grandes.

---

# 16. Tests responsive obligatoires

Après chaque modification importante, vérifier au minimum :

```text
320px
375px
390px
768px
1024px
1280px
1440px
1920px
```

---

# 17. Règle finale

Un composant n'est terminé que lorsqu'il fonctionne correctement sur mobile, tablette, desktop et grand écran.

Ne jamais considérer uniquement le desktop.
