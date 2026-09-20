# LearnOS — UI Design System (v6)

Branch: `version_4` · Files: `index.html`, `offline.html`, `manifest.json`, `sw.js` (cache name), `icon-*.png`
JS behaviour is unchanged apart from the items under "Code changes" below.

## Direction

A flat, dense, neutral interface in the style of a product dashboard, not a generated landing page.
The original mint-gradient look (glow orbs, gradient text, shimmer buttons, 20px blob cards) was replaced.

| Area | Before | Now |
|------|--------|-----|
| Fonts | Inter + Sora | **IBM Plex Sans** (UI) + **IBM Plex Mono** (timers, times, numeric cells) |
| Surfaces | Green-tinted darks, then blue-tinted navy | **True neutral graphite** — surfaces carry no hue at all |
| Accent | Mint, then indigo | One **steel blue** (`#5e9cd0`), fill `#35678f` |
| Status | Neon `#22c55e` / `#f59e0b` / `#ef4444` | Muted `#4a9e6b` / `#c08b3e` / `#c75f5f` + lighter text variants |
| Radius | 10–24px mixed, pills everywhere | One scale: chips 4 · badges 6 · buttons/inputs 8 · cards 12 · modals 16 |
| Buttons | ~20 ad-hoc gradient classes | One system: primary (solid `--brand`), secondary, danger, icon |
| Depth | Gradients, glows, blur, hover-lift | Flat fills, 1px hairlines, no shadow except modals/toasts |
| Icons | Emoji in nav and rows | Inline SVG (stroke = `currentColor`) |
| Charts | Glossy 3D cylinder bars | Flat bars, no outlines, small legend swatches |

**Rule the palette follows:** colour always means something — status, subject identity, or data.
Chrome and surfaces are grey, so anything coloured on screen is carrying information.

## Tokens (`:root`, top of the stylesheet)

- Elevation: `--bg` → `--bg2` (chrome) → `--bg3` (inset) → `--surface` (cards) → `--surface2` (raised)
- Text: `--text`, `--text-bright`, `--muted`, `--muted2`
- Accent: `--accent` (text/strokes on dark), `--brand` (solid button fill, white text, 6.0:1), `--brand-hover`, `--brand-press`
- Status: `--success` / `--warn` / `--danger` for fills and borders; `--success-text` / `--warn-text` / `--danger-text`
  for small text. `--danger` alone is 4.3:1 on cards, below AA, so never use it for label text.
- Radius: `--r-xs/sm/md/lg/xl`; Type: `--font-ui`, `--font-display`, `--font-mono`
- `--mint-*` names are kept as aliases so older page blocks keep working; new code should use the tokens above.

All text pairs were checked against WCAG AA (4.5:1); the lowest is `--muted2` on cards at 4.5:1.

## Task rows

Each row used to carry three filled pills (subject, priority, status), which turned the list into a
colour chart and made every row shout equally. Now:

- **Subject** — a 6px dot in the subject colour plus the name in muted text.
- **Priority** — a 2px left edge on the row; a label appears only when priority is *not* medium,
  so the default state adds no visual noise.
- **Status** — dropped, since the checkbox already shows done/cancelled. Only "Cancelled" and
  "Overdue" still get a label, because those are the states worth interrupting for.
- **Deadline** — plain tabular text ("22 Sept"), not a bordered chip with a calendar emoji.

## Where things live

- **Legacy blocks** (base component CSS) are still in the stylesheet, recoloured through the tokens.
- **Rewritten blocks:** Attendance, Analytics (clean token-based versions).
- **Retired:** the per-page "mint theme" glow layer, timer/modal shimmer buttons, matrix/community `!important` gradient block, and the earlier "UI polish layer".
- **`DESIGN SYSTEM v5`** is the last block in the stylesheet and wins over legacy rules. Sections: base · buttons · forms · login · topbar · sidebar · page shell · cards · dashboard · matrix table · subjects · tasks · timer · community/friends · profile/trophies · owner · modals · toast · mobile nav · motion/a11y.

## Code changes outside styling

1. `renderAchievements()` no longer sets `page-achievements` to inline `display:block`. That made the Trophies page stay visible beneath every other page once it had been opened.
2. Dashboard gained a standard page header ("Dashboard") like every other page.
3. Decorative emoji removed from headings and button labels (empty-state glyphs, login feature tiles, select options and the streak flame were kept).
4. Chart.js: 3D plugin retired (`ensureChart3DPlugin()` is a no-op), fills flattened, font set to IBM Plex Sans.
   The task-status doughnut used to draw "Completed" and "Pending" in two colours that both mapped to the
   same blue; it now uses the status colours.
5. Install banner restyled as a compact card (bottom-right on desktop).
6. `formatDeadline()` added next to the other formatters — renders `2026-09-22` as `22 Sept`.
7. Edit/delete row buttons and the dashboard streak use inline SVG instead of emoji.
8. App icons regenerated in the new palette (`icon-192/512` + maskable); `manifest.json` icon query bumped
   to `?v=3` and `sw.js` cache names to `v7` so installed clients refresh.

## Known follow-ups

- The Owner panel inherits the new tokens and component styles but was not visually reviewed page-by-page.
- Emoji inside JS-rendered strings (toasts, trophy icons) were left as they carry meaning.
- `SUBJECT_COLORS` is now a 10-hue categorical palette; it is only readable up to ~10 subjects.
