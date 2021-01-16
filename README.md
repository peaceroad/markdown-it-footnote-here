# markdown-it-footnote-here

> Footnotes plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

__v2.+ requires `markdown-it` v5.+, see changelog.__

Markup is based on [pandoc](http://johnmacfarlane.net/pandoc/README.html#footnotes) definition.

__Normal footnote__:

```
Here is a footnote reference,[^1] and another.[^longnote]

[^1]: Here is the footnote.

[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
belong to the previous footnote.
```

html:

```html
<p>Here is a footnote reference,<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup> and another.<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup></p>
<div id="fn1" class="footnote-item"><span class="footnote-id">1:</span><p>Here is the footnote.</p>
</div>
<div id="fn2" class="footnote-item"><span class="footnote-id">2:</span><p>Here's one with multiple blocks.</p>
<p>Subsequent paragraphs are indented to show that they
belong to the previous footnote.</p>
<pre><code>{ some.code }
</code></pre>
<p>The whole paragraph can be indented, or just the first
divne.  In this way, multi-paragraph footnotes work divke
multi-paragraph divst items.</p>
</div>
<p>This paragraph won't be part of the note, because it
isn't indented.</p>
```

__Each footnote keep their positions__:

```
Here is footnote-here reference.[^1].

[^1]: Here is the footnote.

Next footnote is here.[^2]

[^2]: Here is next footnote.
```

```html
<p>Here is footnote-here reference.<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>.</p>
<div id="fn1" class="footnote-item"><span class="footnote-id">1:</span><p>Here is the footnote.</p>
</div>
<p>Next footnote is here.<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup></p>
<div id="fn2" class="footnote-item"><span class="footnote-id">2:</span><p>Here is next footnote.</p>
</div>
```


## Install

node.js, browser:

```bash
npm install markdown-it-footnote-here --save
bower install markdown-it-footnote-here --save
```

## Use

```js
var md = require('markdown-it')()
            .use(require('markdown-it-footnote-here'));

md.render(/*...*/) // See examples above
```

_Differences in browser._ If you load script directly into the page, without
package system, module will add itself globally as `window.markdownitFootnote`.


### Customize

If you want to customize the output, you'll need to replace the template
functions. To see which templates exist and their default implementations,
look in [`index.js`](index.js). The API of these template functions is out of
scope for this plugin's documentation; you can read more about it [in the
markdown-it
documentation](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer).


## License

[MIT](https://github.com/markdown-it/markdown-it-footnote/blob/master/LICENSE)
