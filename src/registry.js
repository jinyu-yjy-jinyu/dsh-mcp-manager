/**
 * Supervision of every configured MCP server.
 *
 * Owns the map from server id to `McpSupervisor` and keeps it in step with the
 * settings document: a new or changed server is rebuilt, a disabled or removed
 * one is released, an unchanged one is left running so its tools and its warm
 * connection survive an unrelated edit elsewhere in the settings.
 *
 * Status is published as a single snapshot the settings page renders. The page
 * never talks to a supervisor directly, so a save that rebuilds a server cannot
 * leave the UI holding a half-updated view.
 */

import { McpSupervisor, STATUS } from './supervisor.js'
import { validateServers, validateUnknownKeys } from './schema.js'

/** Per-server state the page renders while nothing has connected yet. */
const IDLE = {
  status: STATUS.STOPPED,
  message: '',
  toolCount: 0,
  attempt: 0,
}

/**
 * Manage the live set of MCP supervisors from a settings snapshot.
 */
export class McpRegistry {
  /**
   * @param {object} ctx - the plugin context carrying `tools`
   * @param {(state: { servers: Record<string, object>, problems: string[] }) => void} publish
   *   - notifies the settings page of the current snapshot
   */
  constructor (ctx, publish) {
    this.ctx = ctx
    this.publishState = publish
    /** @type {Map<string, McpSupervisor>} */
    this.supervisors = new Map()
    /** @type {Record<string, object>} */
    this.state = {}
    /** @type {string[]} */
    this.problems = []
  }

  /**
   * Reconcile the running supervisors against a settings snapshot.
   *
   * @param {{ servers?: Record<string, object>, reconnect?: object }} config - resolved config
   * @param {Record<string, Record<string, unknown>>} [raw] - servers as written, before
   *   Schemastery normalized them; unknown keys are only visible here
   */
  async apply (config, raw) {
    const servers = config?.servers ?? {}
    const reconnect = config?.reconnect ?? {}
    this.problems = [...validateServers(servers), ...validateUnknownKeys(raw ?? servers)]

    const wanted = new Set(Object.keys(servers))
    // Release servers that were removed, disabled, or are no longer valid.
    for (const [id, supervisor] of [...this.supervisors]) {
      const config_ = servers[id]
      if (!config_ || config_.enabled === false) {
        await this.release(id, supervisor)
      }
    }

    // Build or rebuild the rest.
    for (const [id, server] of Object.entries(servers)) {
      if (server.enabled === false) continue
      if (this.problems.some((problem) => problem.includes(`「${id}」`))) {
        this.state[id] = { ...IDLE, status: STATUS.FAILED, message: '配置有误，未连接' }
        continue
      }
      const existing = this.supervisors.get(id)
      if (existing && !existing.stopped && sameConfig(existing.config, server)) {
        this.state[id] = this.state[id] ?? { ...IDLE }
        continue
      }
      if (existing) await this.release(id, existing)
      await this.start(id, server, reconnect)
    }

    // Drop stale state for ids that no longer exist.
    for (const id of Object.keys(this.state)) {
      if (!wanted.has(id)) delete this.state[id]
    }
    this.emit()
  }

  /**
   * Start one server's supervisor.
   *
   * @param {string} id - the server namespace
   * @param {object} server - its resolved config
   * @param {object} reconnect - the shared reconnect policy
   */
  async start (id, server, reconnect) {
    const supervisor = new McpSupervisor(this.ctx, server, reconnect, (status) => {
      this.state[id] = status
      this.emit()
    })
    this.supervisors.set(id, supervisor)
    this.state[id] = { ...IDLE, status: STATUS.CONNECTING }
    this.emit()
    // Do not await: a slow or dead server must not block the settings save.
    supervisor.start().catch((error) => {
      this.ctx.logger?.warn?.(`mcp-manager(${id}): 启动失败：${String(error)}`)
    })
  }

  /**
   * Release one supervisor and clear its state.
   *
   * @param {string} id - the server namespace
   * @param {McpSupervisor} supervisor - the supervisor to stop
   */
  async release (id, supervisor) {
    this.supervisors.delete(id)
    await supervisor.dispose()
    if (this.state[id]) this.state[id] = { ...IDLE }
    this.emit()
  }

  /** Stop every supervisor, e.g. on plugin disposal. */
  async disposeAll () {
    for (const [id, supervisor] of [...this.supervisors]) {
      this.supervisors.delete(id)
      await supervisor.dispose()
    }
  }

  /** Push the current snapshot to the page. */
  emit () {
    this.publishState({
      servers: { ...this.state },
      problems: [...this.problems],
    })
  }

  /**
   * The current snapshot, for a page that connects after startup.
   *
   * @returns {{ servers: Record<string, object>, problems: string[] }} the snapshot
   */
  snapshot () {
    return { servers: { ...this.state }, problems: [...this.problems] }
  }
}

/**
 * Whether two server configs would produce the same connection.
 *
 * Compared by value so an unrelated settings edit does not needlessly drop and
 * rebuild a healthy connection.
 *
 * @param {object} a - the running config
 * @param {object} b - the newly resolved config
 * @returns {boolean} true when the connection is equivalent
 */
function sameConfig (a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b))
}

/**
 * Sort an object's entries by key for stable comparison.
 *
 * @param {unknown} value - a JSON value
 * @returns {unknown} the value with every plain object key-sorted
 */
function stable (value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    )
  }
  return value
}