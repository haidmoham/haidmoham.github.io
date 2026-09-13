import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../contact-context.js', import.meta.url), 'utf8');

function loadContextModule(search = '') {
  const document = {
    readyState: 'complete',
    querySelector() { return null; },
  };
  const window = { location: { search } };
  vm.runInNewContext(source, { URLSearchParams, document, window });
  return window.ContactContext;
}

test('allowlisted contact context is mapped to the visible form fields', () => {
  const context = loadContextModule('?topic=research-scientific-computing&project=c-1n&from=project');
  assert.deepEqual(
    { ...context.readContactContext('?topic=research-scientific-computing&project=c-1n&from=project') },
    {
      interest: 'research-scientific-computing',
      project: 'c-1n',
      entrySurface: 'project',
    },
  );
});

test('arbitrary and repeated query values are not retained or submitted', () => {
  const context = loadContextModule();
  assert.deepEqual(
    { ...context.readContactContext('?topic=executive&project=c-1n&project=lmlab&from=https%3A%2F%2Fexample.com') },
    { interest: '', project: '', entrySurface: '' },
  );
});

test('prefill changes only fields with a validated value', () => {
  const context = loadContextModule();
  const fields = {
    '#interest': { value: '' },
    '#project': { value: '' },
    '#entry-surface': { value: '' },
    '#discovery-source': { value: '' },
  };
  const fakeDocument = { querySelector: selector => fields[selector] };
  const applied = context.applyContactContext(fakeDocument, '?topic=technical-conversation&from=referral&project=unknown');
  assert.equal(fields['#interest'].value, 'technical-conversation');
  assert.equal(fields['#project'].value, '');
  assert.equal(fields['#entry-surface'].value, 'referral');
  assert.equal(fields['#discovery-source'].value, '');
  assert.equal(applied.project, '');
});
