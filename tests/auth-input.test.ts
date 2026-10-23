import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, parseAuthForm } from '../src/lib/auth-input.ts';

test('callback destinations are an exact internal allowlist', () => {
  for (const url of [null, 'https://example.com', '//example.com', '/\\example.com', '/dashboard?next=evil']) {
    assert.equal(safeNext(url), '/dashboard');
  }
  assert.equal(safeNext('/reset-password'), '/reset-password');
});
test('auth input validates and never returns a password on failure', () => {
  const form = new FormData();
  form.set('email', 'invalid'); form.set('password', 'secret-password');
  const result = parseAuthForm(form);
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('secret-password'), false);
  form.set('email', ' student@example.com '); form.set('password', '');
  assert.equal(parseAuthForm(form).ok, false);
  form.set('password', 'a secure password');
  const valid = parseAuthForm(form);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.email, 'student@example.com');
});
