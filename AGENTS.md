# Workflow for Updating markdown-it-footnote-here

This document captures the current implementation workflow, especially around footnotes/endnotes.

## Code overview
- `index.js`:
  - Rendering helpers: `render_footnote_ref`, `render_footnote_open/close`, `render_footnote_anchor`, and `createAfterBackLinkToken`.
  - Parsing: custom block rule `footnote_def`, inline rule `footnote_ref`, core rule `footnote_anchor`, style injection rule `footnote_error_style`, and `endnotes_move` to append endnotes at the end.
  - Endnote handling: labels starting with `endnotesPrefix` (default `en-`) are endnotes; DOM ids/classes use fixed `en`.
  - Duplicate definition handling: `duplicateDefinitionPolicy` (`warn|ignore|strict`), diagnostics in `env.footnoteHereDiagnostics.duplicateDefinitions`, optional style injection via `injectErrorStyle`.
  - Security: option strings are escaped before HTML output (`opt._safe`).
  - `env.docId` is URL-encoded and consistently applied to note/ref ids.

## Adding features / making changes
1) Review options and defaults in `index.js` (`opt` object).
2) Keep DOM prefixes stable:
   - Footnotes use `fn`; endnotes use `en` for ids/classes (`en1`, `en-ref1`, etc.).
3) Parsing flow:
   - `footnote_def` registers notes into `env.footnotes` or `env.endnotes` based on `endnotesPrefix`.
   - On duplicate labels, behavior depends on `duplicateDefinitionPolicy`.
   - `footnote_ref` resolves references via `selectNoteEnv` and tags tokens with `isEndnote`.
4) Rendering flow:
   - `footnote_anchor` injects backlinks/labels into footnote content.
   - `footnote_error_style` injects one `<style>` block only when enabled and duplicates exist.
   - `endnotes_move` removes endnote blocks from inline positions and appends a `<section>` (attributes ordered aria-label -> id -> class -> role).
5) When adding options:
   - Update `README.md` and add fixtures under `test/`.
   - Extend `test/test.js` to load the new fixtures.

## Testing
- Run `npm test` (uses `test/test.js` and fixtures under `test/`).
- Fixtures format: alternating `[Markdown]` and `[HTML]` blocks.
- Keep direct assertions in `test/test.js` for non-fixture edge cases (env reuse, strict mode, style injection count, escaping, `docId` behavior).

## Notes
- `labelSupTag` applies to both footnotes and endnotes.
- If `endnotesPrefix` is empty, endnotes are disabled.
- `endnotesUseHeading` true: render `<h2>` with `endnotesSectionAriaLabel`; false: use `aria-label` without heading.
- Backlink aria option name is `afterBacklinkAriaLabelPrefix` (the old typo key is removed).
- If `beforeSameBacklink` and `afterBacklink` are both true, both backlink styles are rendered.
- For duplicate warnings, classes/messages are:
  - block: `footnote-error`
  - backlink: `footnote-error-backlink`
  - message span: `footnote-error-message`
- `duplicateDefinitionPolicy` has no callback hook yet; diagnostics are available at `env.footnoteHereDiagnostics.duplicateDefinitions`.
- Endnotes heading tag is fixed to `<h2>` when `endnotesUseHeading` is true (no heading-level option yet).
- `docId` cache assumes `env.docId` is stable for a given `env` object during a render cycle.
- Renderer rules should tolerate missing `env` (for example, inline-only renders) and treat missing notes as empty to avoid crashes.
