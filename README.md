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
- When the same footnote/endnote label is defined multiple times, behavior is controlled by `duplicateDefinitionPolicy` (default: `warn`).

## Endnotes

When a footnote label starts with the endnote prefix (default: `en-`), it is collected at the end of the document and rendered as endnotes. The reference/backlink label for endnotes is prefixed by `endnotesLabelPrefix` (default: `E`), so endnotes appear as `[E1]`, `[E2]`, ...

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

- beforeSameBacklink (boolean): false by default. When true, duplicate footnote references will use suffixes (a, b, ... z, aa, ab, ...) and generate matching backlinks in footnote definitions.
- afterBacklink (boolean): false by default. If true, backlinks (↩) are placed at the end of the footnote content instead of before it.
  - Note: If `beforeSameBacklink` is also true, both backlink styles are rendered (before-label links and trailing ↩ links). Use one style if you need a cleaner output.
- afterBacklinkContent (string): The content for the backlink (default: '↩').
- afterBacklinkWithNumber (boolean): If true, backlink will show a number or letter suffix.
- afterBacklinkSuffixArabicNumerals (boolean): If true, backlink suffix uses numbers (1, 2, ...) instead of letters (a, b, ...).
- afterBacklinkAriaLabelPrefix (string): Prefix for aria-label of backlink (default: 'Back to reference ').
  - Breaking change: `afterBacklinkdAriaLabelPrefix` (old typo key) has been removed.
- labelBra (string): Bracket to use before footnote number (default: '[').
- labelKet (string): Bracket to use after footnote number (default: ']'). 
- labelSupTag (boolean): If true, wraps footnote reference in `<sup>` tag.
- backLabelBra (string): Bracket to use before backlink number (default: '[').
- backLabelKet (string): Bracket to use after backlink number (default: ']').
- endnotesPrefix (string): Prefix that marks a footnote as an endnote (default: `'en-'`).
- endnotesLabelPrefix (string): Label prefix for endnote refs/backlinks (default: `'E'`, e.g., `[E1]`).
- endnotesSectionId (string): `id` attribute for the endnotes section wrapper; omitted when empty (default: `'endnotes'`).
- endnotesSectionClass (string): `class` attribute for the endnotes section wrapper; omitted when empty (default: `''`).
- endnotesSectionAriaLabel (string): Used as `aria-label` when `endnotesUseHeading` is false. When `endnotesUseHeading` is true, this value becomes the heading text (default: `'Notes'`).
- endnotesUseHeading (boolean): If true, render `<h2>{endnotesSectionAriaLabel}</h2>` and omit `aria-label`. If false (default), omit the heading and set `aria-label` when provided.
- duplicateDefinitionPolicy (string): Policy for duplicate labels (`'warn' | 'ignore' | 'strict'`, default: `'warn'`).
  - `'warn'`: keep first definition, mark note block with `footnote-error`, mark backlinks with `footnote-error-backlink`, and prepend `<span class="footnote-error-message">...</span>` in note content.
  - `'ignore'`: keep first definition and do not add warning classes/messages.
  - `'strict'`: throw an error on duplicate label.
- duplicateDefinitionMessage (string): Message text used in warning span when policy is `warn` (default: `'[Duplicate footnote label detected. Using the first definition.]'`).
- injectErrorStyle (boolean): If true and policy is `warn`, inject a `<style>` block once per document for `.footnote-error-message` and `.footnote-error-backlink` (includes `prefers-color-scheme` and `forced-colors` handling). Default: `false`.
- Diagnostics: when duplicates are detected, details are collected in `env.footnoteHereDiagnostics.duplicateDefinitions`.
- Security note: option strings used in HTML output are escaped before rendering (labels, aria/id/class values, heading text, backlink content/message).
- `env.docId` note: if provided, it is URL-encoded and applied consistently to note/ref ids to keep links valid and safe.
  - Runtime note: when using `env.docId`, prefer a new `env` object per render; changing `env.docId` on a reused object may keep prior cached id parts.
