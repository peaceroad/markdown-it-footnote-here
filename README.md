# markdown-it-footnote-here

This is [markdown-it](https://github.com/markdown-it/markdown-it) plugin.

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
<p>A paragraph.<a href="#fn1" id="fn-ref1" class="fn-ref" role="doc-noteref">[1]</a></p>
<aside id="fn1" class="fn" role="doc-footnote">
<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a> A footnote.</p>
</aside>
<p>A paragraph.</p>
```

## Use

```js
const md = require('markdown-it')()
            .use(require('@peaceroad/markdown-it-footnote-here'));

md.render(/*...*/) // See examples above
```

## Install

```bash
npm install @peaceroad/markdown-it-footnote-here
```

## License

[MIT](./LICENSE)
