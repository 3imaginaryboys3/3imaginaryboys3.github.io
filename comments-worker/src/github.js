/**
 * Accès à l'API GitHub : authentification (GitHub App ou jeton), recherche du
 * commentaire parent et création de la pull request.
 */
import { parse as parseYaml } from 'yaml';

const API_VERSION = '2022-11-28';
const USER_AGENT = 'jekyll-comments-worker';

export class GitHubError extends Error {
  constructor(status, method, path, detail) {
    super(`GitHub ${method} ${path} → ${status}${detail ? ` : ${detail}` : ''}`);
    this.status = status;
  }
}

/* ---------- Encodages ---------- */

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function utf8ToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64Url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

/* ---------- Clé privée de la GitHub App ---------- */

function derLength(length) {
  if (length < 0x80) return [length];
  const bytes = [];
  for (let n = length; n > 0; n >>= 8) bytes.unshift(n & 0xff);
  return [0x80 | bytes.length, ...bytes];
}

/** Enveloppe une clé RSA PKCS#1 (format fourni par GitHub) en PKCS#8 (format attendu par WebCrypto). */
function pkcs1ToPkcs8(pkcs1) {
  const version = [0x02, 0x01, 0x00];
  const rsaAlgorithm = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octetString = [0x04, ...derLength(pkcs1.length), ...pkcs1];
  const body = [...version, ...rsaAlgorithm, ...octetString];
  return Uint8Array.from([0x30, ...derLength(body.length), ...body]);
}

export async function importPrivateKey(pem) {
  const text = String(pem).replace(/\\n/g, '\n').trim();
  const isPkcs1 = text.includes('BEGIN RSA PRIVATE KEY');
  if (!isPkcs1 && !text.includes('BEGIN PRIVATE KEY')) {
    throw new Error('GITHUB_APP_PRIVATE_KEY : clé PEM introuvable (attendu « -----BEGIN RSA PRIVATE KEY----- »).');
  }
  const der = base64ToBytes(text.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  return crypto.subtle.importKey(
    'pkcs8',
    isPkcs1 ? pkcs1ToPkcs8(der) : der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function createAppJwt(appId, privateKeyPem, now = Date.now()) {
  const key = await importPrivateKey(privateKeyPem);
  const iat = Math.floor(now / 1000) - 60; // marge pour les horloges décalées
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ iat, exp: iat + 9 * 60, iss: String(appId) }));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(signature)}`;
}

/* ---------- Client ---------- */

// Jeton d'installation gardé en mémoire tant que l'instance du Worker vit.
const tokenCache = new Map();

export class GitHubClient {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.github.apiUrl;
  }

  async request(method, path, { body, token, accept } = {}) {
    const auth = token || (await this.token());
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        Accept: accept || 'application/vnd.github+json',
        Authorization: `Bearer ${auth}`,
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': API_VERSION,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.json()).message || '';
      } catch {
        /* corps non JSON */
      }
      throw new GitHubError(response.status, method, path, detail);
    }
    if (response.status === 204) return null;
    return accept && accept.includes('raw') ? response.text() : response.json();
  }

  async token() {
    const { token, appId, privateKey, installationId } = this.config.github;
    if (token) return token;

    const cacheKey = `${this.apiUrl}|${appId}|${this.config.repo}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - Date.now() > 5 * 60 * 1000) return cached.token;

    const jwt = await createAppJwt(appId, privateKey);
    let id = installationId;
    if (!id) {
      const installation = await this.request('GET', `/repos/${this.config.repo}/installation`, { token: jwt });
      id = installation.id;
    }
    const result = await this.request('POST', `/app/installations/${id}/access_tokens`, { token: jwt });
    tokenCache.set(cacheKey, { token: result.token, expiresAt: Date.parse(result.expires_at) || Date.now() + 30 * 60 * 1000 });
    return result.token;
  }

  /** Retrouve un commentaire publié (sur la branche principale) à partir de son identifiant. */
  async findComment(pageKey, commentId) {
    const { repo, branch, commentsDir } = this.config;
    const dir = `${commentsDir}/${pageKey}`;
    let entries;
    try {
      entries = await this.request('GET', `/repos/${repo}/contents/${encodePath(dir)}?ref=${encodeURIComponent(branch)}`);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
    if (!Array.isArray(entries)) return null;
    const file = entries.find(
      (entry) => entry.type === 'file' && /\.ya?ml$/i.test(entry.name) && entry.name.replace(/\.ya?ml$/i, '').endsWith(`-${commentId}`),
    );
    if (!file) return null;
    const raw = await this.request('GET', `/repos/${repo}/contents/${encodePath(file.path)}?ref=${encodeURIComponent(branch)}`, {
      accept: 'application/vnd.github.raw+json',
    });
    const data = parseYaml(raw) || {};
    const id = String(data.id || commentId);
    return { id, name: data.name ? String(data.name) : '', thread: String(data.thread || id) };
  }

  /** Crée une branche, y ajoute le fichier du commentaire et ouvre la pull request. */
  async createCommentPullRequest({ head, path, content, commitMessage, title, body }) {
    const { repo, branch, label, reviewer } = this.config;
    const ref = await this.request('GET', `/repos/${repo}/git/ref/heads/${encodePath(branch)}`);
    await this.request('POST', `/repos/${repo}/git/refs`, { body: { ref: `refs/heads/${head}`, sha: ref.object.sha } });

    let pr;
    try {
      await this.request('PUT', `/repos/${repo}/contents/${encodePath(path)}`, {
        body: { message: commitMessage, content: utf8ToBase64(content), branch: head },
      });
      pr = await this.request('POST', `/repos/${repo}/pulls`, { body: { title, body, head, base: branch } });
    } catch (error) {
      await this.request('DELETE', `/repos/${repo}/git/refs/heads/${encodePath(head)}`).catch(() => {});
      throw error;
    }

    // Étapes de confort : un échec ici n'empêche pas la modération.
    if (label) {
      await this.request('POST', `/repos/${repo}/issues/${pr.number}/labels`, { body: { labels: [label] } }).catch((error) =>
        console.warn(`Étiquette non ajoutée : ${error.message}`),
      );
    }
    if (reviewer) {
      await this.request('POST', `/repos/${repo}/pulls/${pr.number}/requested_reviewers`, {
        body: { reviewers: [reviewer] },
      }).catch((error) => console.warn(`Relecteur non demandé : ${error.message}`));
    }
    return pr;
  }
}

export function resetTokenCache() {
  tokenCache.clear();
}
