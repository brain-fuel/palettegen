# Changelog

## v0.5.1 — 2026-10-26

- Make Add a secondary color immediately apply the displayed picker color,
  update the live palette, and create one undoable edit.
- Keep collapse/expand separate from activation. Undoing the addition restores
  the absent, collapsed state; rendering and history recovery never add a color.

## v0.5.0 — 2026-10-26

- Add Examples/Demos navigation to the pinned toolbar, retaining six full-size
  touch targets on compact screens.
- Add a live desktop palette rail and a collapsible small-screen preview, with
  gradients through all actual shades and links to each full color scale.
- Keep the secondary swatch visible when collapsed, with a nearby Remove action
  that hides on expansion and participates in undo/history.
- Pin Download PDF / Download JSON below the workspace toolbar when scrolling
  through a palette, and restore the row's normal position when scrolling back.
- Keep the pinned downloads current and accessible in both browser builds and
  the native server's fallback without JavaScript.
- Make the download row transparent, with solid button backgrounds to keep
  their labels readable over scrolling palette content. Add 13px of vertical
  breathing room and remove divider lines beneath the pinned rows.

## v0.4.0 — 2026-10-26

- Keep Undo, Redo, History, Edit colors, and See palette together in a bar
  that pins to the top after scrolling past it. Use compact navigation labels
  on phones while retaining full touch targets.
- Return to picture/manual color selection without losing the working picture
  or palette. Workspace navigation moves keyboard focus and keeps destination
  headings below the pinned bar.

## v0.3.2 — 2026-10-25

- Standardize the product name as **PaletteGen** across the application,
  browser loading screen, documentation, and goforge.dev catalog and page.
- Rename the session storage namespace while preserving existing palette,
  color, and undo history through one-time migration.

## v0.3.1 — 2026-10-24

- Name both base colors in two-color palette titles, JSON, PDFs, and download
  filenames. For example: `Magenta #BA2C86 + Teal (Vivid) #26E8C1`.
- Include primary color names when customizing a curated palette, retaining
  its original palette number. Single-color names are unchanged.
- Document corrective UX decisions with PHW's outside/inside fence structure,
  including the principle and limits of each correction.

## v0.3.0 — 2026-10-24

- Add an optional secondary brand scale, independent of the complementary
  accent. Preserve chosen hex values exactly in the interface and exports.
- Pick colors from uploaded, dropped, pasted, or web-linked pictures. Preview
  before assigning Primary/Secondary, then refine that selection live in an
  interactive pixel grid. Zoom and pan without assigning another color.
- Replace Generate with live palette updates, gesture undo/redo, and session
  histories for palettes and explored colors.
- Keep the compact picture workspace together at 375×548 and 320×568 CSS
  pixels, with nearby Change/Remove actions and 44px targets.
- Use Overpass, Atkinson Hyperlegible, and Atkinson Hyperlegible Mono in the
  interface and PDF exports. Use semantic feedback and assignment confirmations.
- Share goml palette/rendering code across the native server and browser Wasm
  app. Embed browser assets and fonts in the installable server binary.

Validation: deterministic generated-code/browser-asset checks, native property
checks, race checks, vet for native and browser targets, and server/static
acceptance checks in desktop Chromium and mobile WebKit. Browser checks cover
preview safety, isolated refinement, zoom/pan, compact layouts, history,
clipboard/CORS failures, retained state, and current JSON/PDF downloads.
