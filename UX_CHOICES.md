# UX choices

This is the decision log for PaletteGen. It applies
Joe Natoli's task-focused UX principles and *Refactoring UI*, using the
Patrick Henry Winston (PHW) “put a fence around the idea” structure requested
by the user. These are our applications, not claims that these authors
prescribed this exact interface.

## How to record a correction

Every corrective decision must show both sides of the fence:

1. **Outside — avoid:** name the concrete failure or misleading alternative.
   Include its trigger and consequence when those explain the correction.
2. **Inside — adopt:** describe the behavior we want, including what the user
   does and what the interface changes.
3. **Principle and boundary:** explain why this helps, where it applies, and
   the limit that prevents an overcorrection.

The outside column includes observed problems and preventive guardrails;
it does not claim every excluded behavior shipped. The superseded patterns
listed later identify approaches we actually replaced. When revising a
decision, update its current fence and preserve the relevant history.

## The task and its flow

Help someone turn a picture or chosen brand colors into a usable UI palette.
The flow is **choose a source → preview a color → assign its role → fine-tune
→ view the live palette → export**. Secondary colors and extra precision are
optional; there is no required generation step.

| Outside the fence — avoid | Inside the fence — adopt | Principle and boundary |
| --- | --- | --- |
| Introductory copy and project metadata consume the top of the screen before the user can work. | Keep **PaletteGen** and Auto/Light/Dark in the header. Put installation, version, and project links in About. | Natoli: prioritize the task. Remove purpose text that the visible controls already communicate; retain labels that explain an actual choice. |
| Burying picture picking below manual fields makes it easy to miss; emphasizing pictures alone makes a picture seem required. | Put the visible picker first, followed by **Or choose colors manually**. | Discoverability with a clear alternative. Picture-first does not mean picture-only. |
| A loaded picture appears elsewhere while an empty upload panel still occupies the original frame. | Replace **Choose File / drop here** with the picture in that same frame. | Spatial continuity: the input area becomes the working area. Keep replacement available without retaining a duplicate empty panel. |
| Expanded replacement inputs compete with the loaded picture, or disappear so completely that replacement is hard to find. | Collapse them under **Change picture**; dropping another picture onto the same frame also replaces it. | Progressive disclosure: hide secondary setup, keep its entry point visible. |
| Requiring one input method makes users recreate their starting situation; treating upload as an inferior fallback discourages it. | Support device upload, drop, explicit clipboard paste, and direct image links as legitimate paths. | Support the user's starting point. Browser permissions and source access still apply. |
| A fixed, unzoomable picture prevents inspection; arbitrary image dimensions break the layout; permanent cropping or overlaid controls hide pixels. | Initially fit the whole picture in a bounded viewport. Provide pinch, +/−, Fit, drag pan, trackpad pinch, and keyboard navigation, with controls outside the image. | Constrain the display, preserve access to the source. Fit restores the whole picture; zooming changes the view, not the sampled image data. |
| Change and Remove picture occupy separate vertical regions or a status card separates the picture from fine-tuning. | Put **Change picture** and **Remove picture** on one row directly below the image. | Group actions on the same object at the point of need. A relevant error may still need its own visible message. |
| Individually spacious components push assignment below the screen; shrinking targets or clipping content merely disguises that problem. | Size the image to available height and place the magnifier and assignment controls directly below it, with 44px targets. | Optimize the complete small-screen task. Remove redundancy and excess spacing first; keep scrolling available for exceptional content and accessibility needs. |

## Exploring and selecting colors

| Outside the fence — avoid | Inside the fence — adopt | Principle and boundary |
| --- | --- | --- |
| A passive sample is unusable for selection, a moving magnifier makes targets shift, or sampling reads the drawn grid/crosshair. | Tap the picture to locate an area, then click, tap, or drag across actual pixels in a fixed magnified grid. | Precision requires a stable target and the source pixel's value. The grid stays fixed during refinement; another picture spot selects another area. |
| Navigation pans or zooms and then assigns a color on release; the same drag has unclear effects across surfaces. | Drag/pinch navigates the picture; dragging the magnifier scrubs pixels; the rest of the page scrolls normally. Suppress selection clicks produced by navigation. | Give each surface a consistent gesture. The picture owns navigation gestures locally; it does not trap scrolling elsewhere. |
| After assigning Primary, selecting a new color intended for Secondary silently overwrites Primary because the old mode persists. | A new picture spot or suggestion populates the grid as **Preview · not assigned**, leaving both roles alone. | Natoli: exploration should have predictable consequences. Fresh selection is a preview; it never inherits the previous assignment target. |
| Buttons merely choose a mode for future samples, forcing users to remember that mode, or act without a usable sample. | **Use as Primary** and **Use as Secondary** assign the displayed preview immediately. Disable them when there is no visible sampled color. | Explicit verbs describe an action on the current selection. The user chooses the destination after seeing the color. |
| Every tiny adjustment requires assignment again, or refinement silently affects the wrong role or both roles. | After assignment, grid tapping/dragging and arrow keys update only the linked role live. Show **Fine-tuning Primary/Secondary** and its pressed assignment button. | Keep refinement immediate and its destination visible. The link belongs to that selection; another picture spot starts a fresh preview. |
| Re-selecting an existing role adds needless confirmation, while matching both roles leads the app to guess. | An exact match to one role links refinement to it; a match to both requires explicit assignment. | Honor an unambiguous existing selection. Selecting it alone changes neither color. |
| Undo, manual edits, removal, or replacement leave a stale link that can overwrite recovered work; focusing a manual field redirects the grid. | Clear the link when its role no longer contains the last assigned sample, and on picture replacement. Manual focus does not redirect it. | Selection state must remain valid after other actions. Retain the link only while its relationship to the assigned value still holds. |
| A Generate step interrupts exploration, repeated export work stalls dragging, or removing Generate makes every unassigned preview mutate the palette. | Update valid assigned/manual changes live, coalesce refinement to animation frames, and generate static PDF downloads on demand. | Immediate feedback follows an actual edit. Live propagation does not erase the distinction between preview and assignment. |
| Users scroll away from sampling to find undo, history, removal, or the next meaningful action. | Keep undo/redo, history, and **Palette** near the editor; keep picture removal beside the picture. | Natoli: put actions at their point of need. These controls support the current task without automatically moving the user away from it. |
| Removing Secondary requires a trip down to the manual fields. | Place **Remove secondary** beside its sampling control as well as in the manual fields; update the palette immediately. | Keep a reversible action beside the object it affects. Removing a role must also invalidate its refinement link. |
| Routine paragraphs such as “Preview only. Use a button below…” repeat the buttons and consume editing space; removing all feedback would conceal failures. | Keep the short preview/role label, explicit buttons, and assignment confirmations. Show relevant errors, warnings, and loading; announce picture-ready success without occupying space. | Remove redundant explanation, preserve necessary state and exceptional feedback. Concision is not silence about a problem. |
| A secondary brand color replaces the complementary accent, or brand choices redefine success/warning/error meanings. | Keep Primary, optional Secondary, the complementary accent, and semantic scales separate. | Refactoring UI: distinguish brand roles from accents and status. A non-complementary secondary remains an additional brand role. |
| Rounded conversions alter a chosen hex value, so inputs, scales, and exports disagree. | Preserve the exact chosen hex and generate a full scale around it, consistently in HTML, JSON, and PDF. | Respect explicit brand choices. Surrounding shades may be generated; the chosen anchor remains authoritative. |
| A two-color title names only the primary, leaving the secondary as an unexplained hex, such as `Magenta #BA2C86 + #26E8C1`. | Name both bases with their color names and exact hex values: `Magenta #BA2C86 + Teal (Vivid) #26E8C1`. Use that shared title in the UI, JSON, PDF, and download names. Customized curated palettes also name their primary colors while retaining the palette number. | Give both brand choices equal descriptive treatment. Naming adds meaning without changing colors, assigning a role, or replacing the separate complementary accent; single-color titles stay unchanged. |

## Feedback, recovery, and history

| Outside the fence — avoid | Inside the fence — adopt | Principle and boundary |
| --- | --- | --- |
| Every message looks alike, brand colors obscure status, or hue similarity is treated as a forbidden/aesthetically bad choice. | Use advisory amber pairing cautions, red failures, green success, and quieter neutral/loading feedback, with text labels for meaning. | Explain consequences and continuation. Color reinforces meaning rather than carrying it alone; guidance never silently changes a brand choice. |
| Assignment succeeds without acknowledgement, stale success makes a new preview seem assigned, or every drag movement creates a notice. | Confirm assignment/completed refinement with role, swatch, and hex for four seconds; announce it accessibly and retain the input value. Clear the notice for a new source preview. | Feedback describes the action that happened. Confirm at a completed gesture, not on every pixel movement; previews do not claim success at assignment. |
| Undo requires dozens of steps for one drag, or grouping that drag loses an intermediate color the user liked. | Treat each completed drag/field edit as one undo step; also keep intermediate rendered palettes and explored colors in their journals. | Recovery should match user actions while retaining finer-grained exploration. Undo and history serve related but different recovery needs. |
| Trying a new direction destroys an abandoned redo branch that contained a desirable palette. | Preserve those palettes in history after the redo timeline branches. | Exploration should remain recoverable. An abandoned branch can leave Redo without disappearing from palette history. |
| History vanishes on ordinary reload, grows without bound, or implies permanent storage/account backup. | Retain up to 100 undo states, 150 recent unique palettes, and 256 recent unique colors in the tab's session, across reloads when storage is available. | Bound storage and set honest expectations. This is session recovery, not a permanent archive. |
| Restoring colors discards the picture or makes the user repeat setup. | Restore a palette or apply a history color to the selected role while retaining the working picture. | Recovery preserves the source during the session. The image itself is not persisted across reloads. |
| Each live update scrolls the page to the result, pulling the user away mid-gesture. | Update in place; let **Palette** explicitly move focus and attention to the result. | Showing an edit's effect does not imply permission to navigate. User-requested result navigation remains available. |
| A bad upload/link/paste destroys usable work, or handling image paste hijacks an ordinary text paste. | Keep the previous usable picture and colors on failure, explain the problem, and leave plain text paste alone. | A failed or unrelated action should not discard work or take over another task. |

## Consistency and implementation constraints

| Outside the fence — avoid | Inside the fence — adopt | Principle and boundary |
| --- | --- | --- |
| Observed: the app, loading shell, documentation, and project catalog used different product names. | Use **PaletteGen** consistently for the product, including the header, About, browser title, loading shell, and goforge.dev catalog. Keep `palettegen` for commands, module paths, URLs, and filesystem names. | One product identity makes the installed app and browser app recognizable. This supersedes the earlier split naming; descriptive palette titles still identify the selected colors. |
| Preventive guardrail: changing a storage namespace discards recoverable palettes, or leaving both namespaces active lets them diverge. | Save under `palettegen/session/v1`; migrate an existing session once and remove its obsolete key only after a successful write. Prefer current data if both keys exist. | A naming cleanup must preserve the session recovery contract. The old key remains solely as an input for migration; unavailable storage still permits normal editing. |
| Inconsistent typography makes headings, prose, and color/code values harder to distinguish, or exports diverge from the UI. | Use Overpass headings, Atkinson Hyperlegible UI text, and Atkinson Hyperlegible Mono code/hex/HSL, including PDF exports. | Give each kind of content a consistent readable treatment across outputs. |
| Compactness is achieved with tiny targets, hidden focus, unreadable inputs, or sideways page overflow. | Keep generous touch targets, visible keyboard focus, readable input sizes, and the existing spacing system. | Density must support use, not just fit a screenshot. Preserve page zoom and access to every control. |
| A bright sampled brand makes control labels/outlines disappear, or fixing that changes the user's actual palette. | Use deeper brand ink in light mode and lighter ink in dark mode, with neutral fallback when contrast is insufficient. | Interface readability and palette content are separate responsibilities. Adjust control ink, not the selected colors. |
| Image contents leak into share URLs/session history, or clipboard reads happen without an explicit paste action. | Process pictures on the device, store/share palette state without image contents, and read the clipboard only on a paste gesture or button press. | Respect the scope of the user's action. A direct image URL still fetches from its source; this is not a claim of zero network activity. |
| A blocked web image is presented as an unexplained failure, or device upload is described as a lesser workaround. | Explain browser/source access limits in context and keep upload available as an equal input path. | Support valid alternatives without promising access that a source has not granted. |
| Server and static versions drift, or live enhancement leaves native color selection unusable when unavailable. | Share goml/Wasm palette/rendering behavior; retain native GET forms with **Apply colors** without enhancement. | Consistency across deployments. The fallback Apply action does not reintroduce Generate into the enhanced workflow. |

Before UI work and after context compaction, review this log and the relevant
local Refactoring UI chapters/illustrations. The reference is at
`~/para/projects/ui/refactoring_ui/chapters/README.md`; the originally supplied
path containing `/goforge/ui/` does not exist. This review is required by the
user to prevent later edits from losing the context behind these boundaries.

## Superseded approaches: fences that changed

These pairs record implemented approaches that were corrected. Their detailed
current boundaries are in the tables above.

| Previously inside, now outside — avoid | Current inside — adopt | Reason for changing the fence |
| --- | --- | --- |
| A separate Generate palette action. | Live assigned/manual updates with recovery history. | Exploration required an unnecessary commit step and could lose a palette the user passed. |
| A separate picture preview below the empty upload panel. | One shared upload/picture frame. | The empty panel wasted space and broke spatial continuity. |
| A passive magnified swatch. | An interactive, fixed pixel grid. | The displayed detail could not itself be used to choose a pixel. |
| Actions at the bottom of all image content. | Nearby assignment, removal, history, and deliberate palette navigation. | Users had to scroll away from the object they were editing to complete or reverse the action. |
| A remembered Primary/Secondary sampling mode. | Preview first, explicitly assign, then refine that selection live. | Selecting a prospective Secondary overwrote Primary because the old mode persisted. |
| A purpose sentence and a routine picture status card. | A compact header, short selection state, and controls that explain their actions. | Repeated explanation pushed the actual task off small screens. |
| Ordinary page scrolling on the picture itself. | Picture-local zoom/pan; ordinary scrolling elsewhere. | Direct image navigation became an explicit requirement. This change is local to that surface, not a general ban on page scrolling. |

## Small-screen baseline

Use the iPhone SE (3rd generation) as a compact mainstream baseline, not a
claim that it is the smallest phone sold anywhere. Apple's [specifications](https://support.apple.com/en-gb/111866)
give its 750×1334 display; at 2× density the layout is 375×667 CSS pixels.
It remains [commercially listed as pre-owned](https://www.target.com/c/unlocked-cell-phones-electronics/apple-iphone-se-3rd-generation-/-/N-5xte3Zq2ijaqkvvm9).
Test **375×548** too, reserving vertical room for browser controls, plus a
conservative **320×568** layout and **412×780** for the user's Pixel 6 with
browser space reserved. These are layout test viewports, not claims about
every browser's exact available height.

| Outside the fence — avoid | Inside the fence — adopt | Principle and boundary |
| --- | --- | --- |
| Testing only on desktop or treating the full phone display as available browser space. | From scroll position zero at the viewports above, keep the loaded picture, +/−/Fit, Change/Remove picture, grid, both assignment buttons, and Remove secondary in view. | Test the complete normal task with browser space reserved, not only individual component widths. |
| Forcing everything into that area by clipping errors, enlarged text, replacement options, or controls. | Let long errors, expanded replacement options, larger user text, and landscape use page scrolling when needed. | The fit target applies to the normal portrait editing state. Accessibility and exceptional content remain usable outside that target. |

## Verification

Check both server and static demo in desktop Chromium and touch-enabled
WebKit. Verify the compact viewports above, source-coordinate accuracy after
zoom, two-pointer zoom in/out, pan, keyboard navigation, Fit, no assignment
from gesture release, and 44px targets. Cover preview without palette changes, explicit assignment, isolated
refinement of each role, exact-match and ambiguous selections, stale-link
clearing after manual edits/removal/undo, exact pixel selection, drag scrubbing, viewport-edge pixels,
undo/redo, history recovery after branching and reload, clipboard failures,
retained images, removal actions, lazy exports, and narrow mobile layouts.
