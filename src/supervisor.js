/**
 * Connection supervision for one MCP server.
 *
 * Owns the transport, the current generation of bridged tools, and the
 * reconnect policy. The lifecycle deliberately mirrors the official
 * `@deepseek-ai/dsh-mcp-client` supervisor so a user moving a server between
 * the two providers sees the same behaviour, while the parts the harness
 * treats as a version-locked contract — the model-facing tool name and the
 * canonical result projection — are reused from that package rather than
 * reimplemented (see `naming.js` and `createMcpToolDefinition` below).
 *
 * Three invariants carry the design:
 *
 *  1. Whole generations, or none. Discovery builds an entire next generation
 *     off to the side; only a complete generation is swapped in. A failed
 *     fetch leaves the previous generation registered; a registry conflict
 *     rolls back the whole attempt. The model never sees half a server.
 *  2. Serialized synchronization. The initial connect, every server-initiated
 *     change notification, and every reconnect all queue onto one lane, so two
 *     synchronizations can never interleave their dispose-then-register swap.
 *  3. Budgeted recovery. A reconnect budget is shared by all failures: after
 *     `maxAttempts` consecutive failures the tools are unregistered and
 *     reconnecting stops. A connection that stays up longer than `maxDelayMs`
 *     resets the budget.
 */

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess'
import { createMcpToolDefinition } from '@deepseek-ai/dsh-mcp-client'
import { publicToolName } from './naming.js'

/** Status values the settings page renders. */
export const STATUS = {
  CONNECTING: 'connecting',
  READY: 'ready',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
  STOPPED: 'stopped',
}

/**
 * Build the environment a stdio child receives.
 *
 * The subprocess seam's scrubbed parent env drops credential-shaped and stale
 * `DSH_*` names; the configured env is merged on top, so an explicit override
 * survives.
 *
 * @param {Record<string, string>} extra - the server's configured env
 * @returns {Record<string, string>} the child environment
 */
function buildChildEnv (extra) {
  return { ...scrubbedParentEnv(), ...extra }
}

/**
 * Create the transport for one server's resolved config.
 *
 * @param {object} config - the resolved server entry
 * @returns {import('@modelcontextprotocol/client').Transport} an unconnected transport
 */
function createTransport (config) {
  if (config.transport === 'stdio') {
    return new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: buildChildEnv(config.env ?? {}),
      cwd: config.cwd || undefined,
    })
  }
  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: config.headers ?? {} },
  })
}

/**
 * Call `body` under a deadline, without leaving a timer behind.
 *
 * @template T
 * @param {Promise<T>} promise - the in-flight work
 * @param {number} ms - deadline in milliseconds
 * @param {AbortSignal} [signal] - the caller's cancellation
 * @returns {Promise<T>} the result, or a rejection naming the timeout
 */
async function withDeadline (promise, ms, signal) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`请求超时（${ms} ms）`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Supervise one MCP server: connect, bridge its tools, reconnect, dispose.
 */
export class McpSupervisor {
  /**
   * @param {object} ctx - the plugin context carrying `tools`
   * @param {object} config - the resolved server entry
   * @param {object} reconnect - the resolved reconnect policy
   * @param {(status: object) => void} onStatus - publishes state to the page
   */
  constructor (ctx, config, reconnect, onStatus) {
    this.ctx = ctx
    this.config = config
    this.reconnect = reconnect
    this.onStatus = onStatus

    this.client = undefined
    this.generation = new Map()
    this.status = STATUS.CONNECTING
    this.message = ''
    this.toolCount = 0
    this.attempt = 0

    this.stopped = false
    this.timer = undefined
    this.lane = Promise.resolve()
    /** Resolvers waiting on the in-flight connect, for `ready`. */
    this.waiters = []
  }

  /**
   * Publish current state to the settings page.
   *
   * @param {string} status - one `STATUS` value
   * @param {string} message - human-readable detail, usually empty or an error
   */
  publish (status, message = '') {
    this.status = status
    this.message = message
    this.onStatus({
      id: this.config.id,
      status,
      message,
      toolCount: this.generation.size,
      attempt: this.attempt,
    })
  }

  /** Queue work onto this server's single synchronization lane. */
  serialize (body) {
    this.lane = this.lane.then(body, body)
    return this.lane
  }

  /** Start supervising. */
  async start () {
    this.publish(STATUS.CONNECTING)
    await this.connect()
  }

  /**
   * Attempt one connection and, if it succeeds, one tool synchronization.
   *
   * @returns {Promise<boolean>} whether the server ended up usable
   */
  async connect () {
    if (this.stopped) return false
    const transport = createTransport(this.config)
    const client = new Client({ name: `dsh-mcp-manager/${this.config.id}`, version: '0.1.0' })
    try {
      await withDeadline(client.connect(transport), this.config.toolCallTimeoutMs)
    } catch (error) {
      await closeQuietly(client, transport)
      if (this.stopped) return false
      this.scheduleReconnect(error)
      return false
    }

    if (this.stopped) {
      await closeQuietly(client, transport)
      return false
    }

    this.client = client
    const ok = await this.serialize(() => this.synchronize())
    if (ok) {
      this.attempt = 0
      this.publish(STATUS.READY)
      this.watchChanges(client)
      return true
    }
    this.scheduleReconnect(new Error('工具发现失败'))
    return false
  }

  /**
   * Replace the registered tool generation with the server's current list.
   *
   * @returns {Promise<boolean>} whether the swap completed
   */
  async synchronize () {
    if (this.stopped || !this.client) return false
    let listed
    try {
      listed = await withDeadline(
        this.client.listTools(),
        this.config.toolCallTimeoutMs,
      )
    } catch (error) {
      if (!this.stopped) {
        this.ctx.logger?.warn?.(`mcp-manager(${this.config.id}): 工具列表获取失败，保留上一组工具：${String(error)}`)
      }
      return false
    }

    // Build the whole next generation before touching the registry.
    const next = new Map()
    for (const tool of listed.tools ?? []) {
      const name = publicToolName(this.config.id, tool.name)
      if (next.has(name)) {
        this.ctx.logger?.warn?.(`mcp-manager(${this.config.id}): 服务器重复列出工具「${tool.name}」，拒绝本次工具列表`)
        return false
      }
      next.set(name, createMcpToolDefinition(this.ctx, {
        name,
        rawName: tool.name,
        description: tool.description ?? '',
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        call: async (args, exec) => {
          const controller = new AbortController()
          exec?.signal?.addEventListener('abort', () => controller.abort(), { once: true })
          return withDeadline(
            this.client.callTool({ name: tool.name, arguments: args }, undefined, { signal: controller.signal }),
            this.config.toolCallTimeoutMs,
          )
        },
      }))
    }

    // Swap: dispose the old generation, then register the new one.
    for (const dispose of this.generation.values()) {
      try { dispose() } catch { /* a stale disposer must not block the swap */ }
    }
    this.generation = new Map()

    const registered = new Map()
    for (const [name, definition] of next) {
      try {
        registered.set(name, this.ctx.tools.register(definition))
      } catch (error) {
        for (const dispose of registered.values()) {
          try { dispose() } catch { /* ignore */ }
        }
        this.ctx.logger?.warn?.(
          `mcp-manager(${this.config.id}): 工具注册冲突，本服务器未注册任何工具：${String(error)}`,
        )
        this.publish(STATUS.FAILED, `工具注册冲突：${String(error)}`)
        return false
      }
    }

    this.generation = registered
    this.ctx.logger?.info(`mcp-manager(${this.config.id}): 已连接，${registered.size} 个工具可用`)
    return true
  }

  /**
   * Re-synchronize when the server changes its tool list.
   *
   * @param {import('@modelcontextprotocol/client').Client} client - the live client
   */
  watchChanges (client) {
    const refresh = () => {
      this.serialize(async () => {
        if (this.stopped) return
        if (await this.synchronize()) this.publish(STATUS.READY)
      })
    }
    try {
      client.setNotificationHandler?.(
        // The SDK's tool-list-changed notification; tolerated across SDK shapes.
        { method: 'notifications/tools/list_changed' },
        refresh,
      )
    } catch {
      // A server that never changes its tool list simply gets no refresh hook.
    }
  }

  /**
   * Wait out the backoff, then try again.
   *
   * @param {unknown} error - why the last attempt failed
   */
  scheduleReconnect (error) {
    if (this.stopped) return
    this.attempt += 1
    const reason = error instanceof Error ? error.message : String(error)

    if (!this.reconnect.enabled) {
      this.publish(
        STATUS.FAILED,
        this.generation.size > 0
          ? `连接中断且已禁用自动重连：${reason}`
          : `连接失败且已禁用自动重连：${reason}`,
      )
      return
    }
    if (this.attempt > this.reconnect.maxAttempts) {
      for (const dispose of this.generation.values()) {
        try { dispose() } catch { /* ignore */ }
      }
      this.generation = new Map()
      this.publish(
        STATUS.FAILED,
        `连续重连 ${this.reconnect.maxAttempts} 次仍失败，已注销该服务器的工具：${reason}`,
      )
      this.ctx.logger?.warn?.(`mcp-manager(${this.config.id}): 放弃重连（预算耗尽）：${reason}`)
      return
    }

    const delay = Math.min(
      this.reconnect.initialDelayMs * 2 ** (this.attempt - 1),
      this.reconnect.maxDelayMs,
    )
    this.publish(STATUS.RECONNECTING, `${reason}（${delay} ms 后进行第 ${this.attempt} 次重试）`)
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.connect()
    }, delay)
    this.timer?.unref?.()
  }

  /**
   * Stop supervising and release everything this server owns.
   *
   * Unregisters the current generation, closes the transport, waits for queued
   * synchronization to settle, and cancels any pending reconnect.
   */
  async dispose () {
    if (this.stopped) return
    this.stopped = true
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    for (const dispose of this.generation.values()) {
      try { dispose() } catch { /* ignore */ }
    }
    this.generation = new Map()
    const client = this.client
    this.client = undefined
    await closeQuietly(client)
    await this.lane.catch(() => {})
    this.publish(STATUS.STOPPED)
  }
}

/**
 * Close a client and its transport without letting cleanup throw.
 *
 * @param {object} [client] - the client to close
 * @param {object} [transport] - the transport, when the client never connected
 * @returns {Promise<void>} always resolves
 */
async function closeQuietly (client, transport) {
  try {
    await client?.close?.()
  } catch { /* the peer may already be gone */ }
  try {
    await transport?.close?.()
  } catch { /* ignore */ }
}