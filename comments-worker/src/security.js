/**
 * Protections : origine autorisée, Cloudflare Turnstile, limitation de débit.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isAllowedOrigin(origin, config) {
  return Boolean(origin) && config.allowedOrigins.includes(origin);
}

export function corsHeaders(origin, config) {
  if (!isAllowedOrigin(origin, config)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function verifyTurnstile(secret, token, ip) {
  if (!token) return { success: false, codes: ['missing-input-response'] };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    const result = await response.json();
    return { success: result.success === true, codes: result['error-codes'] || [] };
  } catch (error) {
    return { success: false, codes: ['verification-unavailable'], error: error.message };
  }
}

/** Limitation optionnelle (binding RATE_LIMITER déclaré dans wrangler.toml). */
export async function checkRateLimit(env, key) {
  if (!env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== 'function' || !key) return true;
  try {
    const { success } = await env.RATE_LIMITER.limit({ key });
    return success;
  } catch {
    return true; // en cas de panne du limiteur, on ne bloque pas les visiteurs
  }
}
