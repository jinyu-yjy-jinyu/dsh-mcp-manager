/**
 * The MCP client bridge's model-facing tool naming.
 *
 * Ported byte-for-byte from `@deepseek-ai/dsh-mcp-client@0.2.0-rc.2`
 * (`publicToolName`, lib/index.js) so that this plugin and the official bridge
 * can coexist in one Host: a session that already recorded
 * `mcp__github__create_issue` keeps working if the server later moves between the
 * two providers. The two constants below are the DeepSeek function-name
 * contract, not configuration.
 *
 * Naming invariants (do not change without breaking session history and
 * permission rules):
 *   - The stable identity of an MCP tool is `(serverName, rawName)`. The
 *     namespace is always the locally configured `serverName`; a remote
 *     `serverInfo.name` is never trusted, because it is not unique across
 *     deployments and may change across upgrades.
 *   - The public name is a pure, synchronous function of that identity.
 *   - Lossy normalization appends a 12-hex-char SHA-256 suffix so that two
 *     distinct identities can never collapse into one public name.
 *
 * The digest is computed in-module rather than with `node:crypto`. This file is
 * also inlined into the browser half, and the DSH browser module system seeds
 * only nine bare specifiers — `react`, `react/jsx-runtime`, `react-dom`,
 * `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`, and
 * three `dsh-client-ui-*` packages. There is no crypto seed, and `crypto.subtle`
 * is asynchronous, which would make the naming function async and therefore
 * unable to produce a tool name during registration. The Host half has
 * `node:crypto` available, but sharing one implementation keeps both halves
 * byte-identical by construction — and `test/naming.test.mjs` pins that equality
 * against `node:crypto` across the block-padding boundaries.
 */

/** DeepSeek function-name contract: at most 64 characters. */
export const MAX_PUBLIC_NAME_LENGTH = 64

/** DeepSeek function-name contract: only `[A-Za-z0-9_-]` is allowed. */
const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/g

/** Hex chars of the SHA-256 identity hash appended on lossy normalization. */
const HASH_LENGTH = 12

/** Valid `serverName`: also the prefix of every tool this server exposes. */
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

// ── SHA-256 ─────────────────────────────────────────────────────────────────
//
// FIPS 180-4. Only what this hash needs is implemented: UTF-8 encoding, the 64
// round constants, and the final hex rendering.

/** Round constants: the first 32 bits of the fractional cube roots of 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** Initial hash values: the first 32 bits of the fractional square roots of 8 primes. */
const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
])

/**
 * Encode a string as UTF-8 bytes.
 *
 * `TextEncoder` is used rather than manual code-point math because it handles
 * surrogate pairs and astral-plane characters the way Node's own UTF-8 encoding
 * does, which is what keeps this hash equal to `node:crypto`'s.
 *
 * @param {string} text - the string to encode
 * @returns {Uint8Array} its UTF-8 bytes
 */
function utf8 (text) {
  return new TextEncoder().encode(text)
}

/**
 * Rotate a 32-bit word right.
 *
 * @param {number} value - the word
 * @param {number} bits - how far to rotate, 0-31
 * @returns {number} the rotated word
 */
function rotr (value, bits) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0
}

/**
 * SHA-256 of a byte array, as lowercase hex.
 *
 * @param {Uint8Array} bytes - the input
 * @returns {string} 64 hexadecimal characters
 */
function sha256Hex (bytes) {
  const H = H0.slice()
  const bitLength = bytes.length * 8

  // Append the 0x80 marker, pad with zeros, and finish with the 64-bit
  // big-endian bit length. The message must grow to the next multiple of 64 that
  // leaves room for all nine trailing bytes, so the block count is
  // `floor((len + 8) / 64) + 1`. Using `(len + 9) / 64 + 1` allocates a spare
  // block whenever `len + 9` is already block-aligned, which writes the length
  // into the wrong place and silently corrupts the digest at those lengths only.
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, bitLength >>> 0, false)
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000), false)

  const w = new Uint32Array(64)
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false)
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15]
      const y = w[i - 2]
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, h] = H
    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      const ch = ((e & f) ^ (~e & g)) >>> 0
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      const temp2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    H[0] = (H[0] + a) >>> 0
    H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0
    H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0
    H[5] = (H[5] + f) >>> 0
    H[6] = (H[6] + g) >>> 0
    H[7] = (H[7] + h) >>> 0
  }

  let out = ''
  for (const word of H) out += word.toString(16).padStart(8, '0')
  return out
}

/** The namespace a server owns, as a tool-name prefix. */
export function serverPrefix (serverName) {
  return `mcp__${serverName}__`
}

/**
 * Derive the model-facing public name for one MCP tool.
 *
 * The clean case is `mcp__<serverName>__<rawName>` verbatim. When character
 * replacement or truncation changes the name, a 12-hex-char SHA-256 hash of the
 * identity is appended.
 *
 * @param {string} serverName - stable local namespace from the config
 * @param {string} rawName - the MCP server's own tool name
 * @returns {string} the globally unique, model-facing tool name
 */
export function publicToolName (serverName, rawName) {
  const joined = `mcp__${serverName}__${rawName}`
  const normalized = joined.replace(INVALID_NAME_CHARS, '_')
  if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH) return normalized
  const hash = sha256Hex(utf8(`${serverName}\0${rawName}`)).slice(0, HASH_LENGTH)
  return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`
}