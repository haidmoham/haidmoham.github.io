import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {rewrite} from './worker.mjs';
test('mirrored navigation stays on the identified domains', () => {
  assert.equal(rewrite('https://shin86.dev/ https://blog.shin86.dev/a //shin86.dev#home'), 'https://mhaider.dev/pocket/ https://blog.mhaider.dev/a //mhaider.dev/pocket/#home');
  assert.equal(rewrite('https://notshin86.dev/'), 'https://notshin86.dev/');
});
test('unknown hosts cannot turn the gateway into an open proxy', async () => {
  assert.equal((await worker.fetch(new Request('https://example.com/'))).status, 404);
});
test('rewrites scripts and headers while isolating cookies', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async request => {
    assert.equal(request.url, 'https://blog.shin86.dev/article?q=a');
    assert.equal(request.headers.get('cookie'), null);
    assert.equal(request.headers.get('authorization'), null);
    return new Response('const home="https://shin86.dev/"', {headers: {'content-type':'application/javascript','set-cookie':'secret=1','etag':'old','location':'https://blog.shin86.dev/next'}});
  };
  try {
    const response = await worker.fetch(new Request('https://blog.mhaider.dev/article?q=a', {headers:{cookie:'portfolio=1',authorization:'Bearer example'}}));
    assert.equal(await response.text(), 'const home="https://mhaider.dev/pocket/"');
    assert.equal(response.headers.get('location'), 'https://blog.mhaider.dev/next');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('etag'), null);
  } finally { globalThis.fetch = original; }
});
