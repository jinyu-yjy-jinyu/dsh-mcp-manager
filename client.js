/**
 * dsh-mcp-manager 闂?browser half.
 *
 * Registers an independent MCP page in Settings (the `settings.section` slot)
 * where the user manages external MCP servers. Two ways in, one way out:
 *
 *  - a form per server, edited inline and saved as one atomic section write;
 *  - a textarea that imports or exports the standard `mcp.json` document.
 *
 * Both paths write the same `mcp-manager` namespace, so a document imported
 * from another MCP client and a server filled in by hand are indistinguishable
 * afterwards, and either can be exported again.
 *
 * Connection status is not settings state 闂?the Host owns it. The page polls
 * the plugin's read-only status route, so a server that connects, fails, and
 * reconnects updates here without a save.
 *
 * Hand-written ModuleLoader bundle: no build step, no dependency beyond the
 * React the shell already provides, and no JSX. All colour comes from theme
 * variables so the page follows light and dark without a stylesheet swap.
 */

window.__ModuleLoader__.load({
  id: 'dsh-mcp-manager',
  factory: require => {
    const module = { exports: {} }
    const exports = module.exports

    // The browser module system's `require` resolves bare specifiers only: a
    // relative path is not in the module table and throws. So the four modules
    // the Host half also imports are inlined here as `moduleData` instead of
    // required. `scripts/sync-client-data.mjs` rewrites this block from `src/`
    // and fails loudly when the checked-in copy drifts, so there is still one
    // source of truth and no build step on the install path.
    /* moduleData:start */
    const moduleData = {}
    const once = thunk => {
      let value
      let filled = false
      return () => {
        if (!filled) {
          value = thunk()
          filled = true
        }
        return value
      }
    }
    const deps = {
      "naming.js": once(() => ((function (resolveDep, node, require) {
      const createHash = node["crypto"]["createHash"]
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

  /** DeepSeek function-name contract: at most 64 characters. */
  const MAX_PUBLIC_NAME_LENGTH = 64

  /** DeepSeek function-name contract: only `[A-Za-z0-9_-]` is allowed. */
  const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/g

  /** Hex chars of the SHA-256 identity hash appended on lossy normalization. */
  const HASH_LENGTH = 12

  /** Valid `serverName`: also the prefix of every tool this server exposes. */
  const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

  /** The namespace a server owns, as a tool-name prefix. */
  function serverPrefix (serverName) {
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
  function publicToolName (serverName, rawName) {
    const joined = `mcp__${serverName}__${rawName}`
    const normalized = joined.replace(INVALID_NAME_CHARS, '_')
    if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH) return normalized
    const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH)
    return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`
  }
return { MAX_PUBLIC_NAME_LENGTH, SERVER_NAME_PATTERN, serverPrefix, publicToolName }
}))(key => deps[key], { crypto: require('crypto') }, require)),
      "paths.js": once(() => ((function (resolveDep, node, require) {
  /**
   * The paths the two halves of this plugin agree on.
   *
   * Shared rather than duplicated so the Host route and the browser fetch cannot
   * drift apart — a mismatch would surface only as a 404 at runtime, in the one
   * place a user would read it as "the server has no status".
   */

  /** Read-only status route served by the Host half. */
  const STATUS_PATH = '/api/dsh-mcp-manager/status'

  /**
   * Marker header a same-origin page must send.
   *
   * The Host refuses any request without it, so a cross-site page cannot read
   * which MCP servers are configured and how they are addressed.
   */
  const CLIENT_MARKER_HEADER = 'x-dsh-mcp-manager'
return { STATUS_PATH, CLIENT_MARKER_HEADER }
}))(key => deps[key], { crypto: require('crypto') }, require)),
      "locales.js": once(() => ((function (resolveDep, node, require) {
  /**
   * Copy for the MCP settings page.
   *
   * Kept in its own dependency-free module so both halves of the plugin can read
   * it and so the keys stay greppable from the page without a dictionary import
   * in the Host bundle.
   */

  /** Dictionary namespace owned by this plugin's browser half. */
  const NS = 'settings.mcpManager'

  /** Simplified Chinese copy. */
  const ZH = {
    title: 'MCP',
    description: '管理外部 MCP 服务器。配置保存后，Agent 即可在对话中自由调用这些服务器提供的工具。',
    empty: '还没有配置 MCP 服务器。点击「添加服务器」逐条填写，或导入现成的 mcp.json。',
    'action.add': '添加服务器',
    'action.import': '导入 JSON',
    'action.export': '导出 JSON',
    'action.save': '保存',
    'action.saving': '保存中…',
    'action.delete': '删除',
    'action.rename': '重命名',
    'action.cancel': '取消',
    'action.copy': '复制',
    'action.importNow': '导入',
    'toggle': '启用该服务器',
    'transport.label': '传输方式',
    'transport.stdio': '本地进程（stdio）',
    'transport.http': '远程服务（Streamable HTTP）',
    'field.id': '名称',
    'field.command': '启动命令',
    'field.args': '参数',
    'field.cwd': '工作目录',
    'field.url': '接口地址',
    'field.timeout': '单次调用超时（毫秒）',
    'hint.tools': '工具将以 {prefix}<工具名> 的形式提供给 Agent。',
    'hint.env': '环境变量（JSON 对象）',
    'hint.headers': '请求头（JSON 对象）',
    'status.ready': '已连接 · {count} 个工具',
    'status.connecting': '连接中…',
    'status.reconnecting': '重连中…',
    'status.failed': '连接失败',
    'status.stopped': '未连接',
    'dialog.import': '导入 mcp.json',
    'dialog.export': '导出 mcp.json',
    'preview.import': '将新增：{added}；将覆盖同名服务器：{replaced}',
    'result.imported': '已导入。新增：{added}；覆盖：{replaced}。点击「保存」生效。',
    'result.copied': '已复制到剪贴板。',
    'error.save': '保存失败：设置已被其它改动更新，请重试。',
    'error.copy': '复制失败，请手动选择文本复制。',
    'error.load': '无法读取 MCP 设置。',
  }

  /** English copy. */
  const EN = {
    title: 'MCP',
    description: 'Manage external MCP servers. Once saved, the agent can freely call the tools these servers provide.',
    empty: 'No MCP server configured yet. Use “Add server” to fill one in, or import an existing mcp.json.',
    'action.add': 'Add server',
    'action.import': 'Import JSON',
    'action.export': 'Export JSON',
    'action.save': 'Save',
    'action.saving': 'Saving…',
    'action.delete': 'Delete',
    'action.rename': 'Rename',
    'action.cancel': 'Cancel',
    'action.copy': 'Copy',
    'action.importNow': 'Import',
    toggle: 'Enable this server',
    'transport.label': 'Transport',
    'transport.stdio': 'Local process (stdio)',
    'transport.http': 'Remote service (Streamable HTTP)',
    'field.id': 'Name',
    'field.command': 'Command',
    'field.args': 'Arguments',
    'field.cwd': 'Working directory',
    'field.url': 'Endpoint URL',
    'field.timeout': 'Per-call timeout (ms)',
    'hint.tools': 'Tools reach the agent as {prefix}<tool name>.',
    'hint.env': 'Environment variables (JSON object)',
    'hint.headers': 'Request headers (JSON object)',
    'status.ready': 'Connected · {count} tools',
    'status.connecting': 'Connecting…',
    'status.reconnecting': 'Reconnecting…',
    'status.failed': 'Failed',
    'status.stopped': 'Not connected',
    'dialog.import': 'Import mcp.json',
    'dialog.export': 'Export mcp.json',
    'preview.import': 'Will add: {added}; will replace same-name servers: {replaced}',
    'result.imported': 'Imported. Added: {added}; replaced: {replaced}. Click “Save” to apply.',
    'result.copied': 'Copied to the clipboard.',
    'error.save': 'Could not save: the settings changed underneath. Please retry.',
    'error.copy': 'Copy failed; select the text and copy it manually.',
    'error.load': 'Could not read the MCP settings.',
  }
return { NS, ZH, EN }
}))(key => deps[key], { crypto: require('crypto') }, require)),
      "mcp-json.js": once(() => ((function (resolveDep, node, require) {
      const withServerDefaults = (...a) => resolveDep("defaults.js")("defaults.js")["withServerDefaults"](...a)
      const SERVER_NAME_PATTERN = (...a) => resolveDep("naming.js")("naming.js")["SERVER_NAME_PATTERN"](...a)
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
  function parseMcpJson (text) {
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
  function exportMcpJson (servers) {
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
  function planImport (current, incoming) {
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
return { parseMcpJson, exportMcpJson, planImport }
}))(key => deps[key], { crypto: require('crypto') }, require))
    }
          deps["naming.js"] = deps["naming.js"]()
          deps["paths.js"] = deps["paths.js"]()
          deps["locales.js"] = deps["locales.js"]()
          deps["mcp-json.js"] = deps["mcp-json.js"]()
    /* moduleData:end */

    const { createElement: h, Fragment, useState, useEffect, useMemo, useCallback, useRef } = require('react')
    const { parseMcpJson, exportMcpJson, planImport } = deps['mcp-json.js']
    const { SERVER_NAME_PATTERN, serverPrefix } = deps['naming.js']
    const { STATUS_PATH, CLIENT_MARKER_HEADER } = deps['paths.js']
    const { NS, ZH, EN } = deps['locales.js']

    /** Settings namespace this plugin owns; shared with the Host half. */
    const NAMESPACE = 'mcp-manager'

    /** How often the page refreshes connection status (ms). */
    const POLL_MS = 4000

    // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀?tiny local widgets 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀閻庢稒顭囬惌鎺旂磼閻樺磭澧い顐㈢箰鐓ゆい蹇撳椤︺劑姊洪崷顓犲笡閻㈩垱甯楀蹇涘川鐎涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换?
    /**
     * A button.
     *
     * @param {object} props - `kind`, `disabled`, `onClick`, children
     * @returns {JSX.Element} the button
     */
    const Button = props => h('button', {
      type: 'button',
      className: `mm_btn${props.kind ? ` ${props.kind}` : ''}`,
      disabled: props.disabled,
      onClick: props.onClick,
    }, props.children)

    /**
     * An on/off switch.
     *
     * @param {object} props - `checked`, `onChange`, `label`
     * @returns {JSX.Element} the switch
     */
    const Switch = props => h('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': props.checked ? 'true' : 'false',
      'aria-label': props.label,
      className: `mm_switch${props.checked ? ' on' : ''}`,
      onClick: props.onChange,
    }, h('i'))

    /**
     * A status pill.
     *
     * @param {object} props - `tone`, children
     * @returns {JSX.Element} the pill
     */
    const Pill = props => h('span', { className: 'mm_pill' },
      props.tone ? h('span', { className: `mm_dot ${props.tone}` }) : null,
      props.children)

    /**
     * A labelled form field.
     *
     * @param {object} props - `label`, children
     * @returns {JSX.Element} the field
     */
    const field = (label, control) => h('label', { className: 'mm_field' }, h('span', null, label), control)

    /**
     * A modal dialog.
     *
     * @param {object} props - `title`, `onClose`, children
     * @returns {JSX.Element} the dialog
     */
    const Dialog = props => {
      const onKey = event => {
        if (event.key === 'Escape') props.onClose()
      }
      return h('div', {
        className: 'mm_scrim',
        onKeyDown: onKey,
      },
      h('div', { className: 'mm_modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title },
        h('header', { className: 'mm_modalhead' },
          h('h3', null, props.title),
          h('button', { type: 'button', className: 'mm_x', 'aria-label': 'close', onClick: props.onClose }, '\u00d7')),
        h('div', { className: 'mm_modalbody' }, props.children)))
    }

    // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀?data access 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀閻庢稒顭囬惌鎺旂磼閻樺磭澧い顐㈢箰鐓ゆい蹇撳椤︺劑姊洪崷顓犲笡閻㈩垱甯楀蹇涘川鐎涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞?
    /**
     * Read this plugin's settings namespace.
     *
     * @returns {Promise<{ value: object, revision: number | undefined }>} the section
     */
    async function readSection () {
      const response = await ctx.remote.settings.describe()
      if (!response.ok) throw new Error('describe failed')
      const row = (response.value?.namespaces ?? []).find(entry => entry.ns === NAMESPACE)
      return { value: row?.value ?? {}, revision: row?.revision }
    }

    /**
     * Overwrite the `servers` map in one atomic write.
     *
     * Writing the section as a unit rather than one field per keystroke keeps a
     * half-finished server from ever reaching the Host: either the new set is
     * persisted and reconciled, or the old one stays.
     *
     * @param {object} servers - the complete server map to persist
     * @param {number | undefined} revision - the revision the edit was based on
     * @returns {Promise<boolean>} whether the Host accepted the write
     */
    async function writeServers (servers, revision) {
      const current = await readSection()
      const response = await ctx.remote.settings.replace(
        NAMESPACE,
        { ...current.value, servers },
        revision,
      )
      return response.ok === true
    }

    /**
     * Fetch the Host's live connection status.
     *
     * @returns {Promise<{ servers: object, problems: string[] }>} the snapshot
     */
    async function readStatus () {
      const response = await fetch(STATUS_PATH, {
        method: 'GET',
        headers: { [CLIENT_MARKER_HEADER]: '1' },
        credentials: 'same-origin',
      })
      if (!response.ok) return undefined
      const payload = await response.json()
      return payload?.ok ? payload.data : undefined
    }

    /**
     * Split a shell-ish argument string, honouring single and double quotes.
     *
     * @param {string} text - the raw text
     * @returns {string[]} the parsed arguments
     */
    function splitArgs (text) {
      const out = []
      const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
      let match
      while ((match = pattern.exec(text)) !== null) out.push(match[1] ?? match[2] ?? match[3])
      return out
    }

    // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀?page 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀閻庢稒顭囬惌鎺旂磼閻樺磭澧い顐㈢箰鐓ゆい蹇撳椤︺劑姊洪崷顓犲笡閻㈩垱甯楀蹇涘川鐎涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮?
    /**
     * The MCP settings page.
     *
     * @param {object} props - `t` (the page's locale reader)
     * @returns {JSX.Element} the page
     */
    function McpSettingsPage (props) {
      const t = props.t
      const [servers, setServers] = useState({})
      const [revision, setRevision] = useState(undefined)
      const [dirty, setDirty] = useState(false)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [notice, setNotice] = useState('')
      const [status, setStatus] = useState({ servers: {}, problems: [] })
      const [dialog, setDialog] = useState(undefined)
      const [jsonText, setJsonText] = useState('')
      const [parse, setParse] = useState({ servers: {}, errors: [], warnings: [] })
      const counter = useRef(0)

      // Load once, then follow the Host.
      useEffect(() => {
        let alive = true
        readSection()
          .then(section => {
            if (!alive) return
            setServers(section.value?.servers ?? {})
            setRevision(section.revision)
          })
          .catch(() => { if (alive) setError(t('error.load')) })
        return () => { alive = false }
      }, [t])

      // Connection status is the Host's fact, not ours; poll it.
      useEffect(() => {
        let alive = true
        const tick = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            readStatus()
              .then(snapshot => { if (alive && snapshot) setStatus(snapshot) })
              .catch(() => { /* keep the last snapshot */ })
          }
        }
        tick()
        const timer = setInterval(tick, POLL_MS)
        return () => { alive = false; clearInterval(timer) }
      }, [])

      /** Stage one server's field change without saving yet. */
      const edit = useCallback((id, patch) => {
        setServers(current => ({ ...current, [id]: { ...current[id], ...patch } }))
        setDirty(true)
      }, [])

      /** Rename a server, moving its staged entry. */
      const rename = useCallback((id, nextId) => {
        setServers(current => {
          const next = {}
          for (const [key, value] of Object.entries(current)) next[key === id ? nextId : key] = value
          return next
        })
        setDirty(true)
      }, [])

      /** Remove one server from the staged set. */
      const remove = useCallback(id => {
        setServers(current => {
          const next = { ...current }
          delete next[id]
          return next
        })
        setDirty(true)
      }, [])

      /** Add an empty server under the next free name. */
      const add = useCallback(() => {
        setServers(current => {
          let n = counter.current
          let candidate = 'server'
          while (Object.hasOwn(current, candidate)) candidate = `server${++n}`
          counter.current = n
          return {
            ...current,
            [candidate]: {
              id: candidate,
              enabled: true,
              transport: 'stdio',
              command: '',
              args: [],
              env: {},
              cwd: '',
              url: '',
              headers: {},
              toolCallTimeoutMs: 60000,
            },
          }
        })
        setDirty(true)
      }, [])

      /** Persist the staged section. */
      const save = useCallback(async () => {
        setBusy(true)
        setError('')
        try {
          if (await writeServers(servers, revision)) {
            setDirty(false)
            const fresh = await readSection()
            setRevision(fresh.revision)
          } else {
            setError(t('error.save'))
          }
        } catch {
          setError(t('error.save'))
        } finally {
          setBusy(false)
        }
      }, [servers, revision, t])

      /** Merge the pasted document into the staged servers. */
      const commitImport = useCallback(() => {
        const { merged, added, replaced } = planImport(servers, parse.servers)
        setServers(merged)
        setDirty(true)
        setDialog(undefined)
        setParse({ servers: {}, errors: [], warnings: [] })
        setNotice(t('result.imported', {
          added: added.join('\u3001') || '\u2014',
          replaced: replaced.join('\u3001') || '\u2014',
        }))
      }, [servers, parse, t])

      const copyExport = useCallback(async () => {
        try {
          await navigator.clipboard.writeText(jsonText)
          setDialog(undefined)
          setNotice(t('result.copied'))
        } catch {
          setError(t('error.copy'))
        }
      }, [jsonText, t])

      const entries = Object.entries(servers)
      const incoming = Object.keys(parse.servers)
      const preview = t('preview.import', {
        added: incoming.filter(id => !Object.hasOwn(servers, id)).join('\u3001') || '\u2014',
        replaced: incoming.filter(id => Object.hasOwn(servers, id)).join('\u3001') || '\u2014',
      })

      return h('div', { className: 'mm_root' },
        h('header', { className: 'mm_hero' },
          h('h2', { className: 'mm_title' }, t('title')),
          h('p', { className: 'mm_desc' }, t('description'))),

        h('div', { className: 'mm_actions' },
          h(Button, { kind: 'primary', onClick: add }, t('action.add')),
          h(Button, {
            onClick: () => {
              setJsonText('')
              setParse({ servers: {}, errors: [], warnings: [] })
              setDialog('import')
            },
          }, t('action.import')),
          h(Button, {
            onClick: () => {
              setJsonText(exportMcpJson(servers))
              setParse({ servers: {}, errors: [], warnings: [] })
              setDialog('export')
            },
          }, t('action.export')),
          h('span', { className: 'mm_spacer' }),
          h(Button, { kind: 'primary', disabled: !dirty || busy, onClick: save },
            busy ? t('action.saving') : t('action.save'))),

        error ? h('p', { className: 'mm_callout err', role: 'alert' }, error) : null,
        notice ? h('p', { className: 'mm_callout' }, notice) : null,
        status.problems.map(problem => h('p', { className: 'mm_callout warn', key: problem }, problem)),

        entries.length === 0
          ? h('p', { className: 'mm_note' }, t('empty'))
          : h('div', null, entries.map(([id, server]) => h(ServerCard, {
            key: id,
            t,
            id,
            server,
            status: status.servers[id],
            onEdit: patch => edit(id, patch),
            onRename: nextId => rename(id, nextId),
            onRemove: () => remove(id),
          }))),

        dialog
          ? h(Dialog, {
            title: t(dialog === 'import' ? 'dialog.import' : 'dialog.export'),
            onClose: () => setDialog(undefined),
          },
          h('textarea', {
            className: 'mm_json',
            spellCheck: false,
            rows: 18,
            value: jsonText,
            onChange: event => {
              const text = event.target.value
              setJsonText(text)
              if (dialog === 'import' && text.trim()) setParse(parseMcpJson(text))
            },
          }),
          parse.errors.map(msg => h('p', { className: 'mm_callout err', key: msg }, msg)),
          parse.warnings.map(msg => h('p', { className: 'mm_callout warn', key: msg }, msg)),
          dialog === 'import' && incoming.length > 0
            ? h('p', { className: 'mm_note' }, preview)
            : null,
          h('div', { className: 'mm_dialogactions' },
            h(Button, { onClick: () => setDialog(undefined) }, t('action.cancel')),
            dialog === 'import'
              ? h(Button, { kind: 'primary', disabled: parse.errors.length > 0, onClick: commitImport }, t('action.importNow'))
              : h(Button, { kind: 'primary', onClick: copyExport }, t('action.copy'))))
          : null)
    }

    /**
     * One server's editable fields and live status.
     *
     * @param {object} props - `t`, `id`, `server`, `status`, and the three mutators
     * @returns {JSX.Element} the card
     */
    function ServerCard (props) {
      const { t, id, server, status } = props
      const [renaming, setRenaming] = useState(false)
      const [draftId, setDraftId] = useState(id)
      const stdio = server.transport === 'stdio'

      const badge = () => {
        switch (status?.status) {
          case 'ready':
            return h(Pill, { tone: 'ok' }, t('status.ready', { count: status.toolCount ?? 0 }))
          case 'connecting':
            return h(Pill, { tone: 'info' }, t('status.connecting'))
          case 'reconnecting':
            return h(Pill, { tone: 'warn' }, t('status.reconnecting'))
          case 'failed':
            return h(Pill, { tone: 'err' }, t('status.failed'))
          default:
            return h(Pill, null, t('status.stopped'))
        }
      }

      return h('article', { className: 'mm_card', 'data-off': String(server.enabled === false) },
        h('header', { className: 'mm_cardhead' },
          renaming
            ? h('span', { className: 'mm_rename' },
              h('input', {
                className: 'mm_input',
                value: draftId,
                placeholder: t('field.id'),
                onChange: event => setDraftId(event.target.value),
              }),
              h(Button, {
                disabled: !SERVER_NAME_PATTERN.test(draftId) || draftId === id,
                onClick: () => { props.onRename(draftId); setRenaming(false) },
              }, t('action.rename')),
              h(Button, { onClick: () => { setDraftId(id); setRenaming(false) } }, t('action.cancel')))
            : h('span', { className: 'mm_cardname' },
              h('code', null, id),
              h(Button, { onClick: () => { setDraftId(id); setRenaming(true) } }, t('action.rename'))),
          h('span', { className: 'mm_cardstate' },
            badge(),
            h(Switch, {
              checked: server.enabled !== false,
              label: t('toggle'),
              onChange: () => props.onEdit({ enabled: server.enabled === false }),
            }))),

        h('div', { className: 'mm_cardbody' },
          field(t('transport.label'), h('select', {
            className: 'mm_input',
            value: server.transport,
            onChange: event => props.onEdit({ transport: event.target.value }),
          },
          h('option', { value: 'stdio' }, t('transport.stdio')),
          h('option', { value: 'streamable-http' }, t('transport.http')))),

          stdio
            ? h(Fragment, null,
              field(t('field.command'), h('input', {
                className: 'mm_input',
                value: server.command ?? '',
                placeholder: 'npx',
                onChange: event => props.onEdit({ command: event.target.value }),
              })),
              field(t('field.args'), h('input', {
                className: 'mm_input',
                value: (server.args ?? []).join(' '),
                placeholder: '-y @modelcontextprotocol/server-github',
                onChange: event => props.onEdit({ args: splitArgs(event.target.value) }),
              })),
              field(t('hint.env'), h('textarea', {
                className: 'mm_json small',
                spellCheck: false,
                rows: 4,
                value: JSON.stringify(server.env ?? {}, null, 2),
                onChange: event => {
                  try { props.onEdit({ env: JSON.parse(event.target.value) }) } catch { /* keep the last valid map */ }
                },
              })),
              field(t('field.cwd'), h('input', {
                className: 'mm_input',
                value: server.cwd ?? '',
                onChange: event => props.onEdit({ cwd: event.target.value }),
              })))
            : h(Fragment, null,
              field(t('field.url'), h('input', {
                className: 'mm_input',
                value: server.url ?? '',
                placeholder: 'http://localhost:3000/mcp',
                onChange: event => props.onEdit({ url: event.target.value }),
              })),
              field(t('hint.headers'), h('textarea', {
                className: 'mm_json small',
                spellCheck: false,
                rows: 4,
                value: JSON.stringify(server.headers ?? {}, null, 2),
                onChange: event => {
                  try { props.onEdit({ headers: JSON.parse(event.target.value) }) } catch { /* keep the last valid map */ }
                },
              }))),

          field(t('field.timeout'), h('input', {
            className: 'mm_input narrow',
            type: 'number',
            value: server.toolCallTimeoutMs ?? 60000,
            onChange: event => props.onEdit({ toolCallTimeoutMs: Number(event.target.value) || 60000 }),
          })),

          h('p', { className: 'mm_note' }, t('hint.tools', { prefix: serverPrefix(id) })),
          status?.message ? h('p', { className: 'mm_callout err', role: 'alert' }, status.message) : null,

          h('footer', { className: 'mm_cardfoot' },
            h(Button, { kind: 'danger', onClick: props.onRemove }, t('action.delete')))))
    }

    // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀?styles 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀閻庢稒顭囬惌鎺旂磼閻樺磭澧い顐㈢箰鐓ゆい蹇撳椤︺劑姊洪崷顓犲笡閻㈩垱甯楀蹇涘川鐎涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣?
    /** Injected once by the page component. */
    const STYLE = `
.mm_root{display:flex;flex-direction:column;gap:14px}
.mm_title{margin:0;font-size:17px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mm_desc{margin:2px 0 0;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}
.mm_actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mm_spacer{flex:1}
.mm_btn{padding:5px 11px;font-size:12.5px;border-radius:7px;cursor:pointer;
 border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-surface-raised);
 color:var(--dsw-alias-label-primary)}
.mm_btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l1)}
.mm_btn:disabled{opacity:.5;cursor:not-allowed}
.mm_btn.primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:var(--dsw-alias-label-inverse)}
.mm_btn.danger{color:var(--dsw-alias-state-critical-fg)}
.mm_switch{width:34px;height:19px;border-radius:10px;padding:0;cursor:pointer;
 border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-surface-sunken);position:relative}
.mm_switch i{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;
 background:var(--dsw-alias-label-secondary);transition:transform .15s}
.mm_switch.on{background:var(--dsw-alias-state-business-primary);border-color:transparent}
.mm_switch.on i{transform:translateX(15px);background:#fff}
.mm_pill{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;font-size:11.5px;
 background:var(--dsw-alias-surface-sunken);color:var(--dsw-alias-label-secondary)}
.mm_dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.mm_dot.ok{background:var(--dsw-alias-state-success-fg)}
.mm_dot.err{background:var(--dsw-alias-state-critical-fg)}
.mm_dot.warn{background:var(--dsw-alias-state-caution-fg)}
.mm_dot.info{background:var(--dsw-alias-state-business-primary)}
.mm_field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.mm_input{padding:5px 8px;font-size:12.5px;border-radius:7px;
 border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-surface-raised);color:var(--dsw-alias-label-primary);min-width:0}
.mm_input.narrow{max-width:120px}
.mm_json{width:100%;box-sizing:border-box;font-family:var(--dsw-alias-font-mono,monospace);font-size:12px;
 padding:8px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);
 background:var(--dsw-alias-surface-sunken);color:var(--dsw-alias-label-primary);resize:vertical}
.mm_json.small{min-height:76px}
.mm_card{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px;
 display:flex;flex-direction:column;gap:10px;background:var(--dsw-alias-surface-raised)}
.mm_card[data-off="true"]{opacity:.62}
.mm_cardhead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.mm_cardname{display:flex;align-items:center;gap:8px;font-size:13px}
.mm_cardname code{font-family:var(--dsw-alias-font-mono,monospace);font-size:12.5px}
.mm_rename{display:flex;align-items:center;gap:6px}
.mm_cardstate{display:flex;align-items:center;gap:8px}
.mm_cardbody{display:flex;flex-direction:column;gap:9px}
.mm_cardfoot{display:flex;justify-content:flex-end}
.mm_note{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.mm_callout{margin:0;padding:7px 10px;border-radius:7px;font-size:12.5px;
 background:var(--dsw-alias-surface-sunken);color:var(--dsw-alias-label-secondary)}
.mm_callout.err{color:var(--dsw-alias-state-critical-fg)}
.mm_callout.warn{color:var(--dsw-alias-state-caution-fg)}
.mm_scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;
 justify-content:center;z-index:1000;padding:24px}
.mm_modal{background:var(--dsw-alias-surface-raised);border-radius:12px;padding:16px;width:min(720px,100%);
 max-height:88vh;overflow:auto;display:flex;flex-direction:column;gap:10px}
.mm_modalhead{display:flex;align-items:center;justify-content:space-between}
.mm_modalhead h3{margin:0;font-size:15px;color:var(--dsw-alias-label-primary)}
.mm_modalbody{display:flex;flex-direction:column;gap:8px}
.mm_x{background:none;border:none;font-size:20px;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.mm_dialogactions{display:flex;justify-content:flex-end;gap:8px}
`

    /** Inject the stylesheet once per document. */
    function ensureStyle () {
      if (typeof document === 'undefined' || document.getElementById('mm-style')) return
      const tag = document.createElement('style')
      tag.id = 'mm-style'
      tag.textContent = STYLE
      document.head.append(tag)
    }

    // 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀?registration 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾鐎规洦鍨跺畷绋课旈埀顒勫磼閵婏妇绡€濠电姴鍊绘晶鏇犵棯閹岀吋闁哄瞼鍠栧畷婊嗩槾閻㈩垱鐩弻锝夊箻閸愬弶娈婚梺鍝勬湰缁嬫牜绮诲☉銏犵闁告劏鏁╅敂鐣岀閻庢稒顭囬惌鎺旂磼閻樺磭澧い顐㈢箰鐓ゆい蹇撳椤︺劑姊洪崷顓犲笡閻㈩垱甯楀蹇涘川鐎涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮璇测槈濮橈絽浜鹃柨婵嗛娴滄繄鈧娲栭惌鍌炲蓟閿涘嫪娌柣锝呯潡瑜忛埀顒冾潐濞叉﹢銆冮崱妤婂殫闁告洦鍓涚弧鈧繛杈剧到婢瑰﹤螞濠婂牊鈷掗柛灞捐壘閳ь剟顥撶划鍫熺瑹閳ь剙鐣烽鐐查敜婵°倐鍋撻柛灞诲妽缁绘繃绻濋崒婊冾暫缂佺偓鍎抽…鐑藉蓟閻旂厧绀堢憸蹇曟暜濞戙垺鐓熼柟鎯у暱閺嗭綁鏌＄仦鍓ь灱缂佺姵鐩獮娆撳礃閳诡剨闄勭换娑氣偓娑欘焽閻帞绱掗悩宕囧ⅹ妞ゎ偄绻愮叅妞ゅ繐瀚ˇ銊╂⒑閸︻厾甯涢悽顖涘笚濞煎繘宕ㄧ€涙ǚ鎷虹紓浣割儐椤戞瑩宕曢幇鐗堢厵闁荤喓澧楅崰妯尖偓娈垮枦椤曆囶敇閸忕厧绶炲┑鐘插濡差垰鈹戦悩顔肩伇婵炲鐩弫鍐晲閸℃瑧褰鹃梺鍝勬储閸ㄦ椽鍩涢幒鎳ㄥ綊鏁愰崶鍓佸姼闂佸搫妫濇禍鍫曞蓟濞戞鐔兼嚒閵堝洨鍘滈柣搴ゎ潐濞叉﹢宕归崸妤冨祦婵☆垵鍋愮壕鍏间繆椤栨粌甯堕悽顖涱殜濮婄粯鎷呮笟顖滃姼缂備胶绮崝娆掓濡炪倖鐗楃粙鎾汇€呴幓鎹ㄦ棃鏁愰崨顓熸闂佹娊鏀遍崹鍧楀蓟濞戙垹绠涙い鎾跺仧缁佺兘鏌ｉ姀鈺佺仜闁告梹鍨垮?
    /** Required services for the browser half. */
    const inject = ['slots', 'locale', 'remote.settings']

    /**
     * Mount the MCP settings page.
     *
     * @param {object} context - the browser plugin context
     */
    function apply (context) {
      const ctx = context
      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'ui-mcp-manager: dictionaries')

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'mcp-manager',
        order: 25,
        label: () => ctx.locale.bind(NS)('title'),
        locale: NS,
      }, props => {
        ensureStyle()
        return h(McpSettingsPage, { ...props, t: ctx.locale.bind(NS) })
      }))
    }

    exports.NS = NS
    exports.apply = apply
    exports.inject = inject
    exports.name = 'mcp-manager'
    return module.exports
  }
})