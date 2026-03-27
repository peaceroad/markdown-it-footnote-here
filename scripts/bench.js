import { performance } from 'node:perf_hooks'
import MarkdownIt from 'markdown-it'
import footnotes from '../index.js'

const rounds = Math.max(20, Number(process.env.BENCH_ROUNDS || 200))
const warmups = Math.max(5, Number(process.env.BENCH_WARMUPS || 30))

const corpusBlock = [
  'A[^1] B[^1] C[^en-1] D[^en-1]',
  '',
  '[^1]: alpha',
  '[^en-1]: omega',
  '',
  'List[^2]',
  '',
  '[^2]:',
  '    - one',
  '    - two',
  '',
  'Fence[^3][^3]',
  '',
  '[^3]:',
  '    ```js',
  '    console.log(1)',
  '    ```',
  '',
  'Mixed[^4][^4]',
  '',
  '[^4]: text',
  '',
  '    > quote',
].join('\n')

const corpus = Array(30).fill(corpusBlock).join('\n\n')

const scenarios = [
  {
    name: 'default',
    options: {},
  },
  {
    name: 'split-featured',
    options: {
      backlinks: {
        footnote: { position: 'before', duplicates: 'first', duplicateMarker: 'numeric', trailingLabel: 'marker' },
        endnote: { position: 'after', duplicates: 'all', duplicateMarker: 'numeric', trailingLabel: 'marker' },
      },
    },
  },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const measureScenario = ({ name, options }) => {
  const md = new MarkdownIt().use(footnotes, options)

  for (let i = 0; i < warmups; i++) {
    md.render(corpus, { docId: `warm-${i}` })
  }

  const samples = []
  for (let i = 0; i < rounds; i++) {
    const env = { docId: `doc-${i % 11}` }
    const start = performance.now()
    md.render(corpus, env)
    samples.push(performance.now() - start)
  }

  return {
    name,
    medianMs: Number(median(samples).toFixed(3)),
  }
}

const results = scenarios.map(measureScenario)

console.log(JSON.stringify({
  rounds,
  warmups,
  results,
}, null, 2))
