# UX choices

This is the decision log for Palette Forge. These are applications of Joe
Natoli's task-focused UX principles and *Refactoring UI*, not quotations or
claims that either author prescribed this exact interface.

## The task and its flow

Help someone turn a picture or chosen brand colors into a usable UI palette.
The flow is **choose a source → preview a color → assign its role → fine-tune → view the live palette →
export**. Secondary colors and extra precision are optional; there is no
required generation step.

| Choice | Principle and reason |
| --- | --- |
| Keep only **Palette Builder** and Auto/Light/Dark in the header. Remove the introductory sentence. Put installation, version, and project links in About. | Natoli: prioritize the user's task over information about the product. The visible picker and manual controls already explain the purpose; repeating it consumes the working area. |
| Put the visible picture picker above a separately labeled **Or choose colors manually** path. | Make capabilities discoverable without implying a picture is required. Labels explain the user's available actions. |
| The picture replaces **Choose File / drop here** in the same frame. Do not leave a second empty upload panel. | Maintain spatial continuity and remove wasted space. The upload frame becomes the workspace. |
| After loading, collapse replacement inputs into **Change picture**. Dropping another picture onto the same frame also replaces it. | Progressive disclosure: keep the current task visible while retaining an obvious way to change the source. |
| Upload, drop, clipboard paste, and direct image links are legitimate input paths. | Support the user's starting situation. Upload is a first-class choice, not merely recovery from blocked web access. |
| Initially fit the complete picture in a bounded viewport. Support two-finger pinch, +/−, Fit, drag panning, trackpad pinch, and keyboard navigation. Keep zoom controls outside the image. | Refactoring UI: constrain uploaded content. Inspection needs zoom without cropping the source or covering pixels with controls. Fit restores the whole image in one action. |
| Put **Change picture** and **Remove picture** on one row immediately below the image. | Group actions on the same object. Eliminate a separate status/removal card between the image and precision controls. |
| Size the image to the available screen height and keep the magnifier and assignment buttons directly below it. Preserve 44px action targets. | Design around the complete task on a small screen, rather than optimizing each component independently. Reduce redundant content and spacing before shrinking targets. |

## Exploring and selecting colors

| Choice | Principle and reason |
| --- | --- |
| Tap the picture to locate an area; click, tap, or drag over individual magnified squares to choose a pixel. Keep the magnified window fixed during that interaction. | Provide precision without a moving target. Read the source pixel, not the crosshair or grid drawn over it. |
| Thumb dragging scrubs pixels inside the magnifier. Picture gestures navigate the image: drag pans and two fingers zoom. The rest of the page scrolls normally. | Give each working surface a consistent gesture. Navigation never samples a color or changes either role, including the click generated on gesture release. |
| A new picture spot or suggestion populates the pixel grid as **Preview · not assigned**. It leaves both palette roles alone. | Natoli: support exploration without unintended consequences. Avoid the mode error where a remembered Primary target overwrites it while the user searches for Secondary. |
| **Use as Primary** and **Use as Secondary** assign the displayed preview immediately. Disable them when there is no visible sampled color. | Explicit verbs make each button's consequence clear. Assignment is an action on the current selection, not a mode the user must remember before selecting. |
| Once assigned, grid tapping/dragging and arrow keys update only that role. Show **Fine-tuning Primary/Secondary** and its pressed assignment button. | Preserve immediate feedback during deliberate refinement, with persistent visible state. Another picture spot or suggestion starts a fresh preview instead of carrying this link forward. |
| Selecting a color already used by exactly one role links refinement to that role. If both roles match, require explicit assignment. | Honor an existing selection without an unnecessary extra step; avoid guessing when the intended role is ambiguous. No color changes merely because it was selected. |
| Manual edits, removal, and history recovery clear a refinement link if that role no longer contains the last assigned sample. A new/replaced picture also clears it. | Prevent stale selection state from overwriting recovered or manually edited work. Focusing a manual field does not redirect an existing grid selection to another role. |
| Update a valid palette on every assigned or manual color change. Coalesce continuous refinement work to animation frames, and create static PDF downloads on demand. | Immediate feedback supports exploration. Avoid an extra Generate decision and keep dragging responsive. Unassigned previews remain local to the picker. |
| Keep undo/redo, session history, and the palette-view action near the editor; keep Remove picture available while sampling. | Natoli: place actions at the point of need instead of making the user scroll to find the next step. |
| Put **Remove secondary** beside the Secondary sampling control as well as in the manual fields. | Keep a reversible action beside the thing it affects. Removing a secondary updates the palette immediately. |
| Remove routine instructional/status paragraphs, including “Preview only. Use a button below…”. Retain the short preview/role label, explicit assignment buttons, and selection confirmations. Errors, warnings, and loading remain visible when relevant; picture-ready success is announced without taking space. | The controls should communicate their own consequences. Keep necessary state and exceptional feedback while reducing repeated instructions and attention cost. |
| Primary and optional secondary are brand roles; the complementary accent and semantic scales remain separate. | Refactoring UI distinguishes brand colors from accents and status colors. A non-complementary secondary is not a replacement for the complementary accent. |
| Preserve chosen hex values exactly and generate a complete scale around each. | Respect an explicit brand choice; input labels and exported colors must agree. |

## Feedback, recovery, and history

| Choice | Principle and reason |
| --- | --- |
| Pairing hints are advisory. Similar/duplicate hues use amber, failures red, successful actions green, and neutral/loading information a quieter treatment. Every tone also has a text label. | Explain the consequence and how to continue. Color supports meaning rather than being its sole carrier. Do not declare a palette aesthetically good or bad merely from its hue relationship. |
| Confirm assignment or completed refinement with its role, swatch, and hex for four seconds. Previewing a different source clears the old notice and never claims the palette changed. Keep assigned values in the inputs and announce confirmations to screen readers. | Feedback must describe the action that actually happened. Avoid stale success messages that make a preview look like an assignment. Continuous scrubbing does not produce a notice on every movement. |
| Undo treats a completed drag or field edit as one gesture. Palette history also keeps intermediate rendered palettes; color history keeps the colors explored along the way. | Make exploration reversible without forcing users to undo dozens of pixel movements individually. A color passed during a drag can still be recovered. |
| Preserve abandoned redo branches in palette history. | Trying a new direction must not erase an earlier palette the user liked. |
| Keep up to 100 undo states, 150 recent unique palettes, and 256 recent unique colors in the tab's session. Retain them across reloads where session storage is available. | Bound memory and storage while offering useful session recovery. There is no account or permanent archive implied. |
| Restore an earlier palette or apply a history color to the chosen role. Keep the image available while doing so. | Recovery should not destroy the user's source or require them to repeat setup. |
| Palette updates do not move the page while the user is sampling. **Palette** explicitly moves attention to the result. | Immediate output and deliberate navigation are different actions; do not jump away from an active gesture. |
| Errors retain the previous usable picture and colors. Plain text paste is left alone. | A failed or unrelated action should not discard work or hijack another task. |

## Consistency and implementation constraints

- Overpass headings; Atkinson Hyperlegible for other UI text; Atkinson
  Hyperlegible Mono for code, hex, and HSL. Use the same families in PDFs.
- Use generous touch targets, visible keyboard focus, readable input sizes,
  no sideways page overflow, and the existing spacing system.
- Use deeper brand shades for control text and outlines in light mode, and
  lighter shades in dark mode, falling back to neutral ink if the brand shade
  has insufficient contrast. Bright sampled colors must not make navigation
  labels fade into the surface; the selected palette's actual colors stay intact.
- Images stay on the user's device. Session history and share URLs contain
  palette/color state, not image contents. Clipboard access happens only on
  an explicit paste gesture or button press.
- Web links need the source's browser-access permission. Explain a blocked
  link in context without presenting upload as an inferior fallback.
- The server and static demo share goml/Wasm behavior. Native GET forms use
  **Apply colors** when browser enhancement is unavailable.
- Before UI work and after context compaction, review the local Refactoring UI
  reference and this log. The reference is at
  `~/para/projects/ui/refactoring_ui/chapters/README.md`; the originally supplied
  path containing `/goforge/ui/` does not exist.

## Superseded choices

- A separate Generate palette action was replaced by live propagation.
- An additional picture preview below the upload panel was replaced by one
  shared upload/picture frame.
- A passive magnified swatch was replaced by an interactive pixel grid.
- Actions at the bottom of all image content were moved to the working area.
- Remembering a Primary/Secondary sampling mode was replaced by preview-first
  selection, explicit assignment, and refinement linked to that selection.
- The header's purpose sentence and the picture's routine status card were
  removed to keep the actual editing task on screen.
- Ordinary scrolling on the picture itself was superseded by direct image
  navigation; scrolling remains available elsewhere on the page.

## Small-screen baseline

Use the iPhone SE (3rd generation) as a compact mainstream baseline, not a
claim that it is the smallest phone sold anywhere. Apple's [specifications](https://support.apple.com/en-gb/111866)
give its 750×1334 display; at 2× density the layout is 375×667 CSS pixels.
It remains [commercially listed as pre-owned](https://www.target.com/c/unlocked-cell-phones-electronics/apple-iphone-se-3rd-generation-/-/N-5xte3Zq2ijaqkvvm9).
Test **375×548** too, reserving vertical room for browser controls, plus a
conservative **320×568** layout and **412×780** for the user's Pixel 6 with
browser space reserved. These are layout test viewports, not claims about
every browser's exact available height.

From scroll position zero with a picture loaded and a secondary assigned,
the picture viewport, +/−/Fit, Change/Remove picture, pixel grid, both assignment
buttons, and Remove secondary must all be in view. Long error messages,
expanded replacement options, larger user text, and landscape may need page
scrolling; never clip controls or disable page zoom to force a fit.

## Verification

Check both server and static demo in desktop Chromium and touch-enabled
WebKit. Verify the compact viewports above, source-coordinate accuracy after
zoom, two-pointer zoom in/out, pan, keyboard navigation, Fit, no assignment
from gesture release, and 44px targets. Cover preview without palette changes, explicit assignment, isolated
refinement of each role, exact-match and ambiguous selections, stale-link
clearing after manual edits/removal/undo, exact pixel selection, drag scrubbing, viewport-edge pixels,
undo/redo, history recovery after branching and reload, clipboard failures,
retained images, removal actions, lazy exports, and narrow mobile layouts.
