/* Layout « old internet » : case _ pour enrouler la fenêtre, taille et police du texte.
   Écrit en JavaScript « ancien » (var, function) pour marcher sur tous les navigateurs. */
(function () {
  var doc = document;
  var html = doc.documentElement;
  if (!doc.querySelector || !doc.addEventListener) return;

  var DEFAUT = { taille: 'normal', police: 'mono' };

  function each(liste, fn) {
    for (var i = 0; i < liste.length; i++) fn(liste[i], i);
  }

  function aClasse(el, c) {
    return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1;
  }

  function basculerClasse(el, c, oui) {
    if (oui && !aClasse(el, c)) el.className += ' ' + c;
    if (!oui) el.className = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  // Remonte jusqu'à l'élément qui correspond au sélecteur (pour les vieux navigateurs sans closest)
  function parent(el, selecteur) {
    var correspond = Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    while (el && el.nodeType === 1) {
      if (correspond.call(el, selecteur)) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ---------- Taille et police du texte (gardées d'un article à l'autre) ---------- */

  function choix(type) {
    var trouve = html.className.match(new RegExp('(^|\\s)' + type + '-([a-z]+)'));
    return trouve ? trouve[2] : DEFAUT[type];
  }

  function marquer() {
    each(doc.querySelectorAll('[data-taille]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-taille') === choix('taille') ? 'true' : 'false');
    });
    each(doc.querySelectorAll('[data-police]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-police') === choix('police') ? 'true' : 'false');
    });
  }

  function appliquer(type, valeur) {
    var classes = html.className.replace(new RegExp('(^|\\s)' + type + '-[a-z]+', 'g'), '');
    if (valeur !== DEFAUT[type]) classes += ' ' + type + '-' + valeur;
    html.className = classes.replace(/^\s+|\s+$/g, '');
    try { localStorage.setItem('tbbe-' + type, valeur); } catch (e) {}
    marquer();
  }

  /* ---------- Clics ---------- */

  doc.addEventListener('click', function (e) {
    var cible = e.target;
    var taille = parent(cible, '[data-taille]');
    var police = parent(cible, '[data-police]');
    var enrouler = parent(cible, '[data-oi="enrouler"]');

    if (taille) appliquer('taille', taille.getAttribute('data-taille'));
    if (police) appliquer('police', police.getAttribute('data-police'));

    if (enrouler) {
      var win = parent(enrouler, '.oi-win');
      if (!win) return;
      var enroulee = !aClasse(win, 'oi-enroulee');
      basculerClasse(win, 'oi-enroulee', enroulee);
      enrouler.setAttribute('aria-expanded', enroulee ? 'false' : 'true');
      enrouler.setAttribute('aria-label', enroulee ? 'Restaurer' : 'Réduire');
    }
  });

  marquer();
})();
