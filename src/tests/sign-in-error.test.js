import test from 'node:test'
import assert from 'node:assert/strict'
import { signInError } from '../features/auth/signInError.js'

test('sign-in errors distinguish unreachable servers, credentials and account setup', () => {
  assert.match(signInError({ name: 'AuthRetryableFetchError' }), /Cannot reach/)
  assert.match(signInError(new TypeError('fetch failed')), /Cannot reach/)
  assert.match(signInError({ code: 'invalid_credentials', status: 400 }), /Email or password is incorrect/)
  assert.match(signInError({ code: 'email_not_confirmed' }), /Confirm your email/)
  assert.match(signInError({ status: 429 }), /Too many/)
  assert.match(signInError({ status: 401 }), /same project/)
  assert.equal(signInError({ message: 'private diagnostic details' }).includes('private diagnostic'), false)
  assert.match(signInError(null), /Unable to sign in/)
})
