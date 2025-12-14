# Workflow for Updating markdown-it-footnote-here

This document captures the current implementation workflow, especially around footnotes/endnotes.

## Code overview
- `index.js`:
  - Rendering helpers: `render_footnote_ref`, `render_footnote_open/close`, `render_footnote_anchor`, and `createAfterBackLinkToken`.
  - Parsing: custom block rule `footnote_def`, inline rule `footnote_ref`, core rule `footnote_anchor`, and `endnotes_move` to append endnotes at the end.
  - Endnote handling: labels starting with `endnotesPrefix` (default `en-`) are endnotes; DOM ids/classes use fixed `en`.
  - Options include backlink placement, label customization, and endnotes section attributes.

## Adding features / making changes
1) Review options and defaults in `index.js` (`opt` object).
2) Keep DOM prefixes stable:
   - Footnotes use `fn`; endnotes use `en` for ids/classes (`en1`, `en-ref1`, etc.).
3) Parsing flow:
   - `footnote_def` registers notes into `env.footnotes` or `env.endnotes` based on `endnotesPrefix`.
   - `footnote_ref` resolves references via `selectNoteEnv` and tags tokens with `isEndnote`.
4) Rendering flow:
   - `footnote_anchor` injects backlinks/labels into footnote content.
   - `endnotes_move` removes endnote blocks from inline positions and appends a `<section>` (attributes ordered aria-label → id → class → role).
5) When adding options:
   - Update `README.md` and add fixtures under `test/`.
   - Extend `test/test.js` to load the new fixtures.

## Testing
- Run `npm test` (uses `test/test.js` and fixtures under `test/`).
- Fixtures format: alternating `[Markdown]` and `[HTML]` blocks.

## Notes
- `labelSupTag` applies to both footnotes and endnotes.
- If `endnotesPrefix` is empty, endnotes are disabled.
- `endnotesUseHeading` true: render `<h2>` with `endnotesSectionAriaLabel`; false: use `aria-label` without heading.
