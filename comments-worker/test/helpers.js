import { generateKeyPairSync } from 'node:crypto';
import { vi } from 'vitest';

export const ORIGIN = 'https://exemple.github.io';
export const PAGE_URL = `${ORIGIN}/2026/11/09/mon-article.html`;

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

export const APP_PRIVATE_KEY = privateKey;
export const APP_PUBLIC_KEY = publicKey;

export function makeEnv(overrides = {}) {
  return {
    GITHUB_REPO: 'exemple/exemple.github.io',
    GITHUB_BRANCH: 'main',
    COMMENTS_DIR: '_data/comments',
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:4000`,
    TIMEZONE: 'Europe/Zurich',
    AUTHOR_NAME: 'Hugo',
    PR_LABEL: 'commentaire',
    GITHUB_REVIEWER: '',
    MAX_LINKS: '3',
    MAX_MESSAGE_LENGTH: '5000',
    MIN_SUBMIT_DELAY_SECONDS: '3',
    BLOCKED_TERMS: 'casino en ligne',
    GITHUB_APP_ID: '123456',
    GITHUB_APP_PRIVATE_KEY: APP_PRIVATE_KEY,
    ...overrides,
  };
}

export function validInput(overrides = {}) {
  return {
    page: '2026-11-09-mon-article',
    page_url: PAGE_URL,
    page_title: 'Mon article',
    name: 'Marie',
    email: '',
    url: '',
    message: 'Super article, merci !',
    reply_to: '',
    t: String(Date.now() - 60_000),
    contact_me_by_fax_only: '',
    ...overrides,
  };
}

export function jsonRequest(body, { origin = ORIGIN, headers = {} } = {}) {
  return new Request('https://blog-comments.exemple.workers.dev/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: origin, 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });
}

export function formRequest(body, { origin = ORIGIN } = {}) {
  return new Request('https://blog-comments.exemple.workers.dev/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin },
    body: new URLSearchParams(body).toString(),
  });
}

/**
 * Faux GitHub : enregistre les appels et répond comme l'API réelle.
 * `files` simule le contenu publié de la branche principale.
 */
export function mockGitHub({ files = {}, failOn = null, turnstile = true } = {}) {
  const calls = [];
  const fetchMock = vi.fn(async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
    calls.push({ method, path: url.pathname + url.search, body, headers: init.headers || {} });

    const respond = (status, payload) =>
      new Response(payload === undefined ? null : typeof payload === 'string' ? payload : JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (url.hostname === 'challenges.cloudflare.com') {
      return respond(200, turnstile ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] });
    }

    const key = `${method} ${url.pathname}`;
    if (failOn && key.startsWith(failOn)) return respond(500, { message: 'Erreur simulée' });

    if (key === 'GET /repos/exemple/exemple.github.io/installation') return respond(200, { id: 42 });
    if (key === 'POST /app/installations/42/access_tokens') {
      return respond(201, { token: 'ghs_installation', expires_at: new Date(Date.now() + 3600_000).toISOString() });
    }
    if (key === 'GET /repos/exemple/exemple.github.io/git/ref/heads/main') return respond(200, { object: { sha: 'abc123' } });
    if (key === 'POST /repos/exemple/exemple.github.io/git/refs') return respond(201, { ref: body.ref });
    if (method === 'PUT' && url.pathname.startsWith('/repos/exemple/exemple.github.io/contents/')) return respond(201, {});
    if (key === 'POST /repos/exemple/exemple.github.io/pulls') return respond(201, { number: 7, html_url: 'https://github.com/exemple/pull/7' });
    if (method === 'POST' && url.pathname.endsWith('/labels')) return respond(200, []);
    if (method === 'DELETE' && url.pathname.includes('/git/refs/heads/')) return respond(204);

    if (method === 'GET' && url.pathname.startsWith('/repos/exemple/exemple.github.io/contents/')) {
      const path = decodeURIComponent(url.pathname.replace('/repos/exemple/exemple.github.io/contents/', ''));
      const accept = (init.headers && init.headers.Accept) || '';
      if (accept.includes('raw')) {
        return path in files ? new Response(files[path], { status: 200 }) : respond(404, { message: 'Not Found' });
      }
      const entries = Object.keys(files)
        .filter((file) => file.startsWith(`${path}/`))
        .map((file) => ({ type: 'file', name: file.split('/').pop(), path: file }));
      return entries.length ? respond(200, entries) : respond(404, { message: 'Not Found' });
    }

    return respond(404, { message: `Route non simulée : ${key}` });
  });
  return { fetchMock, calls };
}
