/**
 * Rendu Markdown sûr des commentaires.
 *
 * Le HTML brut est désactivé (il est échappé tel quel), seuls les liens
 * http(s) et mailto sont acceptés, et les éléments inadaptés à un
 * commentaire (titres, images, tableaux) sont désactivés.
 */
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt('default', {
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

md.disable(['heading', 'lheading', 'image', 'table', 'hr', 'reference']);

md.validateLink = (url) => /^(https?:|mailto:)/i.test(String(url).trim());

// Liens : rel adapté au contenu généré par les visiteurs.
const defaultLinkOpen =
  md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('rel', 'nofollow ugc noopener noreferrer');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(text) {
  return md.render(String(text || '')).trim();
}
