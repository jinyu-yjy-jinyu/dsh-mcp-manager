/**
 * The plugin's settings schema and its cross-field validation.
 *
 * One namespace, `mcp-manager`, holds every configured server. The shape is a
 * flat object per server rather than the official bridge's `stdio |
 * streamable-http` union: the settings form projects a union as an opaque
 * blob, while a flat object renders as ordinary fields and lets the page choose
 * the transport with one control. `validateServer` below then applies the same
 * requirement the union's schema would — the transport decides which fields are
 * mandatory.
 *
 * This module is Host-only: it depends on Schemastery. The dependency-free half
 * (defaults, mcp.json parsing) lives in `defaults.js` and `mcp-json.js` so it
 * can be unit-tested without the harness.
 */

import schema from '@deepseek-ai/schemastery'
import { SERVER_NAME_PATTERN } from './naming.js'
import { DEFAULT_TOOL_CALL_TIMEOUT_MS, RECONNECT_DEFAULTS, isRecord } from './defaults.js'

/** Settings namespace this plugin owns. */
export const NAMESPACE = 'mcp-manager'

const Reconnect = schema.object({
  enabled: schema.boolean().default(RECONNECT_DEFAULTS.enabled),
  initialDelayMs: schema.number().min(1).default(RECONNECT_DEFAULTS.initialDelayMs),
  maxDelayMs: schema.number().min(1).default(RECONNECT_DEFAULTS.maxDelayMs),
  maxAttempts: schema.number().min(1).default(RECONNECT_DEFAULTS.maxAttempts),
})

/** Every key a server entry may carry. */
const SERVER_KEYS = new Set([
  'id', 'enabled', 'transport',
  'command', 'args', 'env', 'cwd',
  'url', 'headers',
  'toolCallTimeoutMs',
])

const Server = schema.object({
  /** Namespace for this server's tools. Must match `SERVER_NAME_PATTERN`. */
  id: schema.string().required(),
  enabled: schema.boolean().default(true),
  transport: schema.union([schema.const('stdio'), schema.const('streamable-http')]).required(),
  // stdio
  command: schema.string().default(''),
  args: schema.array(schema.string()).default([]),
  env: schema.dict(schema.string()).default({}),
  cwd: schema.string().default(''),
  // streamable-http
  url: schema.string().default(''),
  headers: schema.dict(schema.string()).default({}),
  toolCallTimeoutMs: schema.number().default(DEFAULT_TOOL_CALL_TIMEOUT_MS),
})

export const Config = schema.object({
  servers: schema.dict(Server).default({}),
  reconnect: Reconnect.default({}),
})

/**
 * Apply the per-transport requirements the flat schema cannot express.
 *
 * Returns every problem at once so the settings page can show them together
 * instead of one per save attempt.
 *
 * @param {string} id - the server namespace
 * @param {Record<string, unknown>} server - one server's resolved config
 * @returns {string[]} human-readable problems; empty when the entry is usable
 */
export function validateServer (id, server) {
  const problems = []
  if (!SERVER_NAME_PATTERN.test(id)) {
    problems.push(`服务器名称「${id}」不合法：只能使用字母、数字、下划线和连字符，长度 1-32。`)
  }
  if (!isRecord(server)) {
    problems.push(`服务器「${id}」的配置必须是一个对象。`)
    return problems
  }
  if (server.transport === 'stdio') {
    if (!String(server.command ?? '').trim()) {
      problems.push(`服务器「${id}」选择了 stdio，但未填写启动命令。`)
    }
  } else if (server.transport === 'streamable-http') {
    const url = String(server.url ?? '').trim()
    if (!url) {
      problems.push(`服务器「${id}」选择了 Streamable HTTP，但未填写接口地址。`)
    } else {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          problems.push(`服务器「${id}」的接口地址必须以 http:// 或 https:// 开头。`)
        }
      } catch {
        problems.push(`服务器「${id}」的接口地址不是合法的 URL：${url}`)
      }
    }
  } else {
    problems.push(`服务器「${id}」的传输方式无效：${String(server.transport)}`)
  }
  return problems
}

/**
 * Check a whole `servers` section.
 *
 * @param {Record<string, Record<string, unknown>>} servers - resolved servers
 * @returns {string[]} every problem found across all servers
 */
export function validateServers (servers) {
  return Object.entries(servers ?? {}).flatMap(([id, server]) => validateServer(id, server))
}

/**
 * Check a raw, unresolved `servers` section before Schemastery normalizes it.
 *
 * Schemastery drops keys it does not recognize, so validating the resolved value
 * can never see a typo — `envir` would simply be absent by then. This runs over
 * the document exactly as the user or an importer wrote it.
 *
 * @param {Record<string, Record<string, unknown>>} raw - servers as written
 * @returns {string[]} unknown-key problems across all servers
 */
export function validateUnknownKeys (raw) {
  const problems = []
  for (const [id, server] of Object.entries(raw ?? {})) {
    if (!isRecord(server)) continue
    for (const key of Object.keys(server)) {
      if (SERVER_KEYS.has(key)) continue
      problems.push(`服务器「${id}」含有未知配置项「${key}」，请检查拼写。`)
    }
  }
  return problems
}