import { createPublicKey, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { loadConfig } from '../src/config.js';
import { createAppJwt } from '../src/github.js';
import { renderMarkdown } from '../src/markdown.js';
import { buildPullRequest, commentFileName, escapeInline, formatDate, generateId, toYaml } from '../src/serialize.js';
import { normalizeMessage, normalizeUrl, validateComment } from '../src/validate.js';
import { APP_PRIVATE_KEY, APP_PUBLIC_KEY, makeEnv, validInput } from './helpers.js';

const config = loadConfig(makeEnv());

describe('configuration', () => {
  it('refuse un dépôt mal formé', () => {
    expect(() => loadConfig(makeEnv({ GITHUB_REPO: 'pas-de-slash' }))).toThrow(/GITHUB_REPO/);
  });
  it('exige un accès GitHub', () => {
    expect(() => loadConfig(makeEnv({ GITHUB_APP_ID: '', GITHUB_APP_PRIVATE_KEY: '' }))).toThrow(/GitHub/);
  });
  it('accepte un jeton à la place de la GitHub App', () => {
    expect(loadConfig(makeEnv({ GITHUB_APP_ID: '', GITHUB_TOKEN: 'github_pat_x' })).github.token).toBe('github_pat_x');
  });
  it('normalise les origines et ignore un fuseau inconnu', () => {
    const c = loadConfig(makeEnv({ ALLOWED_ORIGINS: 'https://exemple.github.io/ , http://localhost:4000', TIMEZONE: 'Mars/Olympus' }));
    expect(c.allowedOrigins).toEqual(['https://exemple.github.io', 'http://localhost:4000']);
    expect(c.timeZone).toBe('UTC');
  });
});

describe('validation', () => {
  it('accepte un commentaire correct', () => {
    const { data, errors, spam } = validateComment(validInput({ email: 'Marie@Example.org ', url: 'marie.example' }), config);
    expect(errors).toEqual({});
    expect(spam).toBeNull();
    expect(data.email).toBe('marie@example.org');
    expect(data.url).toBe('https://marie.example/');
  });

  it('signale les champs manquants ou invalides', () => {
    const { errors } = validateComment(
      validInput({ name: ' ', message: 'x', email: 'pas-un-email', url: 'javascript:alert(1)', page: '../etc', page_url: 'https://autre.site/x' }),
      config,
    );
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'page', 'page_url', 'url']);
  });

  it('limite le nombre de liens et la longueur', () => {
    const links = 'https://a.fr https://b.fr https://c.fr https://d.fr';
    expect(validateComment(validInput({ message: links }), config).errors.message).toMatch(/3 liens/);
    expect(validateComment(validInput({ message: 'a'.repeat(5001) }), config).errors.message).toMatch(/5000/);
    expect(validateComment(validInput({ name: 'Voir https://spam.example' }), config).errors.name).toMatch(/lien/);
  });

  it('repère les robots (champ piège, envoi trop rapide, termes interdits)', () => {
    expect(validateComment(validInput({ contact_me_by_fax_only: 'x' }), config).spam).toBe('honeypot');
    expect(validateComment(validInput({ t: String(Date.now() - 500) }), config).spam).toBe('too-fast');
    expect(validateComment(validInput({ message: 'Le meilleur CASINO EN LIGNE' }), config).spam).toBe('blocked-term');
  });

  it('nettoie le message', () => {
    expect(normalizeMessage('  Bonjour\r\n\r\n\r\n\r\nà tous\u202e  \u0007 ')).toBe('Bonjour\n\nà tous');
  });

  it('normalise les adresses de site', () => {
    expect(normalizeUrl('exemple.fr/blog')).toBe('https://exemple.fr/blog');
    expect(normalizeUrl('ftp://exemple.fr')).toBeNull();
    expect(normalizeUrl('https://user:pass@exemple.fr')).toBeNull();
    expect(normalizeUrl('localhost')).toBeNull();
    expect(normalizeUrl('')).toBe('');
  });

  it("accepte une réponse à un commentaire importé (identifiant de type UUID)", () => {
    const { errors, data } = validateComment(validInput({ reply_to: '3F2504E0-4F89-11D3-9A0C-0305E82C3301' }), config);
    expect(errors).toEqual({});
    expect(data.replyTo).toBe('3f2504e0-4f89-11d3-9a0c-0305e82c3301');
  });
});

describe('rendu Markdown', () => {
  it('rend la mise en forme courante', () => {
    const html = renderMarkdown('**gras** _italique_ `code`\n\n- un\n- deux\n\n> citation');
    expect(html).toContain('<strong>gras</strong>');
    expect(html).toContain('<em>italique</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<li>un</li>');
    expect(html).toContain('<blockquote>');
  });

  it('neutralise le HTML et les liens dangereux', () => {
    const attacks = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '[clic](javascript:alert(1))',
      '[clic](data:text/html;base64,PHNjcmlwdD4=)',
      '![img](https://exemple.fr/x.png)',
      '<a href="javascript:alert(1)">x</a>',
      '[a](vbscript:msgbox)',
    ];
    for (const attack of attacks) {
      const html = renderMarkdown(attack);
      // Aucune balise active : le texte peut apparaître, mais échappé (&lt;…&gt;).
      expect(html).not.toMatch(/<(script|img)\b/i);
      expect(html).not.toMatch(/<[a-z][^>]*\son\w+=/i);
      expect(html).not.toMatch(/href="(javascript|data|vbscript):/i);
    }
  });

  it('ajoute rel="nofollow ugc" aux liens et désactive les titres', () => {
    expect(renderMarkdown('Voir https://exemple.fr')).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(renderMarkdown('# Titre')).toBe('<p># Titre</p>');
  });

  it('conserve les sauts de ligne', () => {
    expect(renderMarkdown('ligne 1\nligne 2')).toBe('<p>ligne 1<br>\nligne 2</p>');
  });
});

describe('sérialisation', () => {
  it('génère des identifiants courts et sans ambiguïté', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-km-np-z2-9]{10}$/);
    expect(new Set(Array.from({ length: 500 }, () => generateId())).size).toBe(500);
  });

  it('formate la date dans le fuseau choisi, heure d’hiver comme d’été', () => {
    expect(formatDate(new Date('2026-11-09T13:20:05Z'), 'Europe/Zurich')).toBe('2026-11-09T14:20:05+01:00');
    expect(formatDate(new Date('2026-07-01T22:30:00Z'), 'Europe/Zurich')).toBe('2026-07-02T00:30:00+02:00');
    expect(formatDate(new Date('2026-11-09T13:20:05Z'), 'UTC')).toBe('2026-11-09T13:20:05+00:00');
  });

  it('nomme les fichiers pour un tri chronologique', () => {
    expect(commentFileName(new Date('2026-11-09T13:20:05Z'), 'abcdefgh23')).toBe('20261109132005-abcdefgh23.yml');
  });

  it('produit un YAML relu à l’identique, même avec des valeurs piégeuses', () => {
    const comment = {
      id: 'abcdefgh23',
      name: 'No',
      url: 'https://exemple.fr/?a=1#x',
      author: false,
      reply_to: '',
      date: '2026-11-09T14:20:05+01:00',
      message: '  indenté\n# pas un titre\n---\n: deux-points\n"guillemets" \'apostrophes\'\n\n',
      html: '<p>indenté</p>',
    };
    const yamlText = toYaml(comment);
    expect(yamlText).toContain('name: "No"');
    expect(yamlText).toContain('message: |');
    expect(yamlText).not.toContain('author');
    expect(yamlText).not.toContain('reply_to');
    const parsed = parseYaml(yamlText);
    expect(parsed.name).toBe('No');
    expect(parsed.message).toBe(comment.message);
    expect(parsed.date).toBe(comment.date);
  });

  it('protège la pull request contre les mentions et le Markdown', () => {
    expect(escapeInline('@octocat *gras*')).toBe('@\u200boctocat \\*gras\\*');
    const { title, body } = buildPullRequest({
      comment: { id: 'abc', name: '@admin', message: 'Bloc ``` piégé', url: '', author: true },
      pageTitle: 'Mon article',
      pageUrl: 'https://exemple.github.io/a.html',
      path: '_data/comments/a/1-abc.yml',
      parent: null,
    });
    expect(title).toBe('Commentaire de @admin sur « Mon article »');
    expect(body).toContain('@\u200badmin');
    expect(body).toContain('````text\nBloc ``` piégé\n````');
    expect(body).toContain('[!WARNING]');
  });
});

describe('authentification GitHub App', () => {
  it('signe un JWT RS256 valide avec la clé PKCS#1 fournie par GitHub', async () => {
    const now = Date.UTC(2026, 10, 9, 13, 0, 0);
    const jwt = await createAppJwt('123456', APP_PRIVATE_KEY, now);
    const [header, payload, signature] = jwt.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url'))).toEqual({ alg: 'RS256', typ: 'JWT' });
    const claims = JSON.parse(Buffer.from(payload, 'base64url'));
    expect(claims.iss).toBe('123456');
    expect(claims.exp - claims.iat).toBe(540);
    const ok = verify('sha256', Buffer.from(`${header}.${payload}`), createPublicKey(APP_PUBLIC_KEY), Buffer.from(signature, 'base64url'));
    expect(ok).toBe(true);
  });

  it('accepte une clé collée sur une seule ligne avec des \\n littéraux', async () => {
    const oneLine = APP_PRIVATE_KEY.trim().replace(/\n/g, '\\n');
    await expect(createAppJwt('1', oneLine)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('explique une clé invalide', async () => {
    await expect(createAppJwt('1', 'pas une clé')).rejects.toThrow(/PEM/);
  });
});
