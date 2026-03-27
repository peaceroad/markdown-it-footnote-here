# Workflow for Updating markdown-it-footnote-here

This document captures the current implementation workflow, especially around footnotes/endnotes.

## Code overview
- `index.js`:
  - Rendering helpers: `render_footnote_ref`, `render_footnote_open/close`, `render_footnote_anchor`, and `createAfterBackLinkToken`.
  - Renderer compatibility: `footnote_open` still resolves ids via renderer rule `footnote_anchor_name`, so custom renderer overrides keep working.
  - Parsing: custom block rule `footnote_def`, inline rule `footnote_ref`, core rule `footnote_anchor`, style injection rule `footnote_error_style`, and `endnotes_move` to append endnotes at the end.
  - Options are normalized into four groups: `references`, `backlinks`, `endnotes`, and `duplicates`.
  - Runtime note config is precomputed per kind (`footnote`, `endnote`) so renderer/core hot paths only read finished kind configs.
  - Endnote handling: labels starting with `endnotes.prefix` (default `en-`) are endnotes; DOM ids/classes still use fixed `en`.
  - Duplicate definition handling: `duplicates.policy` (`warn|ignore|strict`), diagnostics in `env.footnoteHereDiagnostics.duplicateDefinitions`, optional style injection via `duplicates.injectStyle`.
  - Security: option strings are escaped before HTML output via `safeOptions`.
  - `env.docId` is URL-encoded and consistently applied to note/ref ids; cached encoding must track `env.docId` changes on reused env objects.
  - Long-lived helper caches (`docId` memo, suffix tables) live in the plugin-instance closure, not module-global state.

## Adding features / making changes
1) Review normalized options and runtime builders in `index.js`.
2) Keep DOM prefixes stable:
   - Footnotes use `fn`; endnotes use `en` for ids/classes (`en1`, `en-ref1`, etc.).
3) Parsing flow:
   - `footnote_def` registers notes into `env.footnotes` or `env.endnotes` based on `endnotes.prefix`.
   - On duplicate labels, behavior depends on `duplicates.policy`.
   - `footnote_ref` resolves references from `env.footnotes` / `env.endnotes` and tags tokens with `isEndnote` plus a stable per-note reference ordinal for duplicate-marker rendering.
4) Rendering flow:
   - `footnote_anchor` injects leading labels/backlinks into note content.
   - If a note starts with a non-paragraph block, `footnote_anchor` inserts a standalone leading `<p>` for the note label/backlink.
   - `createAfterBackLinkToken` injects trailing backlinks only when `backlinks.<kind>.position` includes `after`.
   - If a note ends with a non-paragraph block, trailing backlinks are emitted in a standalone trailing `<p>` so they stay at the end of the note.
   - `footnote_error_style` injects one `<style>` block only when enabled and duplicates exist.
   - `endnotes_move` removes endnote blocks from inline positions and appends a `<section>` (attributes ordered aria-label -> id -> class -> role).
5) When adding options:
   - Update `README.md` and add fixtures under `test/`.
   - Extend `test/test.js` to load the new fixtures.
   - Keep removed option names fail-fast. Do not silently reintroduce old aliases.

## Testing
- Run `npm test` (uses `test/test.js` and fixtures under `test/`).
- Optional perf check: run `npm run bench` for a fixed-corpus median render measurement.
- Fixtures format: alternating `[Markdown]` and `[HTML]` blocks.
- Keep direct assertions in `test/test.js` for non-fixture edge cases (env reuse, strict mode, style injection count, escaping, `docId` behavior, non-paragraph note starts/ends, removed-option failures, per-kind backlink customization).

## Notes
- `references.footnote` / `references.endnote` each accept:
  - `prefix`
  - `brackets.open` / `brackets.close`
  - `wrapInSup`
- `backlinks.footnote` / `backlinks.endnote` each accept:
  - `position`: `before | after | both | none`
  - `duplicates`: `first | all`
  - `brackets.open` / `brackets.close`
  - `content`
  - `duplicateMarker`: `alpha | numeric`
  - `trailingLabel`: `none | marker`
  - `ariaLabelPrefix`
- `endnotes.prefix` disables endnotes when empty.
- `endnotes.section.useHeading` true: render `<h{headingLevel}>` with `endnotes.section.label`; false: use `aria-label` without heading.
- `endnotes.section.headingLevel` is normalized to an integer in `1..6` and defaults to `2`.
- Duplicate markers are always applied to ref/backlink ids when a note is referenced multiple times; visible suffixes are only added where the active backlink mode requires them.
- Notes with `position: 'after'` or `position: 'none'` still render a leading non-link label span so the note number remains visible.
- Unreferenced note definitions still render their visible label, but backlink anchors are omitted so the plugin does not emit broken `href` targets.
- For notes that start or end with non-paragraph blocks (lists, headings, fences, blockquotes), the plugin may insert standalone label/backlink paragraphs to keep numbering and return links visible.
- For duplicate warnings, classes/messages are:
  - block: `footnote-error`
  - backlink: `footnote-error-backlink`
  - message span: `footnote-error-message`
- `duplicates.policy` has no callback hook yet; diagnostics are available at `env.footnoteHereDiagnostics.duplicateDefinitions` when policy is `warn`.
- `docId` encoding cache must invalidate when `env.docId` changes on a reused `env` object.
- Renderer rules should tolerate missing `env` (for example, inline-only renders) and treat missing notes as empty to avoid crashes.
