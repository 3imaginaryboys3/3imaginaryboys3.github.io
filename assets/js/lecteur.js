/* Lecteur « Music of the Week » : la pochette et le bouton carré lancent la lecture,
   un cadre fait le tour de la pochette au fil du morceau.
   Sans JavaScript, la balise <audio controls> d'origine reste affichée. */
(function () {
  var tous = [];

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function brancher(el) {
    var audio = el.querySelector('audio');
    var controles = el.querySelector('.lecteur-controles');
    var anneau = el.querySelector('.lecteur-anneau-avance');
    var temps = el.querySelector('[data-temps]');
    var duree = el.querySelector('[data-duree]');
    var boutons = el.querySelectorAll('[data-toggle]');
    var titre = el.getAttribute('data-titre') || '';
    var image = el.querySelector('.lecteur-pochette img');
    if (!audio || !controles || !anneau) return;

    // On remplace la barre native par nos boutons
    audio.removeAttribute('controls');
    audio.hidden = true;
    controles.hidden = false;
    el.classList.add('lecteur-actif');
    tous.push(audio);

    var raf = 0;

    function maj() {
      var d = audio.duration, t = audio.currentTime || 0;
      var p = isFinite(d) && d > 0 ? Math.min(1, t / d) : 0;
      anneau.style.strokeDasharray = (p * 100).toFixed(2) + ' 100';
      temps.textContent = fmt(t);
      duree.textContent = isFinite(d) && d > 0 ? fmt(d) : '-:--';
    }

    function boucle() {
      maj();
      if (!audio.paused) raf = requestAnimationFrame(boucle);
    }

    function etiquettes(enLecture) {
      for (var i = 0; i < boutons.length; i++) {
        boutons[i].setAttribute('aria-label', (enLecture ? 'Pause : ' : 'Écouter : ') + titre);
      }
    }

    function basculer() {
      if (audio.paused) {
        // Un seul morceau à la fois
        tous.forEach(function (a) { if (a !== audio) a.pause(); });
        var promesse = audio.play();
        if (promesse && promesse.catch) promesse.catch(function () {});
      } else {
        audio.pause();
      }
    }

    for (var i = 0; i < boutons.length; i++) boutons[i].addEventListener('click', basculer);

    var sauts = el.querySelectorAll('[data-saut]');
    for (var j = 0; j < sauts.length; j++) {
      sauts[j].addEventListener('click', function (e) {
        var pas = Number(e.currentTarget.getAttribute('data-saut')) || 0;
        var d = audio.duration;
        var cible = Math.max(0, (audio.currentTime || 0) + pas);
        if (isFinite(d) && d > 0) cible = Math.min(cible, Math.max(0, d - 0.25));
        try { audio.currentTime = cible; } catch (err) {}
        maj();
      });
    }

    audio.addEventListener('play', function () {
      el.classList.add('lecture');
      etiquettes(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(boucle);
      // Titre et pochette sur l'écran verrouillé et le centre de contrôle (iOS, Android)
      if ('mediaSession' in navigator && window.MediaMetadata) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: titre,
            artist: el.getAttribute('data-artiste') || '',
            artwork: image ? [{ src: image.currentSrc || image.src }] : []
          });
        } catch (err) {}
      }
    });

    audio.addEventListener('pause', function () {
      el.classList.remove('lecture');
      etiquettes(false);
      cancelAnimationFrame(raf);
      maj();
    });

    audio.addEventListener('ended', function () {
      try { audio.currentTime = 0; } catch (err) {}
      maj();
    });

    ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(function (nom) {
      audio.addEventListener(nom, maj);
    });

    maj();
  }

  var lecteurs = document.querySelectorAll('[data-lecteur]');
  for (var k = 0; k < lecteurs.length; k++) brancher(lecteurs[k]);
})();
