// Page d'accueil : filtre des posts par auteur.
//
// Cliquer sur un nom d'auteur ajoute ?author=<nom> à l'URL et n'affiche que ses posts.
// L'URL est la seule source de vérité : le lien « Back », le bouton retour du navigateur
// et un lien partagé (ex. /?author=chems) donnent tous le même résultat.
(() => {
  const posts = Array.from(document.querySelectorAll('.posts .post'));
  const bar = document.querySelector('.author-filter');
  const barName = document.querySelector('.author-filter-name');
  const back = document.querySelector('.author-filter-back');
  if (!bar || !barName || !back || posts.length === 0) return;

  // Les auteurs sont écrits avec ou sans majuscule (chems / Chems, Noé / noé) :
  // on compare des versions normalisées.
  const normalize = (value) => (value || '').trim().toLowerCase().normalize('NFC');

  const currentAuthor = () => normalize(new URLSearchParams(window.location.search).get('author'));

  const authorOf = (post) => {
    const link = post.querySelector('.post-author-link');
    return link ? normalize(link.dataset.author) : '';
  };

  function render() {
    const author = currentAuthor();
    const matches = author ? posts.filter((post) => authorOf(post) === author) : [];

    // Pas de filtre, ou auteur inconnu : on affiche tout.
    if (matches.length === 0) {
      posts.forEach((post) => { post.hidden = false; });
      bar.hidden = true;
      return;
    }

    posts.forEach((post) => { post.hidden = !matches.includes(post); });
    barName.textContent = matches[0].querySelector('.post-author-link').textContent;
    bar.hidden = false;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.post-author-link');
    // Ctrl/Cmd-clic, clic molette… : on laisse le navigateur ouvrir un nouvel onglet.
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (normalize(link.dataset.author) === currentAuthor()) return;

    history.pushState({ filtered: true }, '', link.href);
    render();
    // Si on a cliqué loin dans la liste, on remonte jusqu'au filtre.
    if (bar.getBoundingClientRect().top < 0) bar.scrollIntoView();
  });

  back.addEventListener('click', (event) => {
    event.preventDefault();
    if (history.state && history.state.filtered) {
      // On revient vraiment à la page d'avant (même effet que le bouton retour du navigateur).
      history.back();
    } else {
      // Arrivé directement sur un lien filtré : on retire juste le filtre.
      history.pushState(null, '', back.href);
      render();
    }
  });

  window.addEventListener('popstate', render);
  render();
})();
