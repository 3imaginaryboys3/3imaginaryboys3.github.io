/**
 * Worker Cloudflare « commentaires Jekyll ».
 *
 * POST /api/comments
 *   Reçoit un commentaire (JSON envoyé par comments.js, ou formulaire HTML
 *   classique), le vérifie, puis ouvre une pull request qui ajoute le fichier
 *   _data/comments/<page>/<date>-<id>.yml au dépôt du blog. Fusionner la pull
 *   request publie le commentaire.
 *
 * GET /
 *   Vérification que le service répond.
 */
import { ConfigError, loadConfig, normalizeName } from './config.js';
import { GitHubClient } from './github.js';
import { renderMarkdown } from './markdown.js';
import { checkRateLimit, corsHeaders, isAllowedOrigin, verifyTurnstile } from './security.js';
import { buildPullRequest, commentFileName, formatDate, generateId, sha256Hex, toYaml } from './serialize.js';
import { readBody, validateComment } from './validate.js';

const MAX_BODY_BYTES = 64 * 1024; // un commentaire de 5000 caractères pèse bien moins

const MESSAGES = {
  success: 'Merci ! Votre commentaire a bien été reçu. Il sera publié après validation.',
  invalid: 'Certains champs sont à corriger.',
  origin: "Ce site n'est pas autorisé à envoyer des commentaires.",
  rateLimited: 'Trop de commentaires envoyés en peu de temps. Patientez une minute avant de réessayer.',
  turnstile: 'La vérification anti-robot a échoué. Rechargez la page puis réessayez.',
  parentMissing: 'Le commentaire auquel vous répondez est introuvable.',
  storage: "Votre commentaire n'a pas pu être enregistré. Réessayez dans quelques minutes.",
  config: 'Le service de commentaires est mal configuré.',
  unexpected: 'Une erreur inattendue est survenue. Réessayez dans quelques minutes.',
};

function json(payload, status, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

function log(level, event, details = {}) {
  console[level](JSON.stringify({ event, ...details }));
}

/**
 * Prépare la réponse selon le mode : JSON pour le script, redirection pour un
 * formulaire envoyé sans JavaScript (vers #comment-sent ou #comment-error).
 */
function responder(formMode, pageUrl, cors) {
  return (status, payload) => {
    if (formMode) {
      if (!pageUrl) return new Response(payload.message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return redirect(`${pageUrl}#${payload.ok ? 'comment-sent' : 'comment-error'}`);
    }
    return json(payload, status, cors);
  };
}

async function handleComment(request, env, config, cors) {
  const origin = request.headers.get('Origin');
  const formMode = !(request.headers.get('Content-Type') || '').toLowerCase().includes('application/json');
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (!isAllowedOrigin(origin, config)) {
    log('warn', 'origin_rejected', { origin });
    return json({ ok: false, error: 'origin', message: MESSAGES.origin }, 403, cors);
  }

  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'too_large', message: MESSAGES.invalid }, 413, cors);
  }

  let input;
  try {
    input = await readBody(request);
  } catch {
    return json({ ok: false, error: 'invalid', message: MESSAGES.invalid }, 400, cors);
  }

  const { data, errors, spam } = validateComment(input, config);
  const respond = responder(formMode, data.pageUrl, cors);

  if (!(await checkRateLimit(env, ip))) {
    log('warn', 'rate_limited', { page: data.page });
    return respond(429, { ok: false, error: 'rate_limited', message: MESSAGES.rateLimited });
  }

  if (spam) {
    // On fait comme si tout allait bien : inutile d'aider les robots à s'adapter.
    log('info', 'spam_dropped', { reason: spam, page: data.page });
    return respond(200, { ok: true, status: 'pending', message: MESSAGES.success });
  }

  if (Object.keys(errors).length > 0) {
    return respond(400, { ok: false, error: 'invalid', message: MESSAGES.invalid, fields: errors });
  }

  if (config.turnstileSecret) {
    const check = await verifyTurnstile(config.turnstileSecret, data.turnstileToken, ip);
    if (!check.success) {
      log('warn', 'turnstile_failed', { codes: check.codes, page: data.page });
      return respond(403, { ok: false, error: 'turnstile', message: MESSAGES.turnstile });
    }
  }

  const github = new GitHubClient(config);

  let parent = null;
  if (data.replyTo) {
    try {
      parent = await github.findComment(data.page, data.replyTo);
    } catch (error) {
      log('error', 'github_parent_lookup_failed', { message: error.message });
      return respond(502, { ok: false, error: 'storage', message: MESSAGES.storage });
    }
    if (!parent) {
      return respond(400, {
        ok: false,
        error: 'invalid',
        message: MESSAGES.parentMissing,
        fields: { reply_to: MESSAGES.parentMissing },
      });
    }
  }

  const now = new Date();
  const id = generateId();
  const html = renderMarkdown(data.message);
  const comment = {
    id,
    name: data.name,
    url: data.url,
    avatar: data.email ? await sha256Hex(data.email.trim().toLowerCase()) : '',
    author: config.authorNames.includes(normalizeName(data.name)),
    reply_to: parent ? parent.id : '',
    reply_to_name: parent && parent.id !== parent.thread ? parent.name : '',
    thread: parent ? parent.thread : '',
    date: formatDate(now, config.timeZone),
    message: data.message,
    html,
  };

  const path = `${config.commentsDir}/${data.page}/${commentFileName(now, id)}`;
  const { title, body } = buildPullRequest({ comment, pageTitle: data.pageTitle, pageUrl: data.pageUrl, path, parent });

  try {
    const pr = await github.createCommentPullRequest({
      head: `comment-${id}`,
      path,
      content: toYaml(comment),
      commitMessage: title,
      title,
      body,
    });
    log('info', 'comment_received', { id, page: data.page, pr: pr.number });
  } catch (error) {
    log('error', 'github_write_failed', { message: error.message, status: error.status });
    return respond(502, { ok: false, error: 'storage', message: MESSAGES.storage });
  }

  return respond(201, {
    ok: true,
    status: 'pending',
    message: MESSAGES.success,
    comment: {
      id,
      name: comment.name,
      url: comment.url,
      author: comment.author,
      reply_to: comment.reply_to,
      thread: comment.thread,
      date: comment.date,
      html,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    let config;
    try {
      config = loadConfig(env);
    } catch (error) {
      log('error', 'config_error', { message: error.message });
      const message = error instanceof ConfigError ? `${MESSAGES.config} ${error.message}` : MESSAGES.config;
      return json({ ok: false, error: 'config', message }, 500);
    }

    const cors = corsHeaders(request.headers.get('Origin'), config);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/' && request.method === 'GET') {
      return json({ ok: true, service: 'jekyll-comments', repo: config.repo }, 200, cors);
    }

    if (url.pathname === '/api/comments') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, { ...cors, Allow: 'POST, OPTIONS' });
      try {
        return await handleComment(request, env, config, cors);
      } catch (error) {
        log('error', 'unexpected_error', { message: error.message, stack: error.stack });
        return json({ ok: false, error: 'unexpected', message: MESSAGES.unexpected }, 500, cors);
      }
    }

    return json({ ok: false, error: 'not_found' }, 404, cors);
  },
};
