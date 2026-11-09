/**
 * Lecture et validation de la configuration du Worker.
 *
 * Les valeurs publiques viennent de la section [vars] de wrangler.toml,
 * les valeurs sensibles des secrets (npx wrangler secret put NOM).
 */

export class ConfigError extends Error {}

function list(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Nom comparable : casse et forme Unicode (é composé ou décomposé) ignorées. */
export function normalizeName(value) {
  return String(value || '').normalize('NFC').trim().toLowerCase();
}

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    throw new ConfigError(`ALLOWED_ORIGINS contient une origine invalide : « ${value} »`);
  }
}

function validTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function loadConfig(env) {
  const repo = String(env.GITHUB_REPO || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new ConfigError('GITHUB_REPO doit être de la forme « compte/depot ».');
  }

  const allowedOrigins = list(env.ALLOWED_ORIGINS).map(normalizeOrigin);
  if (allowedOrigins.length === 0) {
    throw new ConfigError('ALLOWED_ORIGINS doit contenir au moins une origine (ex. https://compte.github.io).');
  }

  const hasToken = Boolean(env.GITHUB_TOKEN);
  const hasApp = Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
  if (!hasToken && !hasApp) {
    throw new ConfigError(
      'Aucun accès GitHub configuré : définissez GITHUB_APP_ID et GITHUB_APP_PRIVATE_KEY (recommandé) ou GITHUB_TOKEN.',
    );
  }

  return {
    repo,
    branch: String(env.GITHUB_BRANCH || 'main').trim(),
    commentsDir: String(env.COMMENTS_DIR || '_data/comments').trim().replace(/^\/+|\/+$/g, ''),
    allowedOrigins,
    timeZone: validTimeZone(String(env.TIMEZONE || 'UTC').trim()),
    // Un ou plusieurs noms (séparés par des virgules) qui reçoivent le badge « Auteur ».
    authorNames: list(env.AUTHOR_NAME).map(normalizeName),
    label: env.PR_LABEL === undefined ? 'commentaire' : String(env.PR_LABEL).trim(),
    reviewer: String(env.GITHUB_REVIEWER || '').trim(),
    maxLinks: int(env.MAX_LINKS, 3),
    maxMessageLength: int(env.MAX_MESSAGE_LENGTH, 5000),
    minSubmitDelayMs: int(env.MIN_SUBMIT_DELAY_SECONDS, 3) * 1000,
    blockedTerms: list(env.BLOCKED_TERMS).map((term) => term.toLowerCase()),
    turnstileSecret: String(env.TURNSTILE_SECRET_KEY || '').trim(),
    github: {
      apiUrl: String(env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, ''),
      token: env.GITHUB_TOKEN || '',
      appId: String(env.GITHUB_APP_ID || '').trim(),
      privateKey: env.GITHUB_APP_PRIVATE_KEY || '',
      installationId: String(env.GITHUB_INSTALLATION_ID || '').trim(),
    },
  };
}
