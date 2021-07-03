const assert = require('assert');
const md = require('markdown-it')();
const footnotes = require('../index.js');
md.use(footnotes);

const ms = [
  [
    'A paragraph.[^1]\n\n[^1]: A footnote.\n\nA paragraph.',
    '<p>A paragraph.<a href="#fn1" id="fn-ref1" class="fn-ref" role="doc-noteref">[1]</a></p>\n<aside id="fn1" class="fn" role="doc-footnote">\n<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a> A footnote.</p>\n</aside>\n<p>A paragraph.</p>\n'
  ],
  [
    'A paragraph.[^1]\n\n[^1]: A footnote.\n\n    A footnote.\n\nA paragraph.',
    '<p>A paragraph.<a href="#fn1" id="fn-ref1" class="fn-ref" role="doc-noteref">[1]</a></p>\n<aside id="fn1" class="fn" role="doc-footnote">\n<p><a href="#fn-ref1" class="fn-backlink" role="doc-backlink">[1]</a> A footnote.</p>\n<p>A footnote.</p>\n</aside>\n<p>A paragraph.</p>\n'
  ]
];

let n = 0;
while(n < ms.length) {
  const h = md.render(ms[n][0]);
  try {
    assert.strictEqual(h, ms[n][1]);
  } catch(e) {
    console.log('Incorrect: ')
    console.log('M: ' + ms[n][0] + '\nH: ' + h +'C: ' + ms[n][1]);
  };
  n++;
}

