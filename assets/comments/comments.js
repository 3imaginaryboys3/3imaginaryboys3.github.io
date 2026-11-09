/*!
 * Commentaires Jekyll : envoi sans rechargement, réponses, mémorisation de l'identité.
 * Aucun script tiers requis (hors Cloudflare Turnstile si activé).
 */
(() => {
  'use strict';

  const section = document.getElementById('comments');
  if (!section) return;

  // Les boutons « Répondre » n'ont de sens qu'avec JavaScript.
  section.querySelectorAll('[data-jc-reply]').forEach((button) => {
    button.hidden = false;
  });

  const form = section.querySelector('[data-jc-form]');
  if (!form) return;

  const endpoint = section.dataset.jcEndpoint;
  const STORAGE_KEY = 'jc-identity';
  const IDENTITY_FIELDS = ['name', 'email', 'url'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (selector, root = form) => root.querySelector(selector);
  const message = form.elements.message;
  const submit = $('[data-jc-submit]');
  const status = $('[data-jc-status]');
  const counter = $('[data-jc-counter]');
  const remember = $('[data-jc-remember]');
  const replyTo = $('[data-jc-reply-to]');
  const replying = $('[data-jc-replying]');
  const replyingName = $('[data-jc-replying-name]');
  const turnstileBox = $('.cf-turnstile');
  const maxLength = Number(message.getAttribute('maxlength')) || 5000;

  let busy = false;

  /* ---------- Stockage local (protégé : navigation privée, quotas…) ---------- */

  const storage = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* stockage indisponible : on ignore */
      }
    },
    clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* idem */
      }
    },
  };

  const saved = storage.get();
  if (saved) {
    IDENTITY_FIELDS.forEach((field) => {
      if (form.elements[field] && saved[field]) form.elements[field].value = saved[field];
    });
    remember.checked = true;
  }

  // Horodatage d'ouverture : un envoi quasi instantané trahit un robot.
  $('[data-jc-started]').value = String(Date.now());

  /* ---------- Messages ---------- */

  function setStatus(type, text) {
    status.className = `jc-status${type ? ` jc-status--${type}` : ''}`;
    status.textContent = text || '';
  }

  function clearErrors() {
    form.querySelectorAll('[data-jc-error]').forEach((element) => {
      element.hidden = true;
      element.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
  }

  function showErrors(fields) {
    let first = null;
    Object.entries(fields).forEach(([name, text]) => {
      const holder = form.querySelector(`[data-jc-error="${name}"]`);
      const input = form.elements[name];
      if (holder) {
        holder.textContent = text;
        holder.hidden = false;
      }
      if (input && input.type !== 'hidden') {
        input.setAttribute('aria-invalid', 'true');
        first = first || input;
      }
    });
    if (first) first.focus();
  }

  function checkLocally(data) {
    const errors = {};
    if (!data.message || data.message.trim().length < 2) errors.message = 'Écrivez votre commentaire.';
    if (!data.name || !data.name.trim()) errors.name = 'Indiquez votre nom ou un pseudonyme.';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = "Cette adresse e-mail n'est pas valide.";
    return errors;
  }

  /* ---------- Compteur de caractères ---------- */

  function updateCounter() {
    const remaining = maxLength - message.value.length;
    counter.textContent = remaining < maxLength * 0.2 ? `${remaining} caractère${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}` : '';
    counter.classList.toggle('jc-counter--low', remaining < 100);
  }

  message.addEventListener('input', updateCounter);

  // Dès qu'un champ est corrigé, son message d'erreur disparaît.
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (!field.name || field.getAttribute('aria-invalid') !== 'true') return;
    field.removeAttribute('aria-invalid');
    const holder = form.querySelector(`[data-jc-error="${field.name}"]`);
    if (holder) {
      holder.hidden = true;
      holder.textContent = '';
    }
    if (!form.querySelector('[aria-invalid="true"]') && status.classList.contains('jc-status--error')) setStatus('', '');
  });
  message.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  /* ---------- Réponses ---------- */

  function markReplying(id) {
    section.querySelectorAll('.jc-comment--replying').forEach((element) => element.classList.remove('jc-comment--replying'));
    if (id) {
      const target = document.getElementById(`comment-${id}`);
      if (target) target.classList.add('jc-comment--replying');
    }
  }

  function startReply(id, name) {
    replyTo.value = id;
    replyingName.textContent = name;
    replying.hidden = false;
    markReplying(id);
    form.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    message.focus({ preventScroll: true });
  }

  function cancelReply() {
    replyTo.value = '';
    replyingName.textContent = '';
    replying.hidden = true;
    markReplying(null);
  }

  section.addEventListener('click', (event) => {
    const replyButton = event.target.closest('[data-jc-reply]');
    if (replyButton) {
      startReply(replyButton.dataset.jcReply, replyButton.dataset.jcName);
      return;
    }
    if (event.target.closest('[data-jc-cancel-reply]')) {
      cancelReply();
      message.focus();
    }
  });

  /* ---------- Aperçu du commentaire en attente ---------- */

  // Même calcul que _includes/comments/item.html, pour garder la même couleur une fois publié.
  function avatarHue(name) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = Array.from(name);
    const position = (char) => {
      const index = letters.indexOf(String(char || '').toUpperCase());
      return index === -1 ? 26 : index;
    };
    return (chars.length + position(chars[0]) + position(chars[chars.length - 1])) % 8;
  }

  function showPending(comment) {
    if (!comment || !comment.id) return;
    const article = document.createElement('article');
    article.className = 'jc-comment jc-comment--pending';
    article.id = `comment-${comment.id}`;

    const header = document.createElement('header');
    header.className = 'jc-meta';
    const avatar = document.createElement('span');
    avatar.className = `jc-avatar jc-avatar--${avatarHue(comment.name)}`;
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = comment.name.charAt(0).toUpperCase();
    const meta = document.createElement('div');
    meta.className = 'jc-meta-text';
    const author = document.createElement('span');
    author.className = 'jc-author';
    author.textContent = comment.name;
    const badge = document.createElement('span');
    badge.className = 'jc-badge jc-badge--pending';
    badge.textContent = 'En attente de validation';
    meta.append(author, ' ', badge);
    header.append(avatar, meta);

    // Ce HTML est produit et assaini par le service de commentaires (Markdown sans HTML brut).
    const body = document.createElement('div');
    body.className = 'jc-body';
    body.innerHTML = comment.html;

    article.append(header, body);

    const item = document.createElement('li');
    const replies = comment.thread ? section.querySelector(`[data-jc-replies="${CSS.escape(comment.thread)}"]`) : null;
    if (replies) {
      replies.append(item);
    } else {
      item.className = 'jc-thread';
      section.querySelector('[data-jc-list]').append(item);
    }
    item.append(article);

    const empty = section.querySelector('[data-jc-empty]');
    if (empty) empty.hidden = true;
    article.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  /* ---------- Turnstile ---------- */

  function resetTurnstile() {
    if (!turnstileBox || !window.turnstile) return;
    try {
      window.turnstile.reset(turnstileBox);
    } catch {
      try {
        window.turnstile.reset();
      } catch {
        /* rien à faire */
      }
    }
  }

  /* ---------- Envoi ---------- */

  function setBusy(value) {
    busy = value;
    submit.disabled = value;
    submit.classList.toggle('jc-submit--busy', value);
    form.setAttribute('aria-busy', String(value));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    clearErrors();
    const data = Object.fromEntries(new FormData(form).entries());

    const localErrors = checkLocally(data);
    if (Object.keys(localErrors).length > 0) {
      showErrors(localErrors);
      setStatus('error', 'Certains champs sont à corriger.');
      return;
    }

    if (turnstileBox && !data['cf-turnstile-response']) {
      setStatus('info', 'Vérification anti-robot en cours… Réessayez dans un instant.');
      return;
    }

    setBusy(true);
    setStatus('info', 'Envoi en cours…');

    let response;
    let payload = {};
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      payload = await response.json().catch(() => ({}));
    } catch {
      setBusy(false);
      resetTurnstile();
      setStatus('error', 'Connexion impossible. Vérifiez votre réseau puis réessayez.');
      return;
    }

    setBusy(false);
    resetTurnstile();

    if (response.ok && payload.ok) {
      if (remember.checked) {
        storage.set(Object.fromEntries(IDENTITY_FIELDS.map((field) => [field, form.elements[field] ? form.elements[field].value.trim() : ''])));
      } else {
        storage.clear();
      }
      showPending(payload.comment);
      message.value = '';
      updateCounter();
      cancelReply();
      setStatus('success', payload.message || 'Merci ! Votre commentaire sera publié après validation.');
      return;
    }

    if (payload.fields) showErrors(payload.fields);
    setStatus('error', payload.message || 'Une erreur est survenue. Réessayez dans quelques minutes.');
  });

  remember.addEventListener('change', () => {
    if (!remember.checked) storage.clear();
  });
})();
