/**
 * The MCP client bridge's model-facing tool naming.
 *
 * Ported byte-for-byte from `@deepseek-ai/dsh-mcp-client@0.2.0-rc.2`
 * (`publicToolName`, lib/index.js) so that this plugin and the official
 * bridge can coexist in one Host: a session that already recorded
 * `mcp__github__create_issue` keeps working if the server later moves
 * between the two providers. The two constants are the DeepSeek
 * function-name contract, not configuration.
 *
 * Naming invariants (do not change without breaking session history and
 * permission rules):
 *   - The stable identity of an MCP tool is `(serverName, rawName)`. The
 *     namespace is always the locally configured `serverName`; a remote
 *     `serverInfo.name` is never trusted, because it is not unique across
 *     deployments and may change across upgrades.
 *   - The public name is a pure function of that identity.
 *   - Lossy normalization appends a 12-hex-char SHA-256 suffix so that two
 *     distinct identities can never collapse into one public name.
 */

import { createHash } from 'node:crypto'

/** DeepSeek function-name contract: at most 64 characters. */
export const MAX_PUBLIC_NAME_LENGTH = 64

/** DeepSeek function-name contract: only `[A-Za-z0-9_-]` is allowed. */
const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/g

/** Hex chars of the SHA-256 identity hash appended on lossy normalization. */
const HASH_LENGTH = 12

/** Valid `serverName`: also the prefix of every tool this server exposes. */
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** The namespace a server owns, as a tool-name prefix. */
export function serverPrefix (serverName) {
  return `mcp__${serverName}__`
}

/**
 * Derive the model-facing public name for one MCP tool.
 *
 * The clean case is `mcp__<serverName>__<rawName>` verbatim. When character
 * replacement or truncation changes the name, a 12-hex-char SHA-256 hash of
 * the identity is appended.
 *
 * @param {string} serverName - stable local namespace from the config
 * @param {string} rawName - the MCP server's own tool name
 * @returns {string} the globally unique, model-facing tool name
 */
export function publicToolName (serverName, rawName) {
  const joined = `mcp__${serverName}__${rawName}`
  const normalized = joined.replace(INVALID_NAME_CHARS, '_')
  if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH) return normalized
  const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH)
  return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`
}