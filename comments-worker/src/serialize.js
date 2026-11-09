/**
 * Construction du fichier de commentaire (YAML) et du texte de la pull request.
 */
import { Document, Scalar } from 'yaml';

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 32 caractères sans ambiguïté (pas de l, o, 0, 1)

export function generateId(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte & 31]).join('');
}

const pad = (n) => String(n).padStart(2, '0');

/** Date ISO 8601 avec le décalage du fuseau choisi, ex. 2026-11-09T14:20:05+01:00 */
export function formatDate(date, timeZone = 'UTC') {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Nom de fichier triable chronologiquement : 20261109132005-abcdefgh23.yml */
export function commentFileName(date, id) {
  const stamp =
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `${stamp}-${id}.yml`;
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const FIELD_ORDER = ['id', 'name', 'url', 'avatar', 'author', 'reply_to', 'reply_to_name', 'thread', 'date', 'message', 'html'];
const BLOCK_FIELDS = new Set(['message', 'html']);

/**
 * Sérialise un commentaire en YAML lisible.
 * Les textes courts sont toujours entre guillemets (évite que « yes », « no »,
 * « 1:30 »… soient interprétés autrement par le YAML de Jekyll) ; le message
 * et son HTML sont en bloc littéral pour rester lisibles dans les diffs.
 */
export function toYaml(comment) {
  const ordered = {};
  for (const key of FIELD_ORDER) {
    const value = comment[key];
    if (value === undefined || value === null || value === '' || value === false) continue;
    ordered[key] = value;
  }
  const doc = new Document(ordered);
  for (const pair of doc.contents.items) {
    if (!(pair.value instanceof Scalar) || typeof pair.value.value !== 'string') continue;
    pair.value.type = BLOCK_FIELDS.has(pair.key.value) ? Scalar.BLOCK_LITERAL : Scalar.QUOTE_DOUBLE;
  }
  return doc.toString({ lineWidth: 0 });
}

/* ---------- Pull request ---------- */

/** Échappe un texte court pour l'insérer dans du Markdown GitHub (sans mention @). */
export function escapeInline(text) {
  return String(text)
    .replace(/[\\`*_{}[\]()#+!|<>~]/g, '\\$&')
    .replace(/@/g, '@\u200b');
}

function fence(text) {
  const longest = Math.max(0, ...(String(text).match(/`+/g) || []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

export function truncate(text, max) {
  const value = String(text);
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildPullRequest({ comment, pageTitle, pageUrl, path, parent }) {
  const title = truncate(`Commentaire de ${comment.name} sur « ${pageTitle || 'une page'} »`, 120);
  const link = `${pageUrl}#comment-${comment.id}`;
  const ticks = fence(comment.message);

  const lines = [
    `**${escapeInline(comment.name)}** a commenté [${escapeInline(pageTitle || pageUrl)}](${pageUrl}).`,
    '',
  ];

  if (parent) {
    lines.push(`↪ En réponse à **${escapeInline(parent.name || parent.id)}** (\`${parent.id}\`).`, '');
  }

  if (comment.author) {
    lines.push(
      '> [!WARNING]',
      "> Ce commentaire est signé du nom d'un auteur du blog. Vérifiez qu'il vient bien de lui avant de fusionner.",
      '',
    );
  }

  lines.push(
    `${ticks}text`,
    comment.message,
    ticks,
    '',
    '| | |',
    '|---|---|',
    `| Nom | ${escapeInline(comment.name)} |`,
    `| Site web | ${comment.url ? `<${comment.url}>` : '—'} |`,
    `| Avatar Gravatar | ${comment.avatar ? 'oui' : 'non'} |`,
    `| Identifiant | \`${comment.id}\` |`,
    `| Fichier | \`${path}\` |`,
    '',
    '---',
    `**Fusionner** cette pull request publie le commentaire ([lien après publication](${link})). **La fermer** le rejette.`,
    '',
    'Vous pouvez aussi corriger le fichier avant de fusionner (onglet *Files changed* → *Edit file*). Si vous modifiez `message`, pensez à adapter `html`.',
  );

  return { title, body: lines.join('\n') };
}
