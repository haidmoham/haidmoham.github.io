import assert from 'node:assert/strict';
const names = ['astrsk','blog','flowers','fog','jellyfish','kristin','mural','punkcubes','sketch','tiramisu','wulfboi'];
const headers = {'User-Agent':'Mozilla/5.0'};
for (const name of names) {
  const target = `https://${name}.mhaider.dev/`;
  const [sourceResponse, mirrorResponse] = await Promise.all([
    fetch(`https://${name}.shin86.dev/`, {headers}), fetch(target, {headers})
  ]);
  assert.equal(sourceResponse.status, 200, `${name}: source root`);
  assert.equal(mirrorResponse.status, 200, `${name}: mirror root`);
  const [source, mirror] = await Promise.all([sourceResponse.text(), mirrorResponse.text()]);
  const title = html => html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1];
  assert.equal(title(mirror), title(source), `${name}: title parity`);
  assert.ok(!/href=["'](?:https?:)?\/\/(?:[\w-]+\.)?shin86\.dev/i.test(mirror), `${name}: navigation backlink`);
  const assets = [...mirror.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(m => new URL(m[1], target));
  const selected = ['.js','.css'].map(ext => assets.find(url => url.pathname.endsWith(ext) && url.origin === new URL(target).origin)).filter(Boolean);
  for (const asset of selected) {
    const response = await fetch(asset, {headers});
    assert.equal(response.status, 200, asset.href);
    assert.ok(!/text\/html/.test(response.headers.get('content-type') || ''), `${asset}: asset returned HTML`);
    await response.arrayBuffer();
  }
  console.log(`${name}: HTTPS 200, title parity, no HTML navigation backlink, ${selected.length} assets passed`);
}
