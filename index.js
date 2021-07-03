// Process footnotes
//
'use strict';

////////////////////////////////////////////////////////////////////////////////
// Renderer partials

function render_footnote_anchor_name(tokens, idx, options, env/*, slf*/) {
  var n = Number(tokens[idx].meta.id + 1).toString();
  var prefix = '';

  if (typeof env.docId === 'string') {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function render_footnote_caption(tokens, idx) {
  var n = Number(tokens[idx].meta.id + 1).toString();

  return '[' + n + ']';
}

function render_footnote_ref(tokens, idx, options, env, slf) {
  var id      = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
  var caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
  var refid   = id;

  return '<a href="#fn' + id + '" id="fn-ref' + refid + '" class="fn-noteref" role="doc-noteref">' + caption + '</a>';
}

function render_footnote_open(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

  return '<aside id="fn' + id + '" class="fn" role="doc-footnote">\n';
}

function render_footnote_close() {
  return '</aside>\n';
}

function render_footnote_anchor(tokens, idx, options, env, slf) {
  var id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
  if (tokens[idx].meta.subId > 0) {
    id += ':' + tokens[idx].meta.subId;
  }
  return '<a href="#fn-ref' + id + '" class="fn-backlink" role="doc-backlink">[' + id + ']</a> ';
}


module.exports = function footnote_plugin(md) {
  const parseLinkLabel = md.helpers.parseLinkLabel;
  const isSpace = md.utils.isSpace;

  md.renderer.rules.footnote_ref          = render_footnote_ref;
  md.renderer.rules.footnote_open         = render_footnote_open;
  md.renderer.rules.footnote_close        = render_footnote_close;
  md.renderer.rules.footnote_anchor       = render_footnote_anchor;

  // helpers (only used in other rules, no tokens are attached to those)
  md.renderer.rules.footnote_caption      = render_footnote_caption;
  md.renderer.rules.footnote_anchor_name  = render_footnote_anchor_name;

  // Process footnote block definition
  function footnote_def(state, startLine, endLine, silent) {
    var oldBMark, oldTShift, oldSCount, oldParentType, pos, label, token, id,
        initial, offset, ch, posAfterColon,
        start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // line should be at least 5 chars - "[^x]:"
    if (start + 4 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */) { return false; }
    if (silent) { return true; }
    pos++;

    if (!state.env.footnotes) { state.env.footnotes = { length:0}; }
    if (!state.env.footnotes.refs) { state.env.footnotes.refs = {}; }

    label = state.src.slice(start + 2, pos - 2);
    id = state.env.footnotes.length++;
    state.env.footnotes.refs[':' + label] = id;

    token       = new state.Token('footnote_open', '', 1);
    token.meta  = { id: id, label: label };
    token.level = state.level++;
    state.tokens.push(token);

    oldBMark = state.bMarks[startLine];
    oldTShift = state.tShift[startLine];
    oldSCount = state.sCount[startLine];
    oldParentType = state.parentType;

    posAfterColon = pos;
    initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);

    /*
    token =  new state.Token('footnote_anchor', '', 0);
    token.meta = { id: id, label: label };
    state.tokens.push(token);
    */


    while (pos < max) {
      ch = state.src.charCodeAt(pos);

      if (isSpace(ch)) {
        if (ch === 0x09) {
          offset += 4 - offset % 4;
        } else {
          offset++;
        }
      } else {
        break;
      }

      pos++;
    }

    state.tShift[startLine] = pos - posAfterColon;
    state.sCount[startLine] = offset - initial;

    state.bMarks[startLine] = posAfterColon;
    state.blkIndent += 4;
    state.parentType = 'footnote';

    if (state.sCount[startLine] < state.blkIndent) {
      state.sCount[startLine] += state.blkIndent;
    }

    state.md.block.tokenize(state, startLine, endLine, true);

    state.parentType = oldParentType;
    state.blkIndent -= 4;
    state.tShift[startLine] = oldTShift;
    state.sCount[startLine] = oldSCount;
    state.bMarks[startLine] = oldBMark;

    token       = new state.Token('footnote_close', '', -1);
    token.level = --state.level;
    state.tokens.push(token);

    return true;
  }

  // Process footnote references ([^...])
  function footnote_ref(state, silent) {
    var label,
        pos,
        id,
        footnoteId,
        token,
        max = state.posMax,
        start = state.pos;

    // should be at least 4 chars - "[^x]"
    if (start + 3 > max) { return false; }

    if (!state.env.footnotes || !state.env.footnotes.refs) { return false; }
    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) { return false; }
      if (state.src.charCodeAt(pos) === 0x0A) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos >= max) { return false; }
    pos++;

    label = state.src.slice(start + 2, pos - 1);
    if (typeof state.env.footnotes.refs[':' + label] === 'undefined') { return false; }

    if (!silent) {
      if (!state.env.footnotes.list) { state.env.footnotes.list = []; }


      let footnoteId = state.env.footnotes.list.length;
      state.env.footnotes.list[footnoteId] = { label: label, count: 0 };

      id = state.env.footnotes.refs[':' + label];

      token      = state.push('footnote_ref', '', 0);
      token.meta = { id: id, label: label };
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  }

  function addClass(token, className) {
    token.attrs = token.attrs || [];
    const ats = token.attrs.map(x => x[0]);
    const i = ats.indexOf('class');
    if (i === -1) {
      token.attrs.push(['class', className]);
    } else {
      let classVal = token.attrs[i][1] || '';
      const classNames = classStr.split(' ');
      if (classNames.indexOf(className) === -1) {
        classVal += ' ' + className;
        token.attrs[i][1] = classVal;
      }
    }
  }

  function footnote_anchor (state) {
    let n = 0;
    let id = 0;
    while (n < state.tokens.length - 2) {
      const token = state.tokens[n];
      const isFootnoteStartTag = token.type === 'footnote_open';
      if(!isFootnoteStartTag) {
        n++;
        continue;
      }
      if(state.tokens[n + 1].type === 'paragraph_open'
        && state.tokens[n + 2].type === 'inline') {
          const aToken =  new state.Token('footnote_anchor', '', 0);
          aToken.meta = { id: id++, label: id };
          state.tokens[n + 2].children.unshift(aToken);
      }
      n++;
    }
  }

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] });
  md.inline.ruler.after('image', 'footnote_ref', footnote_ref);
  md.core.ruler.after('inline', 'footnote_anchor', footnote_anchor);
};
