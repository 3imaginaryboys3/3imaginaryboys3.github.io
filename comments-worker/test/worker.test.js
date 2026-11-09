import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { resetTokenCache } from '../src/github.js';
import worker from '../src/index.js';
import { ORIGIN, PAGE_URL, formRequest, jsonRequest, makeEnv, mockGitHub, validInput } from './helpers.js';

const decode = (b64) => Buffer.from(b64, 'base64').toString('utf8');

let github;

beforeEach(() => {
  resetTokenCache();
  github = mockGitHub();
  vi.stubGlobal('fetch', github.fetchMock);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function useGitHub(options) {
  github = mockGitHub(options);
  vi.stubGlobal('fetch', github.fetchMock);
}

describe('requêtes de service', () => {
  it('répond au test de santé', async () => {
    const res = await worker.fetch(new Request('https://w.dev/'), makeEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, repo: 'exemple/exemple.github.io' });
  });

  it('répond au pré-contrôle CORS uniquement pour les origines autorisées', async () => {
    const ok = await worker.fetch(new Request('https://w.dev/api/comments', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), makeEnv());
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const ko = await worker.fetch(new Request('https://w.dev/api/comments', { method: 'OPTIONS', headers: { Origin: 'https://pirate.example' } }), makeEnv());
    expect(ko.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('signale une configuration incomplète', async () => {
    const res = await worker.fetch(new Request('https://w.dev/'), makeEnv({ GITHUB_REPO: '' }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/GITHUB_REPO/);
  });
});

describe('nouveau commentaire', () => {
  it('ouvre une pull request avec le fichier YAML du commentaire', async () => {
    const res = await worker.fetch(
      jsonRequest(validInput({ message: 'Très **bon** article.\n\n<script>alert(1)</script>', email: 'marie@example.org', url: 'marie.example' })),
      makeEnv(),
    );
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload).toMatchObject({ ok: true, status: 'pending' });
    expect(payload.comment.html).toContain('<strong>bon</strong>');
    expect(payload.comment.html).toContain('&lt;script&gt;');

    const sequence = github.calls.map((c) => `${c.method} ${c.path.split('?')[0]}`);
    expect(sequence).toEqual([
      'GET /repos/exemple/exemple.github.io/installation',
      'POST /app/installations/42/access_tokens',
      'GET /repos/exemple/exemple.github.io/git/ref/heads/main',
      'POST /repos/exemple/exemple.github.io/git/refs',
      expect.stringMatching(/^PUT \/repos\/exemple\/exemple\.github\.io\/contents\/_data\/comments\/2026-11-09-mon-article\/\d{14}-[a-z2-9]{10}\.yml$/),
      'POST /repos/exemple/exemple.github.io/pulls',
      'POST /repos/exemple/exemple.github.io/issues/7/labels',
    ]);

    const put = github.calls.find((c) => c.method === 'PUT');
    const data = parseYaml(decode(put.body.content));
    expect(data).toMatchObject({
      id: payload.comment.id,
      name: 'Marie',
      url: 'https://marie.example/',
      avatar: expect.stringMatching(/^[0-9a-f]{64}$/),
      message: 'Très **bon** article.\n\n<script>alert(1)</script>',
    });
    expect(data.date).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
    expect(data).not.toHaveProperty('email');
    expect(decode(put.body.content)).not.toContain('marie@example.org');
    expect(put.body.branch).toBe(`comment-${payload.comment.id}`);

    const pr = github.calls.find((c) => c.path.endsWith('/pulls'));
    expect(pr.body).toMatchObject({ base: 'main', head: `comment-${payload.comment.id}` });
    expect(pr.body.title).toBe('Commentaire de Marie sur « Mon article »');
    expect(pr.body.body).toContain(`${PAGE_URL}#comment-${payload.comment.id}`);

    const auth = github.calls.find((c) => c.path.endsWith('/pulls')).headers.Authorization;
    expect(auth).toBe('Bearer ghs_installation');
  });

  it('réutilise le jeton d’installation entre deux commentaires', async () => {
    await worker.fetch(jsonRequest(validInput()), makeEnv());
    await worker.fetch(jsonRequest(validInput({ name: 'Paul' })), makeEnv());
    expect(github.calls.filter((c) => c.path.includes('access_tokens'))).toHaveLength(1);
  });

  it('fonctionne avec un jeton personnel et demande une relecture', async () => {
    const env = makeEnv({ GITHUB_APP_ID: '', GITHUB_APP_PRIVATE_KEY: '', GITHUB_TOKEN: 'github_pat_test', GITHUB_REVIEWER: 'hugo' });
    const res = await worker.fetch(jsonRequest(validInput()), env);
    expect(res.status).toBe(201);
    expect(github.calls.some((c) => c.path.includes('installation'))).toBe(false);
    expect(github.calls.find((c) => c.path.endsWith('/requested_reviewers')).body).toEqual({ reviewers: ['hugo'] });
  });

  it("marque les commentaires de l'auteur et le signale dans la pull request", async () => {
    await worker.fetch(jsonRequest(validInput({ name: 'hugo' })), makeEnv());
    const data = parseYaml(decode(github.calls.find((c) => c.method === 'PUT').body.content));
    expect(data.author).toBe(true);
    expect(github.calls.find((c) => c.path.endsWith('/pulls')).body.body).toContain('[!WARNING]');
  });

  it('accepte plusieurs auteurs (casse et accents décomposés ignorés)', async () => {
    const env = makeEnv({ AUTHOR_NAME: 'Chems, Noé' });
    await worker.fetch(jsonRequest(validInput({ name: 'NOÉ' })), env);
    const author = parseYaml(decode(github.calls.find((c) => c.method === 'PUT').body.content));
    expect(author.author).toBe(true);

    github.calls.length = 0;
    await worker.fetch(jsonRequest(validInput({ name: 'Paul' })), env);
    const visitor = parseYaml(decode(github.calls.find((c) => c.method === 'PUT').body.content));
    expect(visitor.author).toBeUndefined();
  });
});

describe('réponses', () => {
  const dir = '_data/comments/2026-11-09-mon-article';
  const files = {
    [`${dir}/20261101100000-racine0001.yml`]: 'id: "racine0001"\nname: "Alice"\ndate: "2026-11-01T11:00:00+01:00"\nmessage: |\n  Premier\n',
    [`${dir}/20261102100000-reponse001.yml`]:
      'id: "reponse001"\nname: "Bob"\nreply_to: "racine0001"\nthread: "racine0001"\ndate: "2026-11-02T11:00:00+01:00"\nmessage: |\n  Réponse\n',
  };

  it('rattache une réponse au fil de son parent', async () => {
    useGitHub({ files });
    const res = await worker.fetch(jsonRequest(validInput({ reply_to: 'racine0001' })), makeEnv());
    expect(res.status).toBe(201);
    const data = parseYaml(decode(github.calls.find((c) => c.method === 'PUT').body.content));
    expect(data).toMatchObject({ reply_to: 'racine0001', thread: 'racine0001' });
    expect(data).not.toHaveProperty('reply_to_name');
  });

  it('garde le fil principal et mémorise le nom lors d’une réponse à une réponse', async () => {
    useGitHub({ files });
    await worker.fetch(jsonRequest(validInput({ reply_to: 'reponse001' })), makeEnv());
    const data = parseYaml(decode(github.calls.find((c) => c.method === 'PUT').body.content));
    expect(data).toMatchObject({ reply_to: 'reponse001', reply_to_name: 'Bob', thread: 'racine0001' });
    expect(github.calls.find((c) => c.path.endsWith('/pulls')).body.body).toContain('En réponse à **Bob**');
  });

  it('refuse une réponse à un commentaire inconnu', async () => {
    useGitHub({ files });
    const res = await worker.fetch(jsonRequest(validInput({ reply_to: 'inconnu99' })), makeEnv());
    expect(res.status).toBe(400);
    expect((await res.json()).fields.reply_to).toMatch(/introuvable/);
    expect(github.calls.some((c) => c.method === 'PUT')).toBe(false);
  });
});

describe('protections', () => {
  it('refuse une origine non autorisée', async () => {
    const res = await worker.fetch(jsonRequest(validInput(), { origin: 'https://pirate.example' }), makeEnv());
    expect(res.status).toBe(403);
    expect(github.calls).toHaveLength(0);
  });

  it('refuse un envoi démesuré sans le lire', async () => {
    const res = await worker.fetch(jsonRequest(validInput(), { headers: { 'Content-Length': String(200 * 1024) } }), makeEnv());
    expect(res.status).toBe(413);
    expect(github.calls).toHaveLength(0);
  });

  it('renvoie les erreurs de saisie champ par champ', async () => {
    const res = await worker.fetch(jsonRequest(validInput({ name: '', message: '' })), makeEnv());
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(Object.keys(payload.fields).sort()).toEqual(['message', 'name']);
    expect(github.calls).toHaveLength(0);
  });

  it('ignore silencieusement les robots', async () => {
    const res = await worker.fetch(jsonRequest(validInput({ contact_me_by_fax_only: 'http://spam' })), makeEnv());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(github.calls).toHaveLength(0);
  });

  it('vérifie Turnstile quand une clé secrète est configurée', async () => {
    useGitHub({ turnstile: false });
    const env = makeEnv({ TURNSTILE_SECRET_KEY: 'secret' });
    const res = await worker.fetch(jsonRequest(validInput({ 'cf-turnstile-response': 'jeton' })), env);
    expect(res.status).toBe(403);
    expect(github.calls.map((c) => c.path)).toEqual(['/turnstile/v0/siteverify']);
    expect(github.calls[0].body.get('remoteip')).toBe('203.0.113.7');

    useGitHub({ turnstile: true });
    const ok = await worker.fetch(jsonRequest(validInput({ 'cf-turnstile-response': 'jeton' })), env);
    expect(ok.status).toBe(201);
  });

  it('applique la limitation de débit si elle est activée', async () => {
    const env = makeEnv({ RATE_LIMITER: { limit: async () => ({ success: false }) } });
    const res = await worker.fetch(jsonRequest(validInput()), env);
    expect(res.status).toBe(429);
    expect(github.calls).toHaveLength(0);
  });

  it('nettoie la branche et répond 502 si GitHub échoue', async () => {
    useGitHub({ failOn: 'POST /repos/exemple/exemple.github.io/pulls' });
    const res = await worker.fetch(jsonRequest(validInput()), makeEnv());
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/Réessayez/);
    expect(github.calls.some((c) => c.method === 'DELETE' && c.path.includes('/git/refs/heads/comment-'))).toBe(true);
  });
});

describe('formulaire sans JavaScript', () => {
  it('redirige vers la page avec #comment-sent', async () => {
    const res = await worker.fetch(formRequest(validInput({ t: '' })), makeEnv());
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(`${PAGE_URL}#comment-sent`);
  });

  it('redirige vers #comment-error en cas de problème', async () => {
    const res = await worker.fetch(formRequest(validInput({ t: '', message: '' })), makeEnv());
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(`${PAGE_URL}#comment-error`);
  });

  it("ne redirige jamais vers un site étranger", async () => {
    const res = await worker.fetch(formRequest(validInput({ t: '', page_url: 'https://pirate.example/' })), makeEnv());
    expect(res.status).toBe(400);
    expect(res.headers.get('Location')).toBeNull();
  });
});
