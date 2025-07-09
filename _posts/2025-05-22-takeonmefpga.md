---
title: TakeOnMeFPGA
show: 'false'
layout: old_internet
logo: Perso_Chems.png
author: chems
---

## TakeOnMeFPGA

Je suis actuellement en train de travailler sur le devoir de mon cours de microcontrôleurs et ça m'a fait penser au petit projet qu'on avait dû réaliser le semestre dernier. 

Le but était, entre autres, de se familiariser avec les technologies **CPLD/FPGA** (en gros des [circuits logiques reprogrammables](https://fr.wikipedia.org/wiki/Circuit_logique_programmable))

Bref : Je m'étais pas mal amusé à implémenter un circuit qui jouait des musiques, seulement, **on ne disposait que d'un seul buzzer !** C'est à dire qu'on était restreints à produire une seule note à la fois sur un périphérique bon marché.
Donc pas vraiment les moyens de faire du Dolby Atmos.	

_J'ai néanmoins pensé à envoyer un signal analogique contenant plusieurs fréquences au buzzer mais ceci n'était pas possible_

Je pense que j'ai réussi à produire quelque chose de pas trop mal (comparé à ce qu'on trouve sur youtube comme musique produite avec 1 seul buzzer (nul))

**Voilà un extrait de Take On Me commandé par la FPGA Altera MAX 10 sur une carte DE10-Lite**



<video width="640" height="360" controls>
  <source src="/assets/img/TakeOnMe FPGA.mp4" type="video/mp4">
  Votre navigateur ne supporte pas la lecture de vidéos HTML5.
</video>


Et voilà la partition : 

00 00 00 00 00 00 00 00 00 00 00 00 00 00 1a 1a 
1a 1a 1a 1a 1a 1a 1a 1a 1a 1a 0e 0e 0e 0a 0a 0a 
0a 0a 0a 0a 0a 0a 0c 0c 0c 30 30 30 0c 30 0c 0c 
0c 30 30 30 0c 30 0c 0c 0c 30 30 30 0c 30 0c 0c 
0c 30 30 30 0c 30 

1f 1f 1b 18 0f 18 0c 1d 
11 1d 11 1d 21 21 22 24 22 16 22 1d 0a 1b 0a 1f 
0f 1f 13 1f 1d 1d 1f 1b 1f 1f 1b 18 0f 18 0c 1d 
11 1d 11 1d 21 21 22 24 22 16 22 1d 0a 1b 0a 1f 
0f 1f 13 1f 1d 1d 1f 1b 1b 1b 0c 1b 0c 1a 18 11 
18 18 0c 18 0c 18 11 11 1a 0e 0a 1a 0a 18 16 16 
1f 1f 0f 1f 1f 13 1d 1d 1b 1b 0c 1b 0c 1a 18 11 
18 18 0c 18 0c 18 11 11 1a 1a 0a 1a 0a 18 0a 16 
16 18 0f 1a 18 18 16 0f 1b 1b 0c 0f 13 11 1b 15 
1b 11 13 15 15 13 15 15 11 16 0a 0a 16 0e 16 11 
16 15 15 13 13 11 0e 0a 0a 0a 16 0a 00 0a 16 16 
15 15 09 15 11 15 11 15 16 16 0a 0e 0a 11 16 16 
11 11 11 13 13 13 11 11 0e 0e 1a 02 1a 0a 0e 1a 
15 15 09 15 11 15 0e 11 16 16 0a 16 0a 16 0a 11 
16 16 0a 1a 1a 18 16 0a 16 16 11 0a 11 0e 16 16 
1d 1d 1d 1d 16 11 11 1d 1f 1f 1f 1f 1f 1f 1f 1f
1f 1f 1b 18 0f 18 0c 1d 11 1d 11 1d 21 21 22 24 
22 16 22 1d 0a 1b 0a 1f 0f 1f 13 1f 1d 1d 1f 1b

1f 1f 1b 18 0f 18 0c 1d 
11 1d 11 1d 21 21 22 24 22 16 22 1d 0a 1b 0a 1f 
0f 1f 13 1f 1d 1d 1f 1b

Pas si longue au final
