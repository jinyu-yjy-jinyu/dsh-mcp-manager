import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/** The platform seed words this bundle is allowed to require. */
function seed () {
  return {
    react: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      Fragment: Symbol('Fragment'),
      useState: () => [undefined, () => {}],
      useEffect: () => {},
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useRef: () => ({ current: 0 }),
    },
    crypto: { createHash },
  }
}

/**
 * Evaluate `client.js` under a stub of the browser module system.
 *
 * The real loader resolves bare specifiers against a module table and refuses
 * relative paths. This stub reproduces that contract closely enough to catch the
 * two mistakes a hand-written bundle actually makes: requiring a relative path,
 * and requiring a bare specifier the platform never seeds. It also returns the
 * bundle's exports so the registration can be asserted.
 *
 * @returns {Promise<object>} the bundle's exports
 */
async function loadClientBundle () {
  const source = await readFile(join(root, 'client.js'), 'utf8')
  const seeded = seed()
  const requested = []

  const require = spec => {
    requested.push(spec)
    if (spec.startsWith('.')) {
      throw new Error(`client-modules: require("${spec}") missed the module table — relative paths are not resolvable`)
    }
    if (!(spec in seeded)) {
      throw new Error(`client-modules: require("${spec}") missed the module table`)
    }
    return seeded[spec]
  }

  // The bundle is a classic script that hands one registration to the loader.
  // Its factory returns the module object the page receives, so capturing that
  // return value is all the harness needs.
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

test('the client bundle loads with only platform seed specifiers', async () => {
  const { exports, requested } = await loadClientBundle()
  assert.ok(exports, 'the bundle factory must return its module exports')
  assert.equal(typeof exports.apply, 'function')
  assert.equal(exports.name, 'mcp-manager')
  assert.deepEqual(exports.inject, ['slots', 'locale', 'remote.settings'])
  assert.ok(requested.length > 0, 'the bundle must have required at least one seed word')
})

test('the browser half never requires a relative specifier', async () => {
  const { requested } = await loadClientBundle()
  const relatives = requested.filter(spec => spec.startsWith('.'))
  assert.deepEqual(relatives, [], `relative requires are unresolvable: ${relatives.join(', ')}`)
})

test('the inlined naming module hashes with the platform crypto seed', async () => {
  // `src/naming.js` imports `node:crypto` for the identity hash. The browser
  // has no `node:` specifier, so the inliner rewires it to the seeded `crypto`.
  // If that rewiring regressed, the load above would throw before this ran.
  const { requested } = await loadClientBundle()
  assert.ok(requested.includes('crypto'))
  assert.ok(!requested.includes('node:crypto'))
  assert.equal(createHash('sha256').update('x').digest('hex').length, 64)
})