---
title: Apanian Quoicoubeh
show: 'true'
author: mattheo
subtitle: Les astuces dans les preuves en maths
layout: minimal
logo: Perso_Mattheo.png
---

### 1. coucou

Coucou tout le monde, merci de m'accueillir sur votre chouette blog. Je m'appelle Mattheo, je suis un pote à Chems de Lausanne, en troisième année de licence de maths. L'IA a uniquement été utilisée pour corriger les fautes d'ortographe et pour le formattage en LaTeX.

### 2. Les preuves en maths

Quand on veut prouver quelque chose en maths, quelque chose qui n'est pas juste une vérification d'une définition, ou d'un calcul élémentaire, il faut souvent trouver une idée, ou du moins essayer de vraiment comprendre le problème, pour aboutir à une preuve. On regarde quelques exemples, des cas plus simples, et on essaie de comprendre pourquoi le résultat est vrai, quels sont les mécanismes qui font qu'il est vrai, avant d'oser se lancer dans une preuve. Ou en tout cas, c'est la "philosophie" générale derrière la résolution de problèmes.

Pour être plus explicite, regardons quelques exemples.

- Pour commencer avec un non exemple, soient $f, g:\mathbb R\to \mathbb R$, définies par $f(x) = x^2$, $g(x) = 2x$ pour tout $x$ dans $\mathbb R$. On veut montrer que $f + g$ est continue. Pour cela, il suffit de dire qu'une somme de fonctions continues est continue. Donc c'est juste l'application directe d'une propriété, il n'y a pas vraiment de difficulté, ou de réflexion (sans vouloir dire que ceux qui n'y arrivent pas ne réfléchissent pas ou quoique ce soit).

- Soient $a,b,c \in \mathbb N$, supposons que $a$ divise $bc$, et que $a$ et $b$ soient premiers entre eux. Alors, $a$ divise $c$. Je crois que ce résultat s'appelle le lemme de Gauss, mais ce n'est pas important. On est assez d'accord que ce résultat n'est pas évident comme le précédent. Il faut écrire quelque chose. Donc il faut essayer de faire des exemples, et comprendre pourquoi c'est vrai.

  Prenons $a = 4$, $bc = 20$. Pour choisir $b$, on doit imposer $(a,b) = 1$ (j'utilise cette notation pour le pgcd), donc par exemple $b=5$. Ceci impose $c = 4.$ Et on voit que ça marche. En faisant d'autres exemples, on peut un peu comprendre que le résultat marche, justement car l'hypothèse $(a,b) = 1$ impose le fait que si $a$ divise $bc$, alors $c$ doit "contenir toute la divisibilité de $bc$ par $a$". Et là, il est naturel de regarder la décomposition en facteurs premiers.

  Un exemple de preuve. Comme $a$ divise $bc$, on peut écrire $bc=ak$ pour un entier $k$, si bien que par unicité de la décomposition en facteurs premiers, tous les facteurs premiers de $a$ apparaissent dans les facteurs premiers de $bc$. Puisque $(a,b)=1$, $a$ et $b$ n'ont aucun facteur premier en commun. Par conséquent, l'ensemble des facteurs premiers de $a$ (avec les puissances) est inclus dans l'ensemble des facteurs premiers de $c$, donc $a$ divise $b$.

Bon, tout ça pour introduire ce que je veux dire. Ici, j'ai donné des exemples de résultats de première année, mais quand on avance dans nos études, on monte dans l'abstraction et les idées devienennt plus sophistiquées. Je catégorise les preuves (à mon niveau, c'est-à-dire la troisième année à la fac) de la manière suivante (et j'en ai sûrement oublié):

- Les preuves de vérification. Par exemple, soient $M, N$ et $P$ des variétés lisses, et $f:M\to N$, $g : N\to P$ des fonctions lisses. Montrer que $g\circ f :M \to P$ est lisse. Il y aura peut-être des parties où il faudra faire attention aux ouverts que l'on considère, faire attention que l'on choisit de bonnes cartes, mais en fin de compte, il faut juste vérifier une définition.

- Les preuves d'application, où le résultat découle d'un argument dont la clef est un résultat du cours. Par exemple, montrer que $S^1\subset \mathbb R^2$ muni de la topologie de sous-espace ne peut pas être homéomorphe à un ouvert de $\mathbb R$. On procède par l'absurde. $S^1$ est compact dans $\mathbb R^2$, donc son image $U$ est aussi compacte, et en particulier fermée dans $\mathbb R$ car ce dernier est Hausdorff. Or, $\mathbb R$ est connexe, et les ouverts fermés d'un espace topologique $X$ sont exactement $X$ et $\emptyset$. Donc $U = \mathbb R$, absurde car $\mathbb R$ n'est pas borné.

- Les preuves par "chatte". Des fois, il arrive que quand on ne sait pas quoi faire, on essaie des choses au pif et par chance de fou ca marche. Par exemple, le classique "quand on ne sait pas quoi faire, on dérive".

- Les preuves que j'appelle "classiques", c'est-à-dire qu'au premier abord, on n'a pas vraiment d'idée de pourquoi le résultat fait sens, donc on regarde des exemples, etc... (comme dit précédemment). Par exemple, soient $M$ une variété lisse, $\mathcal{U, V}$ deux recouvrements ouverts de $M$. Supposons que $\mathcal{V}$ soit un raffinement de $\mathcal U$. Montrer que toute partition de l'unité subordonnée à $\mathcal U$ induit une partition de l'unité subordonnée à $\mathcal V$. C'est le genre de preuves que j'aime, car tout ce que j'ai à faire, c'est m'allonger, fermer mes yeux et imaginer. (input dessin).

- Les preuves qui utilisent une astuce. Dans le mot astuce, je veux parler de deux choses. D'une part, les astuces au sens propre, i.e. les trucs de malade dont on se dit "ok super, c'est vraiment juste un truc sorti de petaouchnok". Le deuxième type d'astuce, c'est quelque chose comme, définir un objet un peu chelou mais choisi de manière hyper astucieuse, considérer une relation très bien choisie (mais vraiment pas évidente) qui simplifie le problème, regarder une fonction bien posée, mais c'est pas un truc trop trop trop wtf. C'est un peu étrange et inhabituel, mais on ne se dit pas "ok le reste de la preuve je ne la lis plus car ça n'a plus de sens maintenant".

J'aimerais préciser que ces catégories ne sont pas disjointes. Je dirais même qu'une grande majorité des preuves sont un mélange de classique et d'application (et d'autres que j'ai sûrement oubliés), et c'est évident, mais je voulais un peu décomposer les différentes parties de ces preuves.

### 3. Sur les "tricks"

Faisons deux exemples pour la dernière catégorie. Pour la première sous-catégorie, prenons le théorème suivant, connu sous le nom du "*Noether Normalization Theorem*" :

**Theorem 3.1.** *Let $k$ be a field, and let*

$$A\cong k[x_1,\dots,x_n]/ I$$

*be a finitely generated $k$-algebra. Then there exists an integer $d\geq 0$ and elements $y_1,\dots,y_d$ algebraically independent over $k$ such that*

$$k[y_1,\dots,y_d]\subset A$$

*is a finite ring extension.*

<figure>
  <img src="{{site.baseurl}}/assets/img/astuce-merde.jpg" alt="Une astuce de merde" width="90%">
  <figcaption>Figure 1 : Une astuce de "merde"</figcaption>
</figure>

La figure 2 est un exemple d'astuce de merde. C'est une relation algébrique immonde, et pour y penser, et bah on n'y pense pas. C'est marrant car toutes les preuves de ce théorème s'appuient sur cette astuce, donc on est vraiment mal barrés. C'est ça que je déteste.

Pour un exemple de la deuxième sous-catégorie, celles des astuces qui ne sont pas immondes, on pourrait prendre le calcul de la fameuse intégrale de Gauss

$$I \mathrel{\vcenter{:}}= \int_{-\infty}^{+\infty}e^{-x^2}dx.$$

Une méthode classique pour trouver la valeur de $I$, c'est de plutôt étudier $I^2$, d'utiliser Fubini, et les coordonnées polaires pour obtenir un calcul relativement simple. Par ailleurs, c'est justement de là que vient la racine dans $I = \sqrt\pi$, c'est car on a pris $I^2$. Bon, ici c'est un exemple de calcul, voyons peut être un exemple qui illustre mieux mon propos.

**Lemma 3.2** (Goursat)**.** *Soit $U\subset \mathbb C$ un domaine, et $Q$ un carré dans $U$. Soit $f:U\to \mathbb C$ holomorphe sur $U$. Alors,*

$$\int_{\partial Q}f(z)dz=0.$$

La preuve est, pour reprendre les mots de mon professeur Joachim Krieger (incroyable prof, incroyable cours) un peu magique quand on la regarde pour la première fois.

<figure>
  <img src="{{site.baseurl}}/assets/img/goursat.jpg" alt="Preuve du lemme de Goursat" width="80%">
  <figcaption>Figure 2 : Preuve du lemme de Goursat</figcaption>
</figure>

On découpe le carré en des sous-carrés qu'on redivise en sous-carrés... C'est indéniablement hyper astucieux, et on est plutôt d'accord qu'un étudiant dans un cours d'analyse complexe ne penserait jamais à faire ça (si c'est la première fois qu'il le voit). Le manque de sommeil me fait oublier les exemples que j'avais en tête, mais je penserai à faire des modifications si elles me reviennent à l'esprit.

J'arrive enfin à ce que je voulais dire, c'est que mon avis sur les astuces a pas mal changé ces dernières semaines. Don't get me wrong, je déteste toujours les astuces de gros connard comme dans la Noether Normalization. Mais pour les autres, celles qui sont justes ingénieuses, je les apprécie beaucoup plus. Je pense qu'avant, je les détestais aussi, car je n'en trouvais aucune, et car je pensais qu'elle sortaient de nulle part. Mais avec le temps, j'ai compris que ces choses-là sont une partie intégrante des preuves en maths.

Penser à ces astuces, c'est le fruit de son intuition, qui est elle-même forgée et développée en faisant beaucoup de maths. Je pense que je mettais aussi les personnes qui trouvaient ces astuces sur un piédestal, car je pensais que je n'arriverais jamais à trouver tout ça moi-même.

J'ai compris que si l'on veut étudier les mathématiques, il faut accepter qu'on doit apprendre des nouvelles choses, notamment des techniques. Je restais trop dans ce mindset con de "moi j'aime que les preuves qui sont le résultat d'une bonne compréhension du problème". Je refusais les astuces. Ou plutôt, je les voyais vraiment trop comme des "tricks", pas des vrais arguments. C'est comme si je refusais d'apprendre la preuve par l'absurde. Évidemment, j'abuse beaucoup trop, mais je pense que vous comprenez.

J'ai commencé à m'ouvrir aux astuces quand j'ai compris que c'était un peu nécessaire pour progresser, et que ces astuces n'étaient pas vraiment des tricks de con, et qu'il y avait souvent une heuristique qui leur donnait sens. Aujourd'hui, je pense apprécier de plus en plus ces astuces, notamment car j'en trouve, mais car j'apprécie ce truc de "ça me fait penser à un truc que j'ai déjà vu, je vais essayer de poser ce truc", et ça me montre que je gagne en maturité. Notre cerveau fait des choses sans qu'on lui demande, c'est sympa! Je vois plus les astuces comme des choses "invisibles" aux non-initiés, mais naturelles à l'habitué du domaine. Pour se donner un exemple simple, un étudiant plus âgé a immédiatement le réflexe de voir l'écriture

$$\dfrac{x}{x-1} = \dfrac{x-1+1}{x-1} = 1 + \dfrac{1}{x-1},$$

qui paraît un peu sortie de nulle part pour un débutant. Et pourtant, tout le monde sait faire ça après la première année, j'irai même jusqu'à dire que ne pas connaître cette "astuce" est rare.

Je pense que le changement a eu lieu quand avec mon pote Urgjen, on essayait de prouver que si $M/L, L/K$ sont des extensions de corps séparables, alors $M/K$ est aussi séparable. De nulle part, je pense à poser un ppcm de polynômes, un truc qu'on avait jamais vu avant, mais mon humble expérience en théorie analytique des nombres m'a sûrement chuchoté à l'oreille. Après quelques autres petits arguments, on a pu prouver le résultat, mais toujours sous cette grande surprise. Je ne sais pas si c'est une preuve standard, mais j'en suis très fier.

Peut être qu'un jour j'accepterai aussi les astuces comme celles dans la Noether Normalization, mais c'est pas pour demain.