import test from 'node:test'
import assert from 'node:assert/strict'

import {
  publicToolName,
  MAX_PUBLIC_NAME_LENGTH,
  serverPrefix,
} from '../src/naming.js'

test('clean names pass through verbatim', () => {
  assert.equal(publicToolName('github', 'create_issue'), 'mcp__github__create_issue')
  assert.equal(publicToolName('web', 'search'), 'mcp__web__search')
})

test('a lossy replacement appends a 12-hex identity hash', () => {
  const name = publicToolName('github', 'tool with spaces')
  assert.match(name, /^mcp__github__tool_with_spaces_[0-9a-f]{12}$/)
})

test('normalization never exceeds the 64-character budget', () => {
  const name = publicToolName('srv', 'x'.repeat(200))
  assert.equal(name.length, MAX_PUBLIC_NAME_LENGTH)
  assert.match(name, /_[0-9a-f]{12}$/)
})

test('two distinct identities cannot collapse to one public name', () => {
  const a = publicToolName('srv', 'a b')
  const b = publicToolName('srv', 'a_b')
  assert.notEqual(a, b)
})

test('the identity hash is stable across calls', () => {
  assert.equal(publicToolName('srv', 'a b'), publicToolName('srv', 'a b'))
})

test('the hash is over (serverName, rawName), not the joined string', () => {
  // A naive `${serverName}${rawName}` hash would collide these two.
  assert.notEqual(publicToolName('ab', 'c d'), publicToolName('a', 'bc d'))
})

test('serverPrefix matches the public name prefix', () => {
  assert.ok(publicToolName('github', 'x').startsWith(serverPrefix('github')))
})