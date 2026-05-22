# Migrate from Semantic UI React to Material UI (MUI)

Semantic UI React is no longer maintained. This project (https://github.com/millerdev/lms-ultralight), a Lyrion Media Server skin, needs to migrate to a maintained component library.

## Goals

- Completely remove all uses of semantic-ui-react components and replace with MUI.
- Construct an MUI theme that allows colors to be changed (light vs dark mode).
- All Stylus styles (`*.styl` files) should be moved into styled components.
  - Put custom component styles for layout into `styled` components.
  - Minimize custom styling and use MUI defaults where possible.
- Code changes should prioritize readability and maintainability, although only change code when necessary for some other reason with one exception: If a cleanup would improve code clarity in a significant way, do that change in a stand-alone commit.
- The commit history should be clean and easy to follow. Do one thing in each commit to make them easy to review.

## Process and historical context

- Look at commits on the mui-migration branch for context on what has been done so far. Take a clean approach where we have a clear indication of progress and next steps if the work needs to be paused at any time along the way.
- Prefer putting styles in `styled` components over putting them in the theme. Avoid `sx=...` styles; absolutely do not use them in logic components

Make a plan of the approach first, then pause for adjustments before commencing with the migration.

## Initial state (verified on `main` @ `a8eab39`)

- **Deps**: `semantic-ui-react ^2.1.5`, `semantic-ui-css ^2.4.1`. No MUI, no emotion, no styled-components.
- **7 files import `semantic-ui-react`** (17 distinct components used):
  - `src/library.js` (800 lines): Breadcrumb, Input, List, Loader, Menu, Segment
  - `src/playlist.js` (804 lines): Button, Confirm, Dropdown, Input, List, Segment
  - `src/menuui.js` (300 lines): Dropdown, Icon, Image, Menu, Message, Sidebar, Transition
  - `src/components.js` (310 lines): Button, Dimmer, Icon, Image, Item, Loader
  - `src/playerui.js` (139 lines): Button, Item
  - `src/touch.js` (768 lines): List, Loader, Ref
  - `src/playerselect.js` (58 lines): Dropdown
- **6 Stylus files**, ~270 lines total: `app.styl`, `components.styl`, `menu.styl`, `playlist.styl`, `touch.styl`, `player.styl`.
- **No theme.js, no ThemeProvider.** `src/app.js` imports `semantic-ui-css/semantic.min.css` and wraps `<Provider store>` → `<Router>` → `<MainMenu>`.
- **Build**: Webpack 5 + stylus-loader → css-loader → style-loader.
- **Tests**: Mocha + Enzyme with React 18 adapter. Run via `npm test`.

## Decisions

- **Branch**: new branch `mui-migration`, cut from `main`.
- **Styled component location**: co-located at the **bottom** of each component's `.js` file, below the logical React components.
- **Use Rounded icons**: the default MUI icon set is pointy and doesn't match the look of SUI icons. Luckily MUI has a Rounded icon variant that is pretty close to the SUI icons; use that.
- **Dark mode**: infrastructure only — `theme.js` exports `lightTheme` and `darkTheme`; no UI toggle in this migration.
- **Progress tracking**: this file (`plans/mui-migration.md`). Checklist updated inside each migration commit.

## Approach

### Guiding rules

1. **One thing per commit.** A file's component swap AND its co-located `.styl` → `styled()` conversion land in the **same** commit, because a half-migrated file is a broken intermediate state — not two things.
2. **Build + tests pass every commit.** During transition, Semantic UI and MUI coexist: `semantic-ui-css/semantic.min.css` stays imported until every `semantic-ui-react` usage is gone.
3. **Theme stays small.** Only palette, typography defaults, `CssBaseline`. Anything component-specific goes in `styled()` in the component's own file.
4. **Cleanups get their own commits** — only when the clarity improvement is significant.

### Migration order (leaves → trunk)

Ordered by coupling and risk, not alphabetically. Each migration is a single commit unless a file is genuinely split into independent regions:

1. **`playerselect.js`** — smallest, isolated. Shakedown for `Select`/`Autocomplete` choice.
2. **`playerui.js`** — small; validates `Item` → `Box` pattern.
3. **`components.js`** — shared primitives (`NavIcon`, repeat/shuffle icon groups, `HoverIconContainer`, `TrackInfoIcon`) consumed by `playlist.js` and `menuui.js`. First file that introduces `@mui/icons-material`; icon name → SVG mapping decisions recorded in this file's checklist for reuse.
4. **`menuui.js`** — top-level shell (`Sidebar`, power bar, main menu). Depends on `components.js`.
5. **`touch.js`** — reusable touchlist primitive. `Ref` drops (use `forwardRef`). Consumed by `library.js` and `playlist.js`.
6. **`library.js`** — depends on `touch.js`; uses `playlist.styl` dropdown rules.
7. **`playlist.js`** — largest surface (`Confirm`, `Dropdown`, `Input`, `List`, `Segment`, `Button`). Last because every dependency is already MUI.

For `playlist.js` / `library.js` / `touch.js`: aim for one commit each. Only split by logically independent sub-feature (e.g. `playlist.js` action-menu vs list body) if the diff is too large to review confidently. **Never split by component type** (don't do "all Buttons in playlist.js first") — that yields half-migrated files.

### Semantic → MUI mapping

Decisions are made as each file migrates and recorded below for reuse.

| Semantic | MUI |
|---|---|
| Icon | `@mui/icons-material/*` SVG |
| Button | `@mui/material/Button` |
| Loader | `CircularProgress` |
| Dimmer | `Backdrop` |
| Image | `Box component="img"` or `<img>` |
| Input | `TextField` / `InputBase` |
| Dropdown | `Select` / `Menu` / `Autocomplete` (per-usage) |
| Segment | `Paper` / `Box` |
| List, Item | `List` / `ListItem` / `Box` |
| Menu | `AppBar`+`Toolbar` / `Tabs` / `List` (per-usage) |
| Sidebar | `Drawer` |
| Breadcrumb | `Breadcrumbs` |
| Message | `Alert` |
| Transition | `Fade` / `Slide` / CSS transitions |
| Confirm | `Dialog` |
| Ref | drop; use `forwardRef` |

### Commit sequence

**Foundation**

- [x] **C1** — Add MUI dependencies (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`). `package.json` + lockfile only. Keep `semantic-ui-react` and `semantic-ui-css` installed.
- [x] **C2** — Add `src/theme.js` with `lightTheme` and `darkTheme` (palette + typography + `CssBaseline`). Wrap `<App>` in `<ThemeProvider theme={lightTheme}><CssBaseline/>...</ThemeProvider>` in `src/app.js`. Keep existing `semantic-ui-css/semantic.min.css` and `./app.styl` imports.

**Per-file migration** — for each, a single commit unless noted:

- [x] **C3** — Migrate `src/playerselect.js` to MUI.
- [x] **C4** — Migrate `src/playerui.js` to MUI.
- [x] **C5** — Migrate `src/components.js` to MUI. Move `components.styl` selectors into `styled()` at the bottom of `components.js`.
- [x] **C6** — Migrate `src/menuui.js` to MUI. Move `menu.styl` into `styled()` in `menuui.js`.
- [x] **C7** — Migrate `src/touch.js` to MUI. Move `touch.styl` into `styled()` in `touch.js`.
- [x] **C8** — Migrate `src/library.js` to MUI.
- [x] **C9** — Migrate `src/playlist.js` to MUI. Move `playlist.styl` into `styled()` in `playlist.js`.

Each commit also:
- Updates `@mui/icons-material` icon mapping decisions in the "Icon decisions" section below.
- Checks off the corresponding box above.
- Updates any tests that reference now-removed Semantic class selectors.

**Termination**

- [x] **T1** — Remove `import 'semantic-ui-css/semantic.min.css'` from `src/app.js`. Visual cliff; keep isolated so a regression is trivially revertable. QA pass before proceeding.
- [x] **T2** — `npm uninstall semantic-ui-react semantic-ui-css`.
- [x] **T3** — Delete any remaining `.styl` files and their imports; remove `src/app.styl` if empty.
- [x] **T4** — `npm uninstall stylus stylus-loader`; remove `.styl` handling from `webpack.config.js`; delete this plan file. *Plan file kept as a migration record; user can delete it whenever they like.*

### Icon decisions (filled in as each file migrates)

_Recorded here for reuse across later files._

| Semantic icon name | MUI replacement | First used in |
|---|---|---|
| `backward` | `FastRewindRounded` | `playerui.js` |
| `forward` | `FastForwardRounded` | `playerui.js` |
| `pause` | `PauseRounded` | `playerui.js` |
| `play` | `PlayArrowRounded` | `playerui.js` |
| `window minimize` | `RemoveRounded` | `playerui.js` |
| `plus` | `AddRounded` | `components.js` |
| `plus square outline` | `AddBoxRounded` | `components.js` |
| `long arrow alternate right` | `ArrowRightAltRounded` | `components.js` |
| `x` / close (✕) | `CloseRounded` | `components.js` |
| `info circle` | `InfoRounded` | `components.js` |
| `content` (hamburger) | `MenuRounded` | `components.js` |
| `repeat` (with "1" overlay) | `RepeatOneRounded` | `components.js` |
| `repeat` | `RepeatRounded` | `components.js` |
| `random` (in outlined box) | `ShuffleOnRounded` | `components.js` |
| `random` | `ShuffleRounded` | `components.js` |
| `step forward` | `SkipNextRounded` | `components.js` |
| `sort content ascending` | `SortRounded` | `components.js` |
| `video play` (active playlist row) | `PlayCircleRounded` | `playlist.js` |
| `bed` | `BedRounded` | `menuui.js` |
| `power` | `PowerSettingsNewRounded` | `menuui.js` |
| `volume down` | `VolumeDownRounded` | `menuui.js` |
| `volume up` | `VolumeUpRounded` | `menuui.js` |
| `warning` | `WarningRounded` | `menuui.js` |
| `right angle` (breadcrumb separator) | `NavigateNextRounded` | `library.js` |
| `search` | `SearchRounded` | `library.js` |
| `bars` (hamburger menu trigger) | `MenuRounded` | `playlist.js` |
| `save` | `SaveRounded` | `playlist.js` |
| `remove` (trash) | `DeleteRounded` | `playlist.js` |

### Polish backlog (batch after T1)

Visual-regression items the user has flagged during the migration. All
deferred until `semantic-ui-css` is removed so that the baseline is
pure MUI.

- ~~Library row hover action buttons (`PlaylistButtons` in `MediaInfo`):
  blue icons and blue outlines.~~ Addressed in "Tune grouped button
  style" — `variant="contained"` + `color="inherit"` + a shared
  `GROUPED_ICON_BUTTONS` sx uses `action.hover` for the background
  and `text.secondary` for the icon color.
- ~~Repeat & shuffle buttons (`RepeatShuffleGroup`) do not expand
  to fill the allocated column width.~~ Addressed: `fullWidth` on the
  ButtonGroup plus an explicit breakpoint-based width on
  `.repeat-shuffle` in `playerui.js`.

### Global-style residue

Rules like `.rc-slider-tooltip { z-index: 200 }` (in `components.styl`) and `.deemphasize` (in `app.styl`) that don't naturally belong to a single component: push toward the consuming component first; fall back to `theme.js` via `MuiCssBaseline.styleOverrides` only when no component owns them.

### Reusing existing patterns

- **`styled()` shape**: follow `mui-migration-take2`'s commit `d05b295` (`HoverIconContainer` in `src/components.js`) as the canonical pattern for co-located styled components.
- **`forwardRef`**: already in use in `src/touch.js` (current `Ref` consumer); use the existing approach when removing Semantic's `Ref`.

## Verification

After **every** commit:

- `npm run build` — Webpack must succeed (ESLint runs via `eslint-webpack-plugin`).
- `npm test` — Mocha/Enzyme suite. Tests referencing Semantic class selectors (`.ui.button`, etc.) update in the same commit as the file they test.

After each per-file migration commit:

- `npm run dev` → manual pass at `localhost:3000`. Compare against `before-migration.png` (local, not committed).
- Exercise the golden path for the migrated area: select a player, browse library, edit playlist (add/remove/reorder), toggle repeat/shuffle/volume, open the sidebar.

After **T1** specifically:

- Thorough manual pass — where any residual Semantic-class-dependence surfaces.

After **T4**:

- Final full-app smoke test.
- Verify dark mode by temporarily swapping `lightTheme` → `darkTheme` in `src/app.js`.

## Post T4 Verification Notes

- [x] Refactor to implement a `MediaQuery` component
  - [x] use `useMediaQuery` and `theme.breakpoints` intnerally
  - [x] `<MediaQuery [down='sm'] [up='sm']>` where `up` and `down` attributes are mutually exclusive
- [x] change responsive break point from 500px to 600px (use MUI standard break points)
  - [x] Use `<MediaQuery down="sm">...</MediaQuery>` (< 600px) and `up('sm')` / `up('md')` throughout. The 500px "smallScreen" boundary and the 700px "wider"/"narrow" boundary collapsed into a single `sm` breakpoint; the 850px "wideScreen" boundary maps to `md`.
  - [x] Remove `react-media` from dependencies. All `<Media>` wrappers replaced with `<MediaQuery>`.

- [x] add button styles to theme
  - [x] gray, not white
  - [x] no outline
  - [x] square with rounded corners, not round
  - [x] Claude implementation comments
    - Set MuiButton and MuiButtonGroup defaultProps to variant="contained",
      color="inherit", disableElevation=true. MUI's built-in rendering for
      contained+inherit is already a flat gray rectangle (grey[300] in light
      mode, grey[700] in dark mode) with a darker hover, no border, rounded
      corners from theme.shape.borderRadius — exactly the Semantic UI basic
      button look the app wanted.
    - This is the conventional way to change MUI defaults app-wide via the
      theme's components.defaultProps. Alternative (mentioned for reference
      but not adopted here): add a custom variant="toolbar" to MuiButton.
      variants and opt in per call site. That would preserve MUI's default
      blue-text look for bare <Button>, but the SUI-style grouped buttons
      are this app's dominant usage, so changing the default is less
      ceremony.

- adjust styling to work with MUI default line-height of 1.5

- large screen
  - top bar
    - [x] has light gray color, should be white
    - [x] buttons have round hover highlight, should be square, full height
    - player selector
      - [x] should not have have a border/outline
      - [x] should have constant width, elide player name if too long
    - sleep button
      - [x] has wrong icon, should use BedtimeRounded
      - [x] when sleep is cancelled the icon should be BedtimeOffRounded
      - [x] does not cancel fade on hover
      - [x] menu styling weirdness (removed ListItemButton nesting)
    - [x] power button is blue when turned on, should be gray
    - [x] play progress is below the bar, should be just above bottom border
  - sidebar
    - [x] appears above the drop shadow and border of the top bar
    - [x] does not shift main content when closed
    - [x] main menu items and search box do not use full menu width
    - search box
      - [x] should have margins around border
      - should have 1px border/outline when focused
    - [x] version number in main menu should be light gray
    - hover buttons
      - [x] are transparent, underlying text bleeds through (should not)
      - [x] content width can push them out beyond edge of sidebar
  - lower-right control menu
    - [x] fix button position on small screen
    - [x] fix menu position on small screen
    - [x] fix button layout in menu

- tablet screen
  - TODO

- phone screen
  - playlist
    - does not scroll to correct position when player UI is visible after reload?
      - works correctly if switch to large screen and then back
  - TODO


**Goal**: refactor and simplify the code to use MUI conventions and defaults throughout.
