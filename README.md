# THE BEST BLOG EVER

Blog collectif (Chemslepro, 3vasily, Blueboy, Gary…) construit avec [Jekyll](https://jekyllrb.com/) et le thème minima, hébergé sur GitHub Pages.

## Lancer le site en local

```sh
bundle install
bundle exec jekyll serve
```

Le site est alors disponible sur http://localhost:4000.

## Organisation

| Dossier / fichier         | Contenu                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `_posts/`                 | Les articles (`AAAA-MM-JJ-titre.md`)                             |
| `_layouts/old_internet.html` | Layout des articles (fenêtre Windows 98 + commentaires Cusdis) |
| `_layouts/default.html`   | Layout de l'accueil et des pages (header + footer)               |
| `_includes/`              | `<head>`, header, footer, Google Analytics                       |
| `_data/music.yml`         | La « Music of the Week » affichée sur l'accueil                  |
| `assets/css/`             | Feuilles de style                                                |
| `assets/img/`, `assets/audio/` | Images et musiques utilisées dans les posts                 |
| `images/`                 | Logo, icônes de navigation et petits persos (`post-logos/`)      |

## Écrire un post

Créer `_posts/AAAA-MM-JJ-titre.md` (directement ou via [Prose.io](https://prose.io)) avec ce front matter :

```yaml
---
title: Titre du post
subtitle: Petite description affichée sur l'accueil
author: chems
layout: old_internet
logo: Perso_Chems.png   # Perso_Chems.png | Perso_Max.png | Perso_Noé.png | Perso_Cla.png
show: true              # false = caché de la liste (mais toujours accessible par l'URL)
---
```

Les images vont dans `assets/img/` et s'insèrent avec `![description](/assets/img/mon-image.jpg)`.
Pensez à redimensionner les photos (≈ 1600 px de large, en JPG) avant de les ajouter.

## Changer la Music of the Week

1. Ajouter le MP3 dans `assets/audio/` et la pochette dans `assets/img/`.
2. Modifier `_data/music.yml` (titre, artiste, `cover`, `audio`).
3. Supprimer l'ancien MP3 et l'ancienne pochette s'ils ne servent plus.

## Publier

```sh
git pull origin main      # récupérer les changements des autres
git add .
git commit -m "Décrire le changement"
git push origin main
```

En cas de conflit après le `pull` : ouvrir les fichiers concernés, garder la bonne version (supprimer les marqueurs `<<<<<<<`, `=======`, `>>>>>>>`), puis `git add .`, `git commit` et `git push`.
