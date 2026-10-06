import test from 'node:test'
import assert from 'node:assert/strict'

import { parseMcpJson, exportMcpJson, planImport } from '../src/mcp-json.js'

test('parses a stdio server with args and env', () => {
  const { servers, errors } = parseMcpJson(JSON.stringify({
    mcpServers: {
      github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_TOKEN: 't' } },
    },
  }))
  assert.deepEqual(errors, [])
  assert.equal(servers.github.transport, 'stdio')
  assert.equal(servers.github.command, 'npx')
  assert.deepEqual(servers.github.args, ['-y', '@modelcontextprotocol/server-github'])
  assert.equal(servers.github.env.GITHUB_TOKEN, 't')
  assert.equal(servers.github.enabled, true)
})

test('parses a url server as streamable-http', () => {
  const { servers, errors } = parseMcpJson(JSON.stringify({
    mcpServers: { web: { url: 'http://localhost:3000/mcp', headers: { Authorization: 'Bearer x' } } },
  }))
  assert.deepEqual(errors, [])
  assert.equal(servers.web.transport, 'streamable-http')
  assert.equal(servers.web.url, 'http://localhost:3000/mcp')
  assert.equal(servers.web.headers.Authorization, 'Bearer x')
})

test('maps type:sse onto streamable-http with a warning', () => {
  const { servers, warnings, errors } = parseMcpJson(JSON.stringify({
    mcpServers: { legacy: { type: 'sse', url: 'http://localhost:9000/sse' } },
  }))
  assert.deepEqual(errors, [])
  assert.equal(servers.legacy.transport, 'streamable-http')
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /sse/)
})

test('drops the type key from the stored config', () => {
  const { servers } = parseMcpJson(JSON.stringify({
    mcpServers: { a: { type: 'stdio', command: 'x' } },
  }))
  assert.equal(servers.a.type, undefined)
})

test('reports invalid JSON without throwing', () => {
  const { errors } = parseMcpJson('{ not json')
  assert.equal(errors.length, 1)
  assert.match(errors[0], /JSON/)
})

test('reports a missing mcpServers field', () => {
  const { errors } = parseMcpJson(JSON.stringify({ other: 1 }))
  assert.match(errors[0], /mcpServers/)
})

test('accepts the `servers` alias', () => {
  const { servers, errors } = parseMcpJson(JSON.stringify({
    servers: { a: { command: 'x' } },
  }))
  assert.deepEqual(errors, [])
  assert.equal(servers.a.command, 'x')
})

test('rejects an illegal id and keeps the valid ones', () => {
  const { servers, errors } = parseMcpJson(JSON.stringify({
    mcpServers: { 'bad name': { command: 'x' }, good: { command: 'y' } },
  }))
  assert.equal(errors.length, 1)
  assert.deepEqual(Object.keys(servers), ['good'])
})

test('reports every problem in one pass', () => {
  const { errors } = parseMcpJson(JSON.stringify({
    mcpServers: { 'a b': { command: 'x' }, ok: 5 },
  }))
  assert.equal(errors.length, 2)
})

test('export omits disabled servers', () => {
  const json = exportMcpJson({
    on: { enabled: true, transport: 'stdio', command: 'x', args: [], env: {}, cwd: '' },
    off: { enabled: false, transport: 'stdio', command: 'y', args: [], env: {}, cwd: '' },
  })
  const parsed = JSON.parse(json)
  assert.deepEqual(Object.keys(parsed.mcpServers), ['on'])
})

test('export omits empty optional fields', () => {
  const parsed = JSON.parse(exportMcpJson({
    a: { enabled: true, transport: 'stdio', command: 'x', args: [], env: {}, cwd: '' },
  }))
  assert.deepEqual(parsed.mcpServers.a, { command: 'x' })
})

test('export includes populated optional fields', () => {
  const parsed = JSON.parse(exportMcpJson({
    a: { enabled: true, transport: 'stdio', command: 'x', args: ['-y'], env: { K: 'v' }, cwd: '/tmp' },
  }))
  assert.deepEqual(parsed.mcpServers.a, { command: 'x', args: ['-y'], env: { K: 'v' }, cwd: '/tmp' })
})

test('export emits url and headers for http servers', () => {
  const parsed = JSON.parse(exportMcpJson({
    a: { enabled: true, transport: 'streamable-http', url: 'http://x/mcp', headers: { A: 'b' } },
  }))
  assert.deepEqual(parsed.mcpServers.a, { url: 'http://x/mcp', headers: { A: 'b' } })
})

test('a parse then export round trip preserves the servers', () => {
  const source = JSON.stringify({
    mcpServers: {
      github: { command: 'npx', args: ['-y', 'srv'], env: { T: 'k' } },
      web: { url: 'http://localhost:3000/mcp' },
    },
  })
  const { servers, errors } = parseMcpJson(source)
  assert.deepEqual(errors, [])
  const round = JSON.parse(exportMcpJson(servers))
  assert.deepEqual(round.mcpServers, JSON.parse(source).mcpServers)
})

test('an exported document re-imports to the same servers', () => {
  const servers = {
    a: { enabled: true, transport: 'stdio', command: 'x', args: [], env: {}, cwd: '' },
  }
  const again = parseMcpJson(exportMcpJson(servers))
  assert.equal(again.errors.length, 0)
  assert.equal(again.servers.a.command, 'x')
})

test('planImport merges without dropping untouched servers', () => {
  const current = { keep: { command: 'k' }, same: { command: 'old' } }
  const { merged, added, replaced } = planImport(current, { same: { command: 'new' }, fresh: { command: 'n' } })
  assert.deepEqual(Object.keys(merged).sort(), ['fresh', 'keep', 'same'])
  assert.deepEqual(added, ['fresh'])
  assert.deepEqual(replaced, ['same'])
  assert.equal(merged.same.command, 'new')
})

test('planImport does not mutate the current object', () => {
  const current = { a: { command: 'k' } }
  planImport(current, { b: { command: 'n' } })
  assert.deepEqual(Object.keys(current), ['a'])
})