/**
 * Inline the browser-half's shared modules into `client.js`.
 *
 * Why this exists: the DSH browser module system's `require` resolves bare
 * specifiers only — a relative path such as `./src/naming.js` is not in the
 * module table and throws. The Host half imports those modules normally, so
 * without this step the two halves would carry separate copies that could
 * silently drift.
 *
 * So the source of truth stays `src/`, and this script rewrites the marked block
 * in `client.js` from those files. It runs in two modes:
 *
 *   node scripts/sync-client-data.mjs          rewrite the block
 *   node scripts/sync-client-data.mjs --check  fail if the block is stale
 *
 * `--check` is what CI and contributors run; the install path itself never needs
 * a build, because the generated block is committed.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/** The modules the browser half needs inlined, in emission order. */
const MODULES = ['naming.js', 'paths.js', 'locales.js', 'mcp-json.js']

const START = '/* moduleData:start */'
const END = '/* moduleData:end */'

/**
 * Rewrite one source module into a factory expression.
 *
 * Each module becomes a self-executing function returning its own exports, so
 * the inlined copies cannot collide in one scope and each keeps its own
 * private helpers. Imports are hoisted into parameters: a sibling import is
 * resolved to the sibling module's entry, and a Node builtin is passed in from
 * the platform seed word the browser half already requires.
 *
 * @param {string} name - the module file name
 * @param {string} source - its text
 * @returns {string} the expression to place after `'name': `
 */
function toFactory (name, source) {
  const exported = collectExports(source)
  const bindings = []
  const prelude = []
  const params = new Set()
  let body = source

  /**
   * Record one hoisted binding, reusing it when the same module is imported twice.
   *
   * The sibling table is passed in as a parameter rather than closed over from
   * the enclosing `const moduleData`: a module is evaluated while that object
   * literal is still initializing, so closing over it would throw a temporal
   * dead zone error for any module that imports a sibling.
   *
   * @param {string} value - the expression supplying the binding
   * @returns {string} the parameter name the destructuring uses
   */
  const bind = value => {
    if (params.has(value)) return [...params][0]
    const param = `mod${params.size}`
    params.add(value)
    prelude.push(`      const ${param} = ${value}`)
    return param
  }

  // `import { a, b } from './x.js'` -> destructure the sibling module's entry.
  body = body.replace(
    /import\s*\{([^}]*)\}\s*from\s*'\.\/([\w.-]+)'\s*;?[ \t]*$/gm,
    (_match, names, from) => {
      // Bound to call time: a sibling's entry may not exist yet while this
      // module's factory is still being evaluated.
      const mod = `resolveDep(${JSON.stringify(from)})`
      const entries = names.split(',').map(entry => entry.trim()).filter(Boolean)
        .map(entry => {
          const local = entry.split(/\s+as\s+/)[0].trim()
          const exported = entry.split(/\s+as\s+/).pop().trim()
          return `      const ${local} = (...a) => ${mod}(${JSON.stringify(from)})[${JSON.stringify(exported)}](...a)`
        })
      prelude.push(...entries)
      return ''
    },
  )
  // `import { x } from 'node:y'` and `import y from 'node:y'` -> seed binding.
  body = body.replace(
    /import\s*(?:\{([^}]*)\}|(\w+))\s*from\s*'node:([\w-]+)'\s*;?[ \t]*$/gm,
    (_match, named, single, mod) => {
      if (named) {
        const entries = named.split(',').map(entry => entry.trim()).filter(Boolean)
          .map(entry => `      const ${entry} = node[${JSON.stringify(mod)}][${JSON.stringify(entry.split(/\s+as\s+/).pop().trim())}]`)
        prelude.push(...entries)
      } else {
        prelude.push(`      const ${single} = node[${JSON.stringify(mod)}]`)
      }
      return ''
    },
  )
  // Anything left is a bare package; the factory still has `require`.
  body = body.replace(
    /import\s*(?:\{([^}]*)\}|(\w+))\s*from\s*'([^']+)'\s*;?[ \t]*$/gm,
    (_match, named, single, spec) => {
      if (named) {
        const entries = named.split(',').map(entry => entry.trim()).filter(Boolean)
          .map(entry => `      const ${entry} = require(${JSON.stringify(spec)})[${JSON.stringify(entry.split(/\s+as\s+/).pop().trim())}]`)
        prelude.push(...entries)
      } else {
        prelude.push(`      const ${single} = require(${JSON.stringify(spec)})`)
      }
      return ''
    },
  )

  const names = ['resolveDep', 'node', 'require', ...bindings]
  return `(function (${names.join(', ')}) {\n${
    prelude.length ? `${prelude.join('\n')}\n` : ''
  }${indent(stripModule(body), 2)}\nreturn { ${exported.join(', ')} }\n})`
}

/**
 * Collect the names a module exports.
 *
 * Only the forms this codebase actually uses are recognised: a leading
 * `export` on a declaration, and a trailing `export { … }` list. A default
 * export is not used by these modules and is reported rather than silently
 * dropped, so a future edit cannot quietly lose a binding.
 *
 * @param {string} source - the module text
 * @returns {string[]} the exported names, in source order
 */
function collectExports (source) {
  const names = []
  for (const match of source.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([\w$]+)/gm)) {
    names.push(match[1])
  }
  for (const match of source.matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm)) {
    for (const entry of match[1].split(',')) {
      const name = entry.trim().split(/\s+as\s+/).pop()?.trim()
      if (name) names.push(name)
    }
  }
  return [...new Set(names)]
}

/**
 * Drop the module's `import` and `export` keywords.
 *
 * Everything else — including the file's doc comment — is kept, so the inlined
 * copy still explains the contract it implements.
 *
 * @param {string} source - the module text
 * @returns {string} the text safe to inline
 */
function stripModule (source) {
  return source
    .replace(/^export\s+(?=(?:async\s+)?(?:const|let|function|class)\b)/gm, '')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    .trim()
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Build the replacement block.
 *
 * Emitted in two phases because the modules form a cycle-free but non-trivial
 * import graph, and every lookup has to be lazy: a module's factory runs while
 * the table it reads from is still being filled, so it must not read a sibling
 * until call time.
 *
 * Phase one defines every entry as a memoizing thunk. Phase two fills each
 * thunk's cached value. A sibling import therefore becomes `dep('x.js')`, which
 * resolves on first call rather than during initialization.
 *
 * @returns {Promise<string>} the generated block, delimiters included
 */
async function buildBlock () {
  const factories = []
  for (const name of MODULES) {
    const source = await readFile(join(root, 'src', name), 'utf8')
    if (/^export\s+default\b/m.test(source)) {
      throw new Error(`sync-client-data: ${name} uses a default export; the inliner only handles named exports`)
    }
    // The DSH shell seeds no Node builtin into the browser module table, so a
    // `node:` import cannot be satisfied here. Refuse loudly instead of emitting
    // a block that throws at boot with an opaque "missed the module table" —
    // that is exactly how the first release failed.
    if (/from\s*'node:[^']+'/m.test(source)) {
      throw new Error(
        `sync-client-data: ${name} imports a Node builtin, which the browser module table cannot resolve. `
        + 'Keep it out of MODULES, or remove the dependency.',
      )
    }
    factories.push({ name, factory: toFactory(name, source) })
  }

  const define = factories
    .map(({ name, factory }) => `      ${JSON.stringify(name)}: once(() => (${factory})(key => deps[key], node, require))`)
    .join(',\n')

  const fill = factories
    .map(({ name }) => `      deps[${JSON.stringify(name)}] = deps[${JSON.stringify(name)}]()`)
    .join('\n')

  return `${START}
    const moduleData = {}
    // Placeholder for a module that imports a \`node:\` builtin. Deliberately
    // empty: the DSH shell seeds no Node builtin into the browser module table,
    // so a shared module that needs one cannot be inlined here and must be
    // kept out of MODULES. naming.js used to need \`node:crypto\` for its identity
    // hash; it now computes the digest itself, which is why this stays empty.
    const node = {}
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
${define}
    }
${indent(fill, 4)}
    ${END}`
}

/**
 * Indent every line of a block.
 *
 * @param {string} text - the block
 * @param {number} spaces - leading spaces per line
 * @returns {string} the indented block
 */
function indent (text, spaces) {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map(line => (line ? pad + line : line)).join('\n')
}

const check = process.argv.includes('--check')
const clientPath = join(root, 'client.js')
const client = await readFile(clientPath, 'utf8')
const block = await buildBlock()

const startIndex = client.indexOf(START)
const endIndex = client.indexOf(END)
if (startIndex < 0 || endIndex < 0) {
  console.error(`sync-client-data: ${clientPath} is missing the ${START} / ${END} markers`)
  process.exit(1)
}

const head = client.slice(0, startIndex)
const tail = client.slice(endIndex + END.length)
const next = `${head}${block}${tail}`

if (next === client) {
  console.log('sync-client-data: client.js already matches src/')
  process.exit(0)
}

if (check) {
  console.error('sync-client-data: client.js is stale — run: node scripts/sync-client-data.mjs')
  process.exit(1)
}

await writeFile(clientPath, next, 'utf8')
console.log('sync-client-data: rewrote the inlined module block in client.js')