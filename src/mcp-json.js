/**
 * Import and export of the widely used `mcp.json` document.
 *
 * The shape users already have on disk — Claude Desktop, Cursor, VS Code, and
 * most MCP servers' own README — is:
 *
 *   { "mcpServers": { "<id>": { "command": ..., "args": [...], "env": {...} } } }
 *   { "mcpServers": { "<id>": { "url": "https://...", "headers": {...} } } }
 *
 * Import is a MERGE: an imported id replaces the existing server of the same
 * id, and every other configured server is left alone. Silently replacing the
 * whole section would let one pasted document delete servers the user did not
 * intend to touch, so the importer reports exactly which ids it replaced and
 * the caller confirms before writing.
 */

import { withServerDefaults } from './defaults.js'
import { SERVER_NAME_PATTERN } from './naming.js'

/**
 * Whether a value is a string-keyed, non-array object.
 *
 * @param {unknown} value - candidate
 * @returns {boolean} true for a plain record
 */
function isRecord (value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read one entry's transport, preferring explicit `type` over field sniffing.
 *
 * @param {string} id - the server id
 * @param {Record<string, unknown>} entry - one `mcpServers` member
 * @returns {{ transport: string, warning?: string, config: Record<string, unknown> }}
 */
function readEntry (id, entry) {
  const declared = typeof entry.type === 'string' ? entry.type : void 0
  const warnings = []
  let transport

  if (declared === 'stdio' || (declared === void 0 && typeof entry.command === 'string' && entry.command)) {
    transport = 'stdio'
  } else {
    transport = 'streamable-http'
    if (declared === 'sse') {
      warnings.push(
        `服务器「${id}」声明为 sse。DSH 只支持 stdio 与 Streamable HTTP，` +
        '已按 Streamable HTTP 处理；若该服务器实际只讲旧版 SSE，连接会失败。',
      )
    } else if (declared !== void 0 && declared !== 'http' && declared !== 'streamable-http') {
      warnings.push(`服务器「${id}」的 type 为「${declared}」，无法识别，已按 Streamable HTTP 处理。`)
    }
  }

  const config = { ...entry }
  delete config.type
  config.transport = transport
  return { transport, warning: warnings[0], config: withServerDefaults(config) }
}

/**
 * Parse an `mcp.json` document into server entries.
 *
 * Returns every problem at once instead of failing on the first, so a user can
 * fix a whole document in one pass.
 *
 * @param {string} text - the pasted JSON
 * @returns {{ servers: Record<string, Record<string, unknown>>, errors: string[], warnings: string[] }}
 */
export function parseMcpJson (text) {
  const errors = []
  const warnings = []

  let document
  try {
    document = JSON.parse(text)
  } catch (error) {
    return { servers: {}, errors: [`JSON 解析失败：${error.message}`], warnings }
  }

  if (!isRecord(document)) {
    return { servers: {}, errors: ['顶层必须是一个 JSON 对象。'], warnings }
  }

  const container = document.mcpServers ?? document.servers
  if (container === void 0) {
    return { servers: {}, errors: ['找不到 mcpServers 字段，请确认粘贴的是完整的 MCP 配置。'], warnings }
  }
  if (!isRecord(container)) {
    return { servers: {}, errors: ['mcpServers 必须是一个对象。'], warnings }
  }

  const entries = Object.entries(container)
  if (entries.length === 0) {
    errors.push('mcpServers 是空的，没有可导入的服务器。')
    return { servers: {}, errors, warnings }
  }

  const servers = {}
  for (const [id, entry] of entries) {
    if (!SERVER_NAME_PATTERN.test(id)) {
      errors.push(`服务器名称「${id}」不合法：只能使用字母、数字、下划线和连字符，长度 1-32。`)
      continue
    }
    if (!isRecord(entry)) {
      errors.push(`服务器「${id}」的配置必须是一个对象。`)
      continue
    }
    const read = readEntry(id, entry)
    if (read.warning) warnings.push(read.warning)
    servers[id] = read.config
  }

  return { servers, errors, warnings }
}

/**
 * Build an `mcp.json` document from the configured servers.
 *
 * Only the fields this plugin actually uses are emitted, so the output is
 * something the user can paste straight into another MCP client.
 *
 * @param {Record<string, Record<string, unknown>>} servers - configured servers
 * @returns {string} formatted JSON
 */
export function exportMcpJson (servers) {
  const mcpServers = {}
  for (const [id, server] of Object.entries(servers ?? {})) {
    if (server?.enabled === false) continue
    if (server?.transport === 'stdio') {
      const entry = { command: server.command }
      if (server.args?.length) entry.args = server.args
      if (server.env && Object.keys(server.env).length) entry.env = server.env
      if (server.cwd) entry.cwd = server.cwd
      mcpServers[id] = entry
    } else {
      const entry = { url: server.url }
      if (server.headers && Object.keys(server.headers).length) entry.headers = server.headers
      mcpServers[id] = entry
    }
  }
  return `${JSON.stringify({ mcpServers }, null, 2)}\n`
}

/**
 * Plan how an import would merge into the current configuration.
 *
 * Pure: it reports the decision and leaves writing to the caller, so the page
 * can show a confirmation step and only then mutate anything.
 *
 * @param {Record<string, unknown>} current - configured servers
 * @param {Record<string, unknown>} incoming - servers parsed from JSON
 * @returns {{ merged: Record<string, unknown>, added: string[], replaced: string[] }}
 */
export function planImport (current, incoming) {
  const merged = { ...current }
  const added = []
  const replaced = []
  for (const [id, server] of Object.entries(incoming)) {
    if (Object.hasOwn(merged, id)) replaced.push(id)
    else added.push(id)
    merged[id] = server
  }
  return { merged, added, replaced }
}