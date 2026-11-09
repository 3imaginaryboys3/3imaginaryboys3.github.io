# Commentaires pour un blog Jekyll sur GitHub Pages

Un espace de commentaires complet pour un blog Jekyll hébergé sur GitHub Pages. Il n'y a ni base de données, ni serveur à maintenir, ni service tiers qui puisse fermer avec vos données.

Chaque commentaire devient un fichier de votre dépôt. Vous le validez en fusionnant une pull request, puis GitHub Pages l'intègre à la page comme n'importe quel autre contenu.

```
 Lecteur ──(formulaire)──▶ Worker Cloudflare ──(API GitHub)──▶ Pull request
                           · validation                        │
                           · anti-robot Turnstile              │ vous fusionnez
                           · rendu Markdown sûr                ▼
 Page publiée ◀──(GitHub Pages reconstruit le site)── _data/comments/<article>/<date>-<id>.yml
```

## Fonctionnalités

- **Commentaires sans compte** : nom, message, site web facultatif, et éventuellement un avatar Gravatar.
- **Réponses en fils** : on peut répondre à une réponse, avec la mention « En réponse à … ».
- **Mise en forme Markdown** : gras, italique, code, listes, citations, liens. Le HTML brut, les images et les liens `javascript:` sont neutralisés.
- **Modération** : chaque commentaire arrive sous forme de pull request. Fusionner publie, fermer rejette, et vous pouvez corriger le texte avant de publier.
- **Anti-spam en plusieurs couches** :
  - Cloudflare Turnstile (invisible la plupart du temps) ;
  - un champ piège pour les robots et un délai minimal avant envoi ;
  - un nombre de liens limité, une liste de mots interdits, une limitation de débit en option ;
  - et, en dernier recours, votre validation.
- **Badge « Auteur »** sur vos propres réponses.
- **Envoi sans rechargement** : le commentaire apparaît aussitôt avec la mention « En attente de validation », et les erreurs s'affichent champ par champ.
- **Fonctionne aussi sans JavaScript** (formulaire classique), sauf si Turnstile est activé.
- **« Se souvenir de moi »** : nom et site sont mémorisés sur l'appareil du lecteur, s'il le souhaite.
- **Accessible** : vrais libellés, messages annoncés aux lecteurs d'écran, navigation au clavier, Ctrl/⌘ + Entrée pour envoyer.
- **S'adapte à votre thème** : police et couleurs héritées, clair comme sombre, une variable pour la couleur d'accent.
- **Dates en français** dans votre fuseau horaire, et compteur de commentaires pour vos listes d'articles.
- **Respect de la vie privée** : aucune adresse e-mail n'est jamais écrite dans le dépôt (qui est public), et aucun script de pistage n'est ajouté.
- **Gratuit** : offres gratuites de Cloudflare Workers et de GitHub.

## Où sont les fichiers dans ce blog

```
_includes/comments/section.html    section complète (liste + formulaire), incluse par
                                   _layouts/minimal.html et _layouts/old_internet.html
_includes/comments/item.html       un commentaire
_includes/comments/form.html       le formulaire
_includes/comments/count.html      « 3 commentaires » pour les listes d'articles
assets/comments/comments.css       styles de base (adaptés à chaque gabarit dans
                                   assets/css/minimal.css et assets/css/old-internet.css)
assets/comments/comments.js        envoi, réponses, mémorisation (sans dépendance)
.github/workflows/comments-cleanup.yml   supprime les branches des commentaires traités
_config.yml (bloc comments)        adresse du Worker, clé Turnstile, options
comments-worker/                   le service qui reçoit les commentaires (Cloudflare Workers),
                                   exclu de la construction du site
  src/                               code source
  test/                              tests automatisés (npm test)
  wrangler.toml                      configuration du déploiement
```

---

## Installation

Comptez environ 45 minutes la première fois. Il vous faut un compte GitHub (le vôtre), un compte Cloudflare gratuit et Node.js 20 ou plus récent sur votre ordinateur.

### 1. Ajouter les fichiers au blog

Déjà fait dans ce dépôt : les fichiers sont en place, Cusdis a été retiré des gabarits `minimal` et `old_internet`, et `_config.yml` contient le bloc `comments` (il reste `endpoint` et `turnstile_sitekey` à compléter aux étapes 3 et 5). Pour un nouveau gabarit d'article, ajoutez simplement :

```liquid
{% include comments/section.html %}
```

Facultatif : affichez le nombre de commentaires dans une liste d'articles :

   ```liquid
{% for post in site.posts %}
  <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  {% include comments/count.html page=post %}
{% endfor %}
```

### 2. Créer la GitHub App

C'est elle qui ouvre les pull requests. Elle n'a accès qu'au dépôt du blog, son accès n'expire pas, et comme les pull requests viennent d'elle (et non de vous), GitHub vous envoie bien une notification à chacune.

1. GitHub → photo de profil → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**.
2. Remplissez :
   - **GitHub App name** : par exemple `Commentaires de monblog`. Le nom doit être unique sur GitHub et sera visible sur les pull requests.
   - **Homepage URL** : l'adresse de votre blog.
   - **Webhook** : décochez **Active**.
   - **Repository permissions** :
     - **Contents** : *Read and write* ;
     - **Pull requests** : *Read and write* ;
     - **Issues** : *Read and write* (facultatif, pour l'étiquette `commentaire`) ;
     - **Metadata** passe automatiquement en lecture seule.
   - **Where can this GitHub App be installed?** : *Only on this account*.
3. Cliquez sur **Create GitHub App**. Notez l'**App ID** affiché en haut de la page.
4. En bas de la page, sous **Private keys**, cliquez sur **Generate a private key**. Un fichier `.pem` est téléchargé : gardez-le précieusement et ne le mettez jamais dans le dépôt.
5. Dans le menu de gauche, cliquez sur **Install App** → **Install**, choisissez **Only select repositories**, puis votre dépôt de blog.

### 3. Créer la protection Cloudflare Turnstile

1. Tableau de bord Cloudflare → **Turnstile** → **Add widget**.
2. Donnez-lui un nom, ajoutez le nom d'hôte de votre blog (par exemple `votre-compte.github.io`, ou votre domaine personnalisé) et laissez le mode **Managed**.
3. Notez la **clé de site** (publique) et la **clé secrète**.

### 4. Déployer le Worker

Dans un terminal, depuis le dossier `comments-worker/` :

```bash
npm install
npx wrangler login              # ouvre le navigateur pour vous connecter à Cloudflare
```

Ouvrez `wrangler.toml` et adaptez la section `[vars]` :

| Variable | À mettre |
|---|---|
| `GITHUB_REPO` | `votre-compte/votre-depot` |
| `GITHUB_BRANCH` | la branche publiée par GitHub Pages (souvent `main`) |
| `ALLOWED_ORIGINS` | l'adresse de votre blog (`https://votre-compte.github.io`, ou votre domaine), plus `http://localhost:4000` pour tester en local |
| `TIMEZONE` | votre fuseau, par exemple `Europe/Zurich` |
| `AUTHOR_NAME` | le ou les noms des auteurs, séparés par des virgules (ils font apparaître le badge « Auteur ») |

Enregistrez ensuite les secrets. Chaque commande vous demande la valeur, ou la lit dans le fichier indiqué :

```bash
npx wrangler secret put GITHUB_APP_ID                       # l'App ID de l'étape 2
npx wrangler secret put GITHUB_APP_PRIVATE_KEY < ~/Téléchargements/votre-app.2026-11-09.private-key.pem
npx wrangler secret put TURNSTILE_SECRET_KEY                # la clé secrète de l'étape 3
```

Puis déployez :

```bash
npx wrangler deploy
```

Wrangler affiche l'adresse du Worker, du type `https://blog-comments.votre-sous-domaine.workers.dev`. En l'ouvrant dans le navigateur, vous devez voir `{"ok":true,…}`. Si un message parle de configuration, il indique précisément ce qui manque.

### 5. Brancher le blog sur le Worker

Dans `_config.yml`, complétez :

```yaml
comments:
  endpoint: "https://blog-comments.votre-sous-domaine.workers.dev"
  turnstile_sitekey: "0x4AAAAAAA..."   # la clé de SITE de l'étape 3
```

Commitez et poussez. GitHub Pages reconstruit le site.

### 6. Régler le dépôt (2 minutes)

- **Settings → General → Pull Requests** : cochez **Automatically delete head branches**. Le workflow fourni supprime aussi les branches des commentaires refusés.
- **Issues → Labels → New label** : créez l'étiquette `commentaire`, pour filtrer facilement les commentaires en attente.
- Vérifiez que vous « surveillez » le dépôt (bouton **Watch** en haut du dépôt). C'est le cas par défaut pour vos propres dépôts. Vous recevrez alors un e-mail à chaque commentaire.

### 7. Essayer

Postez un commentaire sur un article. Il apparaît aussitôt chez vous avec la mention « En attente de validation ». Une pull request « Commentaire de … » s'ouvre dans votre dépôt : fusionnez-la. Une à deux minutes plus tard (jusqu'à dix selon GitHub), le commentaire est en ligne.

---

## Modérer au quotidien

| Je veux… | Je fais… |
|---|---|
| publier un commentaire | **Merge** sur la pull request (fonctionne aussi depuis l'appli mobile GitHub) |
| le refuser | **Close pull request** |
| corriger une faute avant publication | onglet **Files changed** → **⋯** → **Edit file**. Si vous modifiez `message`, adaptez aussi `html`, qui est la version affichée. |
| répondre | utilisez le formulaire de votre blog avec votre nom (`AUTHOR_NAME`) : votre réponse aura le badge « Auteur ». Elle arrive aussi en pull request, à fusionner. |
| supprimer un commentaire publié | supprimez son fichier dans `_data/comments/<article>/` et commitez. Ses réponses éventuelles restent affichées. |
| fermer les commentaires d'un article | ajoutez `comments_closed: true` dans son en-tête |
| masquer la section sur un article | ajoutez `comments: false` dans son en-tête |
| fermer les commentaires partout | `comments.closed: true` dans `_config.yml` |

Les pull requests d'un commentaire signé de votre nom portent un avertissement. Si ce n'est pas vous, refusez-la : quelqu'un a tenté d'usurper votre badge.

## Options

**`_config.yml` (bloc `comments`)**

| Clé | Rôle |
|---|---|
| `endpoint` | adresse du Worker (obligatoire) |
| `turnstile_sitekey` | clé de site Turnstile ; vide = pas de vérification anti-robot côté navigateur |
| `gravatar` | `true` : champ e-mail facultatif et avatars Gravatar ; `false` (par défaut) : initiales colorées, aucun e-mail demandé |
| `closed` | `true` : ferme tous les formulaires |
| `privacy_url` | lien vers votre page de confidentialité, affiché sous le formulaire |

**En-tête d'un article** : `comments: false`, `comments_closed: true`, `comments_id: identifiant-fixe`. Ce dernier rattache les commentaires à cet identifiant plutôt qu'à l'article. C'est utile si vous changez la date ou le titre d'un article qui a déjà des commentaires.

**Worker (`wrangler.toml`)** : en plus des variables de l'étape 4, vous pouvez régler :

| Variable | Rôle | Défaut |
|---|---|---|
| `COMMENTS_DIR` | dossier des commentaires | `_data/comments` |
| `PR_LABEL` | étiquette ajoutée aux pull requests | `commentaire` |
| `GITHUB_REVIEWER` | compte à qui demander une relecture | aucun |
| `MAX_LINKS` | nombre de liens autorisés par commentaire | 3 |
| `MAX_MESSAGE_LENGTH` | longueur maximale | 5000 |
| `MIN_SUBMIT_DELAY_SECONDS` | délai minimal entre l'ouverture de la page et l'envoi | 3 |
| `BLOCKED_TERMS` | mots refusés, séparés par des virgules | aucun |

Une limitation de débit (5 commentaires par minute et par adresse IP) peut être activée en décommentant le bloc `[[ratelimits]]` de `wrangler.toml`.

Après toute modification de `wrangler.toml`, relancez `npx wrangler deploy`.

## Format des données

Les commentaires d'un article sont rangés dans `_data/comments/<identifiant>/`. L'identifiant est calculé à partir du nom du fichier de l'article, en minuscules et sans accents ni ponctuation. Pour `_posts/2026-04-25-CRR-de-Paris-CNSM-et-détresse-psychologique.md`, c'est `2026-04-25-crr-de-paris-cnsm-et-detresse-psychologique`. Renommer le fichier d'un article change donc son identifiant : ajoutez alors `comments_id: <ancien identifiant>` dans son en-tête.

Chaque fichier s'appelle `<date UTC>-<id>.yml`, ce qui le place dans l'ordre chronologique :

```yaml
id: "pau1x8vbn3"
name: "Paul"
url: "https://paul.example/"      # facultatif
avatar: "9f86d0…"                 # facultatif : empreinte SHA-256 de l'e-mail (si gravatar: true)
author: true                      # facultatif : réponse de l'auteur du blog
reply_to: "hug0r3p7ly"            # facultatif : commentaire auquel il répond
reply_to_name: "Hugo"             # facultatif : nom affiché « En réponse à … »
thread: "m4rie2k9qa"              # facultatif : premier commentaire du fil
date: "2026-11-04T07:05:00+01:00"
message: |-
  > il n'y a presque rien avant le col du Marchairuz

  Confirmé, il y a juste une fontaine au chalet de la Bassine.
html: |-
  <blockquote>
  <p>il n'y a presque rien avant le col du Marchairuz</p>
  </blockquote>
  <p>Confirmé, il y a juste une fontaine au chalet de la Bassine.</p>
```

`message` est le texte d'origine. `html` est la version affichée, produite et assainie par le Worker.

## Sécurité et vie privée

- **Aucune adresse e-mail dans le dépôt.** Par défaut, l'e-mail n'est même pas demandé. Avec `gravatar: true`, seule son empreinte SHA-256 est enregistrée, comme le fait Gravatar. Une empreinte d'adresse courante peut toutefois être retrouvée par force brute : n'activez l'option que si les avatars vous importent.
- **Aucune adresse IP ni localisation enregistrée.**
- **Les pull requests sont publiques si votre dépôt l'est.** Un commentaire refusé reste lisible dans sa pull request fermée, car GitHub ne permet pas de supprimer soi-même une pull request. Pour un contenu abusif ou des données personnelles, le support GitHub peut la supprimer. Dans le pire des cas, vous pouvez aussi modifier la description de la pull request.
- **Le HTML affiché est toujours produit par le Worker** à partir du Markdown, sans HTML brut ni lien dangereux. Un visiteur ne peut donc pas injecter de script dans vos pages.
- **Le Worker n'accepte que les envois venant de vos adresses** (`ALLOWED_ORIGINS`). La GitHub App n'a accès qu'à votre dépôt de blog.
- **Les secrets** (clé de la GitHub App, clé Turnstile) ne vivent que chez Cloudflare, jamais dans le dépôt.
- **Une mention sous le formulaire** informe les visiteurs de ce qui sera publié. Liez votre page de confidentialité avec `privacy_url`.

## Personnaliser l'apparence

La section reprend la police et les couleurs de votre thème. Pour l'ajuster, ajoutez dans votre propre CSS (l'ordre de chargement n'a pas d'importance) :

```css
.jc {
  --jc-accent: #9a3412;        /* boutons, liens, badge « Auteur » */
  --jc-radius: 6px;            /* arrondis */
  --jc-avatar: 2.25rem;        /* taille des avatars */
}
```

Les textes sont directement dans les fichiers de `_includes/comments/` et dans `assets/comments/comments.js` (messages d'envoi), faciles à modifier.

## Tester et développer en local

```bash
cd comments-worker
npm test                         # validation, sécurité, YAML, authentification, parcours complets
cp .dev.vars.example .dev.vars   # puis complétez-le
npx wrangler dev                 # Worker local sur http://localhost:8787
```

Côté blog, mettez temporairement `endpoint: "http://localhost:8787"` et utilisez la clé de site de test Turnstile `1x00000000000000000000AA` dans `_config.yml`, puis lancez `bundle exec jekyll serve`.

Pour suivre les journaux du Worker en production : `npx wrangler tail`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| « Ce site n'est pas autorisé à envoyer des commentaires » | l'adresse du blog manque dans `ALLOWED_ORIGINS` (attention à `www.`, à `http`/`https` et au domaine personnalisé) |
| « Le service de commentaires est mal configuré… » | le message précise la variable ou le secret manquant |
| « La vérification anti-robot a échoué » | clé de site et clé secrète Turnstile de deux widgets différents, ou nom d'hôte du blog absent du widget |
| « Votre commentaire n'a pas pu être enregistré » | problème d'accès GitHub : App non installée sur le dépôt, permissions insuffisantes ou mauvaise branche. Voir `npx wrangler tail` |
| la pull request est fusionnée mais le commentaire n'apparaît pas | attendez la fin du build GitHub Pages (onglet **Actions**). Vérifiez que le dossier dans `_data/comments/` porte le même identifiant que l'article (voir *Format des données*) |
| pas d'e-mail pour les nouveaux commentaires | bouton **Watch** du dépôt, ou réglages de notification GitHub. Vous pouvez aussi renseigner `GITHUB_REVIEWER` |

## Limites connues

- Un commentaire validé apparaît après la reconstruction du site, soit une à quelques minutes.
- Les lecteurs ne sont pas prévenus par e-mail quand on leur répond.
- Sans JavaScript, l'envoi n'est possible que si Turnstile est désactivé.
- GitHub Pages applique une limite souple de 10 reconstructions par heure (sauf si le site est publié par un workflow GitHub Actions). C'est sans conséquence pour un blog.
- Les commentaires refusés restent visibles dans les pull requests fermées d'un dépôt public (voir *Sécurité et vie privée*).

## Reprendre les commentaires Cusdis

Dès que vous aurez reçu l'export de Cusdis, un petit script le convertira dans ce format. Chaque commentaire, avec ses réponses, sera rattaché au bon article.
