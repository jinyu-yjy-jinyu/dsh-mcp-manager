import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'

import { publicToolName, MAX_PUBLIC_NAME_LENGTH, serverPrefix } from '../src/naming.js'

/**
 * The identity hash must agree with `node:crypto` byte-for-byte.
 *
 * The in-module SHA-256 exists because the browser module system has no `crypto`
 * seed and `crypto.subtle` is asynchronous, so the naming function cannot stay
 * async. That freedom is only safe while the digest is identical to the official
 * bridge's `createHash('sha256')` — otherwise a server migrated between the two
 * providers would get different tool names and lose its session history and
 * permission rules. This test pins that equality across awkward inputs, since a
 * hand-written compression function is exactly where UTF-8, padding, and 64-bit
 * length bugs hide.
 *
 * @param {string} serverName - the server namespace
 * @param {string} rawName - the server's own tool name
 * @returns {string} the hash both implementations must produce
 */
function officialHash (serverName, rawName) {
  return createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, 12)
}

/** Inputs chosen to exercise multi-block, astral-plane, and padding edge cases. */
const CASES = [
  ['', ''],
  ['a', 'b'],
  ['github', 'create_issue'],
  ['server', 'x'.repeat(200)],
  // Longer than one 64-byte block, so the multi-block path is covered.
  ['srv', 'y'.repeat(500)],
  // Astral-plane characters are surrogate pairs in UTF-16 and 4 bytes in UTF-8.
  ['服务器', '工具🚀'],
  ['\u{1F600}', '\u{10FFFF}'],
  // Exactly at and around the padding boundary.
  ['a', 'b'.repeat(54)],
  ['a', 'b'.repeat(55)],
  ['a', 'b'.repeat(56)],
  ['a', 'b'.repeat(63)],
  ['a', 'b'.repeat(64)],
  ['a', 'b'.repeat(65)],
  // Characters that trigger the lossy replacement path.
  ['srv', 'tool with spaces'],
  ['srv', 'a/b\\c?d'],
]

test('clean names pass through verbatim', () => {
  assert.equal(publicToolName('github', 'create_issue'), 'mcp__github__create_issue')
  assert.equal(publicToolName('web', 'search'), 'mcp__web__search')
})

test('the identity hash matches node:crypto for every lossy case', () => {
  for (const [serverName, rawName] of CASES) {
    const name = publicToolName(serverName, rawName)
    const joined = `mcp__${serverName}__${rawName}`
    const lossy = joined.replace(/[^A-Za-z0-9_-]/g, '_') !== joined
      || joined.length > MAX_PUBLIC_NAME_LENGTH
    if (!lossy) {
      assert.equal(name, joined, `expected a verbatim name for ${JSON.stringify(joined)}`)
      continue
    }
    assert.ok(
      name.endsWith(`_${officialHash(serverName, rawName)}`),
      `hash mismatch for ${JSON.stringify(joined)}: got ${name}`,
    )
  }
})

test('the hash matches node:crypto at every block-padding boundary', () => {
  // The identity is `${serverName}\0${rawName}`, so its length decides how much
  // zero padding follows the 0x80 marker. A padding calculation that is off by
  // one block only misbehaves at specific lengths — it passed short names and
  // broke at 55, 119, and 183 bytes. Walk the whole neighbourhood of each block
  // boundary rather than sampling, so a regression names its length.
  for (let n = 0; n <= 260; n++) {
    const rawName = `${'a'.repeat(n)} ` // trailing space forces the lossy path
    const got = publicToolName('s', rawName)
    const want = createHash('sha256').update(`s\0${rawName}`).digest('hex').slice(0, 12)
    assert.ok(
      got.endsWith(`_${want}`),
      `hash mismatch at identity length ${'s\0'.length + rawName.length}: got ${got}, want suffix _${want}`,
    )
  }
})

test('the hash matches node:crypto on random latin-1 server names', () => {
  // Random bytes read as latin-1 give non-ASCII, multi-byte, and control
  // characters without relying on a hand-picked list of interesting cases.
  for (let i = 0; i < 200; i++) {
    const serverName = randomBytes(6).toString('latin1')
    const rawName = randomBytes(1 + (i % 90)).toString('latin1')
    const name = publicToolName(serverName, rawName)
    assert.ok(
      name.endsWith(`_${officialHash(serverName, rawName)}`),
      `hash mismatch for case ${i}: ${name}`,
    )
  }
})

test('normalization never exceeds the 64-character budget', () => {
  const name = publicToolName('srv', 'x'.repeat(200))
  assert.equal(name.length, MAX_PUBLIC_NAME_LENGTH)
  assert.match(name, /_[0-9a-f]{12}$/)
})

test('two distinct identities cannot collapse to one public name', () => {
  assert.notEqual(publicToolName('srv', 'a b'), publicToolName('srv', 'a_b'))
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