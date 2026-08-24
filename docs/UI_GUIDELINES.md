# DUGHU — UI / UX Guidelines

## 1. Identité

Dughu est un réseau social moderne avec une identité visuelle africaine, chaleureuse et originale.

L'interface doit être inspirée de bonnes pratiques modernes sans copier l'apparence exacte de Facebook ou d'un autre réseau social.

---

# 2. Couleurs

Palette principale Dughu :

```text
Primary Dark:  #4E2A14
Primary:       #6B3F1D
Primary Light: #8B5A2B
White:         #FFFFFF
```

Utiliser ces couleurs de manière cohérente.

Éviter l'utilisation du violet comme couleur dominante.

---

# 3. Design

Privilégier :

* interfaces propres ;
* cartes modernes ;
* coins légèrement arrondis ;
* espacements cohérents ;
* hiérarchie visuelle claire ;
* animations discrètes ;
* transitions fluides.

Éviter :

* interfaces surchargées ;
* effets excessifs ;
* ombres trop fortes ;
* couleurs incohérentes ;
* animations inutiles.

---

# 4. Cards

Les cards doivent conserver une cohérence visuelle.

Elles doivent avoir :

* padding cohérent ;
* bordure ou ombre légère lorsque nécessaire ;
* radius cohérent ;
* contenu correctement espacé.

Ne pas créer un style de card différent pour chaque fonctionnalité sans justification.

---

# 5. Boutons

Les boutons doivent avoir :

* état normal ;
* état hover ;
* état active ;
* état disabled ;
* état loading lorsque nécessaire.

Les boutons principaux doivent utiliser la couleur principale Dughu.

---

# 6. Icônes

Utiliser une bibliothèque d'icônes cohérente dans tout le projet.

Éviter de mélanger plusieurs styles d'icônes sans nécessité.

Les icônes doivent être compréhensibles et correctement dimensionnées.

---

# 7. Typographie

Maintenir une hiérarchie claire :

```text
Titre principal
Titre secondaire
Sous-titre
Texte
Texte secondaire
```

Éviter trop de tailles différentes.

Les textes importants doivent être immédiatement identifiables.

---

# 8. Espacements

Utiliser les espacements Tailwind de manière cohérente.

Éviter les valeurs arbitraires répétées comme :

```tsx
mt-[13px]
ml-[17px]
gap-[11px]
```

lorsqu'une valeur Tailwind standard convient.

---

# 9. Animations

Les animations doivent améliorer l'expérience utilisateur.

Utiliser des animations pour :

* ouverture de menus ;
* notifications ;
* likes ;
* interactions ;
* transitions ;
* chargement.

Éviter les animations permanentes inutiles.

---

# 10. États UI

Les composants doivent prévoir lorsque nécessaire :

### Loading

Afficher un état de chargement cohérent.

### Empty

Afficher un message lorsque aucune donnée n'est disponible.

### Error

Afficher une information compréhensible à l'utilisateur.

### Disabled

Indiquer clairement qu'une action est indisponible.

---

# 11. Posts

Les publications doivent rester visuellement cohérentes dans la timeline.

Les éléments suivants doivent avoir une hiérarchie claire :

* auteur ;
* photo de profil ;
* date ;
* contenu ;
* image/vidéo ;
* actions ;
* likes ;
* commentaires ;
* republication.

---

# 12. Profil

Le profil doit avoir une identité visuelle forte tout en restant simple à utiliser.

Les informations importantes doivent être immédiatement accessibles.

---

# 13. Accessibilité

Lorsque possible :

* utiliser des boutons HTML réels ;
* ajouter des labels accessibles ;
* utiliser `aria-label` lorsque nécessaire ;
* conserver un contraste suffisant ;
* permettre la navigation clavier ;
* ne pas dépendre uniquement de la couleur pour transmettre une information.

---

# 14. Cohérence

Avant de créer un nouveau composant UI, rechercher s'il existe déjà un composant similaire.

Réutiliser les composants existants lorsque possible.

---

# 15. Règle finale

Toute nouvelle interface doit avoir l'impression d'appartenir naturellement à Dughu.

Elle doit être :

* moderne ;
* claire ;
* cohérente ;
* responsive ;
* accessible ;
* agréable ;
* identifiable comme Dughu.
