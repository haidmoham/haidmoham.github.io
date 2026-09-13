// Public project mirrors. Keep the upstream deployment as the content authority.
export const projects = ['astrsk', 'blog', 'flowers', 'fog', 'jellyfish', 'sketch', 'kristin', 'mural', 'punkcubes', 'tiramisu', 'wulfboi'];
export function rewrite(text) {
  return text.replace(/\b([a-z0-9-]+)\.shin86\.dev\b/gi, '$1.mhaider.dev')
    .replace(/(?<![a-z0-9.-])shin86\.dev\b\/?/gi, 'mhaider.dev/pocket/');
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = url.hostname.replace(/\.mhaider\.dev$/, '');
    if (!projects.includes(slug) || url.hostname !== `${slug}.mhaider.dev`) return new Response('Not found', {status: 404});
    const upstream = new URL(url);
    upstream.hostname = `${slug}.shin86.dev`;
    const headers = new Headers(request.headers);
    // Parent-domain portfolio cookies must not cross into personal applications.
    headers.delete('cookie');
    headers.delete('authorization');
    headers.delete('host');
    headers.delete('if-none-match');
    headers.delete('if-modified-since');
    for (const name of ['origin', 'referer']) {
      const value = headers.get(name);
      if (value?.startsWith(url.origin)) headers.set(name, value.replace(url.origin, upstream.origin));
    }
    const response = await fetch(new Request(upstream, new Request(request, {headers})), {redirect: 'manual'});
    if (response.status === 101) return response;
    const outgoing = new Headers(response.headers);
    outgoing.delete('set-cookie');
    for (const name of ['location', 'refresh', 'link', 'content-security-policy', 'access-control-allow-origin']) {
      if (outgoing.has(name)) outgoing.set(name, rewrite(outgoing.get(name)));
    }
    outgoing.set('Referrer-Policy', 'no-referrer');
    const type = outgoing.get('content-type') || '';
    if (request.method !== 'HEAD' && /text\/|javascript|json|xml|svg/.test(type) && response.body) {
      const body = rewrite(await response.text());
      for (const name of ['content-length', 'content-encoding', 'etag', 'content-md5']) outgoing.delete(name);
      return new Response(body, {status: response.status, headers: outgoing});
    }
    return new Response(response.body, {status: response.status, headers: outgoing});
  }
};
