# LearnOS — UI Design System (v5)

Branch: `version_4` · Files: `index.html`, `offline.html`, `manifest.json`, `sw.js` (cache name only)
JS behaviour is unchanged apart from the items under "Code changes" below.

## Direction

A flat, dense, neutral interface in the style of a product dashboard, not a generated landing page.
The previous mint-gradient look (glow orbs, gradient text, shimmer buttons, 20px blob cards) was replaced.

| Area | Before | Now |
|------|--------|-----|
| Fonts | Inter + Sora | **IBM Plex Sans** (UI) + **IBM Plex Mono** (timers, times, numeric cells) |
| Palette | Green-tinted darks + mint accent (clashed with the "success" green) | Cool graphite neutrals + one **indigo** accent; green/amber/red are reserved for status |
| Radius | 10–24px mixed, pills everywhere | One scale: chips 4 · badges 6 · buttons/inputs 8 · cards 12 · modals 16 |
| Buttons | ~20 ad-hoc gradient classes | One system: primary (solid `--brand`), secondary, danger, icon |
| Surfaces | Gradients, glows, blur, hover-lift | Flat fills, 1px hairlines, no shadow except modals/toasts |
| Icons | Emoji in nav | Inline SVG (stroke = `currentColor`) in sidebar, bottom nav, More sheet |
| Headings | Uppercase eyebrows, gradient text | Sentence case, solid text |
| Charts | Glossy 3D cylinder bars | Flat bars, no outlines, small legend swatches |

## Tokens (`:root`, top of the stylesheet)

- Elevation: `--bg` → `--bg2` (chrome) → `--bg3` (inset) → `--surface` (cards) → `--surface2` (raised)
- Text: `--text`, `--text-bright`, `--muted`, `--muted2`
- Accent: `--accent` (text/strokes on dark), `--brand` (solid button fill, white text, 5.2:1), `--brand-hover`, `--brand-press`
- Radius: `--r-xs/sm/md/lg/xl`; Type: `--font-ui`, `--font-display`, `--font-mono`
- `--mint-*` names are kept as aliases so older page blocks keep working; new code should use the tokens above.

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
5. Install banner restyled as a compact card (bottom-right on desktop).
6. `sw.js` cache names bumped to `v6` so installed clients pick up the new offline page.

## Known follow-ups

- App icons (`icon-*.png`) are still the old mint artwork; regenerate them to match the indigo brand.
- The Owner panel inherits the new tokens and component styles but was not visually reviewed page-by-page.
- Emoji inside JS-rendered strings (toasts, trophy icons, task metadata) were left as they carry meaning.
