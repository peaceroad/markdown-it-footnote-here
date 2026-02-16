const getDocIdPart = (env) => {
  if (!env || typeof env !== 'object') return ''
  const cached = docIdPartCache.get(env)
  if (cached !== undefined) return cached

  let value = ''
  if (typeof env.docId === 'string' && env.docId.length > 0) {
    value = `-${encodeURIComponent(env.docId)}-`
  }
  docIdPartCache.set(env, value)
  return value
}

const getRefIdBase = (noteDomPrefix, env) => {
  const docIdPart = getDocIdPart(env)
  if (!docIdPart) return `${noteDomPrefix}-ref`
  return `${noteDomPrefix}${docIdPart}ref`
}

const render_footnote_anchor_name = (tokens, idx, _opt, env) => {
  const n = tokens[idx].meta.id + 1
  return getDocIdPart(env) + n
}

const isEndnoteLabel = (label, opt) => {
  if (!opt.endnotesPrefix) return false
  return label.startsWith(opt.endnotesPrefix)
}

const ensureNotesEnv = (env, key) => {
  if (!env[key]) {
    env[key] = { length: 0, refs: {}, positions: [] }
  }
  return env[key]
}

const ENDNOTE_DOM_PREFIX = 'en'
const FOOTNOTE_DOM_PREFIX = 'fn'
const DEFAULT_DUPLICATE_DEFINITION_MESSAGE = '[Duplicate footnote label detected. Using the first definition.]'
const ERROR_STYLE_CONTENT = '<style>\n:root {\n  --footnote-error-text: #b42318;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --footnote-error-text: #fca5a5;\n  }\n}\n.footnote-error-message {\n  color: var(--footnote-error-text);\n  font-weight: 600;\n  margin-right: 0.35em;\n}\n.footnote-error-backlink {\n  color: var(--footnote-error-text);\n  position: relative;\n}\n.footnote-error-backlink::before {\n  content: "";\n  position: absolute;\n  left: -0.35em;\n  top: 0.08em;\n  bottom: 0.08em;\n  width: 2px;\n  background: var(--footnote-error-text);\n  border-radius: 1px;\n}\n@media (forced-colors: active) {\n  .footnote-error-message,\n  .footnote-error-backlink {\n    color: CanvasText;\n  }\n  .footnote-error-backlink::before {\n    background: CanvasText;\n  }\n}\n</style>\n'
const docIdPartCache = new WeakMap()

const hasLabelWhitespace = (label) => {
  for (let i = 0; i < label.length; i++) {
    if (label.charCodeAt(i) <= 0x20) return true
  }
  return false
}

const alphaSuffixCache = ['']
const arabicSuffixCache = ['']

const formatRefSuffix = (index, useArabicNumerals) => {
  const cache = useArabicNumerals ? arabicSuffixCache : alphaSuffixCache
  if (cache[index]) return cache[index]

  if (useArabicNumerals) {
    const value = String(index)
    cache[index] = value
    return value
  }

  if (index <= 26) {
    const value = String.fromCharCode(96 + index)
    cache[index] = value
    return value
  }

  let value = ''
  let n = index
  while (n > 0) {
    n--
    value = String.fromCharCode(97 + (n % 26)) + value
    n = Math.floor(n / 26)
  }
  cache[index] = value
  return value
}

const findLabelEnd = (src, start, max) => {
  for (let i = start; i < max - 1; i++) {
    if (src.charCodeAt(i) === 0x5D /* ] */ && src.charCodeAt(i + 1) === 0x3A /* : */) {
      return i
    }
  }
  return -1
}

const normalizeDuplicateDefinitionPolicy = (policy) => {
  if (policy === 'ignore' || policy === 'warn' || policy === 'strict') return policy
  return 'warn'
}

const toOptionString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  return String(value)
}

const hasAnyDuplicateDefinition = (notes) => {
  if (!notes || !notes.duplicateCounts) return false
  const counts = notes.duplicateCounts
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0) return true
  }
  return false
}

const selectNoteEnv = (label, env, preferEndnote) => {
  const footRefs = env.footnotes && env.footnotes.refs
  const endRefs = env.endnotes && env.endnotes.refs
  if (!footRefs && !endRefs) return null
  const key = ':' + label

  if (preferEndnote && endRefs) {
    const endId = endRefs[key]
    if (endId !== undefined) {
      return { env: env.endnotes, id: endId, isEndnote: true }
    }
  }
  if (footRefs) {
    const footId = footRefs[key]
    if (footId !== undefined) {
      return { env: env.footnotes, id: footId, isEndnote: false }
    }
  }
  if (!preferEndnote && endRefs) {
    const endId = endRefs[key]
    if (endId !== undefined) {
      return { env: env.endnotes, id: endId, isEndnote: true }
    }
  }
  return null
}

const render_footnote_ref = (tokens, idx, opt, env) => {
  const token = tokens[idx]
  const safe = opt._safe
  const id = token.meta.id
  const n = id + 1
  const isEndnote = token.meta.isEndnote
  const notes = isEndnote ? env && env.endnotes : env && env.footnotes
  const noteDomPrefix = isEndnote ? ENDNOTE_DOM_PREFIX : FOOTNOTE_DOM_PREFIX
  const displayPrefix = isEndnote ? safe.endnotesLabelPrefix : ''
  const docIdPart = getDocIdPart(env)
  const noteIdBase = `${noteDomPrefix}${docIdPart}`
  const refIdBase = getRefIdBase(noteDomPrefix, env)
  const totalCounts = notes && notes.totalCounts ? notes.totalCounts[id] || 0 : 0
  let suffix = ''
  let label = `${safe.labelBra}${displayPrefix}${n}${safe.labelKet}`
  if (totalCounts > 1 && notes) {
    const refCount = notes._refCount || (notes._refCount = [])
    const refIdx = (refCount[id] = (refCount[id] || 0) + 1)
    suffix = '-' + formatRefSuffix(refIdx, opt.afterBacklinkSuffixArabicNumerals)
    if (opt.beforeSameBacklink) {
      label = `${safe.labelBra}${displayPrefix}${n}${suffix}${safe.labelKet}`
    }
  }
  const href = `${noteIdBase}${n}`
  let refCont = `<a href="#${href}" id="${refIdBase}${n}${suffix}" class="${noteDomPrefix}-noteref" role="doc-noteref">${label}</a>`
  if (opt.labelSupTag) refCont = `<sup class="${noteDomPrefix}-noteref-wrapper">${refCont}</sup>`
  return refCont
}

const render_footnote_open = (tokens, idx, opt, env, slf) => {
  const id = slf.rules.footnote_anchor_name(tokens, idx, opt, env, slf)
  const isEndnote = tokens[idx].meta.isEndnote
  const noteId = tokens[idx].meta.id
  const notes = isEndnote ? env && env.endnotes : env && env.footnotes
  const hasDuplicate = !!(notes && notes.duplicateCounts && notes.duplicateCounts[noteId] > 0)
  if (isEndnote) {
    if (hasDuplicate) return `<li id="${ENDNOTE_DOM_PREFIX}${id}" class="footnote-error">\n`
    return `<li id="${ENDNOTE_DOM_PREFIX}${id}">\n`
  }
  let className = FOOTNOTE_DOM_PREFIX
  if (hasDuplicate) className += ' footnote-error'
  return `<aside id="${FOOTNOTE_DOM_PREFIX}${id}" class="${className}" role="doc-footnote">\n`
}

const render_footnote_close = (tokens, idx) => {
  const isEndnote = tokens[idx].meta.isEndnote
  if (isEndnote) return `</li>\n`
  return `</aside>\n`
}

const render_footnote_anchor = (tokens, idx, opt, env) => {
  const safe = opt._safe
  const idNum = tokens[idx].meta.id
  const n = idNum + 1
  const isEndnote = tokens[idx].meta.isEndnote
  const hasDuplicate = !!tokens[idx].meta.hasDuplicateDefinition
  const notes = isEndnote ? env && env.endnotes : env && env.footnotes
  const totalCounts = notes && notes.totalCounts
  const count = totalCounts ? totalCounts[idNum] || 0 : 0
  const noteDomPrefix = isEndnote ? ENDNOTE_DOM_PREFIX : FOOTNOTE_DOM_PREFIX
  const displayPrefix = isEndnote ? safe.endnotesLabelPrefix : ''
  const refIdBase = getRefIdBase(noteDomPrefix, env)
  const backlinkClass = hasDuplicate
    ? `${noteDomPrefix}-backlink footnote-error-backlink`
    : `${noteDomPrefix}-backlink`
  const duplicateMessage = hasDuplicate ? `${opt._duplicateDefinitionMessageHtml} ` : ''

  if (opt.beforeSameBacklink && count > 1) {
    let links = ''
    for (let i = 1; i <= count; i++) {
      const suffix = '-' + formatRefSuffix(i, opt.afterBacklinkSuffixArabicNumerals)
      links += `<a href="#${refIdBase}${n}${suffix}" class="${backlinkClass}" role="doc-backlink">${safe.backLabelBra}${displayPrefix}${n}${suffix}${safe.backLabelKet}</a>`
    }
    return links + ' ' + duplicateMessage
  }

  if (opt.afterBacklink) {
    return `<span class="${noteDomPrefix}-label">${safe.backLabelBra}${displayPrefix}${n}${safe.backLabelKet}</span> ${duplicateMessage}`
  }

  if (count > 1) {
    const firstSuffix = '-' + formatRefSuffix(1, opt.afterBacklinkSuffixArabicNumerals)
    return `<a href="#${refIdBase}${n}${firstSuffix}" class="${backlinkClass}" role="doc-backlink">${safe.backLabelBra}${displayPrefix}${n}${safe.backLabelKet}</a> ${duplicateMessage}`
  }

  return `<a href="#${refIdBase}${n}" class="${backlinkClass}" role="doc-backlink">${safe.backLabelBra}${displayPrefix}${n}${safe.backLabelKet}</a> ${duplicateMessage}`
}

function createAfterBackLinkToken(state, counts, n, opt, noteDomPrefix, isEndnote, hasDuplicate) {
  const safe = opt._safe
  const displayPrefix = isEndnote ? safe.endnotesLabelPrefix : ''
  const refIdBase = getRefIdBase(noteDomPrefix, state.env)
  const backlinkClass = hasDuplicate
    ? `${noteDomPrefix}-backlink footnote-error-backlink`
    : `${noteDomPrefix}-backlink`
  let html = ' '
  if (counts && counts > 1) {
    for (let i = 1; i <= counts; i++) {
      const suffixChar = formatRefSuffix(i, opt.afterBacklinkSuffixArabicNumerals)
      const suffix = '-' + suffixChar
      html += `<a href="#${refIdBase}${n}${suffix}" class="${backlinkClass}" role="doc-backlink"`
      if (safe.afterBacklinkAriaLabelPrefix) html += ` aria-label="${safe.afterBacklinkAriaLabelPrefix}${displayPrefix}${n}${suffix}"`
      html += `>${safe.afterBacklinkContent}`
      if (opt.afterBacklinkWithNumber) {
        html += `<sup>${suffixChar}</sup>`
      }
      html += `</a>`
    }
  } else {
    html += `<a href="#${refIdBase}${n}" class="${backlinkClass}" role="doc-backlink"`
    if (safe.afterBacklinkAriaLabelPrefix) html += ` aria-label="${safe.afterBacklinkAriaLabelPrefix}${displayPrefix}${n}"`
    html += `>${safe.afterBacklinkContent}</a>`
  }
  const token = new state.Token('html_inline', '', 0)
  token.content = html
  return token
}

const footnote_plugin = (md, option) =>{
  const opt = {
    labelBra: '[',
    labelKet: ']',
    labelSupTag: false,
    backLabelBra: '[',
    backLabelKet: ']',
    beforeSameBacklink: false,
    afterBacklink: false,
    afterBacklinkContent: '↩',
    afterBacklinkWithNumber: false,
    afterBacklinkSuffixArabicNumerals: false,
    afterBacklinkAriaLabelPrefix: 'Back to reference ', /* 戻る：本文参照 */
    endnotesPrefix: 'en-',
    endnotesLabelPrefix: 'E',
    endnotesSectionId: 'endnotes',
    endnotesSectionClass: '',
    endnotesSectionAriaLabel: 'Notes',
    endnotesUseHeading: false,
    duplicateDefinitionPolicy: 'warn',
    duplicateDefinitionMessage: DEFAULT_DUPLICATE_DEFINITION_MESSAGE,
    injectErrorStyle: false,
  }
  if (option) {
    Object.assign(opt, option)
  }
  opt.duplicateDefinitionPolicy = normalizeDuplicateDefinitionPolicy(opt.duplicateDefinitionPolicy)
  if (typeof opt.duplicateDefinitionMessage !== 'string') {
    opt.duplicateDefinitionMessage = DEFAULT_DUPLICATE_DEFINITION_MESSAGE
  }
  const escapeHtml = md.utils.escapeHtml
  const escapeOption = (value, fallback = '') => escapeHtml(toOptionString(value, fallback))
  opt._safe = {
    labelBra: escapeOption(opt.labelBra, '['),
    labelKet: escapeOption(opt.labelKet, ']'),
    backLabelBra: escapeOption(opt.backLabelBra, '['),
    backLabelKet: escapeOption(opt.backLabelKet, ']'),
    afterBacklinkContent: escapeOption(opt.afterBacklinkContent, '↩'),
    afterBacklinkAriaLabelPrefix: escapeOption(opt.afterBacklinkAriaLabelPrefix, 'Back to reference '),
    endnotesLabelPrefix: escapeOption(opt.endnotesLabelPrefix, 'E'),
    endnotesSectionId: escapeOption(opt.endnotesSectionId, 'endnotes'),
    endnotesSectionClass: escapeOption(opt.endnotesSectionClass, ''),
    endnotesSectionAriaLabel: escapeOption(opt.endnotesSectionAriaLabel, 'Notes'),
    duplicateDefinitionMessage: escapeOption(opt.duplicateDefinitionMessage, DEFAULT_DUPLICATE_DEFINITION_MESSAGE),
  }
  opt._duplicateDefinitionMessageHtml = `<span class="footnote-error-message">${opt._safe.duplicateDefinitionMessage}</span>`
  const duplicatePolicy = opt.duplicateDefinitionPolicy
  const duplicateWarnEnabled = duplicatePolicy === 'warn'
  const duplicateStrictEnabled = duplicatePolicy === 'strict'

  const isSpace = md.utils.isSpace

  md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => render_footnote_ref(tokens, idx, opt, env)
  md.renderer.rules.footnote_open = (tokens, idx, _options, env, slf) => render_footnote_open(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_close = (tokens, idx, _options, env, slf) => render_footnote_close(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_anchor = (tokens, idx, _options, env, slf) => render_footnote_anchor(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_anchor_name  = (tokens, idx, _options, env, slf) => render_footnote_anchor_name(tokens, idx, opt, env, slf)

  // Reset plugin-owned env state for each parse to avoid cross-render leaks.
  const footnote_reset = (state) => {
    if (!state.env) {
      state.env = {}
      return
    }
    if (state.env.footnotes) delete state.env.footnotes
    if (state.env.endnotes) delete state.env.endnotes
    if (state.env.footnoteHereDiagnostics) delete state.env.footnoteHereDiagnostics
  }

  const registerDuplicateDefinition = (state, notes, id, label, isEndnote, line) => {
    notes.duplicateCounts = notes.duplicateCounts || []
    notes.duplicateCounts[id] = (notes.duplicateCounts[id] || 0) + 1

    if (!state.env.footnoteHereDiagnostics) {
      state.env.footnoteHereDiagnostics = { duplicateDefinitions: [] }
    }
    state.env.footnoteHereDiagnostics.duplicateDefinitions.push({
      label,
      isEndnote,
      line: line + 1,
      noteId: id,
    })
  }

  // Process footnote block definition
  const footnote_def = (state, startLine, endLine, silent) => {
    const bMarks = state.bMarks, tShift = state.tShift, eMarks = state.eMarks, src = state.src
    const start = bMarks[startLine] + tShift[startLine]
    const max = eMarks[startLine]

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) { return false; }

    if (src.charCodeAt(start) !== 0x5B/* [ */ || src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    const idx = findLabelEnd(src, start + 2, max)
    if (idx < start + 3) { return false; }

    const label = src.slice(start + 2, idx)
    if (hasLabelWhitespace(label)) { return false; }
    const pos = idx + 2

    if (silent) { return true; }

    const isEndnote = isEndnoteLabel(label, opt)
    const fn = ensureNotesEnv(state.env, isEndnote ? 'endnotes' : 'footnotes')
    const refKey = ':' + label
    const existingId = fn.refs[refKey]
    const isDuplicate = existingId !== undefined
    const id = isDuplicate ? existingId : fn.length++
    if (!isDuplicate) {
      fn.refs[refKey] = id
    } else {
      if (duplicateStrictEnabled) {
        throw new Error(`[markdown-it-footnote-here] Duplicate footnote label "${label}" at line ${startLine + 1}.`)
      }
      if (duplicateWarnEnabled) {
        registerDuplicateDefinition(state, fn, id, label, isEndnote, startLine)
      }
    }

    let tokenStart = 0
    let openToken = null
    if (!isDuplicate) {
      openToken = new state.Token('footnote_open', '', 1)
      openToken.meta = { id, isEndnote }
      openToken.level = state.level++
      state.tokens.push(openToken)
      fn.positions.push(state.tokens.length - 1)
    } else {
      tokenStart = state.tokens.length
    }

    const oldBMark = bMarks[startLine]
    const oldTShift = tShift[startLine]
    const oldSCount = state.sCount[startLine]
    const oldParentType = state.parentType

    const posAfterColon = pos
    const initial = state.sCount[startLine] + pos - (bMarks[startLine] + tShift[startLine])
    let offset = initial
    let newPos = pos

    while (newPos < max) {
      const ch = src.charCodeAt(newPos)
      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4
        } else {
          offset++
        }
      } else {
        break
      }
      newPos++
    }

    state.tShift[startLine] = newPos - posAfterColon
    state.sCount[startLine] = offset - initial

    state.bMarks[startLine] = posAfterColon
    state.blkIndent += 4
    state.parentType = 'footnote'

    if (state.sCount[startLine] < state.blkIndent) {
      state.sCount[startLine] += state.blkIndent
    }

    state.md.block.tokenize(state, startLine, endLine, true)
    if (openToken) {
      openToken.map = [startLine, state.line]
    }

    state.parentType = oldParentType
    state.blkIndent -= 4
    state.tShift[startLine] = oldTShift
    state.sCount[startLine] = oldSCount
    state.bMarks[startLine] = oldBMark

    if (!isDuplicate) {
      const closeToken = new state.Token('footnote_close', '', -1)
      closeToken.level = --state.level
      closeToken.meta = { isEndnote }
      state.tokens.push(closeToken)
    } else {
      state.tokens.length = tokenStart
    }

    return true
  }

  // Process footnote references ([^...])
  const footnote_ref = (state, silent) => {
    const src = state.src
    const start = state.pos
    const posMax = state.posMax
    if (start + 3 >= posMax) { return false; } // - "[^x]"
    if (src.charCodeAt(start) !== 0x5B/* [ */ || src.charCodeAt(start + 1) !== 0x5E/* ^ */) {
      return false
    }

    let pos = start + 2
    for (; pos < posMax; pos++) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x5D /* ] */) break
      if (ch <= 0x20) { return false; } // whitespace/control chars are invalid in label
    }

    if (pos >= posMax || pos === start + 2) { return false; }
    pos++; // pos set next ']' position.

    const label = src.slice(start + 2, pos - 1)
    const env = state.env
    const preferEndnote = isEndnoteLabel(label, opt)
    const resolved = selectNoteEnv(label, env, preferEndnote)

    if (!resolved) { return false; }
    if (!silent) {
      const fn = resolved.env

      fn.totalCounts = fn.totalCounts || []
      fn.totalCounts[resolved.id] = (fn.totalCounts[resolved.id] || 0) + 1

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id: resolved.id, isEndnote: resolved.isEndnote }
    }

    state.pos = pos
    return true
  }

  const footnote_anchor = (state) => {
    if (!state.env.footnotes && !state.env.endnotes) return
    const tokens = state.tokens

    const injectAnchors = (notes, isEndnote) => {
      const positions = notes && notes.positions
      if (!positions || positions.length === 0) { return; }
      const noteDomPrefix = isEndnote ? ENDNOTE_DOM_PREFIX : FOOTNOTE_DOM_PREFIX
      const totalCounts = notes.totalCounts
      const duplicateCounts = notes.duplicateCounts

      for (let j = 0, len = positions.length; j < len; ++j) {
        const posOpen = positions[j]
        if (posOpen + 2 >= tokens.length) continue

        const t1 = tokens[posOpen + 1]
        if (t1.type !== 'paragraph_open') continue

        const t2 = tokens[posOpen + 2]
        if (t2.type !== 'inline') continue

        const t0 = tokens[posOpen]
        const id = t0.meta.id
        const duplicateDef = !!(duplicateCounts && duplicateCounts[id] > 0)
        const aToken = new state.Token('footnote_anchor', '', 0)
        aToken.meta = { id, isEndnote, hasDuplicateDefinition: duplicateDef }
        t2.children.unshift(aToken)
        if (opt.afterBacklink) {
          const n = id + 1
          const counts = totalCounts && totalCounts[id]
          t2.children.push(createAfterBackLinkToken(state, counts, n, opt, noteDomPrefix, isEndnote, duplicateDef))
        }
      }
    }

    injectAnchors(state.env.footnotes, false)
    injectAnchors(state.env.endnotes, true)
  }

  const inject_error_style = (state) => {
    if (!opt.injectErrorStyle) return
    if (!duplicateWarnEnabled) return
    const hasDuplicate = hasAnyDuplicateDefinition(state.env.footnotes) || hasAnyDuplicateDefinition(state.env.endnotes)
    if (!hasDuplicate) return

    const token = new state.Token('html_block', '', 0)
    token.content = ERROR_STYLE_CONTENT
    state.tokens.unshift(token)
  }

  const move_endnotes_to_section = (state) => {
    if (!opt.endnotesPrefix) return
    if (!state.env.endnotes || !state.env.endnotes.positions || state.env.endnotes.positions.length === 0) {
      return
    }

    const tokens = state.tokens
    const endnoteTokens = []

    let write = 0
    let i = 0
    while (i < tokens.length) {
      const token = tokens[i]
      if (token.type === 'footnote_open' && token.meta && token.meta.isEndnote) {
        endnoteTokens.push(token)
        i++
        while (i < tokens.length) {
          const t = tokens[i]
          endnoteTokens.push(t)
          if (t.type === 'footnote_close' && t.meta && t.meta.isEndnote) {
            i++
            break
          }
          i++
        }
        continue
      }
      tokens[write++] = token
      i++
    }

    if (endnoteTokens.length === 0) return

    const sectionOpen = new state.Token('html_block', '', 0)
    const safe = opt._safe
    const attrs = []
    if (!opt.endnotesUseHeading && opt.endnotesSectionAriaLabel) {
      attrs.push(`aria-label="${safe.endnotesSectionAriaLabel}"`)
    }
    if (opt.endnotesSectionId) attrs.push(`id="${safe.endnotesSectionId}"`)
    if (opt.endnotesSectionClass) attrs.push(`class="${safe.endnotesSectionClass}"`)
    attrs.push('role="doc-endnotes"')
    let sectionContent = `<section ${attrs.join(' ')}>\n`
    if (opt.endnotesUseHeading && opt.endnotesSectionAriaLabel) {
      sectionContent += `<h2>${safe.endnotesSectionAriaLabel}</h2>\n`
    }
    sectionContent += '<ol>\n'
    sectionOpen.content = sectionContent

    const sectionClose = new state.Token('html_block', '', 0)
    sectionClose.content = '</ol>\n</section>\n'

    tokens.length = write
    tokens.push(sectionOpen)
    for (let j = 0; j < endnoteTokens.length; j++) tokens.push(endnoteTokens[j])
    tokens.push(sectionClose)
  }

  md.core.ruler.before('block', 'footnote_reset', footnote_reset)
  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] })
  md.inline.ruler.after('image', 'footnote_ref', footnote_ref)
  md.core.ruler.after('inline', 'footnote_anchor', footnote_anchor)
  md.core.ruler.after('footnote_anchor', 'footnote_error_style', inject_error_style)
  md.core.ruler.after('footnote_error_style', 'endnotes_move', move_endnotes_to_section)
}

export default footnote_plugin
