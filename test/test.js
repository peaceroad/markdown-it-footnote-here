import fs from 'fs'
import path from 'path'
import assert from 'assert'
import mdit from 'markdown-it'
import footnotes from '../index.js'

const createMd = (option) => mdit().use(footnotes, option)

const md = createMd()
const mdBacklinksAfterAll = createMd({
  backlinks: {
    footnote: { position: 'after', duplicates: 'all' },
    endnote: { position: 'after', duplicates: 'all' },
  },
})
const mdBacklinksBeforeAll = createMd({
  backlinks: {
    footnote: { position: 'before', duplicates: 'all' },
    endnote: { position: 'before', duplicates: 'all' },
  },
})
const mdBacklinksBeforeAllNumeric = createMd({
  backlinks: {
    footnote: { position: 'before', duplicates: 'all', duplicateMarker: 'numeric' },
    endnote: { position: 'before', duplicates: 'all', duplicateMarker: 'numeric' },
  },
})
const mdBacklinkOptions = createMd({
  backlinks: {
    footnote: { position: 'after', duplicates: 'all', content: 'BACK', trailingLabel: 'marker', duplicateMarker: 'numeric', ariaLabelPrefix: 'Go to ' },
    endnote: { position: 'after', duplicates: 'all', content: 'BACK', trailingLabel: 'marker', duplicateMarker: 'numeric', ariaLabelPrefix: 'Go to ' },
  },
})
const mdLabelOptions = createMd({
  references: {
    footnote: { brackets: { open: '(', close: ')' }, wrapInSup: true },
    endnote: { brackets: { open: '(', close: ')' }, wrapInSup: true },
  },
  backlinks: {
    footnote: { brackets: { open: '{', close: '}' } },
    endnote: { brackets: { open: '{', close: '}' } },
  },
})
const mdDuplicateIgnore = createMd({ duplicates: { policy: 'ignore' } })
const mdDuplicateStyleInjected = createMd({ duplicates: { injectStyle: true } })
const mdEndnoteCustomLabel = createMd({ references: { endnote: { prefix: 'X' } } })
const mdEndnoteCustomPrefix = createMd({ endnotes: { prefix: 'n-' } })
const mdEndnoteHeading = createMd({
  endnotes: {
    section: {
      useHeading: true,
      className: 'endnotes',
    },
  },
})
const mdEndnoteHeadingCustom = createMd({
  endnotes: {
    section: {
      id: '',
      className: '',
      label: 'Custom Heading',
      useHeading: true,
      headingLevel: 3,
    },
  },
})
const mdEndnoteSectionAttrs = createMd({
  endnotes: {
    section: {
      id: '',
      className: 'notes-list',
      label: 'Custom Notes',
    },
  },
})
const mdEndnoteDisabled = createMd({ endnotes: { prefix: '' } })

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

const testData = {
  noOption: __dirname + path.sep +  'examples.txt',
  backlinksAfterAll: __dirname + path.sep +  'examples-backlinks-after-all.txt',
  backlinkOptions: __dirname + path.sep +  'examples-backlinks-after-all-options.txt',
  backlinksBeforeAll: __dirname + path.sep +  'examples-backlinks-before-all.txt',
  backlinksBeforeAllNumeric: __dirname + path.sep +  'examples-backlinks-before-all-numeric.txt',
  labelOptions: __dirname + path.sep + 'examples-label-options.txt',
  footnoteDuplicate: __dirname + path.sep + 'examples-footnotes-duplicate.txt',
  footnoteDuplicateIgnore: __dirname + path.sep + 'examples-footnotes-duplicate-ignore.txt',
  duplicateStyleInjected: __dirname + path.sep + 'examples-duplicate-style-injected.txt',
  endnotes: __dirname + path.sep + 'examples-endnotes.txt',
  endnotesDetectionPrefix: __dirname + path.sep + 'examples-endnotes-prefix-options.txt',
  endnotesReferencePrefix: __dirname + path.sep + 'examples-endnotes-custom-prefix.txt',
  endnotesHeading: __dirname + path.sep + 'examples-endnotes-heading.txt',
  endnotesHeadingCustom: __dirname + path.sep + 'examples-endnotes-heading-custom.txt',
  endnotesSectionAttrs: __dirname + path.sep + 'examples-endnotes-section-options.txt',
  endnotesMixed: __dirname + path.sep + 'examples-endnotes-mixed.txt',
  endnotesDuplicate: __dirname + path.sep + 'examples-endnotes-duplicate.txt',
  endnotesDisabled: __dirname + path.sep + 'examples-endnotes-disabled.txt',
  splitBacklinks: __dirname + path.sep + 'examples-backlinks-split.txt',
}

const getTestData = (pat) => {
  const ms = []
  if (!fs.existsSync(pat)) {
    console.log('No exist: ' + pat)
    return ms
  }
  const exampleCont = fs.readFileSync(pat, 'utf-8').trim()

  const parts = exampleCont.split(/\n*\[Markdown\]\n/)
  for (let i = 1; i < parts.length; i++) {
    const mhs = parts[i].split(/\n+\[HTML[^\]]*?\]\n/)
    const html = (mhs[1] || '').replace(/$/, '\n')
    ms.push({
      markdown: mhs[0],
      html,
    })
  }
  return ms
}

const runTest = (mdInstance, pat, pass) => {
  console.log('===========================================================')
  console.log(pat)
  const ms = getTestData(pat)
  if (ms.length === 0) return pass

  for (let i = 0; i < ms.length; i++) {
    const testNo = i + 1
    const m = ms[i].markdown
    const h = mdInstance.render(m)
    console.log('Test: ' + testNo + ' >>>')
    try {
      assert.strictEqual(h, ms[i].html)
    } catch (e) {
      pass = false
      console.log(ms[i].markdown)
      console.log('incorrect:')
      console.log('H: ' + h + 'C: ' + ms[i].html)
    }
  }
  return pass
}

const runDirectTests = (pass) => {
  console.log('===========================================================')
  console.log('direct assertions')

  try {
    const env = {}
    md.render('A[^1]\n\n[^1]: one\n', env)
    const rendered = md.render('B[^1]\n', env)
    assert.strictEqual(rendered, '<p>B[^1]</p>\n')
    console.log('Test: env-reset >>>')
  } catch (e) {
    pass = false
    console.log('Test: env-reset >>> failed')
    console.log(e.message)
  }

  try {
    md.parse('no footnote here')
    console.log('Test: parse-no-env >>>')
  } catch (e) {
    pass = false
    console.log('Test: parse-no-env >>> failed')
    console.log(e.message)
  }

  try {
    const manyRefs = Array(27).fill('[^1]').join('')
    const mdMany = createMd({
      backlinks: {
        footnote: { position: 'before', duplicates: 'all' },
        endnote: { position: 'before', duplicates: 'all' },
      },
    })
    const rendered = mdMany.render(`P ${manyRefs}\n\n[^1]: note\n`)
    assert.ok(rendered.includes('id="fn-ref1-aa"'))
    assert.ok(!rendered.includes('fn-ref1-{'))
    console.log('Test: suffix-aa >>>')
  } catch (e) {
    pass = false
    console.log('Test: suffix-aa >>> failed')
    console.log(e.message)
  }

  try {
    const mdAriaPrefix = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'all', ariaLabelPrefix: 'Alias ' },
        endnote: { position: 'after', duplicates: 'all', ariaLabelPrefix: 'Alias ' },
      },
    })
    const rendered = mdAriaPrefix.render('P[^1][^1]\n\n[^1]: note\n')
    assert.ok(rendered.includes('aria-label="Alias 1-a"'))
    console.log('Test: aria-prefix >>>')
  } catch (e) {
    pass = false
    console.log('Test: aria-prefix >>> failed')
    console.log(e.message)
  }

  try {
    const mdPerKindBacklinks = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'all', content: '↩', trailingLabel: 'marker', ariaLabelPrefix: 'Back to footnote reference ' },
        endnote: { position: 'after', duplicates: 'all', content: '↑', trailingLabel: 'marker', ariaLabelPrefix: 'Back to endnote reference ' },
      },
    })
    const rendered = mdPerKindBacklinks.render('A[^1][^1] B[^en-1][^en-1]\n\n[^1]: foot\n[^en-1]: end\n')
    assert.ok(rendered.includes('aria-label="Back to footnote reference 1-a">↩<sup>a</sup>'))
    assert.ok(rendered.includes('aria-label="Back to endnote reference E1-a">↑<sup>a</sup>'))
    console.log('Test: per-kind-backlink-content-and-aria >>>')
  } catch (e) {
    pass = false
    console.log('Test: per-kind-backlink-content-and-aria >>> failed')
    console.log(e.message)
  }

  try {
    const mdAfterFirst = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'first', trailingLabel: 'marker' },
        endnote: { position: 'after', duplicates: 'first', trailingLabel: 'marker' },
      },
    })
    const rendered = mdAfterFirst.render('P[^1][^1]\n\n[^1]: note\n')
    const backlinkCount = (rendered.match(/class="fn-backlink"/g) || []).length
    assert.strictEqual(backlinkCount, 1)
    assert.ok(rendered.includes('href="#fn-ref1-a"'))
    assert.ok(!rendered.includes('<sup>a</sup>'))
    console.log('Test: after-first-single-backlink >>>')
  } catch (e) {
    pass = false
    console.log('Test: after-first-single-backlink >>> failed')
    console.log(e.message)
  }

  try {
    assert.throws(
      () => createMd({ labelBra: '(' }),
      /Option "labelBra" has been removed/
    )
    console.log('Test: removed-top-level-option-fails >>>')
  } catch (e) {
    pass = false
    console.log('Test: removed-top-level-option-fails >>> failed')
    console.log(e.message)
  }

  try {
    assert.throws(
      () => createMd({ backlinks: { content: 'BACK' } }),
      /Option "backlinks\.content" has been removed/
    )
    console.log('Test: removed-shared-backlink-option-fails >>>')
  } catch (e) {
    pass = false
    console.log('Test: removed-shared-backlink-option-fails >>> failed')
    console.log(e.message)
  }

  try {
    const mdStrict = createMd({ duplicates: { policy: 'strict' } })
    assert.throws(
      () => mdStrict.render('A[^1]\n\n[^1]: one\n[^1]: two\n'),
      /Duplicate footnote label "1"/
    )
    console.log('Test: duplicate-strict >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-strict >>> failed')
    console.log(e.message)
  }

  try {
    const mdStrictEndnote = createMd({ duplicates: { policy: 'strict' } })
    assert.throws(
      () => mdStrictEndnote.render('A[^en-1]\n\n[^en-1]: one\n[^en-1]: two\n'),
      /Duplicate footnote label "en-1"/
    )
    console.log('Test: duplicate-strict-endnote >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-strict-endnote >>> failed')
    console.log(e.message)
  }

  try {
    const mdInvalidPolicy = createMd({ duplicates: { policy: 'invalid-value' } })
    const rendered = mdInvalidPolicy.render('A[^1]\n\n[^1]: one\n[^1]: two\n')
    assert.ok(rendered.includes('class="fn footnote-error"'))
    assert.ok(rendered.includes('footnote-error-message'))
    console.log('Test: duplicate-policy-fallback >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-policy-fallback >>> failed')
    console.log(e.message)
  }

  try {
    const env = {}
    md.render('A[^1]\n\n[^1]: one\n[^1]: two\n', env)
    assert.ok(Array.isArray(env.footnoteHereDiagnostics.duplicateDefinitions))
    assert.strictEqual(env.footnoteHereDiagnostics.duplicateDefinitions.length, 1)
    assert.strictEqual(env.footnoteHereDiagnostics.duplicateDefinitions[0].label, '1')
    console.log('Test: duplicate-diagnostics >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-diagnostics >>> failed')
    console.log(e.message)
  }

  try {
    const env = {}
    md.render('A[^1]\n\n[^1]: one\n[^1]: two\n', env)
    md.render('B[^1]\n\n[^1]: one\n', env)
    assert.strictEqual(env.footnoteHereDiagnostics, undefined)
    console.log('Test: duplicate-diagnostics-reset >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-diagnostics-reset >>> failed')
    console.log(e.message)
  }

  try {
    const mdAfterDuplicate = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'all' },
        endnote: { position: 'after', duplicates: 'all' },
      },
    })
    const rendered = mdAfterDuplicate.render('A[^1][^1]\n\n[^1]: one\n[^1]: two\n')
    assert.ok(rendered.includes('class="fn-backlink footnote-error-backlink"'))
    assert.ok(rendered.includes('<span class="footnote-error-message">[Duplicate footnote label detected. Using the first definition.]</span>'))
    console.log('Test: duplicate-after-backlink >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-after-backlink >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyle = createMd({ duplicates: { injectStyle: true } })
    const rendered = mdStyle.render('A[^1] B[^2]\n\n[^1]: one\n[^1]: one-dup\n[^2]: two\n[^2]: two-dup\n')
    const styleCount = (rendered.match(/<style>/g) || []).length
    assert.strictEqual(styleCount, 1)
    console.log('Test: style-injected-once >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-injected-once >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyle = createMd({ duplicates: { injectStyle: true } })
    const rendered = mdStyle.render('A[^1]\n\n[^1]: one\n')
    assert.ok(!rendered.includes('<style>'))
    console.log('Test: style-no-duplicate >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-no-duplicate >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyleIgnore = createMd({ duplicates: { injectStyle: true, policy: 'ignore' } })
    const rendered = mdStyleIgnore.render('A[^1]\n\n[^1]: one\n[^1]: one-dup\n')
    assert.ok(!rendered.includes('<style>'))
    console.log('Test: style-ignore-policy >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-ignore-policy >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyleEndnote = createMd({ duplicates: { injectStyle: true } })
    const rendered = mdStyleEndnote.render('A[^en-1]\n\n[^en-1]: one\n[^en-1]: one-dup\n')
    const styleCount = (rendered.match(/<style>/g) || []).length
    assert.strictEqual(styleCount, 1)
    assert.ok(rendered.includes('class="en-backlink footnote-error-backlink"'))
    console.log('Test: style-endnote-duplicate >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-endnote-duplicate >>> failed')
    console.log(e.message)
  }

  try {
    const mdIgnoreEndnote = createMd({ duplicates: { policy: 'ignore' } })
    const rendered = mdIgnoreEndnote.render('A[^en-1]\n\n[^en-1]: one\n[^en-1]: one-dup\n')
    assert.ok(!rendered.includes('footnote-error'))
    assert.ok(!rendered.includes('footnote-error-message'))
    console.log('Test: ignore-endnote-duplicate >>>')
  } catch (e) {
    pass = false
    console.log('Test: ignore-endnote-duplicate >>> failed')
    console.log(e.message)
  }

  try {
    const mdEscapedMessage = createMd({ duplicates: { message: '<b>danger</b>' } })
    const rendered = mdEscapedMessage.render('A[^1]\n\n[^1]: one\n[^1]: one-dup\n')
    assert.ok(rendered.includes('&lt;b&gt;danger&lt;/b&gt;'))
    assert.ok(!rendered.includes('<span class="footnote-error-message"><b>danger</b></span>'))
    console.log('Test: duplicate-message-escaped >>>')
  } catch (e) {
    pass = false
    console.log('Test: duplicate-message-escaped >>> failed')
    console.log(e.message)
  }

  try {
    const mdEscapedOpts = createMd({
      references: {
        footnote: { brackets: { open: '<', close: '>' } },
        endnote: { prefix: '<E>', brackets: { open: '<', close: '>' } },
      },
      backlinks: {
        footnote: { position: 'after', duplicates: 'all', brackets: { open: '<', close: '>' }, content: '<b>BACK</b>', ariaLabelPrefix: '"x"' },
        endnote: { position: 'after', duplicates: 'all', brackets: { open: '<', close: '>' }, content: '<b>BACK</b>', ariaLabelPrefix: '"x"' },
      },
      endnotes: {
        section: {
          label: '<Notes>',
          id: 'end" id2="x',
          className: 'cls" x="y',
          useHeading: true,
        },
      },
    })
    const rendered = mdEscapedOpts.render('A[^en-1]\n\n[^en-1]: one\n')
    assert.ok(rendered.includes('&lt;E&gt;'))
    assert.ok(rendered.includes('&lt;Notes&gt;'))
    assert.ok(rendered.includes('id="end&quot; id2=&quot;x"'))
    assert.ok(rendered.includes('class="cls&quot; x=&quot;y"'))
    assert.ok(rendered.includes('&lt;b&gt;BACK&lt;/b&gt;'))
    assert.ok(!rendered.includes('<b>BACK</b>'))
    assert.ok(rendered.includes('aria-label="&quot;x&quot;&lt;E&gt;1"'))
    console.log('Test: option-strings-escaped >>>')
  } catch (e) {
    pass = false
    console.log('Test: option-strings-escaped >>> failed')
    console.log(e.message)
  }

  try {
    const env = { docId: 'doc1' }
    const rendered = md.render('A[^1]\n\n[^1]: one\n', env)
    assert.ok(rendered.includes('href="#fn-doc1-1"'))
    assert.ok(rendered.includes('id="fn-doc1-ref1"'))
    assert.ok(rendered.includes('id="fn-doc1-1"'))
    assert.ok(rendered.includes('href="#fn-doc1-ref1"'))
    console.log('Test: docid-footnote-link-consistency >>>')
  } catch (e) {
    pass = false
    console.log('Test: docid-footnote-link-consistency >>> failed')
    console.log(e.message)
  }

  try {
    const env = { docId: 'a\" b<' }
    const rendered = md.render('A[^en-1]\n\n[^en-1]: one\n', env)
    assert.ok(rendered.includes('id="en-a%22%20b%3C-1"'))
    assert.ok(rendered.includes('id="en-a%22%20b%3C-ref1"'))
    assert.ok(!rendered.includes('id="en-a" b<'))
    console.log('Test: docid-sanitized >>>')
  } catch (e) {
    pass = false
    console.log('Test: docid-sanitized >>> failed')
    console.log(e.message)
  }

  try {
    const env = { docId: 'doc1' }
    md.render('A[^1]\n\n[^1]: one\n', env)
    env.docId = 'doc2'
    const rendered = md.render('B[^1]\n\n[^1]: two\n', env)
    assert.ok(rendered.includes('href="#fn-doc2-1"'))
    assert.ok(rendered.includes('id="fn-doc2-ref1"'))
    assert.ok(!rendered.includes('fn-doc1'))
    console.log('Test: docid-reused-env-updated >>>')
  } catch (e) {
    pass = false
    console.log('Test: docid-reused-env-updated >>> failed')
    console.log(e.message)
  }

  try {
    const env = {}
    const tokens = mdBacklinksBeforeAll.parse('A[^1][^1]\n\n[^1]: one\n', env)
    const rendered1 = mdBacklinksBeforeAll.renderer.render(tokens, mdBacklinksBeforeAll.options, env)
    const rendered2 = mdBacklinksBeforeAll.renderer.render(tokens, mdBacklinksBeforeAll.options, env)
    assert.strictEqual(rendered1, rendered2)
    assert.ok(rendered1.includes('id="fn-ref1-a"'))
    assert.ok(rendered1.includes('id="fn-ref1-b"'))
    console.log('Test: repeated-render-stable >>>')
  } catch (e) {
    pass = false
    console.log('Test: repeated-render-stable >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('A[^1]\n\n[^1]:\n    - one\n    - two\n')
    assert.ok(rendered.includes('<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a></p>\n<ul>'))
    console.log('Test: list-leading-label-paragraph >>>')
  } catch (e) {
    pass = false
    console.log('Test: list-leading-label-paragraph >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('A[^1]\n\n[^1]:\n    # head\n    text\n')
    assert.ok(rendered.includes('<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a></p>\n<h1>head</h1>'))
    console.log('Test: heading-leading-label-paragraph >>>')
  } catch (e) {
    pass = false
    console.log('Test: heading-leading-label-paragraph >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('A[^1]\n\n[^1]:\n    > quote\n')
    assert.ok(rendered.includes('<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a></p>\n<blockquote>'))
    console.log('Test: blockquote-leading-label-paragraph >>>')
  } catch (e) {
    pass = false
    console.log('Test: blockquote-leading-label-paragraph >>> failed')
    console.log(e.message)
  }

  try {
    const mdAfterFirst = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'first' },
        endnote: { position: 'after', duplicates: 'first' },
      },
    })
    const rendered = mdAfterFirst.render('A[^1]\n\n[^1]:\n    ```js\n    console.log(1)\n    ```\n')
    assert.ok(rendered.includes('<p><span class="fn-label">[1]</span></p>\n<pre><code class="language-js">'))
    assert.ok(rendered.includes('</code></pre>\n<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink" aria-label="Back to reference 1">↩</a></p>'))
    console.log('Test: fence-leading-and-trailing-paragraphs >>>')
  } catch (e) {
    pass = false
    console.log('Test: fence-leading-and-trailing-paragraphs >>> failed')
    console.log(e.message)
  }

  try {
    const mdAfterAll = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'all' },
        endnote: { position: 'after', duplicates: 'all' },
      },
    })
    const rendered = mdAfterAll.render('A[^1][^1]\n\n[^1]: text\n\n    - one\n')
    assert.ok(rendered.includes('<p><span class="fn-label">[1]</span> text</p>\n<ul>'))
    assert.ok(rendered.includes('</ul>\n<p><a href="#fn-ref1-a" class="fn-backlink" role="doc-backlink" aria-label="Back to reference 1-a">↩</a><a href="#fn-ref1-b" class="fn-backlink" role="doc-backlink" aria-label="Back to reference 1-b">↩</a></p>'))
    console.log('Test: trailing-backlinks-moved-to-note-end >>>')
  } catch (e) {
    pass = false
    console.log('Test: trailing-backlinks-moved-to-note-end >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('A[^en-1]\n\n[^en-1]:\n    - one\n')
    assert.ok(rendered.includes('<li id="en1">\n<p><span class="en-label">[E1]</span></p>\n<ul>'))
    assert.ok(rendered.includes('</ul>\n<p><a href="#en-ref1" class="en-backlink" role="doc-backlink" aria-label="Back to reference E1">↩</a></p>'))
    console.log('Test: endnote-list-leading-label-paragraph >>>')
  } catch (e) {
    pass = false
    console.log('Test: endnote-list-leading-label-paragraph >>> failed')
    console.log(e.message)
  }

  try {
    const mdHeadingLevel = createMd({
      endnotes: {
        section: {
          label: 'Custom Notes',
          useHeading: true,
          headingLevel: 4,
        },
      },
    })
    const rendered = mdHeadingLevel.render('A[^en-1]\n\n[^en-1]: note\n')
    assert.ok(rendered.includes('<h4>Custom Notes</h4>'))
    console.log('Test: endnotes-heading-level >>>')
  } catch (e) {
    pass = false
    console.log('Test: endnotes-heading-level >>> failed')
    console.log(e.message)
  }

  try {
    const mdHeadingLevelInvalid = createMd({
      endnotes: {
        section: {
          label: 'Custom Notes',
          useHeading: true,
          headingLevel: 9,
        },
      },
    })
    const rendered = mdHeadingLevelInvalid.render('A[^en-1]\n\n[^en-1]: note\n')
    assert.ok(rendered.includes('<h2>Custom Notes</h2>'))
    assert.ok(!rendered.includes('<h9>'))
    console.log('Test: endnotes-heading-level-fallback >>>')
  } catch (e) {
    pass = false
    console.log('Test: endnotes-heading-level-fallback >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('[^1]: orphan\n')
    assert.ok(rendered.includes('<span class="fn-label">[1]</span> orphan'))
    assert.ok(!rendered.includes('class="fn-backlink"'))
    console.log('Test: orphan-footnote-no-broken-backlink >>>')
  } catch (e) {
    pass = false
    console.log('Test: orphan-footnote-no-broken-backlink >>> failed')
    console.log(e.message)
  }

  try {
    const mdAfterOrphan = createMd({
      backlinks: {
        footnote: { position: 'after', duplicates: 'all' },
        endnote: { position: 'after', duplicates: 'all' },
      },
    })
    const rendered = mdAfterOrphan.render('[^1]: orphan\n')
    assert.ok(rendered.includes('<span class="fn-label">[1]</span> orphan'))
    assert.ok(!rendered.includes('class="fn-backlink"'))
    console.log('Test: orphan-after-mode-no-broken-backlink >>>')
  } catch (e) {
    pass = false
    console.log('Test: orphan-after-mode-no-broken-backlink >>> failed')
    console.log(e.message)
  }

  try {
    const mdNoBacklinks = createMd({
      backlinks: {
        footnote: { position: 'none', duplicates: 'all' },
        endnote: { position: 'none', duplicates: 'all', trailingLabel: 'marker' },
      },
    })
    const rendered = mdNoBacklinks.render('A[^1][^1] B[^en-1][^en-1]\n\n[^1]: foot\n[^en-1]: end\n')
    assert.ok(rendered.includes('<span class="fn-label">[1]</span> foot'))
    assert.ok(rendered.includes('<span class="en-label">[E1]</span> end'))
    assert.ok(!rendered.includes('class="fn-backlink"'))
    assert.ok(!rendered.includes('class="en-backlink"'))
    console.log('Test: no-backlinks-still-labelled >>>')
  } catch (e) {
    pass = false
    console.log('Test: no-backlinks-still-labelled >>> failed')
    console.log(e.message)
  }

  try {
    const rendered = md.render('A[^1][^1] B[^en-1][^en-1]\n\n[^1]: foot\n[^en-1]: end\n')
    assert.ok(rendered.includes('<aside id="fn1" class="fn" role="doc-footnote">\n<p><a href="#fn-ref1-a" class="fn-backlink" role="doc-backlink">[1]</a> foot</p>\n</aside>'))
    assert.ok(!rendered.includes('href="#fn-ref1-b" class="fn-backlink"'))
    assert.ok(rendered.includes('href="#en-ref1-a" class="en-backlink"'))
    assert.ok(rendered.includes('href="#en-ref1-b" class="en-backlink"'))
    assert.ok(rendered.includes('↩<sup>a</sup>'))
    assert.ok(rendered.includes('↩<sup>b</sup>'))
    console.log('Test: split-backlinks-by-kind >>>')
  } catch (e) {
    pass = false
    console.log('Test: split-backlinks-by-kind >>> failed')
    console.log(e.message)
  }

  return pass
}

let pass = true
pass = runTest(md, testData.noOption, pass)
pass = runTest(mdBacklinksAfterAll, testData.backlinksAfterAll, pass)
pass = runTest(mdBacklinkOptions, testData.backlinkOptions, pass)
pass = runTest(mdBacklinksBeforeAll, testData.backlinksBeforeAll, pass)
pass = runTest(mdBacklinksBeforeAllNumeric, testData.backlinksBeforeAllNumeric, pass)
pass = runTest(mdLabelOptions, testData.labelOptions, pass)
pass = runTest(md, testData.footnoteDuplicate, pass)
pass = runTest(mdDuplicateIgnore, testData.footnoteDuplicateIgnore, pass)
pass = runTest(mdDuplicateStyleInjected, testData.duplicateStyleInjected, pass)
pass = runTest(md, testData.endnotes, pass)
pass = runTest(mdEndnoteCustomPrefix, testData.endnotesDetectionPrefix, pass)
pass = runTest(mdEndnoteCustomLabel, testData.endnotesReferencePrefix, pass)
pass = runTest(mdEndnoteHeading, testData.endnotesHeading, pass)
pass = runTest(mdEndnoteHeadingCustom, testData.endnotesHeadingCustom, pass)
pass = runTest(mdEndnoteSectionAttrs, testData.endnotesSectionAttrs, pass)
pass = runTest(md, testData.endnotesMixed, pass)
pass = runTest(md, testData.endnotesDuplicate, pass)
pass = runTest(mdEndnoteDisabled, testData.endnotesDisabled, pass)
pass = runTest(md, testData.splitBacklinks, pass)
pass = runDirectTests(pass)

if (pass) {
  console.log('Passed all test.')
} else {
  process.exitCode = 1
}
