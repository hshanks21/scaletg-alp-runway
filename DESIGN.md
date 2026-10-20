

---
name: RUNWAY
description: A calm, dark task and project dashboard where green marks only what is alive. Progress, actions and selection get the color; everything else stays quiet.
colors:
  greenhouse-green: "#1D8837"
  fern-shade: "#187430"
  pine: "#135E27"
  sprout: "#3FA85E"
  night-soil: "#0D0F0E"
  potting-bench: "#141716"
  slate-leaf: "#1A1E1C"
  bench-hover: "#1F2321"
  mist-text: "#E8ECE9"
  sage: "#9AA59D"
  lichen: "#848D86"
  stone: "#7C8780"
  hairline: "rgba(232,240,234,.07)"
  hairline-strong: "rgba(232,240,234,.13)"
  sprout-wash: "rgba(63,168,94,.12)"
  sprout-edge: "rgba(63,168,94,.45)"
  rust: "#E0805C"
  rust-light: "#B4512C"
  amber: "#D9A441"
  heather: "#B76BA3"
  day-bg: "#F4F6F5"
  day-panel: "#FFFFFF"
  day-raised: "#F1F4F2"
  ink: "#1C221E"
  slate: "#4A544D"
  day-faint: "#5E665F"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "25px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
  summary:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Space Grotesk, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.05em"
  wordmark:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  pill: "20px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  xxl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.fern-shade}"
    textColor: "{colors.white}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.mist-text}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.bench-hover}"
  button-danger:
    backgroundColor: "{colors.rust-light}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "8px 18px"
  card:
    backgroundColor: "{colors.potting-bench}"
    rounded: "{rounded.lg}"
    padding: "14px"
  input:
    backgroundColor: "{colors.night-soil}"
    textColor: "{colors.mist-text}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  chip-status:
    backgroundColor: "{colors.slate-leaf}"
    textColor: "{colors.mist-text}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  view-tab:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    rounded: "{rounded.sm}"
    padding: "6px 22px"
  view-tab-active:
    backgroundColor: "{colors.slate-leaf}"
    textColor: "{colors.mist-text}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    rounded: "{rounded.md}"
    padding: "7px 8px"
  nav-item-active:
    backgroundColor: "{colors.slate-leaf}"
    textColor: "{colors.mist-text}"
  task-row-selected:
    backgroundColor: "{colors.sprout-wash}"
    textColor: "{colors.mist-text}"
  count-badge:
    backgroundColor: "{colors.sprout-wash}"
    textColor: "{colors.sprout}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
---

# Design System: Runway

## Overview

**Creative North Star: "The Quiet Greenhouse"**

Runway is a dark, calm workspace where almost everything is soil, glass and shade: near-black surfaces in gentle steps, hairline borders and soft gray text. Against that quiet, green appears only where something is alive: the action you can take, the task you've selected, the work that's done, the line marking today. When green shows up, it means something. A second warm voice, rust, appears only when something has slipped past its deadline.

It is an Operate surface: people live in it for hours, triaging and updating work. Familiar structure (sidebar, project header, list/board/timeline views, an on-demand detail panel) is a feature, not a compromise. Personality lives in precision rather than decoration: exact alignment, readable small type, one consistent language for lateness, and an interface that opens on "what needs me?" rather than a wall of metrics. The confirmed anti-references are the busy, saturated "everything is green" admin theme this system replaced, and stock metric templates (big-number tiles, rainbow per-person charts).

Both themes share the same rules. Dark is the default; the light theme swaps soil for paper and keeps green and rust in the same roles.

**Key Characteristics:**
- Charcoal base with a faint green undertone, in four tonal steps from page to hover
- Green reserved for actions, selection, completion, progress and focus
- Rust plus an alert icon plus words ("Overdue by 2 days") as the single signal for lateness
- Flat surfaces separated by hairlines and tone, never shadows at rest
- Neutral chips with small colored dots for priority and status
- Detail panel and filters revealed on demand; nothing permanent that isn't always needed
- Two typefaces with a tight scale and an 11px floor: Inter for the interface, Space Grotesk for data

## Colors

A restrained, near-monochrome charcoal palette with one living accent (green) and one warning accent (rust); every other hue is a small status dot.

### Primary
- **Greenhouse Green** (`greenhouse-green`): the brand green — the logo mark, and the light-theme accent for text, checks and underlines. Too bright for filled buttons on dark surfaces.
- **Fern Shade** (`fern-shade`): fill for primary buttons ("+ Add task", "Create task") with white text.
- **Pine** (`pine`): hover and pressed state for primary buttons.
- **Sprout** (`sprout`): the accent on dark surfaces. Used for the active-tab underline, completed checkmarks, the "Done" segment of the status bar, progress fills, the timeline's Today line, focus rings and link buttons. It reads 6:1 on panels.
- **Sprout Wash** and **Sprout Edge** (`sprout-wash`, `sprout-edge`): the selected-task fill and its 1px outline, selected member chips, and the focus halo around inputs.

### Secondary
- **Rust** (`rust`, light theme `rust-light`): overdue dates, the alert icon, "Overdue by N days," the late share of workload bars, the warning sidebar badge, and destructive buttons. It never appears without an accompanying icon or words.

### Tertiary (status dots only)
- **Amber** (`amber`): the "In progress" dot and status-bar segment.
- **Heather** (`heather`): the "Review" dot and status-bar segment.
- **Stone** (`stone`): the "To do" and "Low" dot, and neutral workload bars.

### Neutral
- **Night Soil** (`night-soil`): the page and app-shell background; also the fill inside inputs and calendar days, so fields read as recessed.
- **Potting Bench** (`potting-bench`): cards, panels, the project header and the sidebar's raised states.
- **Slate Leaf** (`slate-leaf`): raised elements on a panel, such as board cards, chips, the active tab, the active nav item, toasts and progress tracks.
- **Bench Hover** (`bench-hover`): the hover state for rows, nav items and ghost buttons.
- **Mist Text** (`mist-text`): primary text and task names.
- **Sage** (`sage`): secondary text (roles, inactive tabs and nav labels, section titles).
- **Lichen** (`lichen`): hints, column headers, metadata and placeholders. This is the faintest text allowed and still passes 4.5:1 on every dark surface.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): 1px borders and dividers; the strong variant is used for control outlines and hover.
- **Light theme neutrals**: `day-bg` page, `day-panel` cards, `day-raised` raised elements, `ink` text, `slate` secondary text, `day-faint` hints (4.5:1 on white).

### Named Rules
**The Living Green Rule.** Green marks only what is alive: the primary action, the current selection, completed or in-progress work, focus and today. It never decorates inactive elements, backgrounds or headings. If a screen has more than a handful of green elements, one of them is wrong.

**The Rust Means Late Rule.** Rust is reserved for overdue work and destructive actions. Lateness is always shown three ways at once (rust color, the alert icon, and words such as "Overdue by 2 days"), so it never depends on color alone.

**The Dot, Not Fill Rule.** Priority and status are neutral chips or plain text with a 6px colored dot. Never fill a chip, row or card with a status color.

## Typography

**Display Font:** Fraunces (editorial serif) — used for engagement titles (the `<h1>` on the engagement detail page, 600 / 25px / −0.01em tracking).
**Body Font:** Inter (with system-ui, sans-serif)
**Data Font:** Space Grotesk (numbers, fees, hours, dates)

**Character:** Three typefaces, three jobs. Inter carries the interface — headings, labels, body and buttons. Space Grotesk handles data — numbers, fees, hours and dates — in tabular figures. Fraunces (editorial serif) marks engagement titles. Hierarchy comes from size and weight steps, plus uppercase tracked labels for section titles.

### Hierarchy
- **Headline** (500, 16px, 1.3): project names, page titles ("Dashboard", "Activity"), the task title in the detail panel and dialog titles. Engagement titles (the `<h1>` on the detail page) use the Display Font (Fraunces, 600 / 25px) instead.
- **Summary** (400, 15px, 1.4): the one-line Overview summary ("4 of 11 done · 2 overdue · …"); the leading fact is bolded to 500 in Mist Text.
- **Body** (400, 14px, 1.5): the base size for the app shell, nav items (12.5px in the sidebar) and the description field.
- **Data** (Space Grotesk, 400, 12px, tabular figures): table cells, list rows, buttons, inputs, chips and legend items. Numbers align in columns.
- **Label** (600, 11px, 0.05em tracking, uppercase): section titles ("OVERDUE", "DETAILS"), column headers and field labels in the detail panel.
- **Wordmark** (600, 13px, 0.08em tracking, uppercase): reserved for a text logotype. The app shell currently shows the 40px logo mark alone, no text wordmark.

### Named Rules
**The 11px Floor Rule.** No functional text is ever smaller than 11px. That includes avatar initials, badges, column headers, calendar events and timeline labels.

**The Two-Weight Rule.** Text uses 400 for reading and 500 for emphasis. 600 is allowed only for uppercase labels and the wordmark.

## Layout

The app is a full-height shell (20px page padding, 14px inner padding, 14px corner) with a global top bar and a content grid below it.

- **Top bar:** a three-column grid. The logo is left, a centered search field (up to 440px wide, ⌘K) sits in the middle, and the account chip and theme toggle are right. It holds only global controls.
- **Content grid:** sidebar (210px) | main (flexible). A 310px detail column appears only when a task is selected.
- **Project header:** a single row with the project name on the left, the view tabs (Overview, Timeline, List view, Board) exactly centered, and Filters and "+ Add task" on the right. When the main column is narrower than 760px, the tabs wrap to their own row.
- **Rhythm:** a 2/4/6/8/10/14/20px scale. Use tight 6–8px gaps inside a group (chip contents, avatar stacks, field rows) and 10–14px between groups and cards.
- **Density:** comfortable-dense. List rows are about 39px, board cards are compact, and the Overview leads with two attention lists side by side.
- **Responsive:**
  - At **1150px and below**, the sidebar narrows to 190px and the detail panel overlays the content from the right (320px).
  - At **780px and below**, the layout becomes one column:
    - The sidebar becomes a horizontal, swipeable strip.
    - The view tabs stretch full width.
    - The table scrolls sideways instead of compressing (640px minimum).
    - The detail panel becomes a bottom sheet.
    - Overview rows wrap their status under the name.

### Named Rules
**The Panel On Demand Rule.** Secondary surfaces (the detail panel, the filter bar) exist only while they're in use. Selecting a task opens the panel; closing it, pressing Esc, selecting the task again or leaving the project page gives the space back.

**The Global vs Local Rule.** The top bar holds only things that apply everywhere. Anything scoped to a project (views, filters, adding tasks) lives in the project header.

## Elevation & Depth

RUNWAY is flat. Depth comes from tonal steps (Night Soil → Potting Bench → Slate Leaf → Bench Hover) and 1px hairlines, not shadows. Shadows appear only when a surface truly floats above content it covers:
- The overlay detail panel at narrow widths: `-16px 0 40px rgba(0,0,0,.4)`.
- The bottom-sheet panel on phones: `0 -16px 40px rgba(0,0,0,.45)`.
- Dialogs, which sit over a `rgba(0,0,0,.6)` backdrop.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No drop shadows on cards, buttons or chips, no glows, no gradients and no glass blur. The sole exception: primary buttons cast a subtle `0 1px 3px rgba(0,0,0,.25)` shadow on hover, as a hover-only affordance — never at rest.

**The No Side-Stripe Rule.** Selection and emphasis never use a colored left or right border thicker than 1px. A selected row gets Sprout Wash with a full 1px Sprout Edge outline; an active nav item gets a tonal fill and a green icon.

## Shapes

Small, gentle, consistent corners on a strict ladder:
- **4px:** calendar events and tiny tags.
- **6px:** buttons, inputs, chips and tabs.
- **8px:** the search field, board cards, toasts and nav items.
- **10px:** cards and panels.
- **12–14px:** dialogs and the app shell.
- **Pill (20px):** member chips and count badges.

Borders are always 1px hairlines; dashed hairlines mark "add" affordances ("+ Add task" on the board, "Create new project"). Avatars are 22px circles with a 1.5px ring in the page color, overlapping by 3px in stacks.

## Components

Calm and precise: flat fills, hairline edges and small radii, with state shown by tint and outline rather than decoration.

### Buttons
- **Shape:** gently rounded (6px; 7–8px for dialog buttons).
- **Primary:** Fern Shade fill with white text (12px), darkening to Pine with a subtle `0 1px 3px rgba(0,0,0,.25)` shadow on hover. There is one per area: "+ Add task", "Create task".
- **Secondary:** transparent with a Hairline Strong outline and Mist Text ("Filters", "Cancel", "Mark done"). Hover fills with Bench Hover. When a filter is active, the outline shifts to Sprout Edge and the text to Sprout.
- **Danger:** a Rust outline with Rust text in panels ("Delete task"), or a solid `rust-light` fill with white text as the confirm button in destructive dialogs ("Delete project", "Reset data"). The label always names the action.
- **Icon buttons:** 28px square and transparent, with Bench Hover on hover. Every icon button has an aria-label (close, previous or next month).
- **Link buttons:** Sprout text with no chrome, underlined on hover. Used for clickable numbers in the Overview ("2 overdue", "View all 8").

### Chips
- **Priority:** Slate Leaf fill, hairline border, Mist Text, and a 6px dot (Rust for High, Sprout for Medium, Stone for Low).
- **Status:** plain text with a 6px dot (Stone To do, Amber In progress, Heather Review, Sprout Done).
- **Member chips:** a pill with the avatar and first name. Selected chips get Sprout Wash and a Sprout Edge outline.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Potting Bench, with a hairline border and no shadow.
- **Internal Padding:** 14px. Board columns use 10px.
- **Board cards:** Slate Leaf with an 8px radius, showing the title, role and a footer row (priority chip, due date, avatars). A selected card gets Sprout Wash with a Sprout Edge border.

### Inputs / Fields
- **Style:** Night Soil fill (recessed), hairline border, 6px radius, 12px text.
- **Focus:** the border shifts to Sprout Edge with a 3px Sprout Wash halo. Native outlines are suppressed only on inputs, never on other controls.
- **Error:** inline Rust text under the field in dialogs ("End date must be on or after the start date"). An overdue deadline field shows its date in Rust with "Overdue by N days" beneath.
- **Search:** Potting Bench fill, 8px radius, a ⌘K hint key on the right, and a Sprout Edge border on focus.

### Navigation
- **Sidebar items:**
  - Sage text with a small icon tile.
  - Hover fills with Bench Hover.
  - The active item gets a Slate Leaf fill, Mist Text and a Sprout icon.
  - Projects show a count badge (Sprout Wash); a project with late work gets a Rust-tinted badge with the alert icon.
- **View tabs:** a segmented control inside a hairline tray. Inactive tabs are Sage. The active tab gets a Slate Leaf fill with a 2px Sprout underline.

### Task List
- **Columns:** sortable headers in the uppercase Label style, with a small chevron icon (Sprout when sorted, plus `aria-sort`).
- **Rows:** about 39px. Hover fills with Bench Hover; selection uses Sprout Wash with a 1px Sprout Edge outline.
- **Completion:** a 14px circular check (Lichen outline; Sprout fill with a white tick when done). Completed names are struck through in Lichen.
- **Dates:** compact ranges ("Oct 9–13", "Oct 29 – Nov 2"); the year appears only when it isn't the current year.

### Overdue Signal (signature)
The one language for lateness, used identically in the list, board, Overview, detail panel and sidebar: a 13px Rust alert icon (a circle with an exclamation mark), Rust text and the words "Overdue by N days" (screen readers hear the same words). Upcoming items use "Due today," "Due tomorrow" or "Due Sun, Oct 18" in Lichen.

### Overview (signature)
Attention first, laid out top to bottom:
1. A one-line summary.
2. A single segmented status bar with a clickable legend.
3. Two lists side by side: Overdue (worst first) and Due in the next 7 days.
4. Workload per person as neutral Stone bars, where only the late share is Rust.

Every number links to the filtered list. There are no big-number tiles.

### Toasts and Dialogs
- **Toast:** Slate Leaf with a hairline border, centered at the bottom, with an 8px radius and a 7px Sprout dot. It disappears after about 2 seconds, or about 7 seconds when it carries an Undo button. Messages are also sent to a polite live region for screen readers.
- **Dialog:** Potting Bench with a Hairline Strong border, 12px radius, 22px padding, and the title in Headline style. Cancel and the named primary action sit bottom-right.

### Motion
Motion is calm, quick, and never decorative — one shared pattern for all dialogs.

- **Open:** the backdrop fades in over 160ms while the panel fades up 8px from a 0.97 scale over 200ms (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Close:** both surfaces play a 150ms fade/sink-out before the dialog unmounts. Dismissals are never instant.

**Implementation (the method):** dialogs are conditionally rendered, so to animate the exit they stay mounted through a `closing` state. Use the `useDialogTransition(onClose)` hook and the shared classes:

- `.runway-backdrop` and `.runway-dialog` — the two animation surfaces.
- `.is-closing` — appended during the 150ms exit (plays the reverse keyframes with `forwards` fill).

Any new dialog reuses these classes and the hook — no per-modal animation code. All dialog animation is disabled under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** keep green to actions, selection, completion, progress, focus and today (The Living Green Rule).
- **Do** show lateness with Rust, the alert icon and "Overdue by N days" together, everywhere it appears.
- **Do** separate surfaces with the four tonal steps and 1px hairlines.
- **Do** keep all functional text at 11px or larger, and secondary text at 4.5:1 or better in both themes (Lichen `#848D86` dark, `#5E665F` light).
- **Do** use tabular figures for dates, counts and anything in columns.
- **Do** make every summary number a link to the filtered list it describes.
- **Do** prefer Undo for reversible deletes, and use a named, styled confirmation only for irreversible ones.
- **Do** give every interactive element a keyboard path and a visible 2px Sprout focus ring.

### Don't:
- **Don't** flood backgrounds, panels or headers with green. This system replaced exactly that.
- **Don't** use big-number metric tiles, rainbow per-person colors or duplicated percentages.
- **Don't** add a colored side stripe (more than 1px) to rows, cards, toasts or nav items.
- **Don't** use shadows, glows, gradients or glass blur on surfaces at rest.
- **Don't** fill chips, rows or cards with status colors; use the 6px dot.
- **Don't** use the browser's native `confirm()` dialogs or text glyphs as icons.
- **Don't** keep the detail panel open by default or show it on pages unrelated to the selected task.
- **Don't** put project-scoped controls (views, filters, add task) in the global top bar.
