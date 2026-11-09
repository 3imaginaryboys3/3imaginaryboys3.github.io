/* Lecteur « Music of the Week ».
   Deux styles, choisis pour chaque morceau dans _data/music.yml (style: cd | pochette) :
   - pochette : la pochette lance la lecture, un cadre en fait le tour au fil du morceau ;
   - cd : le boîtier lance la lecture, le CD en sort et tourne, la partie déjà lue
     s'assombrit du centre vers le bord.
   Le bouton noir, le temps et les sauts de 10 s sont communs aux deux.
   Écrit en JavaScript « ancien » (var, function) pour marcher partout.
   Sans JavaScript, la balise <audio controls> d'origine reste affichée. */
(function () {
  // Navigateur trop ancien : on laisse le lecteur audio natif
  if (!document.querySelectorAll || !window.addEventListener) return;

  // Tour du cadre de la pochette, en unités du dessin : le carré M1.5 1.5H98.5V98.5H1.5Z fait 97 de côté.
  // On s'en sert à la place de l'attribut pathLength, que les Safari d'avant 2020 ignorent.
  var TOUR_CADRE = 388;
  var tous = [];

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function brancher(el) {
    var audio = el.querySelector('audio');
    var controles = el.querySelector('.lecteur-controles');
    var temps = el.querySelector('[data-temps]');
    var duree = el.querySelector('[data-duree]');
    var boutons = el.querySelectorAll('[data-toggle]');
    var sauts = el.querySelectorAll('[data-saut]');
    var titre = el.getAttribute('data-titre') || '';
    var image = el.querySelector('.lecteur-pochette img');
    var anneau = el.querySelector('.lecteur-anneau-avance'); // style « pochette »
    var grave = el.querySelector('.lecteur-cd-grave');       // style « cd »
    var animation = 0;
    var i;
    // Pas de lecture audio possible (ou page incomplète) : on ne touche à rien
    if (!audio || !audio.canPlayType || !controles || !temps || !duree) return;

    // On remplace la barre native par nos boutons
    audio.removeAttribute('controls');
    audio.setAttribute('hidden', '');
    controles.removeAttribute('hidden');
    el.className += ' lecteur-actif';
    tous.push(audio);

    function enLecture(oui) {
      if (oui) {
        if (!/\blecture\b/.test(el.className)) el.className += ' lecture';
      } else {
        el.className = el.className.replace(/\s*\blecture\b/g, '');
      }
      for (var k = 0; k < boutons.length; k++) {
        boutons[k].setAttribute('aria-label', (oui ? 'Pause : ' : 'Écouter : ') + titre);
      }
    }

    function maj() {
      var d = audio.duration, t = audio.currentTime || 0;
      var connue = isFinite(d) && d > 0;
      var p = connue ? Math.min(1, t / d) : 0;
      temps.textContent = fmt(t);
      // Tant que la durée n'est pas connue, on garde celle de music.yml (ou « -:-- »)
      if (connue) duree.textContent = fmt(d);

      // Pochette : le cadre avance autour de l'image
      if (anneau) anneau.style.strokeDasharray = (p * TOUR_CADRE).toFixed(2) + ' ' + TOUR_CADRE;

      // CD : la partie gravée grandit du centre (39 %) vers le bord (97 %)
      if (grave) {
        if (p > 0) {
          var taille = (39 + 58 * p).toFixed(2) + '%';
          grave.style.width = taille;
          grave.style.height = taille;
          grave.style.display = 'block';
        } else {
          grave.style.display = 'none';
        }
      }
    }

    // Pochette : pendant la lecture, mise à jour à chaque image pour que le cadre avance sans à-coups.
    // CD : la partie gravée grandit très lentement, la mise à jour de « timeupdate » (≈ 4 fois par seconde)
    // suffit, ce qui économise la batterie.
    function animer() {
      maj();
      if (anneau && !audio.paused && window.requestAnimationFrame) animation = window.requestAnimationFrame(animer);
    }

    function arreterAnimation() {
      if (animation && window.cancelAnimationFrame) window.cancelAnimationFrame(animation);
      animation = 0;
    }

    function basculer() {
      if (audio.paused) {
        // Un seul morceau à la fois
        for (var k = 0; k < tous.length; k++) {
          if (tous[k] !== audio) tous[k].pause();
        }
        var promesse = audio.play();
        // .then(null, …) plutôt que .catch(…) : « catch » est un mot réservé pour les très vieux moteurs JS
        if (promesse && typeof promesse.then === 'function') promesse.then(null, function () { enLecture(false); });
      } else {
        audio.pause();
      }
    }

    function sauter(e) {
      var pas = Number(e.currentTarget.getAttribute('data-saut')) || 0;
      var d = audio.duration;
      var cible = Math.max(0, (audio.currentTime || 0) + pas);
      if (isFinite(d) && d > 0) cible = Math.min(cible, Math.max(0, d - 0.25));
      try { audio.currentTime = cible; } catch (err) {}
      maj();
    }

    for (i = 0; i < boutons.length; i++) boutons[i].addEventListener('click', basculer);
    for (i = 0; i < sauts.length; i++) sauts[i].addEventListener('click', sauter);

    audio.addEventListener('play', function () {
      enLecture(true);
      arreterAnimation();
      animer();
      // Titre et pochette sur l'écran verrouillé et le centre de contrôle (iPhone, Android)
      if ('mediaSession' in navigator && typeof window.MediaMetadata === 'function') {
        try {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: titre,
            artist: el.getAttribute('data-artiste') || '',
            artwork: image ? [{ src: image.currentSrc || image.src }] : []
          });
        } catch (err) {}
      }
    });

    audio.addEventListener('pause', function () {
      enLecture(false);
      arreterAnimation();
      maj();
    });

    audio.addEventListener('ended', function () {
      try { audio.currentTime = 0; } catch (err) {}
      enLecture(false);
      arreterAnimation();
      maj();
    });

    var evenements = ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'];
    for (i = 0; i < evenements.length; i++) audio.addEventListener(evenements[i], maj);

    maj();
  }

  function demarrer() {
    var lecteurs = document.querySelectorAll('[data-lecteur]');
    for (var k = 0; k < lecteurs.length; k++) brancher(lecteurs[k]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
