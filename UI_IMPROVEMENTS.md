# LearnOS — UI Improvements

Branch: `version_4` · File touched: `index.html` only · JS logic: **unchanged**

This document has two parts:

1. [What was changed](#part-1--what-was-changed) — everything already done in this pass.
2. [What should be implemented next](#part-2--what-should-be-implemented-next) — researched recommendations, prioritised, with how to do each one.

---

## Part 1 — What was changed

### 1.1 Approach

- **Nothing was removed.** No element, text, ID, `onclick` handler, or JS hook was deleted.
- All new styling lives in **one labelled block at the very end of the `<style>` section** ("UI POLISH LAYER", sections 1–22). It loads last, so it refines the older rules instead of replacing them. To roll back the visual work, delete that block.
- Base button selectors use low specificity (`button:where(.btn-accent)`) so existing, more specific classes (`.modal-btn-primary`, `.timer-btn-primary`, `#page-x .btn-accent`) keep winning where they were already customised.
- Only **Profile** and **Achievements** got markup changes: inline `style="…"` attributes were replaced with classes (`pf-*`, `ach-*`) so they can have hover/border/responsive states. All IDs are preserved, and no JS reads those inline styles (checked).

### 1.2 Bugs found and fixed

| # | Problem | Impact | Fix |
|---|---------|--------|-----|
| 1 | `.btn-accent` / `.btn-secondary` had **no base CSS** | Save Task, Cancel, Done, Apply Leave, Save Note, Copy Prompt, Add… rendered as plain default buttons | Added a filled primary and an outline secondary style |
| 2 | `--radius-lg` (7 uses) and `--text-bright` were **never defined** | Community/Friends cards lost rounded corners; matrix table headers lost their colour | Defined both in `:root` |
| 3 | White text on mint gradient (login button, sidebar active item) | Contrast ≈ 1.9:1 — fails WCAG AA (needs 4.5:1) | Dark ink `#06241c` on mint; sidebar active uses tinted bg + line indicator |
| 4 | Mobile modal rule targeted `.modal-content`, but the class is `.modal` | Bottom-sheet style never applied | Rule now targets `.modal`; modals are bottom sheets on ≤700px |
| 5 | `.modal-overlay` z-index 500 < bottom nav 9999 | On mobile the bottom nav covered modal footers | Modal z-index → 10000, toast → 10001 (via `--z-modal`, `--z-toast`) |
| 6 | Toast at `bottom: 28px` on mobile | Overlapped the bottom nav | Sits above the nav, full width on mobile |
| 7 | `button { outline: none }` with no replacement | No visible keyboard focus anywhere | Global `:focus-visible` ring; inputs get a box-shadow ring |
| 8 | Tasks/Notes `select` used a `background:` shorthand at higher specificity | Would have wiped the custom dropdown chevron | Chevron applied with matching specificity, stored in `--chev` |

### 1.3 Design tokens added (`:root`)

`--radius-lg`, `--text-bright`, `--line`, `--line-strong`, `--line-soft`, `--on-accent`, `--ring`, `--ease`, `--z-modal`, `--z-toast`, `--chev`.

### 1.4 Section-by-section changes

| Section | Changes |
|---------|---------|
| **Base** | `color-scheme: dark`, font smoothing, branded `::selection`, thin themed scrollbars (desktop only), global `:focus-visible` |
| **Buttons** | One system: 1px line borders everywhere. Primary = filled mint + border + inset highlight; Secondary = outline; Danger = red outline; Icon buttons = 32px bordered; consistent hover lift (`-1px`) and press states. Timer/modal buttons calmed from `-3px + scale` hover to `-1px`, borders reduced from 2px to 1px |
| **Forms** | Uniform 42px inputs, hover border, focus ring, custom select chevron, dark date/time pickers, dashed read-only fields, styled file-picker button |
| **Toolbars** | Search + filters + action sit inside a bordered bar (Tasks, Notes, Subjects add-form) |
| **Login** | Divider line between panels, bordered feature rows with hover, dark-ink button, boxed error message |
| **Topbar** | Frosted-glass bar with hairline + shadow, bordered clock pill, divider before username, bordered logout/hamburger buttons |
| **Sidebar** | Muted labels, accessible active state (tinted bg + border + 3px left indicator), softer hover |
| **Page headers** | Hairline divider under every page header |
| **Cards** | Consistent hairline border + inset highlight, accent tick before every card title, dashed empty states, tags/badges with colour-matched hairline borders |
| **Dashboard** | Task pills get a coloured top line and hover lift, subject rows get hover highlight, matrix table gets uppercase headers and column lines |
| **Subjects** | Bordered add button, progress-track inner line, topic rows hover |
| **Tasks / Notes** | Row hover, checkbox hover, deadline shown as a bordered pill |
| **Timer** | Running card gets an accent border, paused card gets an amber indicator, time readout in a bordered box with glow when running, outlined Pending button |
| **Attendance / Analytics** | Already polished — only added borders on the primary buttons and focus states |
| **Community / Friends** | Radius fix applied, tidied badge and labels |
| **Profile** | Ringed avatar, 4-up stats strip with dividers, outlined logout button (fills red on hover), tidy key/value rows |
| **Achievements** | Same divided stats strip, earned trophies get gradient + glow, locked trophies get dashed borders |
| **Owner panel** | Now matches the student theme (gradient titles, card styling, active-student indicator) |
| **Modals** | Blurred backdrop, gradient surface, sticky header/footer with lines, bordered 32px close button (red on hover), bottom sheet on mobile with full-width buttons |
| **Toast** | Left colour bar (mint / green / red), blurred surface |
| **Mobile nav** | Top-line indicator on the active tab, bordered "More" tiles |
| **Motion / a11y** | `prefers-reduced-motion` support, `forced-colors` (high-contrast) fallback |

### 1.5 How it was verified

- CSS braces and parentheses balanced (1140/1140 and 1559/1559).
- Rendered in Chrome via a local static server, with the login screen bypassed for visual testing only: login, app shell, Dashboard, Profile, Add-Task modal.
- Mobile checked in a 400px iframe: bottom-sheet modal, bottom nav, More menu. No horizontal scroll.
- **Not visually checked:** Timer with live sessions, Analytics charts, Community feed, Friends lists, Owner panel, Achievements with data. These need real data or a Firebase sign-in.

### 1.6 Deployment note

`sw.js` serves `index.html` **network-first and never caches it**, so these changes reach users without bumping `SW_VERSION`.

---

## Part 2 — What should be implemented next

Priority: **P1** = accessibility/correctness, do first · **P2** = maintainability/quality · **P3** = nice-to-have.
Effort: S ≈ under 1 hour · M ≈ half a day · L ≈ 1+ days.

These come from established guidelines (WCAG 2.2, WAI-ARIA Authoring Practices, Material/Apple touch-target guidance) and from gaps found while reading this codebase.

### P1 — Accessibility and correctness

#### 1. Make modals real dialogs (M)
**Gap found:** there is no `role="dialog"`, `aria-modal`, Escape-to-close, or focus handling anywhere in the file.
**Implement:**
- Add `role="dialog" aria-modal="true" aria-labelledby="<title-id>"` to each `.modal`.
- On open: remember `document.activeElement`, move focus to the first field, trap Tab inside the modal.
- On close: restore focus to the opener.
- Close on `Escape` and on backdrop click.
- Give the `×` buttons `aria-label="Close"`.
- Put this in the existing `openModal` / `closeModal` helpers so every modal benefits at once.

#### 2. Fix low-contrast muted text (S)
`--muted2: #5a786c` on `--bg: #0a1210` is roughly 3.7:1, below the 4.5:1 AA threshold for small text. It's used for `.meta-lbl`, `.nav-label`, `.task-deadline`, and placeholders.
**Implement:** lighten `--muted2` to about `#7b9a8d` (check with a contrast checker) and re-verify `--muted` on `--surface2`.

#### 3. Announce toasts and state changes (S)
Add `role="status" aria-live="polite"` to `#toast` (use `role="alert"` for errors) and to `#login-error`. Add `aria-current="page"` to the active `.nav-item` and `.bnav-item` inside `navTo()`.

#### 4. Touch targets ≥ 44×44px on mobile (S)
Several controls are 30–36px: the timer month arrows (inline `30px`), `.btn-icon`, `.modal-close`, `.topic-check`, `.task-checkbox` (18px). WCAG 2.2 (2.5.8) sets a 24px minimum, and Apple/Google recommend 44/48px.
**Implement:** inside `@media (pointer: coarse)`, raise `min-width/min-height` to 44px, or enlarge the hit area with padding or a `::after`.

#### 5. Restore text selection in cards (S)
`button, a, .nav-item, .bnav-item, .card, .topic-item { user-select: none }` stops users copying text from cards (session names, notes, emails). Keep `user-select: none` on buttons and nav only, and remove `.card` and `.topic-item` from that list.

#### 6. Give the emoji icons text alternatives (S)
Emoji used as icons (⬛ 📚 ✅ ⏱ …) are read aloud literally. Wrap decorative ones in `<span aria-hidden="true">`. Icon-only buttons (🚪 logout) need `aria-label`; the topbar one only has `title`.
**Related:** the "Dashboard" sidebar icon is a black square (⬛) that renders as a dark block. Replace it with 🏠 or 📈.

### P2 — Maintainability and quality

#### 7. Split the 10.5k-line file (L)
CSS is ~3,500 lines, HTML ~1,500, JS ~5,500 in one file. Move to `styles/app.css`, `js/app.js` (or ES modules per feature), keeping `index.html` as markup.
- Add the new files to the `SHELL_CACHE` list in `sw.js` and bump `SW_VERSION`.
- Big win for diffs, code review and browser caching.
- Do this in a separate commit from any visual change.

#### 8. Consolidate the CSS (M)
The file has overlapping generations of the same components (three button families, three card styles, per-page duplicates of the same gradient). Now that the polish layer defines the target look:
- Merge its rules back into the original definitions and delete the superseded ones.
- Replace repeated raw values (`rgba(45,212,168,…)`, `#2dd4a8`, `rgba(20,32,42,0.95)`) with tokens (`--accent`, `--surface-grad`).
- Remove dead rules such as `.modal-content` (mobile) and `.timer-display`.
- Reduce `!important` (Community/Friends sections use it heavily).

#### 9. Remove the remaining inline styles (M)
Still inline: the More menu buttons (7 near-identical `style=""` blocks), Friends form fields, the Timer history header, Analytics month select, login info box. Move each into a class. This is why the polish layer needs `!important` for `#more-menu`.

#### 10. Fix duplicate SVG IDs (S)
`id="tl1"` / `id="tl2"` gradients appear in both the app topbar and the owner topbar (invalid HTML; the second reference can render wrong). Rename the owner ones (`otl1`, `otl2`).

#### 11. Theme the Chart.js charts to match (M)
Charts are the one area the CSS pass can't reach. In the chart configs: use `--accent` palette for datasets, `rgba(255,255,255,0.06)` grid lines, `Inter` for tick labels, rounded bar corners (`borderRadius: 6`), and a tooltip styled like the toast (dark surface, 1px border).

#### 12. Add a visual-regression safety net (M)
Use Playwright with screenshot tests (`toHaveScreenshot`) for: login, dashboard, tasks, timer, profile, one modal, and the mobile viewport. Seed the state (`localStorage`) instead of signing in. Add `@axe-core/playwright` to fail on contrast and ARIA regressions.

### P3 — Nice-to-have

#### 13. Replace emoji icons with one SVG set (M)
Emoji look different on every OS and can't be recoloured. Use an inline SVG sprite (Lucide or Phosphor, both MIT), sized 18–20px with `stroke: currentColor`, so icons follow hover/active colours automatically.

#### 14. Loading skeletons on data pages (S)
`.skeleton` and the `shimmer` keyframes already exist but are barely used. Show skeleton cards for Subjects, Tasks and the Dashboard while Firestore data loads, instead of empty states that flash "No subjects yet".

#### 15. Light theme / theme toggle (L)
The tokens are now centralised enough to add `[data-theme="light"]` overrides. Respect `prefers-color-scheme`, store the choice in `localStorage`, and update `<meta name="theme-color">` to match. Requires tokenising the many hard-coded `rgba(20,32,42,…)` surfaces first (see item 8).

#### 16. Micro-interactions (S)
- Animate the checkbox tick on task completion.
- Count-up animation for KPI numbers (respect reduced motion).
- Swipe-down-to-dismiss on the mobile bottom-sheet modals.
- Add `overscroll-behavior: contain` to modals so background scrolling doesn't leak on mobile.

#### 17. Performance tuning for low-end phones (S)
`backdrop-filter` is used on the topbar, bottom nav, modals, toast and Community/Friends cards. It is expensive on older Android. Add `@supports not (backdrop-filter: blur(1px))` fallbacks to solid backgrounds, and consider dropping the blur on cards (keep it on the overlay and nav only).

#### 18. Typography refinements (S)
Load only the weights actually used (currently Inter 400–800 plus Sora 600–800), add `font-variant-numeric: tabular-nums` to all numeric readouts (streak, KPIs, table totals), and set `text-wrap: balance` on page titles and empty-state text.

### Suggested order

1. Items 1–6 (accessibility, one PR, small, high value)
2. Item 10 (one-line fix)
3. Items 8 and 9 (clean up while the target look is fresh)
4. Item 12 (regression tests before any refactor)
5. Item 7 (file split, its own PR)
6. Items 11, 13, 14, then the rest as time allows

---

## Appendix — Quick reference for the new classes

| Class | Purpose |
|-------|---------|
| `.pf-stats`, `.pf-stat`, `.pf-stat-val`, `.pf-stat-lbl` | Profile stats strip |
| `.pf-c-accent / -success / -info / -warn` | Profile value colours |
| `.pf-rows`, `.pf-row`, `.pf-row-lbl`, `.pf-row-val` | Profile account-info rows |
| `.pf-logout` | Outlined logout button |
| `.ach-stats`, `.ach-stat`, `.ach-stat-val`, `.ach-stat-lbl` | Achievements stats strip |
| `--line`, `--line-strong`, `--line-soft` | Hairline border colours |
| `--on-accent` | Dark text colour for use on mint fills |
| `--ring` | Focus-ring box-shadow |
