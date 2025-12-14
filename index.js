const render_footnote_anchor_name = (tokens, idx, opt, env) => {
  let n = tokens[idx].meta.id + 1
  if (!opt.afterBacklinkSuffixArabicNumerals) n = Number(n).toString()
  let prefix = ''
  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-'
  }
  return prefix + n
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

const getDomPrefix = (isEndnote) => (isEndnote ? ENDNOTE_DOM_PREFIX : 'fn')
const getDisplayPrefix = (isEndnote, opt) => (isEndnote ? opt.endnotesLabelPrefix : '')

const getNotesMeta = (token, env) => {
  if (token.meta && token.meta.isEndnote) return env.endnotes
  return env.footnotes
}

const selectNoteEnv = (label, env, preferEndnote) => {
  const endRefs = env.endnotes && env.endnotes.refs
  const footRefs = env.footnotes && env.footnotes.refs
  const endId = endRefs && endRefs[':' + label]
  const footId = footRefs && footRefs[':' + label]

  if (preferEndnote && endId !== undefined) {
    return { env: env.endnotes, id: endId, isEndnote: true }
  }
  if (footId !== undefined) {
    return { env: env.footnotes, id: footId, isEndnote: false }
  }
  if (endId !== undefined) {
    return { env: env.endnotes, id: endId, isEndnote: true }
  }
  return null
}

const render_footnote_ref = (tokens, idx, opt, env) => {
  const token = tokens[idx]
  const id = token.meta.id
  const n = id + 1
  const notes = getNotesMeta(token, env)
  const isEndnote = !!token.meta.isEndnote
  const noteDomPrefix = getDomPrefix(isEndnote)
  const displayPrefix = getDisplayPrefix(isEndnote, opt)
  notes._refCount = notes._refCount || {}
  let refIdx = (notes._refCount[id] = (notes._refCount[id] || 0) + 1)
  if (!opt.afterBacklinkSuffixArabicNumerals) {
    refIdx = String.fromCharCode(96 + refIdx)
  }
  let suffix = ''
  let label = `${opt.labelBra}${displayPrefix}${n}${opt.labelKet}`
  if (notes.totalCounts && notes.totalCounts[id] > 1) {
    suffix = '-' + refIdx
    if (opt.beforeSameBacklink) {
      label = `${opt.labelBra}${displayPrefix}${n}${suffix}${opt.labelKet}`
    }
  }
  const href = `${noteDomPrefix}${n}`
  let refCont = `<a href="#${href}" id="${noteDomPrefix}-ref${n}${suffix}" class="${noteDomPrefix}-noteref" role="doc-noteref">${label}</a>`
  if (opt.labelSupTag) refCont = `<sup class="${noteDomPrefix}-noteref-wrapper">${refCont}</sup>`
  return refCont
}

const render_footnote_open = (tokens, idx, opt, env, slf) => {
  const id = slf.rules.footnote_anchor_name(tokens, idx, opt, env, slf)
  const isEndnote = tokens[idx].meta && tokens[idx].meta.isEndnote
  if (isEndnote) return `<li id="${ENDNOTE_DOM_PREFIX}${id}">\n`
  return `<aside id="fn${id}" class="fn" role="doc-footnote">\n`
}

const render_footnote_close = (tokens, idx) => {
  const isEndnote = tokens[idx].meta && tokens[idx].meta.isEndnote
  if (isEndnote) return `</li>\n`
  return `</aside>\n`
}

const render_footnote_anchor = (tokens, idx, opt, env) => {
  const idNum = tokens[idx].meta.id
  const n = idNum + 1
  const isEndnote = tokens[idx].meta && tokens[idx].meta.isEndnote
  const notes = getNotesMeta(tokens[idx], env)
  const counts = notes && notes.totalCounts
  const noteDomPrefix = getDomPrefix(!!isEndnote)
  const displayPrefix = getDisplayPrefix(!!isEndnote, opt)

  if (opt.beforeSameBacklink && counts && counts[idNum] > 1) {
    let links = ''
    for (let i = 1; i <= counts[idNum]; i++) {
      const suffix = '-' + String.fromCharCode(96 + i); // a, b, c ...
      links += `<a href="#${noteDomPrefix}-ref${n}${suffix}" class="${noteDomPrefix}-backlink" role="doc-backlink">${opt.backLabelBra}${displayPrefix}${n}${suffix}${opt.backLabelKet}</a>`
    }
    return links + ' '
  }

  if (opt.afterBacklink) {
    return `<span class="${noteDomPrefix}-label">${opt.backLabelBra}${displayPrefix}${n}${opt.backLabelKet}</span> `
  }

  if (counts && counts[idNum] > 1) {
    return `<a href="#${noteDomPrefix}-ref${n}-a" class="${noteDomPrefix}-backlink" role="doc-backlink">${opt.backLabelBra}${displayPrefix}${n}${opt.backLabelKet}</a> `
  }

  return `<a href="#${noteDomPrefix}-ref${n}" class="${noteDomPrefix}-backlink" role="doc-backlink">${opt.backLabelBra}${displayPrefix}${n}${opt.backLabelKet}</a> `
}

function createAfterBackLinkToken(state, counts, n, opt, noteDomPrefix, isEndnote) {
  const displayPrefix = isEndnote ? opt.endnotesLabelPrefix : ''
  let html = ' '
  if (counts && counts > 1) {
    for (let i = 1; i <= counts; i++) {
      const suffixChar = opt.afterBacklinkSuffixArabicNumerals ? i : String.fromCharCode(96 + i)
      const suffix = '-' + suffixChar
      html += `<a href="#${noteDomPrefix}-ref${n}${suffix}" class="${noteDomPrefix}-backlink" role="doc-backlink"`
      if (opt.afterBacklinkdAriaLabelPrefix) html += ` aria-label="${opt.afterBacklinkdAriaLabelPrefix}${displayPrefix}${n}${suffix}"`
      html += `>${opt.afterBacklinkContent}`
      if (opt.afterBacklinkWithNumber) {
        html += `<sup>${suffixChar}</sup>`
      }
      html += `</a>`
    }
  } else {
    html += `<a href="#${noteDomPrefix}-ref${n}" class="${noteDomPrefix}-backlink" role="doc-backlink"`
    if (opt.afterBacklinkdAriaLabelPrefix) html += ` aria-label="${opt.afterBacklinkdAriaLabelPrefix}${displayPrefix}${n}"`
    html += `>${opt.afterBacklinkContent}</a>`
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
    afterBacklinkdAriaLabelPrefix: 'Back to reference ', /* 戻る：本文参照 */
    endnotesPrefix: 'en-',
    endnotesLabelPrefix: 'E',
    endnotesSectionId: 'endnotes',
    endnotesSectionClass: '',
    endnotesSectionAriaLabel: 'Notes',
    endnotesUseHeading: false,
  }
  if (option) Object.assign(opt, option)

  const isSpace = md.utils.isSpace

  md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => render_footnote_ref(tokens, idx, opt, env)
  md.renderer.rules.footnote_open = (tokens, idx, _options, env, slf) => render_footnote_open(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_close = (tokens, idx, _options, env, slf) => render_footnote_close(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_anchor = (tokens, idx, _options, env, slf) => render_footnote_anchor(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_anchor_name  = (tokens, idx, _options, env, slf) => render_footnote_anchor_name(tokens, idx, opt, env, slf)

  // Process footnote block definition
  const footnote_def = (state, startLine, endLine, silent) => {
    const bMarks = state.bMarks, tShift = state.tShift, eMarks = state.eMarks, src = state.src
    const start = bMarks[startLine] + tShift[startLine]
    const max = eMarks[startLine]

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) { return false; }

    if (src.charCodeAt(start) !== 0x5B/* [ */ || src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    // locate end of label efficiently
    const idx = src.indexOf(']:', start + 2)
    if (idx < start + 3 || idx > max - 2) { return false; }

    const label = src.slice(start + 2, idx)
    if (label.indexOf(' ') >= 0) { return false; }
    const pos = idx + 2

    if (silent) { return true; }

    const isEndnote = isEndnoteLabel(label, opt)
    const fn = ensureNotesEnv(state.env, isEndnote ? 'endnotes' : 'footnotes')
    const id = fn.length++
    fn.refs[':' + label] = id

    const token = new state.Token('footnote_open', '', 1)
    token.meta = { id, label, isEndnote }
    token.level = state.level++
    state.tokens.push(token)
    fn.positions.push(state.tokens.length - 1)

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

    state.parentType = oldParentType
    state.blkIndent -= 4
    state.tShift[startLine] = oldTShift
    state.sCount[startLine] = oldSCount
    state.bMarks[startLine] = oldBMark

    const closeToken = new state.Token('footnote_close', '', -1)
    closeToken.level = --state.level
    closeToken.meta = { isEndnote }
    state.tokens.push(closeToken)

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
    let found = false
    for (; pos < posMax && !found; pos++) {
      const ch = src.charCodeAt(pos)
      if (ch === 0x20 || ch === 0x0A) { return false; } // space or linebreak
      if (ch === 0x5D /* ] */) { found = true; break; }
    }

    if (!found || pos === start + 2) { return false; }
    pos++; // pos set next ']' position.

    const label = src.slice(start + 2, pos - 1)
    const env = state.env
    const preferEndnote = isEndnoteLabel(label, opt)
    const resolved = selectNoteEnv(label, env, preferEndnote)

    if (!resolved) { return false; }
    if (!silent) {
      const fn = resolved.env

      if (!fn.list) { fn.list = []; }

      const footnoteId = fn.list.length
      fn.list[footnoteId] = { label, count: 0 }

      fn.totalCounts = fn.totalCounts || {}
      fn.totalCounts[resolved.id] = (fn.totalCounts[resolved.id] || 0) + 1

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id: resolved.id, label, isEndnote: resolved.isEndnote }
    }

    state.pos = pos
    return true
  }

  const footnote_anchor = (state) => {
    if (!state.env.footnotes && !state.env.endnotes) return
    const tokens = state.tokens
    const createAnchorToken = (id, isEndnote) => {
      const aToken = new state.Token('footnote_anchor', '', 0)
      aToken.meta = { id, label: id + 1, isEndnote }
      return aToken
    }

    const injectAnchors = (notes, isEndnote) => {
      const positions = notes && notes.positions
      if (!positions || positions.length === 0) { return; }

      for (let j = 0, len = positions.length; j < len; ++j) {
        const posOpen = positions[j]
        if (posOpen + 2 >= tokens.length) continue

        const t1 = tokens[posOpen + 1]
        if (t1.type !== 'paragraph_open') continue

        const t2 = tokens[posOpen + 2]
        if (t2.type !== 'inline') continue

        const t0 = tokens[posOpen]
        const id = t0.meta.id
        const noteDomPrefix = isEndnote ? ENDNOTE_DOM_PREFIX : 'fn'

        t2.children.unshift(createAnchorToken(id, isEndnote))
        if (opt.afterBacklink) {
          const n = id + 1
          const counts = notes.totalCounts && notes.totalCounts[id]
          t2.children.push(createAfterBackLinkToken(state, counts, n, opt, noteDomPrefix, isEndnote))
        }
      }
    }

    injectAnchors(state.env.footnotes, false)
    injectAnchors(state.env.endnotes, true)
  }

  const move_endnotes_to_section = (state) => {
    if (!opt.endnotesPrefix) return
    if (!state.env.endnotes || !state.env.endnotes.positions || state.env.endnotes.positions.length === 0) {
      return
    }

    const tokens = state.tokens
    const endnoteBlocks = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type !== 'footnote_open' || !token.meta || !token.meta.isEndnote) continue

      let j = i + 1
      while (j < tokens.length) {
        const t = tokens[j]
        if (t.type === 'footnote_close' && t.meta && t.meta.isEndnote) {
          j++
          break
        }
        j++
      }
      endnoteBlocks.push(tokens.slice(i, j))
      tokens.splice(i, j - i)
      i--
    }

    if (endnoteBlocks.length === 0) return

    const sectionOpen = new state.Token('html_block', '', 0)
    const attrs = []
    if (!opt.endnotesUseHeading && opt.endnotesSectionAriaLabel) {
      attrs.push(`aria-label="${opt.endnotesSectionAriaLabel}"`)
    }
    if (opt.endnotesSectionId) attrs.push(`id="${opt.endnotesSectionId}"`)
    if (opt.endnotesSectionClass) attrs.push(`class="${opt.endnotesSectionClass}"`)
    attrs.push('role="doc-endnotes"')
    let sectionContent = `<section ${attrs.join(' ')}>\n`
    if (opt.endnotesUseHeading && opt.endnotesSectionAriaLabel) {
      sectionContent += `<h2>${opt.endnotesSectionAriaLabel}</h2>\n`
    }
    sectionContent += '<ol>\n'
    sectionOpen.content = sectionContent

    const sectionClose = new state.Token('html_block', '', 0)
    sectionClose.content = '</ol>\n</section>\n'

    tokens.push(sectionOpen)
    endnoteBlocks.forEach(block => {
      tokens.push(...block)
    })
    tokens.push(sectionClose)
  }

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] })
  md.inline.ruler.after('image', 'footnote_ref', footnote_ref)
  md.core.ruler.after('inline', 'footnote_anchor', footnote_anchor)
  md.core.ruler.after('footnote_anchor', 'endnotes_move', move_endnotes_to_section)
}

export default footnote_plugin
