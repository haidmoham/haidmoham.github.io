// Static metadata and the hydrated route share one identity. No browser repair
// script is needed, and crawlers receive the complete metadata in the HTML.
export const portfolioIdentity = Object.freeze({
  image: 'https://mhaider.dev/assets/og-portfolio-paper-20261014.png',
  imageAlt: 'Mohammad Haider — software engineer. Selected work in systems, simulation, and interactive graphics.',
  siteName: 'Mohammad Haider',
  themeColor: '#f3f0e7',
});

const tagPattern = /<(meta|link)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
const iconRels = new Set(['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'manifest']);
const identityKeys = new Set([
  'og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale',
  'og:image', 'og:image:url', 'og:image:secure_url', 'og:image:type',
  'og:image:width', 'og:image:height', 'og:image:alt',
  'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt',
  'theme-color', 'color-scheme',
]);

function decodeEntities(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0', mdash: '—', ndash: '–', middot: '·' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name[0] !== '#') return named[name.toLowerCase()] ?? entity;
    const point = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

function attributes(tag) {
  const result = {};
  const source = tag.replace(/^<\w+\b/, '').replace(/\/?\s*>$/, '');
  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

const escapeAttribute = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const metaKey = props => (props.property ?? props.name ?? '').toLowerCase();
const isIdentityTag = (tag, props) => tag === 'meta' && identityKeys.has(metaKey(props)) || tag === 'link' && iconRels.has((props.rel ?? '').toLowerCase());

function metadataPlan(head, canonicalUrl) {
  const existing = new Map();
  let canonical;
  for (const match of head.matchAll(tagPattern)) {
    const props = attributes(match[0]);
    if (match[1].toLowerCase() === 'meta' && !existing.has(metaKey(props))) existing.set(metaKey(props), props.content);
    if (match[1].toLowerCase() === 'link' && props.rel?.toLowerCase() === 'canonical') canonical ??= props.href;
  }
  const title = decodeEntities(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = existing.get('description');
  const values = new Map([...existing].filter(([key]) => identityKeys.has(key)));
  const fill = (key, value) => { if (!values.get(key) && value) values.set(key, value); };
  fill('og:title', title);
  fill('og:description', description);
  fill('og:url', canonical ?? canonicalUrl);
  fill('og:type', 'website');
  fill('twitter:title', values.get('og:title'));
  fill('twitter:description', values.get('og:description'));
  // A dedicated project image remains authoritative. Only pages without one
  // inherit the portfolio card; its dimensions and alt text are image-specific.
  const image = values.get('og:image') || values.get('og:image:url') || values.get('twitter:image') || portfolioIdentity.image;
  fill('og:image', image);
  fill('twitter:image', image);
  if (image === portfolioIdentity.image) {
    values.set('og:image:type', 'image/png');
    values.set('og:image:width', '1200');
    values.set('og:image:height', '630');
    values.set('og:image:alt', portfolioIdentity.imageAlt);
  }
  if (values.get('twitter:image') === image) fill('twitter:image:alt', values.get('og:image:alt'));
  values.set('og:site_name', portfolioIdentity.siteName);
  values.set('og:locale', 'en_US');
  values.set('twitter:card', 'summary_large_image');
  values.set('theme-color', portfolioIdentity.themeColor);
  values.set('color-scheme', 'light');
  const tags = [...values].map(([key, content]) => ({
    tag: 'meta', props: { [key.startsWith('og:') ? 'property' : 'name']: key, content },
  }));
  tags.push(
    { tag: 'link', props: { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' } },
    { tag: 'link', props: { rel: 'icon', href: '/favicon.svg?v=20261014', type: 'image/svg+xml', sizes: 'any' } },
    { tag: 'link', props: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png?v=20261014', sizes: '180x180' } },
    { tag: 'link', props: { rel: 'manifest', href: '/site.webmanifest?v=20261014' } },
  );
  return { tags, canonical: canonical ?? canonicalUrl, addCanonical: !canonical && Boolean(canonicalUrl) };
}

function renderTag({ tag, props }) {
  return `<${tag}${Object.entries(props).map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join('')}>`;
}

function findMetadataList(value) {
  if (!Array.isArray(value)) return null;
  if (value.some(item => Array.isArray(item) && item[0] === '$' && (
    item[1] === 'title' || item[1] === 'meta' && metaKey(item[3] ?? {}).startsWith('og:')
  ))) return value;
  for (const child of value) {
    const found = findMetadataList(child);
    if (found) return found;
  }
  return null;
}

function updateRouteMetadata(payload, plan) {
  const routeName = payload.__route;
  if (typeof routeName !== 'string' || !routeName.startsWith('route:')) return false;
  const route = payload[routeName];
  const list = findMetadataList(route?.[0]);
  if (!list) throw new Error(`Cannot locate hydrated metadata for ${routeName}; export left unchanged.`);
  const retained = list.filter(item => !(
    Array.isArray(item) && item[0] === '$' && isIdentityTag(item[1], item[3] ?? {})
  ));
  const hasCanonical = retained.some(item => Array.isArray(item) && item[1] === 'link' && item[3]?.rel === 'canonical');
  const tags = [...plan.tags];
  if (!hasCanonical && plan.canonical) tags.push({ tag: 'link', props: { rel: 'canonical', href: plan.canonical } });
  list.splice(0, list.length, ...retained, ...tags.map(({ tag, props }, index) => ['$' , tag, `portfolio-identity-${index}`, props]));
  return true;
}

function updateHydration(html, plan) {
  // Decode JSON string arguments rather than editing escaped source text. A
  // Flight record may span push calls, so parse the concatenated record stream
  // and distribute edits back into the original script positions.
  const chunks = [];
  let stream = '';
  for (const script of html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
    for (const call of script[0].matchAll(/\.rsc\.push\(\s*("(?:[^"\\]|\\[\s\S])*")\s*\)/g)) {
      const content = JSON.parse(call[1]);
      const sourceStart = script.index + call.index + call[0].indexOf(call[1]);
      chunks.push({ sourceStart, sourceEnd: sourceStart + call[1].length, start: stream.length, content });
      stream += content;
    }
  }
  if (!chunks.length) return html;
  const edits = [];
  const recordPattern = /(^|\n)([0-9a-f]+):(\{[^\n]*\})(?=\n|$)/g;
  for (const record of stream.matchAll(recordPattern)) {
    let payload;
    try { payload = JSON.parse(record[3]); } catch { continue; }
    if (!updateRouteMetadata(payload, plan)) continue;
    const start = record.index + record[1].length + record[2].length + 1;
    edits.push({ start, end: start + record[3].length, text: JSON.stringify(payload) });
  }
  if (!edits.length) throw new Error('Hydration bootstrap found without a recognized route metadata record; export left unchanged.');
  for (const chunk of chunks) {
    let cursor = chunk.start;
    const end = cursor + chunk.content.length;
    let updated = '';
    for (const edit of edits) {
      if (edit.end <= cursor || edit.start >= end) continue;
      if (edit.start >= cursor) {
        updated += stream.slice(cursor, edit.start) + edit.text;
      }
      cursor = Math.min(end, edit.end);
    }
    chunk.updated = updated + stream.slice(cursor, end);
  }
  for (const chunk of chunks.reverse()) {
    // Keep HTML script boundaries safe even if authored text contains '<'.
    const literal = JSON.stringify(chunk.updated).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    html = html.slice(0, chunk.sourceStart) + literal + html.slice(chunk.sourceEnd);
  }
  return html;
}

/** Add consistent identity metadata without changing document content or layout.
 * canonicalUrl is optional when a page already declares its canonical URL.
 * Existing project-specific images, page titles, descriptions and URLs survive.
 */
export function applyPortfolioIdentity(html, { canonicalUrl } = {}) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) throw new Error('Cannot apply portfolio identity without a document head.');
  const plan = metadataPlan(head[1], canonicalUrl);
  const emitted = new Set();
  const replacementTags = plan.tags.map(renderTag).join('');
  let content = head[1].replace(tagPattern, (tag, name) => {
    if (!isIdentityTag(name.toLowerCase(), attributes(tag))) return tag;
    // A single insertion position makes subsequent exports byte-stable.
    if (emitted.has('identity')) return '';
    emitted.add('identity');
    return replacementTags;
  });
  if (!emitted.size) content += replacementTags;
  if (plan.addCanonical) content += renderTag({ tag: 'link', props: { rel: 'canonical', href: plan.canonical } });
  const start = head.index + head[0].indexOf('>') + 1;
  html = html.slice(0, start) + content + html.slice(start + head[1].length);
  return updateHydration(html, plan);
}
