import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../contact-form.js', import.meta.url), 'utf8');
const contactPage = await readFile(new URL('../contact.html', import.meta.url), 'utf8');

test('form enhancement retains native submission when JavaScript fetch is unavailable', () => {
  assert.match(source, /if \(!form \|\| typeof window\.fetch !== 'function'\) return;/);
  assert.match(source, /form\.addEventListener\('submit', submitContactForm\)/);
});

test('the enhanced form posts only after browser validation and requests JSON from Formspree', () => {
  assert.match(source, /if \(!form\.checkValidity\(\)\) \{/);
  assert.match(source, /form\.reportValidity\(\);/);
  assert.match(source, /body: new FormData\(form\)/);
  assert.match(source, /headers: \{ Accept: 'application\/json' \}/);
});

test('optional work context stays collapsed after the required message fields', () => {
  assert.match(
    contactPage,
    /<label for="message">message<\/label>[\s\S]*?<\/div>\s*<details class="contact-context" data-contact-context>\s*<summary>about this work \(optional\)<\/summary>/,
  );
  assert.match(contactPage, /<p class="form-note">optional work context travels with your message\.<\/p>/);
});

function createHarness(fetch) {
  const state = { prevented: false, resetCount: 0, errorFocusCount: 0, successFocusCount: 0 };
  const button = { disabled: false, textContent: 'send message' };
  const success = { hidden: true, focus() { state.successFocusCount += 1; } };
  const error = { hidden: true, textContent: '', focus() { state.errorFocusCount += 1; } };
  const form = {
    action: 'https://formspree.io/f/xykowgkw',
    querySelector() { return button; },
    checkValidity() { return true; },
    reset() { state.resetCount += 1; },
    setAttribute() {},
    removeAttribute() {},
    addEventListener(name, listener) { if (name === 'submit') state.listener = listener; },
  };
  const document = {
    querySelector(selector) {
      if (selector === '#contact-form') return form;
      if (selector === '[data-fs-success]') return success;
      if (selector === '[data-fs-error=""]') return error;
      return null;
    },
  };
  const window = { fetch };
  class MockFormData { constructor(receivedForm) { this.form = receivedForm; } }
  // The production script runs against the mocked fetch; no real request is possible here.
  vm.runInNewContext(source, { FormData: MockFormData, document, window });
  return { button, error, form, state, success };
}

test('a successful mocked submission sends FormData and moves focus to its status', async () => {
  const requests = [];
  const harness = createHarness(async (...args) => {
    requests.push(args);
    return { ok: true };
  });
  await harness.state.listener({ preventDefault() { harness.state.prevented = true; } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], harness.form.action);
  assert.equal(requests[0][1].method, 'POST');
  assert.equal(requests[0][1].headers.Accept, 'application/json');
  assert.equal(requests[0][1].body.form, harness.form);
  assert.equal(harness.state.resetCount, 1);
  assert.equal(harness.success.hidden, false);
  assert.equal(harness.state.successFocusCount, 1);
  assert.equal(harness.button.textContent, 'send message');
});

test('a failed mocked submission exposes a readable error and sends no real message', async () => {
  const harness = createHarness(async () => ({ ok: false }));
  await harness.state.listener({ preventDefault() {} });
  assert.equal(harness.state.resetCount, 0);
  assert.equal(harness.error.hidden, false);
  assert.equal(harness.state.errorFocusCount, 1);
  assert.equal(harness.error.textContent, 'message could not be sent. please try again or email hi@mhaider.dev.');
});
