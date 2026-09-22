# LearnOS — UI Additions Roadmap (what to build next)

Branch: `version_4` · Target file: `index.html` (single-file app) · Design system: see `UI_IMPROVEMENTS.md` (v6 tokens)

This is a plan for **what sections / elements are missing** from the current UI, not a restyling pass.
Styling direction is already settled; everything below should be built with the existing tokens
(`--bg/--bg2/--bg3/--surface`, `--brand`, `--success/--warn/--danger`, `--r-xs`…`--r-xl`, IBM Plex Sans/Mono).

---

## 1. Current inventory

**Shell:** topbar (logo, offline dot, clock, name, logout) · sidebar in 4 groups (Main / Track / Social / Account) · mobile bottom nav + more-menu · install banner · toast · app loader.

**Pages (14):** Dashboard · Subjects · Subject detail · Tasks · Study Timer · Attendance · Calendar · Analytics · Notes · Community · Friends · Trophies & XP · Profile · Settings. Plus a separate Owner panel.

**Modals (16):** task, note, session, manual session, leave, import, prompt, attachment, add-attach, daily goal, matrix columns, matrix log, add friend, friend requests, friends list, content view. *(The roadmap modal was retired in Tier 2 — `openRoadmap()` now opens the subject detail page.)*

**What is genuinely absent today:** notifications / activity feed (Tier 1 §1.5, still open) · onboarding · `aria-live` regions · `role="dialog"` on modals · everything in Tier 3 and §§3–4 below.

---

## 2. Priority tiers

### Tier 1 — Fills a real hole — **shipped, except 1.5**

| # | Element | Where | Why |
|---|---------|-------|-----|
| 1.1 | **Settings page** (new nav item under *Account*) | new `#page-settings` after `#page-profile` (~L3470) | There is no settings surface at all. Everything configurable is scattered into modals or hardcoded. |
| 1.2 | **Theme toggle (dark / light / system)** | topbar icon button + a Settings row | App is dark-only. The token architecture already supports a second palette via `:root[data-theme="light"]`. |
| 1.3 | **Global search / command palette (`Ctrl+K`)** | overlay modal, trigger in topbar | With 11 pages plus subjects, tasks, notes and sessions there is no cross-page lookup. Per-page search exists only on Tasks and Notes. |
| 1.4 | **Empty-state CTA buttons** | all 28 `.empty-state` blocks | Every empty state is icon + text only. Each should carry its primary action ("+ Add your first subject") so a new account is never a dead end. |
| 1.5 | **Notification / activity centre** — *not built* | topbar bell + dropdown panel | Friend requests already have a nav badge but no inbox. Overdue tasks, streak-at-risk, pending timers and received files have nowhere to surface. |
| 1.6 | **Data import (JSON restore)** | Settings → Data section, beside the existing `exportData()` | Export exists with no matching import, so the backup is write-only. |

### Tier 2 — Strong additions to pages that already work — **shipped**

All eight are in `index.html`. CSS lives in the appended v6 block, sections **G–N**;
the JS sits in the `TIER 2` block just above the `START` section.

| # | Built as | Notes |
|---|----------|-------|
| 2.1 | `renderHeatmap(mountId, statsId)` | 53×7 grid, 4 intensity steps (<30m / <60m / <120m / 120m+), month strip, current + best streak. Mounted on Dashboard **and** Profile; scrolls horizontally on phones and opens at this week. |
| 2.2 | `#page-calendar`, `CAL` state | Month grid and Agenda share one row renderer; day panel on the right. Dots for sessions / task deadlines / present / leave, leave days tinted. Nav item under *Track*, plus mobile more-menu and `Ctrl+K`. |
| 2.3 | `pomoTick()` on the one-second clock | Mode switch in the session modal with focus/break minutes, persisted per device. Focus → auto-pause into break → next block, with a cycle counter, skip button and a WebAudio chime. Only focus time accrues to the session. |
| 2.4 | `renderUpNext()` | Next 3 pending tasks by deadline (overdue and today called out) plus a resume button that prefers a live timer, then the last session, then a cold start. |
| 2.5 | `#page-subject`, `renderSubjectPage()` | Replaces the roadmap modal — `openRoadmap()` now navigates here, so every existing call site still works. Topics editor, linked tasks, recent sessions, and per-subject totals. |
| 2.6 | `sortTasks()` + selection mode | Five sort orders; *Select* reveals per-row checkboxes and a bulk bar (select all / complete / pending / delete). Selection is pruned to what is actually on screen. |
| 2.7 | `noteTags()`, `toggleNotePin()`, `setNotesView()` | Pin-to-top, comma-separated tags with a tag filter and clickable chips, and a list/grid toggle stored per device. |
| 2.8 | `renderSidebarFoot()` | Streak, time studied today, and goal progress at the foot of the sidebar; refreshed on every `navTo` and whenever the goal card re-renders. Desktop/tablet only — the sidebar is hidden below 700px. |

#### Original plan

| # | Element | Where | Why |
|---|---------|-------|-----|
| 2.1 | **Contribution heatmap** (52-week study grid) | Dashboard, below the study-hero card; mirror on Profile | The week chart shows 7 days. A year grid makes streak and consistency legible at a glance. |
| 2.2 | **Calendar / Agenda page** | new `#page-calendar` under *Track* | Task deadlines, leaves, attendance and sessions all carry dates but there is no single time view. Month grid + day-agenda toggle. |
| 2.3 | **Pomodoro mode in the timer** | `#page-timer` (~L3165), a mode switch on the timer card | Timer is free-running only. 25/5 with a cycle counter is the expected study-timer feature. |
| 2.4 | **Today / Up-next panel** | Dashboard, top-right of the first grid | Dashboard is all aggregates — there is no "what do I do now". Next 3 tasks by deadline + resume-last-session button. |
| 2.5 | **Subject detail page** (not just the roadmap modal) | promote `openRoadmap()` into a full page or a wide drawer | A subject holds topics, progress, linked tasks, session time and notes — too much for a modal. |
| 2.6 | **Task bulk actions + sort** | `#page-tasks` toolbar (~L3141) | Filters exist (search / status / subject) but there is no sort control, no select-all, no bulk complete or delete. |
| 2.7 | **Notes: pin, tags, grid/list toggle** | `#page-notes` (~L3322) | Notes has search + type filter only. Pinning and tags are what keep a scratchpad usable past ~30 entries. |
| 2.8 | **Streak / goal widget in the sidebar footer** | bottom of `#sidebar` | Streak is buried in `#dash-meta`. Persistent placement makes the daily goal a constant nudge. |

### Tier 3 — Depth and polish

| # | Element | Where |
|---|---------|-------|
| 3.1 | **Analytics: subject comparison + best-hours chart** — stacked bars per subject across the range, and an hour-of-day histogram built from session start times | `#page-analytics` (~L3372) |
| 3.2 | **Goal history / weekly goal** — hit-rate over the month, not just today | Dashboard goal card + Analytics |
| 3.3 | **Trophy progress bars** — show "3 / 10 sessions" on locked trophies instead of a flat locked state | `#page-achievements` (~L3696) |
| 3.4 | **Community: search, tag filter, saved posts** | `#page-community` (~L3344) |
| 3.5 | **Friends: activity / leaderboard tab** — study hours this week among friends | `#page-friends` (~L3549) |
| 3.6 | **Profile: avatar upload + inline editable display name** | `#page-profile` (~L3470) |
| 3.7 | **Attendance: year view + present-day streak** | `#page-attendance` (~L3214) |
| 3.8 | **Keyboard shortcuts overlay (`?`)** — lists the bindings added by 1.3 and below | global modal |

---

## 3. Global shell additions (cut across every page)

- **Page-context row** — a thin row under the topbar showing the current page and a right-aligned primary action, so that action sits in the same place on every page.
- **Skeleton loaders per card** — 3 `skeleton` rules already exist; extend them to dashboard cards, the task list and session history so first paint is not a blank grid.
- **Toast queue** — the current toast is single-slot. Stack up to 3, with an undo affordance on destructive actions.
- **Undo for deletes** — pair with the toast; safer and lighter than adding more confirm dialogs.
- **Sync status chip** — the offline dot is binary. Show "Synced 2m ago" / "Syncing…" / "3 queued" using the existing `offlineQueueAdd` / `offlineQueueProcess`.
- **Collapsible sidebar (icon-only rail)** — a width toggle persisted in `localStorage`, for laptops at 1280px.
- **Quick-add "+"** — one topbar button opening a chooser (task / note / session / subject) instead of navigating first.

---

## 4. Accessibility & correctness backlog

Cheap, and currently unmet:

1. `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on all 16 modals; focus trap, and restore focus to the trigger on close.
2. `aria-live="polite"` on the toast container, the timer readout, and every list that re-renders (`renderTasks`, `renderNotes`, `renderSessions`).
3. `Esc` to close modals and the more-menu — `closeModal()` exists but no key handler is wired to it.
4. `aria-current="page"` on the active `.nav-item`; the active state is colour-only today.
5. `aria-label` on every icon-only button — most have one, sweep for the rest.
6. Visible `:focus-visible` ring on nav items, cards and table rows; only 3 rules exist now.
7. `aria-hidden="true"` on the decorative emoji in empty states.
8. Honour `prefers-reduced-motion` for the streak pulse and the offline-dot animation — one rule exists, but the dot's animation is inline and escapes it.

---

## 5. Suggested build order

1. **Pass A — shell:** Settings page → theme toggle → sync chip → toast queue + undo. *(Unblocks everything else; a11y items 1–4 ride along.)*
2. **Pass B — findability:** command palette (`Ctrl+K`) → notification centre → empty-state CTAs → quick-add.
3. **Pass C — data depth:** heatmap → Today/Up-next → Calendar page → import.
4. **Pass D — per-page:** pomodoro → task bulk actions & sort → notes pin + tags → subject detail page.
5. **Pass E — Tier 3**, in whatever order the data supports.

**Sequencing note:** the app is a single 467 KB `index.html`. Before Pass C, consider splitting the `<style>` and `<script>` blocks into `app.css` / `app.js` — `sw.js` already caches by name, so it is a manifest edit plus two tags. Not required, but every pass after B gets harder without it.

---

## 6. Explicitly out of scope here

Restyling anything already covered by `UI_IMPROVEMENTS.md`; the Owner panel (flagged there as not visually reviewed — it deserves its own pass); and Firebase schema changes beyond what the elements above imply.
