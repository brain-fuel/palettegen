# Palette Forge

- Before starting any UI work, and immediately after every context compaction
  during UI work, inspect `~/para/projects/ui/refactoring_ui/chapters/README.md`
  and reread the relevant chapters and illustrations. The initially supplied
  `~/para/projects/goforge/ui/refactoring_ui` path does not exist; the reference
  is in `~/para/projects/ui/refactoring_ui`.
- Apply its guidance on primary versus accent colors, action hierarchy,
  spacing, mobile layouts, and user-uploaded images to this application's UI.
- Read and maintain `UX_CHOICES.md` for the task flow, live updates, session
  recovery, gesture behavior, and the principles behind these decisions.
- Record every corrective UX decision using PHW's fence structure: outside
  (the failure or alternative to avoid), inside (the adopted behavior), and
  the principle/context/limits. Distinguish observed corrections from preventive
  guardrails, and preserve relevant history when a boundary changes.
- Author application behavior in `.goml`; regenerate committed `*_gml.go`
  with goml v0.158.0. JavaScript is limited to the Wasm bootstrap/runtime bridge
  and test/build tooling.
- Keep primary, optional secondary brand color, complementary accent, and
  semantic colors distinct. Upload is a first-class image source.
- Put the visible picture picker before the clearly labeled manual color
  path. Keep the header minimal; tuck project/install details into About.
- Support image clipboard paste and confirm primary/secondary assignments
  with a brief notification. Use labeled semantic tones for guidance and
  outcomes (warnings, errors, successes, and neutral information).
- Show the image in the upload frame. Update palettes live, preserve session
  palette/color history, and keep removal and history actions near sampling.
- Keep the header to Palette Builder and theme controls. Group Change/Remove
  picture on one row; omit routine instruction paragraphs. Keep the loaded
  editing task in view at 375x548 and 320x568 without shrinking touch targets.
- Picture gestures zoom/pan without sampling; provide +, − and Fit controls.
- A new picture spot or suggestion previews a color without changing the
  palette. Explicit assignment links subsequent grid refinement to that role;
  never inherit the previously used role when selecting another source color.
- Use Overpass for headings, Atkinson Hyperlegible for other UI text, and
  Atkinson Hyperlegible Mono for code/hex values, including PDF exports.
- Verify native checks, generated-code freshness, the browser Wasm target,
  and mobile interaction before reporting UI work complete.
