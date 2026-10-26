# PaletteGen

A web app that gives out complete UI color palettes — written entirely in
[goml](https://goforge.dev/goplus/), the ML-family surface for the Go+
toolchain, and compiled down to a single Go binary.

Pick one starting color (or one of the book's 24 curated palettes), optionally
add a second brand color, and you
get the full system a real interface needs: ten shades each of a primary
scale, temperature-matched neutrals, and supporting scales — downloadable as
a **PDF** laid out like the *Refactoring UI: Color Palettes* book, and as
**JSON**.

## Run it

```sh
go install goforge.dev/palettegen@latest && palettegen
# or, from a checkout:
make run          # generate, build browser assets, build server, run
# serving on http://localhost:8383   (override with PORT=...)
```

Working on the source requires Go ≥ 1.26 and the goml tool:
`go install goforge.dev/goplus/cmd/goml@v0.158.0`.
The committed browser assets are built with Go 1.26.5; use that version for
the deterministic browser-asset check in `make ci`. Browser builds exclude
checkout-specific VCS metadata so committing or using a worktree does not
change the embedded Wasm.

- `make check` — run the goml-native self-checks (`./palettegen check`)
- `make ci` — verify committed generated code is fresh, build, and check
- `make data` — regenerate `palette/data.goml` from `tools/palettes.json`
- `make wasm` — build the interactive static demo under `try/`
- `make browser-check` — browser acceptance checks (Node, npm, OpenSSL,
  Chrome, and Playwright WebKit; install WebKit with
  `tools/node_modules/.bin/playwright install webkit` after `npm --prefix tools ci`)
- `make fonts` — refresh embedded web/PDF fonts and their OFL licenses

Deployment is one self-contained binary with embedded fonts, Wasm, and its
small JavaScript bootstrap/runtime bridge; there is no database.
Palette state lives in the URL (`/?c=7C3AED&s=E87924` or `/?p=12`, plus `&t=light|dark` for
an explicit color scheme), so pages, JSON (`/palette.json?...`) and PDFs
(`/palette.pdf?...`) are all cacheable GETs.

The page itself follows the OS light/dark preference by default
(`prefers-color-scheme`); the header toggle pins it explicitly. The goml/Wasm
enhancement updates results without reloading, retaining your picture and
draft colors while changing themes. Native GET forms, hex inputs, curated
palettes, themes, and downloads also work without JavaScript. Besides the
swatch scales, the palette is shown in context six ways (cards on light and
dark grounds, semantic alerts, text hierarchy, navigation, forms and focus),
and a collapsible block offers the JSON for copy-paste next to the download
buttons.

## Secondary brand color and picture picking

The optional secondary has its own ten-shade scale. It never replaces the
complementary accent or changes the primary's matched neutrals. Exact input
hex values survive in the generated scales, HTML, JSON, and PDF. Similar-hue
or duplicate-color guidance is advisory; brand choices are never silently
adjusted. Curated palettes with a secondary are labeled customized.

**Pick from a picture** is visible above **Or choose colors manually**.
Upload from your device, drop an image file, paste with Cmd/Ctrl+V, use the
**Paste image** button, or expand **Use an image link** for a direct HTTPS URL.
The manual path offers a color picker and hex input independently of pictures.
The picture replaces the upload prompt in the same frame. Replacement options
collapse under **Change picture**, and the frame still accepts another drop.
Tap the picture or a suggested color to preview it in the magnified pixel
grid, then choose **Use as Primary** or **Use as Secondary**. A fresh source
selection does not change either palette color. Once assigned, tapping or
dragging in that grid (or using arrow keys) fine-tunes the assigned role live.
Selecting the exact color of one existing role also links fine-tuning to that
role. If both roles use that color, choose the role explicitly. The visible
label distinguishes an unassigned preview from fine-tuning Primary/Secondary.
The grid stays fixed while you explore it. Another picture spot or suggestion
starts a fresh preview. Pinch to zoom the picture, drag to pan, or use +/− and
**Fit**. Trackpad pinch and keyboard +/−/0 also navigate; Shift+arrows pan,
while plain arrows refine a pixel. Navigation never assigns a color.

Every valid assigned or manual color change updates the palette immediately.
**See palette** takes you to the result; **Edit colors** returns to picture/manual
color selection. Their bar also contains **Undo**, **Redo**, and **History** and
pins to the top once you scroll past it. On compact screens, the navigation
labels shorten to **Edit** and **Palette**. **Examples** (**Demos** on phones)
jumps to the in-context UI examples; all six toolbar buttons retain full touch
targets. Navigation focuses the destination below the pinned rows and retains
your picture and colors. There is no Generate step. Remove picture stays near the
sampling area, and **Remove secondary** sits beside the Secondary control.
The picture stays available across edits, themes, and history changes.

The **Download PDF / Download JSON** row also pins after you scroll past it,
directly below the workspace bar, and returns to its place below the palette
title when you scroll back up. The row is transparent, with 13px of space above
and below the buttons and no divider beneath either pinned row. The buttons have solid
backgrounds so their labels stay readable over the palette. It exports the
current palette while pinned.

A narrow live palette preview sits in the right margin on screens at least
1280px wide. Each strip blends through the scale's actual ten shades; hover or
focus reveals its role and name, and selecting it jumps to the full scale.
On smaller screens, **Palette preview** opens the overview by the palette
heading. It stays current through edits, history, undo, and role removal.

**Add a secondary color** immediately applies the displayed picker color and
updates the palette as one undoable edit. Expanding/collapsing an existing
secondary only changes field visibility; undoing Add restores the absent,
collapsed state.

A collapsed secondary-color row keeps the chosen swatch visible and provides
its own **Remove** button. Expanding the row hides that duplicate action and
keeps removal beside the fields. Undo restores both the color and its summary.

**Undo**, **Redo**, and **History** remain available while editing or viewing
the palette. A completed drag or field edit is one undo step; history also
keeps intermediate palettes and explored colors, including abandoned redo
branches. Restore a palette or apply a previous color to either role. The tab
retains up to 100 undo states, 150 unique palettes, and 256 unique colors in
session storage, including across reloads when storage is available. Images
are not stored. See [UX_CHOICES.md](UX_CHOICES.md) for the decisions and rationale.

Assigning a primary or secondary shows its role, swatch, and hex in a green
confirmation for four seconds. The input retains the selection afterward;
screen readers receive the same confirmation. Pairing cautions are amber,
errors are red, successful operations are green, and loading/neutral guidance
has a quieter treatment, with text labels as well as color.

The header contains only **PaletteGen** and theme controls. Version,
installation, and project links live in the footer's **About PaletteGen**.

Images are processed on your device and are not uploaded to the server or
included in share URLs. Web images are fetched without credentials and must
allow browser cross-origin access; blocked sources get an inline explanation.
Device uploads work independently of source-website permissions.
Clipboard contents are read only on an explicit paste gesture or button press.
The button depends on browser clipboard support/permission (HTTPS or localhost);
normal text pastes into hex and URL fields are left unchanged. Clipboard
failures retain the existing picture and explain how to continue.

Files are limited to 20 MB, orientation is honored, and large images are
normalized to a maximum 2048px edge for sampling. Analysis uses a maximum
256px bitmap and deterministic weighted median-cut extraction. Partial
transparency is composited over the visible white backdrop; fully transparent
pixels are excluded from suggestions. Supported formats depend on the browser
(PNG, JPEG, and WebP are common; unsupported formats get a helpful message).

## Goml application, minimal browser bridge

Every line of application code is `.goml`; each `*_gml.go` file beside it is
generated by `goml gen` (committed, per the toolchain's convention — run
`goml gen -check ./...` in CI to keep them honest). There are no hand-written
`.go` or `.gp` files. Browser event handling, fetching, sampling, history, and
generation also live in goml in `_browser/`, compiled explicitly for js/wasm.
JavaScript is limited to loading Wasm and Go's supplied runtime shim, plus
build/test tooling. Important details:

- **Data as code**: the book's palettes live in `palette/data.goml`
  (generated once by `tools/gen_data.py` from the extraction in
  `tools/palettes.json`). Only hex strings are stored; HSL is recomputed at
  startup by the goml `ParseHex`, which the extraction validated to within
  the book's own rounding (±1).
- **Tests as goml**: `web/check.goml` includes property checks using
  `testing/quick`; `palettegen check` exits non-zero on failure. Browser tests
  exercise both deployments in Chromium and touch-enabled WebKit, including
  a real second HTTPS origin for CORS failures.
- **Fonts as code**: Overpass (headings), Atkinson Hyperlegible (body and
  controls), and Atkinson Hyperlegible Mono (code and hex values) are embedded
  in `web/fonts.goml` and `palette/pdf_fonts.goml`. Web WOFF2 and PDF TrueType
  subsets use the same fonts; OFL licenses are in `LICENSES/`.
- **Browser assets as code**: `tools/gen_browser.py` embeds a deterministic
  gzip payload in `browserassets/`, which only the native server imports.
  Modern browsers fetch the compressed Wasm; a raw-Wasm option supports
  browsers without `DecompressionStream`. No asset download depends on a CDN.

The one goforge tool deliberately *not* used is the cadence/Quicken web
framework: its API needs generic struct literals and slice→variadic spread,
which goml v0.158 has no syntax for — so serving is goml driving `net/http`
directly, which it does natively.

## How generation works (the Refactoring UI method)

1. Your color is parsed to HSL and matched to the nearest of the book's 26
   hand-tuned reference scales (hue distance, saturation class as
   tie-break).
2. The seed scale is re-anchored: your color lands exactly on the shade
   nearest its lightness; hue rotates uniformly; saturation and lightness
   corrections fade toward the scale's ends, so the book's usable-as-text
   darks and tinted-background lights survive.
3. Neutrals are the book's grey family matching your hue's temperature
   (warm → Warm Grey, greens/yellows → Grey, blues → Blue Grey,
   purples → Cool Grey).
4. Supporting = a complementary accent generated the same way, plus the
   book's semantic Red/Yellow/Green scales (vivid or muted to match your
   saturation), skipping any that would duplicate the primary hue.
5. An optional secondary is anchored independently into its own scale;
   adding or changing it leaves those other categories intact.

## Design notes

- **UX (Joe Natoli)**: one screen, one purpose; a useful default palette on
  first load (zero decisions needed); labeled in plain words; the primary
  action is the only loud thing on the page; bad input degrades to a
  helpful note, never a dead end.
- **UI (Leonardo da Vinci)**: simplicity as sophistication — whitespace,
  one column, soft shadow depth instead of borders; spacing on a
  Fibonacci scale, type on a golden-ratio ramp (16/26/42).
- **UI (Patrick Henry Winston)**: corrective decisions in [UX_CHOICES.md](UX_CHOICES.md)
  put a fence around each idea: the failure to avoid, the behavior to adopt,
  and its principle and limits. Stable landmarks (Primary / optional Secondary
  / Neutrals / Supporting), role captions, swatches, previews, and exports
  help make the palette understandable.
- The app's chrome wears the palette it is showing: page background, text,
  buttons, links, focus rings and shadows are all derived from the selected
  palette's neutral and primary scales (in both color schemes). The default
  landing therefore dresses the site in the book's Palette 1 — and every
  generated palette is instantly test-driven by the very page presenting it.

## Sources

Palettes and method from *Refactoring UI* and *Refactoring UI: Color
Palettes v1.1.0* (Adam Wathan & Steve Schoger). PDF rendering via
`codeberg.org/go-pdf/fpdf`.

Part of the [goforge](https://goforge.dev/) suite. MIT licensed.
