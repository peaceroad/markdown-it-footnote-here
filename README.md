# markdown-it-footnote-here

This is [markdown-it](https://github.com/markdown-it/markdown-it) plugin.

This plugin inserts footnotes just below paragraphs.

The input Markdown and the output HTML are as follows.


```
Here is a footnote reference[^1].

[^1]: Here is the footnote.

[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
belong to the previous footnote.
```

```

## Use

```js
var md = require('markdown-it')()
            .use(require('markdown-it-footnote-here'));

md.render(/*...*/) // See examples above
```

## Install

```bash
npm install @peaceroad/markdown-it-footnote-here
```

## License

[MIT](https://github.com/markdown-it/markdown-it-footnote/blob/master/LICENSE)
