/**
 * The paths the two halves of this plugin agree on.
 *
 * Shared rather than duplicated so the Host route and the browser fetch cannot
 * drift apart — a mismatch would surface only as a 404 at runtime, in the one
 * place a user would read it as "the server has no status".
 */

/** Read-only status route served by the Host half. */
export const STATUS_PATH = '/api/dsh-mcp-manager/status'

/**
 * Marker header a same-origin page must send.
 *
 * The Host refuses any request without it, so a cross-site page cannot read
 * which MCP servers are configured and how they are addressed.
 */
export const CLIENT_MARKER_HEADER = 'x-dsh-mcp-manager'