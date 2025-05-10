const render_footnote_anchor_name = (tokens, idx, opt, env) => {
  let n = tokens[idx].meta.id + 1
  if (!opt.afterBacklinkSuffixArabicNumerals) n = Number(n).toString()
  let prefix = ''
  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-'
  }
  return prefix + n
}

const render_footnote_ref = (tokens, idx, opt, env) => {
  const token = tokens[idx]
  const id = token.meta.id
  const n = id + 1
  const footnotes = env.footnotes
  footnotes._refCount = footnotes._refCount || {}
  let refIdx = (footnotes._refCount[id] = (footnotes._refCount[id] || 0) + 1)
  if (!opt.afterBacklinkSuffixArabicNumerals) {
    refIdx = String.fromCharCode(96 + refIdx)
  }
  let suffix = ''
  let label = `${opt.labelBra}${n}${opt.labelKet}`
  if (footnotes.totalCounts && footnotes.totalCounts[id] > 1) {
    suffix = '-' + refIdx
    if (opt.beforeSameBacklink) {
      label = `${opt.labelBra}${n}${suffix}${opt.labelKet}`
    }
  }
  let refCont = `<a href="#fn${n}" id="fn-ref${n}${suffix}" class="fn-noteref" role="doc-noteref">${label}</a>`
  if (opt.labelSupTag) refCont = `<sup class="fn-noteref-wrapper">${refCont}</sup>`
  return refCont
}

const render_footnote_open = (tokens, idx, opt, env, slf) => {
  const id = slf.rules.footnote_anchor_name(tokens, idx, opt, env, slf)
  return `<aside id="fn${id}" class="fn" role="doc-footnote">\n`
}

const render_footnote_close = () => {
  return `</aside>\n`
}

const render_footnote_anchor = (tokens, idx, opt, env) => {
  const idNum = tokens[idx].meta.id
  const n = idNum + 1
  const footnotes = env.footnotes
  const counts = footnotes && footnotes.totalCounts
  if (opt.beforeSameBacklink && counts && counts[idNum] > 1) {
    let links = ''
    for (let i = 1; i <= counts[idNum]; i++) {
      const suffix = '-' + String.fromCharCode(96 + i); // a, b, c ...
      links += `<a href="#fn-ref${n}${suffix}" class="fn-backlink" role="doc-backlink">${opt.backLabelBra}${n}${suffix}${opt.backLabelKet}</a>`
    }
    return links + ' '
  }

  if (opt.afterBacklink) {
    return `<span class="fn-label">${opt.backLabelBra}${n}${opt.backLabelKet}</span> `
  }

  if (counts && counts[idNum] > 1) {
    return `<a href="#fn-ref${n}-a" class="fn-backlink" role="doc-backlink">${opt.backLabelBra}${n}${opt.backLabelKet}</a> `
  }

  return `<a href="#fn-ref${n}" class="fn-backlink" role="doc-backlink">${opt.backLabelBra}${n}${opt.backLabelKet}</a> `
}

function createAfterBackLinkToken(state, counts, n, opt) {
  let html = ' '
  if (counts && counts > 1) {
    for (let i = 1; i <= counts; i++) {
      const suffixChar = opt.afterBacklinkSuffixArabicNumerals ? i : String.fromCharCode(96 + i)
      const suffix = '-' + suffixChar
      html += `<a href="#fn-ref${n}${suffix}" class="fn-backlink" role="doc-backlink"`
      if (opt.afterBacklinkdAriaLabelPrefix) html += ` aria-label="${opt.afterBacklinkdAriaLabelPrefix}${n}${suffix}"`
      html += `>${opt.afterBacklinkContent}`
      if (opt.afterBacklinkWithNumber) {
        html += `<sup>${suffixChar}</sup>`
      }
      html += `</a>`
    }
  } else {
    html += `<a href="#fn-ref${n}" class="fn-backlink" role="doc-backlink"`
    if (opt.afterBacklinkdAriaLabelPrefix) html += ` aria-label="${opt.afterBacklinkdAriaLabelPrefix}${n}"`
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
  }
  if (option) Object.assign(opt, option)

  const isSpace = md.utils.isSpace

  md.renderer.rules.footnote_ref = (tokens, idx, _options, env) => render_footnote_ref(tokens, idx, opt, env)
  md.renderer.rules.footnote_open = render_footnote_open
  md.renderer.rules.footnote_close = render_footnote_close
  md.renderer.rules.footnote_anchor = (tokens, idx, _options, env, slf) => render_footnote_anchor(tokens, idx, opt, env, slf)
  md.renderer.rules.footnote_anchor_name  = render_footnote_anchor_name

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

    // initialize footnotes environment once
    if (!state.env.footnotes) {
      state.env.footnotes = { length: 0, refs: {}, positions: [] }
    }
    const fn = state.env.footnotes
    const id = fn.length++
    fn.refs[':' + label] = id

    const token = new state.Token('footnote_open', '', 1)
    token.meta = { id, label }
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

    const env = state.env
    if (!env.footnotes || !env.footnotes.refs) { return false; }

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
    const id = env.footnotes.refs[':' + label]

    if (id === undefined) { return false; }

    if (!silent) {
      const fn = env.footnotes

      if (!fn.list) { fn.list = []; }

      const footnoteId = fn.list.length
      fn.list[footnoteId] = { label, count: 0 }

      fn.totalCounts = fn.totalCounts || {}
      fn.totalCounts[id] = (fn.totalCounts[id] || 0) + 1

      const token = state.push('footnote_ref', '', 0)
      token.meta = { id, label }
    }

    state.pos = pos
    return true
  }

  const footnote_anchor = (state) => {
    const tokens = state.tokens
    const fn = state.env.footnotes
    const positions = fn && fn.positions
    if (!positions || positions.length === 0) { return; }

    const createAnchorToken = (id) => {
      const aToken = new state.Token('footnote_anchor', '', 0)
      aToken.meta = { id, label: id + 1 }
      return aToken
    }

    for (let j = 0, len = positions.length; j < len; ++j) {
      const posOpen = positions[j]
      if (posOpen + 2 >= tokens.length) continue

      const t1 = tokens[posOpen + 1]
      if (t1.type !== 'paragraph_open') continue

      const t2 = tokens[posOpen + 2]
      if (t2.type !== 'inline') continue

      const t0 = tokens[posOpen]
      const id = t0.meta.id

      t2.children.unshift(createAnchorToken(id))
      if (opt.afterBacklink) {
        const n = id + 1
        const counts = fn.totalCounts && fn.totalCounts[id]
        t2.children.push(createAfterBackLinkToken(state, counts, n, opt))
      }
    }
  }

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] })
  md.inline.ruler.after('image', 'footnote_ref', footnote_ref)
  md.core.ruler.after('inline', 'footnote_anchor', footnote_anchor)
}

export default footnote_plugin
