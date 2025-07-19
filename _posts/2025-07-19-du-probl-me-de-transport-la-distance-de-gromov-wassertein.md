---
title: Du problème de transport à la distance de Gromov-Wassertein
show: 'false'
author: chems
layout: old_internet
logo: Perso_Chems.png
---
## Du problème de transport à la distance de Gromov-Wassertein

Bon ça fait quelques jours que j’ai un rythme de vie assez minable, je me dis que j’irai lire puis dormir aux alentours de 23h et au final je me perds sur internet jusqu’à 2 voire 3h du matin, moment auquel je m’endors naturellement d’épuisement. Le matin je me réveille aux alentours de 7h30 puis je rentre dans un cycle où je m’endors, chaque fois le temps d’un rêve, me réveille puis recommence le processus jusqu’à ce que je sois vraiment obligé de me lever pour me rendre à un rendez-vous ou pour me mettre à travailler si je souhaite faire quelque chose de ma matinée.

Cette fois-ci, au lieu de 

Dire conservation de la masse

## Mesure

En reprenant l’analogie des tas de sable, il nous faut trouver une manière de représenter ces distribution, de sable. Ceci se fera à partir de la notion de mesure que l’on peut voir comme une distribution de poids réparti sur l’espace considéré. 

Dans le cas d’une distribution discrète (c’est à dire prenant un nombre fini, raisonnable de valeurs) on considèrera des mesures de la forme 

→ somme de diracs, où … défini une masse de dirac …

Dans le cas plus général notre tas de sable sera représenté comme une densité … définie par rapport à la mesure de Lebesgue et vérifiant la relation …

A noter que la mesure ne se traduit qu’à travers l’intégrale d’une fonction par cette même mesure, sur un sous-ensemble de l’espace de définition.

Tout comme une densité de probabilité est une mesure, elle n’est sondée qu’à travers une intégrale recouvrant un sous ensemble de l’espace des issues pour y assigner une valeur que l’on interprète comme probabilité.

## Formulation de Monge

Une formulation très simple du problème est d’imaginer un certain nombre n de tas de sable chacun ayant une quantité ai de sable et un même nombre m = n de trous pouvant contenir chacun une quantité bj de sable. Et pour chaque couple de trous et de tas sable, on associe un coefficient c(i,j) qui représente le coût de transportation du tas de sable i jusqu’au trou j. Le but est de trouver la meilleure manière de boucher tous les trous and déplaçant chaque tas de sable vers un des trous i.e le meilleur plan de transport de la distribution des tas de sables vers la distribution des trous (vus comme des mesures)

On peut formuler ceci de la manière suivante : 

Trouver une solution à ce problème est équivalent à trouver une permutation des n tas de sables telle que : …

Ce problème est communément appelé problème d’assignement

En généralisant le problème d’assignement à des mesures discrètes quelquconques alpha et beta telles que :…

On tombe sur ce qu’on appelle le problème de Monge pour mesures discrètes et on peut formaliser le problème en …

Où T : … est tel que …. et traduit nos plans de transport (la manière qu’on choisit de déplacer la première mesure vers la seconde)

En généralisant à des mesures arbitraire pour notre distribution de départ et d’arrivée

De manière plus générale on écrira pour deux mesures arbitraire… (mettre l’hypothèse de conservation de la masse)

Avec cette formulation, on peut se heurter à deux problèmes : 

Premièrement, on a implicitement exclus les cas n>m. 

Deuxièmement, 

## Formulation de Kantorovich

Une solution à nos problèmes précédement évoquée est de s’autoriser à envoyer une certaine quantité de masse présente à un point de l’espace, vers plusieurs points différents. C’est l’idée derrière la méthode de Kantorovich. Cette fois ci, nous n’utiliserons plus un objet qui pour chaque point de l’espace de départ spécifie un seul point de l’espace d’arrivée mais plutôt ce qu’on appelle un “coupling” qui encode une manière de déplacer la masse de chaque point de l’espace de départ vers un ou plusieurs points de l’espace d’arrivée. 

Dans le cas discret on peut simplement encoder ce mapping dans une matrice P dans laquelle chaque entrée Pij spécifie la proportion de masse envoyée du point i au point j. Par construction il nous faut P1m = a et PT1m = b.

Si on encode le cout de chaque déplacement dans une matrice C, le problème de transport sous le prisme de Kantorovich s’écrit :

(lire :…)

Etendu à des mesures arbitraires, on défini pi := … une distribution jointe entre la mesure de départ et d’arrivée, c’est une mesure qui encode nos plans de transports. On défini l’ensemble des pi admissible vérifiant la conservation de la masse par 

La formulation de Kantorovich s’écrit : …

## Distance de Wasserstein

La théorie du transport optimal permet de poser un cadre quant à la recherche de la transformation d’une mesure à une autre qui minimise un certain coût. On peu alors naturellement se demander si on peut quantifier à quel point une certaine mesure est différente d’une autre en utilisant les outils que l’on vient d’évoquer. Il est clair que cette quantification sera dépendante du coût associé au transport. C’est ceci que réalise la distance de Wasserstein, pour deux distribution. 

En supposant que c(x,y) = ….

La p-distance de Wasserstein est définie comme

et définie une distance entre deux mesures définies sur le même espace métrique, que l’on appelle distance de Wasserstein.

## Distance de Gromov-Wassertstein
