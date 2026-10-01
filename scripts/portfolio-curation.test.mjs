import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const excluded = ['mural', 'ecosim', 'flowers', 'soundspace', 'punkcubes', 'pokedex'];
const moduleReferences = source => [...source.matchAll(/(?:from|import\()[`"'](\.\/[^`"']+\.js)[`"']/g)].map(match => match[1]);

function activeGraph() {
  const pending = [...html.matchAll(/<script\b[^>]*src="(\/_next\/static\/chunks\/[^"?]+\.js)"/g)].map(match => match[1].slice(1));
  const graph = new Map();
  while (pending.length) {
    const name = pending.pop();
    if (graph.has(name)) continue;
    const source = read(name);
    graph.set(name, source);
    pending.push(...moduleReferences(source).map(ref => path.posix.join(path.posix.dirname(name), ref)));
  }
  return graph;
}

const graph = activeGraph();
const pageName = [...graph.keys()].find(name => /\/page-curated-/.test(name));
const page = graph.get(pageName);
const jsx = (type, props, key) => ({ type, props, key });
const react = { useState: init => [typeof init === 'function' ? init() : init, () => {}], useEffect() {} };
const context = vm.createContext({ e: value => value, t: () => react, n: () => ({ jsx, jsxs: jsx, Fragment: 'fragment' }) });
vm.runInContext(page.replace(/import\{[^;]+from["'][^"']+["'];/g, '').replace(/export\{P as default\};/, '') + ';globalThis.catalogue={projects:o,featured:s,fallback:u,renderLedger:m,setFeed:feed=>{u=feed}};', context);
const catalogue = JSON.parse(JSON.stringify({ projects: context.catalogue.projects, featured: context.catalogue.featured, fallback: context.catalogue.fallback }));

test('the active homepage module graph has exactly one page and one bootstrap', () => {
  const names = [...graph.keys()].map(name => path.basename(name));
  assert.deepEqual(names.filter(name => name.startsWith('page-')), ['page-curated-20260930.js']);
  assert.deepEqual(names.filter(name => name.startsWith('index-')), ['index-curated-20260930.js']);
  assert.ok(names.includes('layout-segment-context-curated-20260930.js'));
  assert.ok(names.includes('app-route-prefetch-policy-curated-20260930.js'));
  assert.ok(![...graph.values()].some(source => source.includes('index-BSTPn-7X.js')));
});

test('static and hydrated featured selections agree and use real product captures', () => {
  const staticIds = [...html.matchAll(/<article class="project-plate [^"]+" id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(staticIds, catalogue.featured);
  assert.ok(staticIds.includes('receipts'));
  assert.equal(catalogue.projects.find(project => project.id === 'lm').href, '/labs/lmlab/');
  assert.ok(html.includes('href="/labs/lmlab/"'));
  for (const src of ['/work/tiramisu-product-20260930.jpg', '/work/receipts-product-20261001.jpg']) {
    const bytes = fs.readFileSync(path.join(root, src));
    assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(html.includes(src));
    assert.ok(page.includes(src));
  }
  const tiramisu = catalogue.projects.find(project => project.id === 'tiramisu');
  assert.equal(tiramisu.href, 'https://lyrics.mhaider.dev/');
  assert.equal(catalogue.projects.find(project => project.id === 'receipts').source, 'https://github.com/haidmoham/political-receipts');
});

test('the catalogue, feed source, saved feeds, and static portfolio exclude personal listings', () => {
  for (const projects of [catalogue.projects, catalogue.fallback.projects, ...['project-sources.json', 'project-state/index.json', 'project-state/anonymous.json'].map(name => JSON.parse(read(name)).projects)]) {
    assert.ok(projects.every(project => !excluded.includes(project.id)));
  }
  assert.deepEqual(catalogue.fallback.projects.map(project => project.id), JSON.parse(read('project-state/index.json')).projects.map(project => project.id));
  for (const name of ['index.html', 'projects.html', 'work/production.html', 'work/creative.html', 'pocket/index.html']) {
    const source = read(name);
    assert.doesNotMatch(source, /shin86\.dev|mural|ecosim|laboon|punkcubes|soundspace|haidmoham\/flowers|pok[eé]dex|monogatari|blog\.mhaider\.dev/i, name);
  }
});

test('a stale or unexpected activity-feed entry cannot re-enter the project ledger', () => {
  const feed = JSON.parse(JSON.stringify(catalogue.fallback));
  for (const id of [...excluded, 'unreviewed-project']) {
    feed.projects.push({ ...feed.projects.find(project => project.ledgerEligible), id, label: id, source: `https://github.com/haidmoham/${id}` });
  }
  context.catalogue.setFeed(feed);
  const rendered = JSON.stringify(context.catalogue.renderLedger());
  for (const id of [...excluded, 'unreviewed-project']) assert.ok(!rendered.includes(`"id":"${id}"`));
  for (const id of ['social', 'physics', 'agent', 'nebvis']) assert.ok(rendered.includes(`"id":"${id}"`));
});

test('checkpoint publication markers survive in static and hydrated homepage content', () => {
  for (const marker of ['title', 'description', 'summary', 'limits', 'video', 'poster', 'source', 'checkpoint']) {
    assert.ok(html.includes(`data-c1n-${marker}`));
    assert.ok(page.includes(`data-c1n-${marker}`));
  }
});
