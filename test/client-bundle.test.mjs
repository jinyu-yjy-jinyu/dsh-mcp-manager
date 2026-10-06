import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * The exact bare specifiers the DSH shell seeds into the browser module table.
 *
 * Copied from the shell's own static-module table rather than guessed. Getting
 * this list wrong is how the first release shipped: the bundle asked for
 * `crypto`, the loader had no such seed, and the plugin failed to load at boot
 * with `require("crypto") missed the module table`. Anything outside this set is
 * a boot failure, so the assertions below are made against this list.
 */
const PLATFORM_SEED = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

/**
 * Evaluate `client.js` under a stub of the browser module system.
 *
 * The stub reproduces the real loader's contract: bare specifiers resolve
 * against a fixed seed table, and anything else throws the way the shell does.
 * It also reports what the bundle asked for, so the assertions are made against
 * the loader's own rules instead of a hand-maintained list of allowed calls.
 *
 * @returns {Promise<{ exports: object, requested: string[] }>} the load result
 */
async function loadClientBundle () {
  const source = await readFile(join(root, 'client.js'), 'utf8')
  const seeded = {
    react: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      Fragment: Symbol('Fragment'),
      useState: () => [undefined, () => {}],
      useEffect: () => {},
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useRef: () => ({ current: 0 }),
    },
  }
  const requested = []

  const require = spec => {
    requested.push(spec)
    if (spec.startsWith('.')) {
      throw new Error(`client-modules: require("${spec}") missed the module table`)
    }
    if (!PLATFORM_SEED.includes(spec)) {
      throw new Error(`client-modules: require("${spec}") missed the module table`)
    }
    return seeded[spec]
  }

  let exports
  const loader = {
    load (registration) {
      exports = registration.factory(require)
    },
  }

  const run = new Function('window', source)
  run({ __ModuleLoader__: loader })

  return { exports, requested }
}

test('the client bundle loads without leaving the platform seed set', async () => {
  const { exports } = await loadClientBundle()
  assert.ok(exports, 'the bundle factory must return its module exports')
  assert.equal(typeof exports.apply, 'function')
  assert.equal(exports.name, 'mcp-manager')
  assert.deepEqual(exports.inject, ['slots', 'locale', 'remote.settings'])
})

test('every specifier the bundle requires is a real platform seed word', async () => {
  const { requested } = await loadClientBundle()
  // The seed list itself is asserted: a duplicate or typo in the table above
  // would otherwise hide a missing seed exactly the way the missing `crypto` did.
  assert.equal(new Set(PLATFORM_SEED).size, PLATFORM_SEED.length, 'the seed list has duplicates')
  for (const spec of requested) {
    assert.ok(
      PLATFORM_SEED.includes(spec),
      `require("${spec}") is not a platform seed word; the shell has no such entry`,
    )
  }
})

test('the bundle never requires a relative specifier', async () => {
  const { requested } = await loadClientBundle()
  const relatives = requested.filter(spec => spec.startsWith('.'))
  assert.deepEqual(relatives, [], `relative requires are unresolvable: ${relatives.join(', ')}`)
})

test('the browser half needs no hash builtin from the platform', async () => {
  // `src/naming.js` must stay free of any hash import: the shell seeds no crypto
  // module, and `crypto.subtle` is asynchronous, so the naming function could
  // not stay synchronous. Assert the bundle never reaches for one.
  const { requested } = await loadClientBundle()
  assert.ok(!requested.includes('crypto'), 'the bundle must not require "crypto"')
  assert.ok(!requested.includes('node:crypto'), 'the bundle must not require "node:crypto"')
})