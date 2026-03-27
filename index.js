const ENDNOTE_DOM_PREFIX = 'en'
const FOOTNOTE_DOM_PREFIX = 'fn'
const DEFAULT_DUPLICATE_DEFINITION_MESSAGE = '[Duplicate footnote label detected. Using the first definition.]'
const DEFAULT_BACKLINK_ARIA_LABEL_PREFIX = 'Back to reference '
const ERROR_STYLE_CONTENT = '<style>\n:root {\n  --footnote-error-text: #b42318;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --footnote-error-text: #fca5a5;\n  }\n}\n.footnote-error-message {\n  color: var(--footnote-error-text);\n  font-weight: 600;\n  margin-right: 0.35em;\n}\n.footnote-error-backlink {\n  color: var(--footnote-error-text);\n  position: relative;\n}\n.footnote-error-backlink::before {\n  content: "";\n  position: absolute;\n  left: -0.35em;\n  top: 0.08em;\n  bottom: 0.08em;\n  width: 2px;\n  background: var(--footnote-error-text);\n  border-radius: 1px;\n}\n@media (forced-colors: active) {\n  .footnote-error-message,\n  .footnote-error-backlink {\n    color: CanvasText;\n  }\n  .footnote-error-backlink::before {\n    background: CanvasText;\n  }\n}\n</style>\n'
const ROOT_OPTION_KEYS = new Set(['references', 'backlinks', 'endnotes', 'duplicates'])
const NOTE_KIND_KEYS = new Set(['footnote', 'endnote'])
const REFERENCE_KIND_KEYS = new Set(['prefix', 'brackets', 'wrapInSup'])
const BACKLINK_KIND_KEYS = new Set(['position', 'duplicates', 'brackets', 'content', 'duplicateMarker', 'trailingLabel', 'ariaLabelPrefix'])
const BRACKET_KEYS = new Set(['open', 'close'])
const ENDNOTES_KEYS = new Set(['prefix', 'section'])
const ENDNOTE_SECTION_KEYS = new Set(['id', 'className', 'label', 'useHeading', 'headingLevel'])
const DUPLICATE_KEYS = new Set(['policy', 'message', 'injectStyle'])

const REMOVED_TOP_LEVEL_OPTION_HINTS = {
  beforeSameBacklink: 'Use backlinks.<kind>.position and backlinks.<kind>.duplicates.',
  afterBacklink: 'Use backlinks.<kind>.position.',
  afterBacklinkContent: 'Use backlinks.<kind>.content.',
  afterBacklinkWithNumber: 'Use backlinks.<kind>.trailingLabel.',
  afterBacklinkSuffixArabicNumerals: 'Use backlinks.<kind>.duplicateMarker.',
  afterBacklinkAriaLabelPrefix: 'Use backlinks.<kind>.ariaLabelPrefix.',
  afterBacklinkdAriaLabelPrefix: 'Use backlinks.<kind>.ariaLabelPrefix.',
  labelBra: 'Use references.<kind>.brackets.open.',
  labelKet: 'Use references.<kind>.brackets.close.',
  labelSupTag: 'Use references.<kind>.wrapInSup.',
  backLabelBra: 'Use backlinks.<kind>.brackets.open.',
  backLabelKet: 'Use backlinks.<kind>.brackets.close.',
  endnotesPrefix: 'Use endnotes.prefix.',
  endnotesLabelPrefix: 'Use references.endnote.prefix.',
  endnotesSectionId: 'Use endnotes.section.id.',
  endnotesSectionClass: 'Use endnotes.section.className.',
  endnotesSectionAriaLabel: 'Use endnotes.section.label.',
  endnotesUseHeading: 'Use endnotes.section.useHeading.',
  duplicateDefinitionPolicy: 'Use duplicates.policy.',
  duplicateDefinitionMessage: 'Use duplicates.message.',
  injectErrorStyle: 'Use duplicates.injectStyle.',
}

const REMOVED_BACKLINK_ROOT_OPTION_HINTS = {
  content: 'Use backlinks.footnote.content and backlinks.endnote.content.',
  duplicateMarker: 'Use backlinks.footnote.duplicateMarker and backlinks.endnote.duplicateMarker.',
  trailingLabel: 'Use backlinks.footnote.trailingLabel and backlinks.endnote.trailingLabel.',
  ariaLabelPrefix: 'Use backlinks.footnote.ariaLabelPrefix and backlinks.endnote.ariaLabelPrefix.',
}

const getRefIdBase = (noteDomPrefix, docIdPart) => {
  if (!docIdPart) return `${noteDomPrefix}-ref`
  return `${noteDomPrefix}${docIdPart}ref`
}

const render_footnote_anchor_name = (tokens, idx, env, getDocIdPart) => {
  const n = tokens[idx].meta.id + 1
  return getDocIdPart(env) + n
}

const isEndnoteLabel = (label, endnotesPrefix) => {
  if (!endnotesPrefix) return false
  return label.startsWith(endnotesPrefix)
}

const ensureNotesEnv = (env, key) => {
  if (!env[key]) {
    env[key] = { length: 0, refs: {}, positions: [] }
  }
  return env[key]
}

const isObjectRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const toOptionString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  return String(value)
}

const normalizeBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value
  return fallback
}

const createDefaultReferenceKind = (prefix) => ({
  prefix,
  brackets: { open: '[', close: ']' },
  wrapInSup: false,
})

const createDefaultBacklinkKind = (overrides) => ({
  position: 'before',
  duplicates: 'first',
  brackets: { open: '[', close: ']' },
  content: '↩',
  duplicateMarker: 'alpha',
  trailingLabel: 'none',
  ariaLabelPrefix: DEFAULT_BACKLINK_ARIA_LABEL_PREFIX,
  ...overrides,
})

const createDefaultReferences = () => ({
  footnote: createDefaultReferenceKind(''),
  endnote: createDefaultReferenceKind('E'),
})

const createDefaultBacklinks = () => ({
  footnote: createDefaultBacklinkKind(),
  endnote: createDefaultBacklinkKind({
    position: 'after',
    duplicates: 'all',
    trailingLabel: 'marker',
  }),
})

const createDefaultEndnotes = () => ({
  prefix: 'en-',
  section: {
    id: 'endnotes',
    className: '',
    label: 'Notes',
    useHeading: false,
    headingLevel: 2,
  },
})

const createDefaultDuplicates = () => ({
  policy: 'warn',
  message: DEFAULT_DUPLICATE_DEFINITION_MESSAGE,
  injectStyle: false,
})

const hasLabelWhitespace = (label) => {
  for (let i = 0; i < label.length; i++) {
    if (label.charCodeAt(i) <= 0x20) return true
  }
  return false
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

const normalizeBacklinkPosition = (position) => {
  if (position === 'before' || position === 'after' || position === 'both' || position === 'none') {
    return position
  }
  return 'before'
}

const normalizeBacklinkDuplicates = (duplicates) => {
  if (duplicates === 'all' || duplicates === 'first') return duplicates
  return 'first'
}

const normalizeBacklinkDuplicateMarker = (marker) => {
  if (marker === 'numeric' || marker === 'alpha') return marker
  return 'alpha'
}

const normalizeBacklinkTrailingLabel = (label) => {
  if (label === 'marker' || label === 'none') return label
  return 'none'
}

const normalizeHeadingLevel = (value) => {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 6) return 2
  return n
}

const ensureOptionObject = (value, path) => {
  if (value === undefined || value === null) return null
  if (!isObjectRecord(value)) {
    throw new Error(`[markdown-it-footnote-here] Option "${path}" must be an object.`)
  }
  return value
}

const assertAllowedKeys = (obj, allowedKeys, path) => {
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      const optionPath = path ? `${path}.${key}` : key
      throw new Error(`[markdown-it-footnote-here] Unknown option "${optionPath}".`)
    }
  }
}

const assertRemovedOptionKeys = (obj, removedMap, path = '') => {
  for (const key of Object.keys(obj)) {
    if (!removedMap[key]) continue
    const optionPath = path ? `${path}.${key}` : key
    throw new Error(`[markdown-it-footnote-here] Option "${optionPath}" has been removed. ${removedMap[key]}`)
  }
}

const normalizeBrackets = (value, path, fallback) => {
  const normalized = {
    open: fallback.open,
    close: fallback.close,
  }
  const obj = ensureOptionObject(value, path)
  if (!obj) return normalized
  assertAllowedKeys(obj, BRACKET_KEYS, path)
  normalized.open = toOptionString(obj.open, normalized.open)
  normalized.close = toOptionString(obj.close, normalized.close)
  return normalized
}

const normalizeReferenceKind = (value, path, defaultPrefix) => {
  const normalized = createDefaultReferenceKind(defaultPrefix)
  const obj = ensureOptionObject(value, path)
  if (!obj) return normalized
  assertAllowedKeys(obj, REFERENCE_KIND_KEYS, path)
  normalized.prefix = toOptionString(obj.prefix, normalized.prefix)
  normalized.brackets = normalizeBrackets(obj.brackets, `${path}.brackets`, normalized.brackets)
  normalized.wrapInSup = normalizeBoolean(obj.wrapInSup, normalized.wrapInSup)
  return normalized
}

const normalizeBacklinkKind = (value, path) => {
  const normalized = createDefaultBacklinkKind()
  const obj = ensureOptionObject(value, path)
  if (!obj) return normalized
  assertAllowedKeys(obj, BACKLINK_KIND_KEYS, path)
  normalized.position = normalizeBacklinkPosition(obj.position)
  normalized.duplicates = normalizeBacklinkDuplicates(obj.duplicates)
  normalized.brackets = normalizeBrackets(obj.brackets, `${path}.brackets`, normalized.brackets)
  normalized.content = toOptionString(obj.content, normalized.content)
  normalized.duplicateMarker = normalizeBacklinkDuplicateMarker(obj.duplicateMarker)
  normalized.trailingLabel = normalizeBacklinkTrailingLabel(obj.trailingLabel)
  normalized.ariaLabelPrefix = toOptionString(obj.ariaLabelPrefix, normalized.ariaLabelPrefix)
  return normalized
}

const normalizeReferences = (value) => {
  const normalized = createDefaultReferences()
  const obj = ensureOptionObject(value, 'references')
  if (!obj) return normalized
  assertAllowedKeys(obj, NOTE_KIND_KEYS, 'references')
  normalized.footnote = normalizeReferenceKind(obj.footnote, 'references.footnote', normalized.footnote.prefix)
  normalized.endnote = normalizeReferenceKind(obj.endnote, 'references.endnote', normalized.endnote.prefix)
  return normalized
}

const normalizeBacklinks = (value) => {
  const normalized = createDefaultBacklinks()
  const obj = ensureOptionObject(value, 'backlinks')
  if (!obj) return normalized
  assertRemovedOptionKeys(obj, REMOVED_BACKLINK_ROOT_OPTION_HINTS, 'backlinks')
  assertAllowedKeys(obj, NOTE_KIND_KEYS, 'backlinks')
  normalized.footnote = normalizeBacklinkKind(obj.footnote, 'backlinks.footnote')
  normalized.endnote = normalizeBacklinkKind(obj.endnote, 'backlinks.endnote')
  return normalized
}

const normalizeEndnotes = (value) => {
  const normalized = createDefaultEndnotes()
  const obj = ensureOptionObject(value, 'endnotes')
  if (!obj) return normalized
  assertAllowedKeys(obj, ENDNOTES_KEYS, 'endnotes')
  normalized.prefix = toOptionString(obj.prefix, normalized.prefix)
  const section = ensureOptionObject(obj.section, 'endnotes.section')
  if (section) {
    assertAllowedKeys(section, ENDNOTE_SECTION_KEYS, 'endnotes.section')
    normalized.section.id = toOptionString(section.id, normalized.section.id)
    normalized.section.className = toOptionString(section.className, normalized.section.className)
    normalized.section.label = toOptionString(section.label, normalized.section.label)
    normalized.section.useHeading = normalizeBoolean(section.useHeading, normalized.section.useHeading)
    if (section.headingLevel !== undefined) {
      normalized.section.headingLevel = normalizeHeadingLevel(section.headingLevel)
    }
  }
  return normalized
}

const normalizeDuplicates = (value) => {
  const normalized = createDefaultDuplicates()
  const obj = ensureOptionObject(value, 'duplicates')
  if (!obj) return normalized
  assertAllowedKeys(obj, DUPLICATE_KEYS, 'duplicates')
  normalized.policy = normalizeDuplicateDefinitionPolicy(obj.policy)
  normalized.message = toOptionString(obj.message, normalized.message)
  normalized.injectStyle = normalizeBoolean(obj.injectStyle, normalized.injectStyle)
  return normalized
}

const normalizeOptions = (value) => {
  const option = ensureOptionObject(value, 'options') || {}
  assertRemovedOptionKeys(option, REMOVED_TOP_LEVEL_OPTION_HINTS)
  assertAllowedKeys(option, ROOT_OPTION_KEYS, '')
  return {
    references: normalizeReferences(option.references),
    backlinks: normalizeBacklinks(option.backlinks),
    endnotes: normalizeEndnotes(option.endnotes),
    duplicates: normalizeDuplicates(option.duplicates),
  }
}

const buildBacklinkRuntime = (backlinks) => {
  const hasBefore = backlinks.position === 'before' || backlinks.position === 'both'
  const hasAfter = backlinks.position === 'after' || backlinks.position === 'both'
  const showDuplicateRefLabel = backlinks.duplicates === 'all' && hasBefore
  return {
    hasBefore,
    hasAfter,
    showDuplicateRefLabel,
    showAllBacklinks: backlinks.duplicates === 'all',
  }
}

const buildSafeOptions = (escapeHtml, options) => {
  const escapeOption = (value, fallback = '') => escapeHtml(toOptionString(value, fallback))

  return {
    references: {
      footnote: {
        prefix: escapeOption(options.references.footnote.prefix, ''),
        brackets: {
          open: escapeOption(options.references.footnote.brackets.open, '['),
          close: escapeOption(options.references.footnote.brackets.close, ']'),
        },
      },
      endnote: {
        prefix: escapeOption(options.references.endnote.prefix, 'E'),
        brackets: {
          open: escapeOption(options.references.endnote.brackets.open, '['),
          close: escapeOption(options.references.endnote.brackets.close, ']'),
        },
      },
    },
    backlinks: {
      footnote: {
        brackets: {
          open: escapeOption(options.backlinks.footnote.brackets.open, '['),
          close: escapeOption(options.backlinks.footnote.brackets.close, ']'),
        },
        content: escapeOption(options.backlinks.footnote.content, '↩'),
        ariaLabelPrefix: escapeOption(options.backlinks.footnote.ariaLabelPrefix, DEFAULT_BACKLINK_ARIA_LABEL_PREFIX),
      },
      endnote: {
        brackets: {
          open: escapeOption(options.backlinks.endnote.brackets.open, '['),
          close: escapeOption(options.backlinks.endnote.brackets.close, ']'),
        },
        content: escapeOption(options.backlinks.endnote.content, '↩'),
        ariaLabelPrefix: escapeOption(options.backlinks.endnote.ariaLabelPrefix, DEFAULT_BACKLINK_ARIA_LABEL_PREFIX),
      },
    },
    endnotes: {
      section: {
        id: escapeOption(options.endnotes.section.id, 'endnotes'),
        className: escapeOption(options.endnotes.section.className, ''),
        label: escapeOption(options.endnotes.section.label, 'Notes'),
      },
    },
    duplicates: {
      message: escapeOption(options.duplicates.message, DEFAULT_DUPLICATE_DEFINITION_MESSAGE),
    },
  }
}

const buildKindRuntime = (kindName, options, safeOptions) => {
  const isEndnote = kindName === 'endnote'
  const noteDomPrefix = isEndnote ? ENDNOTE_DOM_PREFIX : FOOTNOTE_DOM_PREFIX
  const references = options.references[kindName]
  const backlinks = options.backlinks[kindName]
  const safeReferences = safeOptions.references[kindName]
  const safeBacklinks = safeOptions.backlinks[kindName]
  const backlinkRuntime = buildBacklinkRuntime(backlinks)

  return {
    isEndnote,
    notesEnvKey: isEndnote ? 'endnotes' : 'footnotes',
    noteDomPrefix,
    noteRefClass: `${noteDomPrefix}-noteref`,
    noteRefWrapperClass: `${noteDomPrefix}-noteref-wrapper`,
    noteBacklinkClass: `${noteDomPrefix}-backlink`,
    noteBacklinkErrorClass: `${noteDomPrefix}-backlink footnote-error-backlink`,
    noteLabelClass: `${noteDomPrefix}-label`,
    referencePrefix: safeReferences.prefix,
    referenceLabelOpen: safeReferences.brackets.open,
    referenceLabelClose: safeReferences.brackets.close,
    wrapReferenceInSup: references.wrapInSup,
    backlinkLabelOpen: safeBacklinks.brackets.open,
    backlinkLabelClose: safeBacklinks.brackets.close,
    backlinkContent: safeBacklinks.content,
    backlinkAriaLabelPrefix: safeBacklinks.ariaLabelPrefix,
    duplicateMarkerIsNumeric: backlinks.duplicateMarker === 'numeric',
    showTrailingBacklinkMarker: backlinks.trailingLabel === 'marker',
    ...backlinkRuntime,
  }
}

const getKindRuntime = (kinds, isEndnote) => {
  return isEndnote ? kinds.endnote : kinds.footnote
}

const hasAnyDuplicateDefinition = (notes) => {
  if (!notes || !notes.duplicateCounts) return false
  const counts = notes.duplicateCounts
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0) return true
  }
  return false
}

const createSpaceToken = (state, level) => {
  const token = new state.Token('text', '', 0)
  token.content = ' '
  token.level = level
  return token
}

const render_footnote_ref = (tokens, idx, env, getDocIdPart, formatRefSuffix, kinds) => {
  const token = tokens[idx]
  const kind = getKindRuntime(kinds, token.meta.isEndnote)
  const id = token.meta.id
  const n = id + 1
  const notes = env && env[kind.notesEnvKey]
  const docIdPart = getDocIdPart(env)
  const noteIdBase = `${kind.noteDomPrefix}${docIdPart}`
  const refIdBase = getRefIdBase(kind.noteDomPrefix, docIdPart)
  const totalCounts = notes && notes.totalCounts ? notes.totalCounts[id] || 0 : 0
  let suffix = ''
  let label = `${kind.referenceLabelOpen}${kind.referencePrefix}${n}${kind.referenceLabelClose}`
  if (totalCounts > 1) {
    const refOrdinal = token.meta.refOrdinal || 1
    suffix = '-' + formatRefSuffix(refOrdinal, kind.duplicateMarkerIsNumeric)
    if (kind.showDuplicateRefLabel) {
      label = `${kind.referenceLabelOpen}${kind.referencePrefix}${n}${suffix}${kind.referenceLabelClose}`
    }
  }
  let refHtml = `<a href="#${noteIdBase}${n}" id="${refIdBase}${n}${suffix}" class="${kind.noteRefClass}" role="doc-noteref">${label}</a>`
  if (kind.wrapReferenceInSup) {
    refHtml = `<sup class="${kind.noteRefWrapperClass}">${refHtml}</sup>`
  }
  return refHtml
}

const render_footnote_open = (tokens, idx, env, slf, kinds) => {
  const kind = getKindRuntime(kinds, tokens[idx].meta.isEndnote)
  const id = slf.rules.footnote_anchor_name(tokens, idx, null, env, slf)
  const noteId = tokens[idx].meta.id
  const notes = env && env[kind.notesEnvKey]
  const hasDuplicate = !!(notes && notes.duplicateCounts && notes.duplicateCounts[noteId] > 0)
  if (kind.isEndnote) {
    if (hasDuplicate) return `<li id="${kind.noteDomPrefix}${id}" class="footnote-error">\n`
    return `<li id="${kind.noteDomPrefix}${id}">\n`
  }
  let className = kind.noteDomPrefix
  if (hasDuplicate) className += ' footnote-error'
  return `<aside id="${kind.noteDomPrefix}${id}" class="${className}" role="doc-footnote">\n`
}

const render_footnote_close = (tokens, idx) => {
  if (tokens[idx].meta.isEndnote) return '</li>\n'
  return '</aside>\n'
}

const render_footnote_anchor = (tokens, idx, env, getDocIdPart, formatRefSuffix, duplicateMessageHtml, kinds) => {
  const token = tokens[idx]
  const kind = getKindRuntime(kinds, token.meta.isEndnote)
  const idNum = token.meta.id
  const n = idNum + 1
  const hasDuplicate = !!token.meta.hasDuplicateDefinition
  const notes = env && env[kind.notesEnvKey]
  const count = notes && notes.totalCounts ? notes.totalCounts[idNum] || 0 : 0
  const refIdBase = getRefIdBase(kind.noteDomPrefix, getDocIdPart(env))
  const backlinkClass = hasDuplicate ? kind.noteBacklinkErrorClass : kind.noteBacklinkClass
  const duplicateMessage = hasDuplicate ? duplicateMessageHtml : ''
  const plainLabel = `<span class="${kind.noteLabelClass}">${kind.backlinkLabelOpen}${kind.referencePrefix}${n}${kind.backlinkLabelClose}</span>`

  if (kind.showDuplicateRefLabel && count > 1) {
    let links = ''
    for (let i = 1; i <= count; i++) {
      const suffix = '-' + formatRefSuffix(i, kind.duplicateMarkerIsNumeric)
      links += `<a href="#${refIdBase}${n}${suffix}" class="${backlinkClass}" role="doc-backlink">${kind.backlinkLabelOpen}${kind.referencePrefix}${n}${suffix}${kind.backlinkLabelClose}</a>`
    }
    if (duplicateMessage) return `${links} ${duplicateMessage}`
    return links
  }

  if (count <= 0 || !kind.hasBefore) {
    if (duplicateMessage) return `${plainLabel} ${duplicateMessage}`
    return plainLabel
  }

  if (count > 1) {
    const firstSuffix = '-' + formatRefSuffix(1, kind.duplicateMarkerIsNumeric)
    const link = `<a href="#${refIdBase}${n}${firstSuffix}" class="${backlinkClass}" role="doc-backlink">${kind.backlinkLabelOpen}${kind.referencePrefix}${n}${kind.backlinkLabelClose}</a>`
    if (duplicateMessage) return `${link} ${duplicateMessage}`
    return link
  }

  const link = `<a href="#${refIdBase}${n}" class="${backlinkClass}" role="doc-backlink">${kind.backlinkLabelOpen}${kind.referencePrefix}${n}${kind.backlinkLabelClose}</a>`
  if (duplicateMessage) return `${link} ${duplicateMessage}`
  return link
}

const createAfterBackLinkToken = (state, count, n, kind, hasDuplicate, getDocIdPart, formatRefSuffix) => {
  if (count <= 0) return null
  const refIdBase = getRefIdBase(kind.noteDomPrefix, getDocIdPart(state.env))
  const backlinkClass = hasDuplicate ? kind.noteBacklinkErrorClass : kind.noteBacklinkClass
  const showAll = count > 1 && kind.showAllBacklinks
  let html = ''

  if (showAll) {
    for (let i = 1; i <= count; i++) {
      const suffixChar = formatRefSuffix(i, kind.duplicateMarkerIsNumeric)
      const suffix = '-' + suffixChar
      html += `<a href="#${refIdBase}${n}${suffix}" class="${backlinkClass}" role="doc-backlink"`
      if (kind.backlinkAriaLabelPrefix) {
        html += ` aria-label="${kind.backlinkAriaLabelPrefix}${kind.referencePrefix}${n}${suffix}"`
      }
      html += `>${kind.backlinkContent}`
      if (kind.showTrailingBacklinkMarker) {
        html += `<sup>${suffixChar}</sup>`
      }
      html += '</a>'
    }
  } else {
    const suffix = count > 1 ? '-' + formatRefSuffix(1, kind.duplicateMarkerIsNumeric) : ''
    html += `<a href="#${refIdBase}${n}${suffix}" class="${backlinkClass}" role="doc-backlink"`
    if (kind.backlinkAriaLabelPrefix) {
      html += ` aria-label="${kind.backlinkAriaLabelPrefix}${kind.referencePrefix}${n}"`
    }
    html += `>${kind.backlinkContent}</a>`
  }

  const token = new state.Token('html_inline', '', 0)
  token.content = html
  return token
}

const cloneTokenMap = (token) => {
  if (!token || !token.map) return null
  return [token.map[0], token.map[1]]
}

const findMappedToken = (tokens, start, end, fromEnd = false) => {
  if (!fromEnd) {
    for (let i = start; i < end; i++) {
      if (tokens[i] && tokens[i].map) return tokens[i]
    }
    return null
  }

  for (let i = end - 1; i >= start; i--) {
    if (tokens[i] && tokens[i].map) return tokens[i]
  }
  return null
}

const createInlineParagraphTokens = (state, paragraphLevel, map, children) => {
  const paragraphOpen = new state.Token('paragraph_open', 'p', 1)
  paragraphOpen.block = true
  paragraphOpen.level = paragraphLevel
  if (map) paragraphOpen.map = map

  const inline = new state.Token('inline', '', 0)
  inline.block = true
  inline.level = paragraphLevel + 1
  inline.content = ''
  inline.children = children
  if (map) inline.map = map

  const paragraphClose = new state.Token('paragraph_close', 'p', -1)
  paragraphClose.block = true
  paragraphClose.level = paragraphLevel

  return [paragraphOpen, inline, paragraphClose]
}

const footnote_plugin = (md, option) => {
  const options = normalizeOptions(option)
  const safeOptions = buildSafeOptions(md.utils.escapeHtml, options)
  const duplicateMessageHtml = `<span class="footnote-error-message">${safeOptions.duplicates.message}</span>`
  const kinds = {
    footnote: buildKindRuntime('footnote', options, safeOptions),
    endnote: buildKindRuntime('endnote', options, safeOptions),
  }
  const duplicatePolicy = options.duplicates.policy
  const duplicateWarnEnabled = duplicatePolicy === 'warn'
  const duplicateStrictEnabled = duplicatePolicy === 'strict'
  const endnotesPrefix = options.endnotes.prefix
  const endnotesSection = options.endnotes.section
  const safeEndnotesSection = safeOptions.endnotes.section
  const endnotesHeadingTag = `h${endnotesSection.headingLevel}`
  const alphaSuffixCache = ['']
  const arabicSuffixCache = ['']
  let lastDocIdRaw = ''
  let lastDocIdValue = ''
  const getDocIdPart = (env) => {
    if (!env || typeof env !== 'object') return ''
    const raw = typeof env.docId === 'string' && env.docId.length > 0 ? env.docId : ''
    if (raw === lastDocIdRaw) return lastDocIdValue
    lastDocIdRaw = raw
    lastDocIdValue = raw ? `-${encodeURIComponent(raw)}-` : ''
    return lastDocIdValue
  }
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

  const isSpace = md.utils.isSpace

  md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => render_footnote_ref(tokens, idx, env, getDocIdPart, formatRefSuffix, kinds)
  md.renderer.rules.footnote_open = (tokens, idx, _options, env, slf) => render_footnote_open(tokens, idx, env, slf, kinds)
  md.renderer.rules.footnote_close = (tokens, idx) => render_footnote_close(tokens, idx)
  md.renderer.rules.footnote_anchor = (tokens, idx, _options, env) => render_footnote_anchor(tokens, idx, env, getDocIdPart, formatRefSuffix, duplicateMessageHtml, kinds)
  md.renderer.rules.footnote_anchor_name  = (tokens, idx, _options, env) => render_footnote_anchor_name(tokens, idx, env, getDocIdPart)

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

    const isEndnote = isEndnoteLabel(label, endnotesPrefix)
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
      openToken.meta = { id, isEndnote, closeIndex: -1 }
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
      openToken.meta.closeIndex = state.tokens.length - 1
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
    const env = state.env
    if (!env || (!env.footnotes && !env.endnotes)) { return false; }

    let pos = start + 2
    for (; pos < posMax; pos++) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x5D /* ] */) break
      if (ch <= 0x20) { return false; } // whitespace/control chars are invalid in label
    }

    if (pos >= posMax || pos === start + 2) { return false; }
    pos++; // pos set next ']' position.

    const label = src.slice(start + 2, pos - 1)
    const preferEndnote = isEndnoteLabel(label, endnotesPrefix)
    const key = ':' + label
    const footnotes = env.footnotes
    const endnotes = env.endnotes
    const footRefs = footnotes && footnotes.refs
    const endRefs = endnotes && endnotes.refs
    let fn
    let id
    let isEndnote = false

    if (preferEndnote && endRefs) {
      id = endRefs[key]
      if (id !== undefined) {
        fn = endnotes
        isEndnote = true
      }
    }
    if (!fn && footRefs) {
      id = footRefs[key]
      if (id !== undefined) {
        fn = footnotes
      }
    }
    if (!fn && !preferEndnote && endRefs) {
      id = endRefs[key]
      if (id !== undefined) {
        fn = endnotes
        isEndnote = true
      }
    }

    if (!fn) { return false; }
    if (!silent) {
      const totalCounts = fn.totalCounts || (fn.totalCounts = [])
      const refOrdinal = (totalCounts[id] || 0) + 1
      totalCounts[id] = refOrdinal

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id, isEndnote, refOrdinal }
    }

    state.pos = pos
    return true
  }

  const footnote_anchor = (state) => {
    if (!state.env.footnotes && !state.env.endnotes) return
    const tokens = state.tokens
    const noteEdits = []

    const collectAnchorEdits = (notes, kind) => {
      const positions = notes && notes.positions
      if (!positions || positions.length === 0) { return; }
      const totalCounts = notes.totalCounts
      const duplicateCounts = notes.duplicateCounts

      for (let j = 0, len = positions.length; j < len; ++j) {
        const posOpen = positions[j]
        const t0 = tokens[posOpen]
        if (!t0) continue
        const posClose = t0.meta && t0.meta.closeIndex
        if (posClose === undefined || posClose <= posOpen || posClose >= tokens.length) continue
        const id = t0.meta.id
        const duplicateDef = !!(duplicateCounts && duplicateCounts[id] > 0)
        noteEdits.push({ posOpen, posClose, id, duplicateDef, counts: totalCounts && totalCounts[id], kind })
      }
    }

    collectAnchorEdits(state.env.footnotes, kinds.footnote)
    collectAnchorEdits(state.env.endnotes, kinds.endnote)

    noteEdits.sort((a, b) => b.posOpen - a.posOpen)

    for (let i = 0; i < noteEdits.length; i++) {
      const edit = noteEdits[i]
      const { posOpen, posClose, id, duplicateDef, counts, kind } = edit
      const noteOpen = tokens[posOpen]
      if (!noteOpen || noteOpen.type !== 'footnote_open') continue
      const paragraphLevel = noteOpen.level + 1
      let leadingInsertion = null
      let trailingInsertion = null

      const leadingAnchor = new state.Token('footnote_anchor', '', 0)
      leadingAnchor.meta = { id, isEndnote: kind.isEndnote, hasDuplicateDefinition: duplicateDef }

      const firstOpen = tokens[posOpen + 1]
      const firstInline = tokens[posOpen + 2]
      if (firstOpen && firstInline && firstOpen.type === 'paragraph_open' && firstInline.type === 'inline') {
        if (!firstInline.children) firstInline.children = []
        if (firstInline.children.length > 0) {
          firstInline.children.unshift(createSpaceToken(state, firstInline.level))
        }
        firstInline.children.unshift(leadingAnchor)
      } else {
        const leadMap = cloneTokenMap(findMappedToken(tokens, posOpen, posClose))
        leadingInsertion = {
          index: posOpen + 1,
          tokens: createInlineParagraphTokens(state, paragraphLevel, leadMap, [leadingAnchor]),
        }
      }

      if (kind.hasAfter) {
        const trailingAnchor = createAfterBackLinkToken(
          state,
          counts || 0,
          id + 1,
          kind,
          duplicateDef,
          getDocIdPart,
          formatRefSuffix
        )

        if (trailingAnchor) {
          const lastParagraphOpen = tokens[posClose - 3]
          const lastInline = tokens[posClose - 2]
          const lastParagraphClose = tokens[posClose - 1]
          if (lastParagraphOpen && lastInline && lastParagraphClose &&
              lastParagraphOpen.type === 'paragraph_open' &&
              lastInline.type === 'inline' &&
              lastParagraphClose.type === 'paragraph_close') {
            if (!lastInline.children) lastInline.children = []
            if (lastInline.children.length > 0) {
              lastInline.children.push(createSpaceToken(state, lastInline.level))
            }
            lastInline.children.push(trailingAnchor)
          } else {
            const trailMap = cloneTokenMap(findMappedToken(tokens, posOpen, posClose, true))
            trailingInsertion = {
              index: posClose,
              tokens: createInlineParagraphTokens(state, paragraphLevel, trailMap, [trailingAnchor]),
            }
          }
        }
      }

      if (trailingInsertion) tokens.splice(trailingInsertion.index, 0, ...trailingInsertion.tokens)
      if (leadingInsertion) tokens.splice(leadingInsertion.index, 0, ...leadingInsertion.tokens)
    }
  }

  const inject_error_style = (state) => {
    if (!options.duplicates.injectStyle) return
    if (!duplicateWarnEnabled) return
    const hasDuplicate = hasAnyDuplicateDefinition(state.env.footnotes) || hasAnyDuplicateDefinition(state.env.endnotes)
    if (!hasDuplicate) return

    const token = new state.Token('html_block', '', 0)
    token.content = ERROR_STYLE_CONTENT
    state.tokens.unshift(token)
  }

  const move_endnotes_to_section = (state) => {
    if (!endnotesPrefix) return
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
    const attrs = []
    if (!endnotesSection.useHeading && endnotesSection.label) {
      attrs.push(`aria-label="${safeEndnotesSection.label}"`)
    }
    if (endnotesSection.id) attrs.push(`id="${safeEndnotesSection.id}"`)
    if (endnotesSection.className) attrs.push(`class="${safeEndnotesSection.className}"`)
    attrs.push('role="doc-endnotes"')
    let sectionContent = `<section ${attrs.join(' ')}>\n`
    if (endnotesSection.useHeading && endnotesSection.label) {
      sectionContent += `<${endnotesHeadingTag}>${safeEndnotesSection.label}</${endnotesHeadingTag}>\n`
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
