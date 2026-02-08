import fs from 'fs'
import path from 'path'
import assert from 'assert'
import mdit from 'markdown-it'
import footnotes from '../index.js'

const createMd = (option) => mdit().use(footnotes, option)

const md = createMd()
const mdAfterBacklink = createMd({ afterBacklink: true })
const mdBeforeSameBacklink = createMd({ beforeSameBacklink: true })
const mdBeforeSameBacklinkArabic = createMd({
  beforeSameBacklink: true,
  afterBacklinkSuffixArabicNumerals: true,
})
const mdAfterBacklinkOptions = createMd({
  afterBacklink: true,
  afterBacklinkContent: 'BACK',
  afterBacklinkWithNumber: true,
  afterBacklinkSuffixArabicNumerals: true,
  afterBacklinkAriaLabelPrefix: 'Go to ',
})
const mdLabelOptions = createMd({
  labelBra: '(',
  labelKet: ')',
  labelSupTag: true,
  backLabelBra: '{',
  backLabelKet: '}',
})
const mdDuplicateIgnore = createMd({ duplicateDefinitionPolicy: 'ignore' })
const mdDuplicateStyleInjected = createMd({ injectErrorStyle: true })
const mdEndnoteCustomLabel = createMd({ endnotesLabelPrefix: 'X' })
const mdEndnoteCustomPrefix = createMd({ endnotesPrefix: 'n-' })
const mdEndnoteHeading = createMd({
  endnotesUseHeading: true,
  endnotesSectionClass: 'endnotes',
})
const mdEndnoteHeadingCustom = createMd({
  endnotesSectionId: '',
  endnotesSectionClass: '',
  endnotesSectionAriaLabel: 'Custom Heading',
  endnotesUseHeading: true,
})
const mdEndnoteSectionAttrs = createMd({
  endnotesSectionId: '',
  endnotesSectionClass: 'notes-list',
  endnotesSectionAriaLabel: 'Custom Notes',
})
const mdEndnoteDisabled = createMd({ endnotesPrefix: '' })

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

const testData = {
  noOption: __dirname + path.sep +  'examples.txt',
  afterBacklink: __dirname + path.sep +  'examples-after-backlink.txt',
  afterBacklinkOptions: __dirname + path.sep +  'examples-after-backlink-options.txt',
  beforeSameBacklink: __dirname + path.sep +  'examples-before-same-backlink.txt',
  beforeSameBacklinkArabic: __dirname + path.sep +  'examples-before-same-backlink-arabic.txt',
  labelOptions: __dirname + path.sep + 'examples-label-options.txt',
  footnoteDuplicate: __dirname + path.sep + 'examples-footnotes-duplicate.txt',
  footnoteDuplicateIgnore: __dirname + path.sep + 'examples-footnotes-duplicate-ignore.txt',
  duplicateStyleInjected: __dirname + path.sep + 'examples-duplicate-style-injected.txt',
  endnotes: __dirname + path.sep + 'examples-endnotes.txt',
  endnotesPrefix: __dirname + path.sep + 'examples-endnotes-prefix-options.txt',
  endnotesCustomPrefix: __dirname + path.sep + 'examples-endnotes-custom-prefix.txt',
  endnotesHeading: __dirname + path.sep + 'examples-endnotes-heading.txt',
  endnotesHeadingCustom: __dirname + path.sep + 'examples-endnotes-heading-custom.txt',
  endnotesSectionAttrs: __dirname + path.sep + 'examples-endnotes-section-options.txt',
  endnotesMixed: __dirname + path.sep + 'examples-endnotes-mixed.txt',
  endnotesDuplicate: __dirname + path.sep + 'examples-endnotes-duplicate.txt',
  endnotesDisabled: __dirname + path.sep + 'examples-endnotes-disabled.txt',
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
    const mdMany = createMd({ beforeSameBacklink: true })
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
      afterBacklink: true,
      afterBacklinkAriaLabelPrefix: 'Alias ',
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
    const mdOldRemoved = createMd({
      afterBacklink: true,
      afterBacklinkdAriaLabelPrefix: 'old ',
    })
    const rendered = mdOldRemoved.render('P[^1][^1]\n\n[^1]: note\n')
    assert.ok(rendered.includes('aria-label="Back to reference 1-a"'))
    assert.ok(!rendered.includes('aria-label="old 1-a"'))
    console.log('Test: removed-old-aria-option-ignored >>>')
  } catch (e) {
    pass = false
    console.log('Test: removed-old-aria-option-ignored >>> failed')
    console.log(e.message)
  }

  try {
    const mdStrict = createMd({ duplicateDefinitionPolicy: 'strict' })
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
    const mdStrictEndnote = createMd({ duplicateDefinitionPolicy: 'strict' })
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
    const mdInvalidPolicy = createMd({ duplicateDefinitionPolicy: 'invalid-value' })
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
    const mdAfterDuplicate = createMd({ afterBacklink: true })
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
    const mdStyle = createMd({ injectErrorStyle: true })
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
    const mdStyle = createMd({ injectErrorStyle: true })
    const rendered = mdStyle.render('A[^1]\n\n[^1]: one\n')
    assert.ok(!rendered.includes('<style>'))
    console.log('Test: style-no-duplicate >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-no-duplicate >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyleIgnore = createMd({ injectErrorStyle: true, duplicateDefinitionPolicy: 'ignore' })
    const rendered = mdStyleIgnore.render('A[^1]\n\n[^1]: one\n[^1]: one-dup\n')
    assert.ok(!rendered.includes('<style>'))
    console.log('Test: style-ignore-policy >>>')
  } catch (e) {
    pass = false
    console.log('Test: style-ignore-policy >>> failed')
    console.log(e.message)
  }

  try {
    const mdStyleEndnote = createMd({ injectErrorStyle: true })
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
    const mdIgnoreEndnote = createMd({ duplicateDefinitionPolicy: 'ignore' })
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
    const mdEscapedMessage = createMd({ duplicateDefinitionMessage: '<b>danger</b>' })
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
      labelBra: '<',
      labelKet: '>',
      backLabelBra: '<',
      backLabelKet: '>',
      afterBacklink: true,
      afterBacklinkContent: '<b>BACK</b>',
      afterBacklinkAriaLabelPrefix: '"x"',
      endnotesLabelPrefix: '<E>',
      endnotesSectionAriaLabel: '<Notes>',
      endnotesSectionId: 'end" id2="x',
      endnotesSectionClass: 'cls" x="y',
      endnotesUseHeading: true,
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

  return pass
}

let pass = true
pass = runTest(md, testData.noOption, pass)
pass = runTest(mdAfterBacklink, testData.afterBacklink, pass)
pass = runTest(mdAfterBacklinkOptions, testData.afterBacklinkOptions, pass)
pass = runTest(mdBeforeSameBacklink, testData.beforeSameBacklink, pass)
pass = runTest(mdBeforeSameBacklinkArabic, testData.beforeSameBacklinkArabic, pass)
pass = runTest(mdLabelOptions, testData.labelOptions, pass)
pass = runTest(md, testData.footnoteDuplicate, pass)
pass = runTest(mdDuplicateIgnore, testData.footnoteDuplicateIgnore, pass)
pass = runTest(mdDuplicateStyleInjected, testData.duplicateStyleInjected, pass)
pass = runTest(md, testData.endnotes, pass)
pass = runTest(mdEndnoteCustomPrefix, testData.endnotesPrefix, pass)
pass = runTest(mdEndnoteCustomLabel, testData.endnotesCustomPrefix, pass)
pass = runTest(mdEndnoteHeading, testData.endnotesHeading, pass)
pass = runTest(mdEndnoteHeadingCustom, testData.endnotesHeadingCustom, pass)
pass = runTest(mdEndnoteSectionAttrs, testData.endnotesSectionAttrs, pass)
pass = runTest(md, testData.endnotesMixed, pass)
pass = runTest(md, testData.endnotesDuplicate, pass)
pass = runTest(mdEndnoteDisabled, testData.endnotesDisabled, pass)
pass = runDirectTests(pass)

if (pass) {
  console.log('Passed all test.')
} else {
  process.exitCode = 1
}
