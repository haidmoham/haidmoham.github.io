// Import only the built homepage, preserving independently maintained static pages.
import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [assetDirectory, responseUrl] = process.argv.slice(2);
if (!assetDirectory || !responseUrl) {
  throw new Error('Usage: node scripts/export-homepage.mjs <dist/client> <production-server-url>');
}
const response = await fetch(responseUrl);
if (!response.ok) throw new Error(`Homepage export failed: ${response.status}`);
let html = await response.text();
if (!html.includes('vinext.navigationRuntime') || !html.includes('/_next/static/')) {
  throw new Error('Expected complete production HTML with hydration bootstrap.');
}
if (html.includes('/@vite/') || html.includes('/@react-refresh')) {
  throw new Error('Development HTML cannot be imported.');
}
const assetRoot = path.resolve(assetDirectory);
const localAssetPaths = [...html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+)"/g)];
for (const [, assetPath] of localAssetPaths) {
  await readFile(path.join(assetRoot, assetPath.slice(1)));
}

// The production build is still the source of the rendered page. Keep its
// runtime intact, but keep the fallback usable before enhancement so the full portfolio is
// useful before React, Three, or their dependency graph download.
const runtimeScripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)]
  .map(match => match[0]);
if (runtimeScripts.length === 0) {
  throw new Error('Expected production runtime scripts to defer.');
}

html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi, '')
  .replace('<head>', '<head><link id="portfolio-enhancement-styles" rel="stylesheet" href="/portfolio-enhancement.css"><script src="/portfolio-enhancement.js" defer></script>')
  .replace('<body>', '<body class="portfolio-lightweight">')
  // A frozen preview should describe what is visible, not invite a reader to
  // use a control that is intentionally unavailable in reading view. The
  // original text is restored before React hydrates the saved production page.
  .replace(
    'pick a token to see which earlier tokens it can attend to.',
    '<span data-portfolio-static-copy="pick a token to see which earlier tokens it can attend to.">the highlighted row shows which earlier tokens “from” can attend to.</span>',
  )
  .replace(
    'one small piece of the drawing work. change the curve or add a vector.',
    '<span data-portfolio-static-copy="one small piece of the drawing work. change the curve or add a vector.">one recorded reconstruction: three rotating vectors, 42.4% error.</span>',
  )
  .replace(
    'live project specimen · running without audio',
    '<span data-portfolio-static-copy="live project specimen · running without audio">project preview · open the full app for audio response</span>',
  )
  // The SSR controls describe interactive models. Until the matching runtime
  // exists, disabling them prevents dead controls for keyboard and touch users.
  .replace(/<button(?![^>]*\bdisabled\b)/gi, '<button disabled data-portfolio-disabled="true"')
  .replace(/<input(?![^>]*\bdisabled\b)/gi, '<input disabled data-portfolio-disabled="true"')
  .replace(
    '</body>',
    `<template id="portfolio-runtime">${runtimeScripts.join('')}</template></body>`,
  );

await cp(path.join(assetRoot, '_next'), path.join(root, '_next'), { recursive: true });
await writeFile(path.join(root, 'index.html'), html);
console.log(`Imported production homepage with ${runtimeScripts.length} deferred runtime scripts. Supporting pages preserved.`);
