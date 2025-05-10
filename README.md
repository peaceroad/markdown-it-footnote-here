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

Notice. When multiple instances of the same footnote number appear in the main content, the default behavior is that the backlink from the footnote will refer to the first instance.

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

- beforeSameBacklink (boolean): false by default. When true, duplicate footnote references will use letter suffixes (a, b, c, ...) and generate matching backlinks in footnote definitions.
- afterBacklink (boolean): false by default. If true, backlinks (↩) are placed at the end of the footnote content instead of before it.
- afterBacklinkContent (string): The content for the backlink (default: '↩').
- afterBacklinkWithNumber (boolean): If true, backlink will show a number or letter suffix.
- afterBacklinkSuffixArabicNumerals (boolean): If true, backlink suffix uses numbers (1, 2, ...) instead of letters (a, b, ...).
- afterBacklinkdAriaLabelPrefix (string): Prefix for aria-label of backlink (default: 'Back to reference ').
- labelBra (string): Bracket to use before footnote number (default: '[').
- labelKet (string): Bracket to use after footnote number (default: ']').
- labelSupTag (boolean): If true, wraps footnote reference in `<sup>` tag.
- backLabelBra (string): Bracket to use before backlink number (default: '[').
- backLabelKet (string): Bracket to use after backlink number (default: ']').
