/**
 * Lecture, normalisation et validation d'un commentaire reçu.
 */

export const LIMITS = {
  pageKey: 150,
  pageTitle: 200,
  name: 50,
  email: 254,
  url: 200,
  minMessage: 2,
};

// Nom du champ piège : invisible pour les humains, rempli par les robots.
export const HONEYPOT_FIELD = 'contact_me_by_fax_only';

const PAGE_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMENT_ID_RE = /^[a-z0-9][a-z0-9-]{3,63}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Caractères de contrôle (sauf tabulation et saut de ligne), séparateurs Unicode
// et caractères de direction bidirectionnelle souvent utilisés pour tromper l'affichage.
// (Les jointures U+200C/U+200D sont conservées : elles composent certains emojis et écritures.)
const CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;
const LINK_RE = /\bhttps?:\/\/|\bwww\./gi;

function str(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function singleLine(value) {
  return str(value).replace(CONTROL_RE, '').replace(/[\r\n\u2028\u2029\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeMessage(value) {
  return str(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(CONTROL_RE, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countLinks(text) {
  return (str(text).match(LINK_RE) || []).length;
}

export function normalizeUrl(value) {
  let raw = singleLine(value);
  if (!raw) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!parsed.hostname.includes('.')) return null;
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

/**
 * Lit le corps de la requête (JSON envoyé par le script, ou formulaire classique).
 */
export async function readBody(request) {
  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (type.includes('application/json')) {
    const data = await request.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData();
    const data = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') data[key] = value;
    }
    return data;
  }
  return {};
}

/**
 * Valide les données. Renvoie { data, errors, spam }.
 * - errors : messages à afficher sous les champs concernés ;
 * - spam : raison si la soumission vient très probablement d'un robot
 *   (on répond alors « succès » sans rien enregistrer).
 */
export function validateComment(input, config, now = Date.now()) {
  const errors = {};
  let spam = null;

  if (str(input[HONEYPOT_FIELD]).trim() !== '') spam = 'honeypot';

  const startedAt = Number(input.t);
  if (!spam && Number.isFinite(startedAt) && startedAt > 0 && config.minSubmitDelayMs > 0) {
    if (now - startedAt < config.minSubmitDelayMs) spam = 'too-fast';
  }

  const page = singleLine(input.page).toLowerCase();
  if (!page || page.length > LIMITS.pageKey || !PAGE_KEY_RE.test(page)) {
    errors.page = "Cette page n'accepte pas de commentaires (identifiant de page invalide).";
  }

  let pageUrl = '';
  try {
    const parsed = new URL(singleLine(input.page_url));
    if (config.allowedOrigins.includes(parsed.origin)) {
      parsed.hash = '';
      pageUrl = parsed.href;
    }
  } catch {
    /* traité ci-dessous */
  }
  if (!pageUrl) errors.page_url = "L'adresse de la page n'est pas reconnue.";

  const pageTitle = singleLine(input.page_title).slice(0, LIMITS.pageTitle);

  const name = singleLine(input.name);
  if (!name) errors.name = 'Indiquez votre nom ou un pseudonyme.';
  else if (name.length > LIMITS.name) errors.name = `Le nom ne doit pas dépasser ${LIMITS.name} caractères.`;
  else if (countLinks(name) > 0) errors.name = 'Le nom ne peut pas contenir de lien.';

  const email = singleLine(input.email).toLowerCase();
  if (email && (email.length > LIMITS.email || !EMAIL_RE.test(email))) {
    errors.email = "Cette adresse e-mail n'est pas valide.";
  }

  const url = normalizeUrl(input.url);
  if (url === null || (url && url.length > LIMITS.url)) {
    errors.url = "L'adresse du site doit commencer par http:// ou https://.";
  }

  const message = normalizeMessage(input.message);
  if (message.length < LIMITS.minMessage) errors.message = 'Écrivez votre commentaire.';
  else if (message.length > config.maxMessageLength) {
    errors.message = `Le commentaire ne doit pas dépasser ${config.maxMessageLength} caractères (actuellement ${message.length}).`;
  } else if (countLinks(message) > config.maxLinks) {
    errors.message =
      config.maxLinks === 0
        ? 'Les liens ne sont pas autorisés dans les commentaires.'
        : `Un commentaire peut contenir au maximum ${config.maxLinks} lien${config.maxLinks > 1 ? 's' : ''}.`;
  }

  const replyTo = singleLine(input.reply_to).toLowerCase();
  if (replyTo && !COMMENT_ID_RE.test(replyTo)) errors.reply_to = 'Le commentaire auquel vous répondez est invalide.';

  if (!spam && config.blockedTerms.length > 0) {
    const haystack = `${name}\n${message}\n${url || ''}`.toLowerCase();
    if (config.blockedTerms.some((term) => haystack.includes(term))) spam = 'blocked-term';
  }

  return {
    spam,
    errors,
    data: {
      page,
      pageUrl,
      pageTitle,
      name,
      email,
      url: url || '',
      message,
      replyTo,
      turnstileToken: singleLine(input['cf-turnstile-response'] || input.turnstile_token),
    },
  };
}
