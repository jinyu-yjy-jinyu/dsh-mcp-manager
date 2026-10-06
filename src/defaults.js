/**
 * Defaults for the settings schema.
 *
 * Kept free of imports so both halves of the plugin can read them: the Host
 * feeds them to Schemastery in `schema.js`, and the mcp.json importer applies
 * them directly in `mcp-json.js`. The importer is the reason they live here —
 * it must produce entries indistinguishable from hand-written ones without
 * pulling the Host's schema library into the importer, which also keeps that
 * module unit-testable outside the harness.
 */

/** Default per-call deadline for one MCP `tools/call` (ms). */
export const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60_000

/** Defaults applied to every server entry. */
export const SERVER_DEFAULTS = {
  enabled: true,
  command: '',
  args: [],
  env: {},
  cwd: '',
  url: '',
  headers: {},
  toolCallTimeoutMs: DEFAULT_TOOL_CALL_TIMEOUT_MS,
}

/** Defaults applied to the shared reconnect policy. */
export const RECONNECT_DEFAULTS = {
  enabled: true,
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxAttempts: 10,
}

/**
 * Whether a value is a string-keyed, non-array object.
 *
 * @param {unknown} value - candidate
 * @returns {boolean} true for a plain record
 */
export function isRecord (value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Fill one server entry's defaults without dropping unknown keys.
 *
 * `transport` is inferred when absent: a `command` means stdio, anything else
 * means Streamable HTTP. Unknown keys are intentionally preserved so
 * validation, not this function, decides what to reject.
 *
 * @param {unknown} raw - candidate entry
 * @returns {unknown} the entry with defaults applied
 */
export function withServerDefaults (raw) {
  if (!isRecord(raw)) return raw
  const value = { ...SERVER_DEFAULTS, ...raw }
  if (typeof value.transport !== 'string') {
    value.transport = typeof value.command === 'string' && value.command ? 'stdio' : 'streamable-http'
  }
  return value
}