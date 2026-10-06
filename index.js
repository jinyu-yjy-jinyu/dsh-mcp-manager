/**
 * dsh-mcp-manager — Host half.
 *
 * Owns one settings namespace (`mcp-manager`) describing the external MCP
 * servers the user wants available, and supervises a live connection per
 * enabled server. Tools are bridged onto `ctx.tools` under the same
 * model-facing names the official `@deepseek-ai/dsh-mcp-client` uses, so a
 * session that already recorded `mcp__github__create_issue` keeps working.
 *
 * Every bridged tool goes through the ordinary ToolRuntime pipeline, so it
 * inherits the deployment's approval prompts, permission presets, timeouts, and
 * result pruning without a second implementation. There is no separate MCP
 * fast path for the model to reach.
 *
 * Persistence belongs to the settings service, not to this plugin: the page
 * writes the `mcp-manager` namespace through `ctx.remote.settings`, and this
 * half only reacts to the resulting config change. That keeps one writer per
 * document and means the page, the HMR reloader, and a hand-edited
 * `cordis.patch.yml` all converge on the same state.
 *
 * The only HTTP surface here is a read-only status route for the page to poll.
 * `inject` declares `tools` and `webServer`; everything else degrades a
 * feature rather than failing the plugin — no attachments means MCP images fall
 * back to text.
 */

import { Config, NAMESPACE, validateServers, validateUnknownKeys } from './src/schema.js'
import { McpRegistry } from './src/registry.js'
import { STATUS_PATH, CLIENT_MARKER_HEADER } from './src/paths.js'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'mcp-manager'

/** Services required by this plugin. */
export const inject = ['tools', 'webServer']

export { Config, NAMESPACE, validateServers, validateUnknownKeys }

/**
 * Whether a Host header names a loopback address or a configured trusted host.
 *
 * @param {import('node:http').IncomingMessage} req - the request
 * @param {string[]} trustedHosts - hosts the deployment trusts
 * @returns {boolean} true when the request may be served
 */
function originAllowed (req, trustedHosts) {
  const host = typeof req.headers.host === 'string' ? req.headers.host : ''
  if (!host) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (typeof origin === 'string') {
    try {
      if (new URL(origin).host !== host) return false
    } catch {
      return false
    }
  }
  const hostname = host.replace(/:\d+$/, '')
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
  return loopback || trustedHosts.includes(host)
}

/**
 * Write one JSON response.
 *
 * @param {import('node:http').ServerResponse} res - the response
 * @param {number} code - HTTP status
 * @param {unknown} payload - the body
 */
function json (res, code, payload) {
  if (!res || res.writableEnded || res.destroyed) return
  res.once('error', () => {})
  try {
    const body = JSON.stringify(payload)
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  } catch { /* the peer went away */ }
}

/**
 * Mount the plugin.
 *
 * @param {object} ctx - the plugin context
 * @param {object} config - the resolved settings
 */
export function apply (ctx, config, rawConfig) {
  /** @type {McpRegistry} */
  const registry = new McpRegistry(ctx, () => {})

  // Reconcile on activation and on every settings change. `ctx.config` is the
  // live resolved config, so an edit anywhere in the namespace re-runs the diff.
  const reconcile = async () => {
    try {
      // The raw document rides along because Schemastery has already discarded
      // any unknown key by the time the resolved config is readable.
      await registry.apply(ctx.config, rawConfig?.servers ?? ctx.config?.servers)
    } catch (error) {
      ctx.logger?.warn?.(`mcp-manager: 应用配置失败：${String(error)}`)
    }
  }

  ctx.effect(() => {
    reconcile()
    ctx.on('config', reconcile)
  }, 'mcp-manager: reconcile')

  ctx.effect(() => () => registry.disposeAll(), 'mcp-manager: connections')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/api/dsh-mcp-manager',
    handler: async (req, res) => {
      const trustedHosts = Array.isArray(ctx.webRuntime?.trustedHosts) ? ctx.webRuntime.trustedHosts : []
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, { ok: false, error: `method not allowed: ${req.method}` })
      }
      if (!originAllowed(req, trustedHosts)) {
        return json(res, 403, { ok: false, error: 'forbidden host' })
      }
      if (req.headers[CLIENT_MARKER_HEADER] !== '1') {
        return json(res, 403, { ok: false, error: 'missing client marker' })
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname.replace(/\/+$/, '') !== STATUS_PATH) {
        return json(res, 404, { ok: false, error: 'not found' })
      }
      const snapshot = registry.snapshot()
      if (req.method === 'HEAD') return json(res, 200, snapshot)
      return json(res, 200, { ok: true, data: snapshot })
    },
  }), 'mcp-manager: status route')
}