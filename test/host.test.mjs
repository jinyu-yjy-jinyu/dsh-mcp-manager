import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Whether the real host packages are materialized next to this workspace.
 *
 * They are not part of the repository: the plugin resolves them from the running
 * DSH Host at load time. These tests materialize them locally so the Host half
 * can be executed against the genuine Schemastery, the MCP SDK, and
 * `@deepseek-ai/dsh-mcp-client` rather than a stub. When they are absent — an
 * ordinary checkout — the tests skip instead of failing, because they assert an
 * integration this repository does not vendor.
 *
 * @returns {boolean} true when the Host half can be loaded
 */
function hostPackagesAvailable () {
  return existsSync(join(root, 'node_modules', '@deepseek-ai', 'dsh-mcp-client', 'package.json'))
    && existsSync(join(root, 'node_modules', '@deepseek-ai', 'schemastery', 'package.json'))
}

const maybe = test

maybe('the Host half loads against the real DSH packages', { skip: !hostPackagesAvailable() }, async () => {
  const entry = await import('../index.js')

  assert.equal(entry.name, 'mcp-manager')
  assert.deepEqual(entry.inject, ['tools', 'webServer'])
  assert.equal(typeof entry.apply, 'function')
  assert.equal(entry.NAMESPACE, 'mcp-manager')
})

maybe('the settings schema fills defaults and validates', { skip: !hostPackagesAvailable() }, async () => {
  const { Config, validateServers } = await import('../index.js')

  const parsed = Config({
    servers: {
      gh: { id: 'gh', transport: 'stdio', command: 'npx', args: ['-y', 'srv'], env: { T: 'k' } },
      web: { id: 'web', transport: 'streamable-http', url: 'http://localhost:3000/mcp' },
    },
  })

  assert.equal(parsed.servers.gh.enabled, true)
  assert.equal(parsed.servers.gh.toolCallTimeoutMs, 60_000)
  assert.deepEqual(parsed.servers.gh.args, ['-y', 'srv'])
  assert.deepEqual(parsed.servers.web.headers, {})
  assert.deepEqual(parsed.reconnect, {
    enabled: true,
    initialDelayMs: 500,
    maxDelayMs: 30_000,
    maxAttempts: 10,
  })
  assert.deepEqual(validateServers(parsed.servers), [])
})

maybe('an empty config is valid and yields no servers', { skip: !hostPackagesAvailable() }, async () => {
  const { Config, validateServers } = await import('../index.js')
  const parsed = Config({})
  assert.deepEqual(parsed.servers, {})
  assert.deepEqual(validateServers(parsed.servers), [])
})

maybe('a missing transport is rejected by the schema', { skip: !hostPackagesAvailable() }, async () => {
  const { Config } = await import('../index.js')
  assert.throws(() => Config({ servers: { a: { id: 'a', command: 'x' } } }))
})

maybe('an unknown key is reported, not silently dropped', { skip: !hostPackagesAvailable() }, async () => {
  const { validateUnknownKeys } = await import('../index.js')

  // Schemastery drops the key on the way in, so the check runs over the raw
  // document the user actually wrote.
  const problems = validateUnknownKeys({
    a: { id: 'a', transport: 'stdio', command: 'x', totallyBogus: 1 },
  })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /totallyBogus/)

  assert.deepEqual(validateUnknownKeys({
    b: { id: 'b', transport: 'stdio', command: 'x', args: [], env: {} },
  }), [])
})

maybe('the cross-field validator reports each transport requirement', { skip: !hostPackagesAvailable() }, async () => {
  const { validateServers } = await import('../index.js')

  const stdio = validateServers({ a: { id: 'a', transport: 'stdio', command: '' } })
  assert.equal(stdio.length, 1)
  assert.match(stdio[0], /stdio/)

  const http = validateServers({ b: { id: 'b', transport: 'streamable-http', url: '' } })
  assert.equal(http.length, 1)
  assert.match(http[0], /Streamable HTTP/)

  const badUrl = validateServers({ c: { id: 'c', transport: 'streamable-http', url: 'not a url' } })
  assert.equal(badUrl.length, 1)

  const wrongScheme = validateServers({ d: { id: 'd', transport: 'streamable-http', url: 'ftp://x/mcp' } })
  assert.equal(wrongScheme.length, 1)

  const badId = validateServers({ 'bad name': { id: 'bad name', transport: 'stdio', command: 'x' } })
  assert.equal(badId.length, 1)
  assert.match(badId[0], /bad name/)
})

maybe('validation reports every server at once', { skip: !hostPackagesAvailable() }, async () => {
  const { validateServers } = await import('../index.js')
  const problems = validateServers({
    a: { id: 'a', transport: 'stdio', command: '' },
    b: { id: 'b', transport: 'streamable-http', url: '' },
  })
  assert.equal(problems.length, 2)
})