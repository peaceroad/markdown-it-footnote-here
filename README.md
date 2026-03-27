# markdown-it-footnote-here

This is [markdown-it](https://github.com/markdown-it/markdown-it) plugin. And, this plugin is a further fork of [markdown-it-footnote-here](https://github.com/uyumyuuy/markdown-it-footnote-here), which is a fork of the original [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) plugin.

This plugin inserts footnotes just below paragraphs.

The input Markdown and the output HTML are as follows.

Markdown:

```md
A paragraph.[^1]

[^1]: A footnote.

A paragraph.
```

HTML:

```html
<p>A paragraph.<a href="#fn1" id="fn-ref1" class="fn-noteref" role="doc-noteref">[1]</a></p>
<aside id="fn1" class="fn" role="doc-footnote">
<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a> A footnote.</p>
</aside>
<p>A paragraph.</p>
```

Notice.
- When multiple instances of the same footnote number appear in the main content, the default behavior is that the backlink from the footnote will refer to the first instance.
- When the same footnote/endnote label is defined multiple times, behavior is controlled by `duplicates.policy` (default: `warn`).
- When a note starts or ends with a non-paragraph block such as a list, heading, blockquote, or fence, the plugin inserts standalone label/backlink paragraphs as needed so numbering and return links remain visible.

## Endnotes

When a footnote label starts with `endnotes.prefix` (default: `en-`), it is collected at the end of the document and rendered as endnotes. The reference/backlink label for endnotes uses `references.endnote.prefix` (default: `E`), so endnotes appear as `[E1]`, `[E2]`, ...

Markdown:

```md
A paragraph.[^en-1]

[^en-1]: A endnote.

A paragraph.
```

HTML:

```html
<p>A paragraph.<a href="#en1" id="en-ref1" class="en-noteref" role="doc-noteref">[E1]</a></p>
<p>A paragraph.</p>
<section aria-label="Notes" id="endnotes" role="doc-endnotes">
<ol>
<li id="en1">
<p><a href="#en-ref1" class="en-backlink" role="doc-backlink">[E1]</a> A endnote.</p>
</li>
</ol>
</section>
```

## Use

```js
import mdit from 'markdown-it'
import mditFootnoteHere from '@peaceroad/markdown-it-footnote-here'

const md = mdit().use(mditFootnoteHere)
md.render(/*...*/) // See examples above
```

## Install

```samp
npm install @peaceroad/markdown-it-footnote-here
```

## Options

- Breaking change: options are now grouped into `references`, `backlinks`, `endnotes`, and `duplicates`.
- Removed legacy keys now throw at plugin setup. This includes the old top-level keys such as `beforeSameBacklink`, `afterBacklink*`, `labelBra`, `labelKet`, `labelSupTag`, `backLabelBra`, `backLabelKet`, `endnotesPrefix`, `endnotesLabelPrefix`, `endnotesSection*`, `duplicateDefinition*`, `injectErrorStyle`, and the old shared `backlinks.content`, `backlinks.duplicateMarker`, `backlinks.trailingLabel`, `backlinks.ariaLabelPrefix`.
- `references` (object): controls how note references render in main text.
  - `footnote.prefix` / `endnote.prefix`: visible label prefix before the note number. Defaults are `''` for footnotes and `'E'` for endnotes.
  - `footnote.brackets.open` / `.close`, `endnote.brackets.open` / `.close`: visible brackets around note reference labels. Default: `'['` and `']'`.
  - `footnote.wrapInSup` / `endnote.wrapInSup`: whether that kind of note reference is wrapped in `<sup>`. Default: `false`.
- `backlinks` (object): controls labels and return links inside note bodies.
  - `footnote.position` / `endnote.position`: `'before' | 'after' | 'both' | 'none'` (default: `'before'`).
  - `footnote.duplicates` / `endnote.duplicates`: `'first' | 'all'` (default: `'first'`). `all` renders one backlink per repeated reference; `first` points back only to the first occurrence.
  - `footnote.brackets.open` / `.close`, `endnote.brackets.open` / `.close`: visible brackets used for leading note labels/backlinks. Default: `'['` and `']'`.
  - `footnote.content` / `endnote.content`: trailing backlink content. Default: `'↩'`.
  - `footnote.duplicateMarker` / `endnote.duplicateMarker`: visible duplicate suffix style, `'alpha' | 'numeric'` (default: `'alpha'`).
  - `footnote.trailingLabel` / `endnote.trailingLabel`: whether trailing backlinks render a visible duplicate suffix marker, `'none' | 'marker'` (default: `'none'`).
  - `footnote.ariaLabelPrefix` / `endnote.ariaLabelPrefix`: prefix for trailing backlink `aria-label` values (default: `'Back to reference '`).
  - Note: when `position` includes `before` and `duplicates` is `all`, duplicate references and leading backlinks use visible suffixes such as `a`, `b`, `c` (or `1`, `2`, `3` when `duplicateMarker: 'numeric'`).
  - Note: `position: 'none'` still renders a non-link note label so the note number remains visible.
- `endnotes` (object): controls how endnotes are detected and where they are rendered.
  - `prefix`: prefix that marks a note as an endnote (default: `'en-'`). When empty, endnotes are disabled.
  - `section.id`: `id` attribute for the endnotes section wrapper; omitted when empty (default: `'endnotes'`).
  - `section.className`: `class` attribute for the endnotes section wrapper; omitted when empty (default: `''`).
  - `section.label`: used as `aria-label` when `section.useHeading` is `false`; used as heading text when `section.useHeading` is `true` (default: `'Notes'`).
  - `section.useHeading`: if `true`, render a heading tag and omit `aria-label`. If `false` (default), omit the heading and set `aria-label` when provided.
  - `section.headingLevel`: heading level used when `section.useHeading` is `true`, limited to `1..6` (default: `2`).
- `duplicates` (object): controls duplicate note-definition handling.
  - `policy`: `'warn' | 'ignore' | 'strict'` (default: `'warn'`).
  - `'warn'`: keep first definition, mark note block with `footnote-error`, mark backlinks with `footnote-error-backlink`, and prepend `<span class="footnote-error-message">...</span>` in note content.
  - `'ignore'`: keep first definition and do not add warning classes/messages.
  - `'strict'`: throw an error on duplicate label.
  - `message`: warning text used when `policy` is `'warn'` (default: `'[Duplicate footnote label detected. Using the first definition.]'`).
  - `injectStyle`: if `true` and `policy` is `'warn'`, inject a `<style>` block once per document for `.footnote-error-message` and `.footnote-error-backlink` (includes `prefers-color-scheme` and `forced-colors` handling). Default: `false`.
- Example:

```js
const md = mdit().use(mditFootnoteHere, {
  references: {
    footnote: {
      brackets: { open: '[', close: ']' },
    },
    endnote: {
      prefix: 'E',
      brackets: { open: '[', close: ']' },
    },
  },
  backlinks: {
    footnote: { position: 'before', duplicates: 'first' },
    endnote: { position: 'after', duplicates: 'all', content: '↑', trailingLabel: 'marker' },
  },
  endnotes: {
    prefix: 'en-',
    section: { label: 'Notes', useHeading: true, headingLevel: 2 },
  },
  duplicates: {
    policy: 'warn',
  },
})
```

- Diagnostics: when duplicates are detected under `duplicates.policy: 'warn'`, details are collected in `env.footnoteHereDiagnostics.duplicateDefinitions`.
- Security note: option strings used in HTML output are escaped before rendering (labels, aria/id/class values, heading text, backlink content/message).
- Unreferenced note-definition note: when a note definition has no matching reference, the note still renders its visible label, but backlink anchors are omitted so broken `href` targets are not emitted.
- `env.docId` note: if provided, it is URL-encoded and applied consistently to note/ref ids to keep links valid and safe.
- Reused-render note: repeated renders are stable because duplicate-reference suffixes are fixed during parse, and changing `env.docId` on a reused `env` object updates generated ids consistently.
- Renderer note: hosts may call render paths without a populated `env` (for example, inline-only renders). In that case, references render without count-based suffixes; pass a shared `env` during parse+render to keep counts consistent.
