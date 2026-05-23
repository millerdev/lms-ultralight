# Post-migration code cleanup

## Context

The MUI migration is complete and the UI looks good. However, the migration introduced several consistency issues: `sx` props scattered in logic/render components (the migration plan explicitly forbids them there), legacy React APIs left over from the pre-migration code, dead/commented-out code, confusing identifier names, and a few hardcoded values that belong in the theme or as named constants. This plan addresses each issue in a separate commit so changes are easy to review and revert.

## Commits (in order)

- [x] **1** — Remove commented-out DevTools code
- [x] **2** — Fix inverted `ICON_STYLES` names in `TrackInfoIcon`
- [x] **3** — Replace `contextTypes` with `useContext`; remove dead `contextTypes`
- [x] **4** — Move minimize-button `sx` into `PlayerRoot`
- [x] **5** — Extract `DenseToolbar` to eliminate repeated Toolbar `sx`
- [x] **6** — Move `SidebarMenu` layout `sx` into styled components
- [x] **7** — Move `PlayerBar` inline `sx` into styled components
- [x] **8** — Move `ActionMenu` `sx` into styled components
- [x] **9** — Move `PlaylistItem` info-panel `Paper sx` into `TrackInfoPaper`
- [ ] **10** — Extract progress-bar color constants from `MainMenuRoot`
- [ ] **11** — Use theme color for `TouchListItemEl` drop-indicator shadow

---

### 1. Remove commented-out DevTools code
**Files:** `src/app.js`, `src/store.js`

Two files still carry the old Redux DevTools comments from before the migration. Remove:
- `app.js` line 7: `//import DevTools from './devtools'`
- `app.js` line 53: `{/* <DevTools /> */}`
- `store.js` line 4: `//import DevTools from './devtools'`
- `store.js` line 11: `//DevTools.instrument()`

---

### 2. Fix inverted `ICON_STYLES` names in `TrackInfoIcon`
**File:** `src/components.js`

`ICON_STYLES` has `big: 36px` and `large: 20px` — the names are inverted (`large` is the *smaller* of the two). Rename so names and sizes match:

```js
const ICON_STYLES = {
  large: { height: "36px", width: "36px" },  // was "big"
  small: { height: "20px", width: "20px" },   // was "large"
}
```

Update the single usage:
```js
const dims = props.smallScreen ? ICON_STYLES.large : ICON_STYLES.small
```

---

### 3. Replace `contextTypes` with `useContext`; remove dead `contextTypes`
**Files:** `src/components.js`, `src/playerui.js`

Two function components still use the legacy React `contextTypes` API (deprecated since React 16.3):

**`components.js` — `MediaInfo` (active usage):**
`MediaInfo = (props, context) => { const mediaNav = props.mediaNav || context.mediaNav ... }` reads `mediaNav` from the legacy context API. Replace with `useContext(MenuContext)`:
```js
import { useContext } from 'react'
import { MenuContext } from './menucontext'
// ...
export const MediaInfo = (props) => {
  const { mediaNav: contextMediaNav } = useContext(MenuContext)
  const mediaNav = props.mediaNav || contextMediaNav
  // ...
}
// Remove MediaInfo.contextTypes
```

**`playerui.js` — `CurrentTrackInfo` (dead code):**
`CurrentTrackInfo.contextTypes` is declared but `CurrentTrackInfo` only destructures props — it never reads the second `context` argument, so the declaration has no effect. Remove it. `drillable()` handles `mediaNav = undefined` gracefully (returns plain text), which is the current behavior anyway.

Also remove the `PropTypes` import from `playerui.js` if it becomes unused.

---

### 4. Move minimize-button `sx` into `PlayerRoot`
**File:** `src/playerui.js`

`PlayerUI` renders `<IconButton sx={{ float: "right" }}>` (an `sx` in a render component). All layout rules belong in `PlayerRoot`. Add a selector and use `className` instead:
- Add `'& .minimize-button': { float: 'right' }` to `PlayerRoot`'s styled definition
- Replace `sx={{ float: "right" }}` with `className="minimize-button"` on the `IconButton`

---

### 5. Extract `DenseToolbar` to eliminate repeated Toolbar `sx`
**File:** `src/menuui.js`

The pattern `<Toolbar variant="dense" disableGutters sx={{ gap: 1, paddingX: 1 }}>` appears identically twice — in `PowerBar` (line 184) and in `PlayerBar`'s bottom case (line 278). Extract to a styled component at the bottom of the file:

```js
const DenseToolbar = styled(Toolbar)(({ theme }) => ({
  gap: theme.spacing(1),
  paddingInline: theme.spacing(1),
}))
```

Replace both call sites with `<DenseToolbar variant="dense" disableGutters>`.

---

### 6. Move `SidebarMenu` layout `sx` into styled components
**File:** `src/menuui.js`

`SidebarMenu` is a logic component (has `useMatch`, `useEffect`) but contains three `sx` blocks:

1. `<Box sx={{ display: 'flex' }}>` — layout wrapper
2. `<Drawer sx={{ width, flexShrink, '& .MuiDrawer-paper': { ... } }}>` — complex static styles
3. `<Box component="main" sx={{ flexGrow, minWidth, marginLeft, transition }}>` — dynamic `marginLeft`

Create at the bottom of `menuui.js`:

```js
const SidebarLayout = styled(Box)({ display: 'flex' })

const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    top: TOOLBAR_HEIGHT,
    height: `calc(100% - ${TOOLBAR_HEIGHT})`,
  },
}))

const SidebarMain = styled(Box, {
  shouldForwardProp: prop => prop !== 'menuOpen',
})(({ theme, menuOpen }) => ({
  flexGrow: 1,
  minWidth: 0,
  marginLeft: menuOpen ? 0 : `-${DRAWER_WIDTH}px`,
  transition: theme.transitions.create('margin-left'),
}))
```

Replace the three `sx`-bearing elements in `SidebarMenu` with these three components. Pass `menuOpen` as a prop to `SidebarMain`.

---

### 7. Move `PlayerBar` inline `sx` into styled components
**File:** `src/menuui.js`

`PlayerBar` has five `sx` blocks that belong in styled components. Create at the bottom of `menuui.js`:

```js
// Clickable track info area (album art + text)
const TrackInfoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
  cursor: 'pointer',
}))

// Album art thumbnail (replaces Box component="img")
const AlbumArtImg = styled('img')({
  width: 32,
  height: 32,
  flex: '0 0 auto',
})

// Text overflow wrapper
const TrackTextBox = styled(Box)({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

// AppBar pinned to bottom of screen
const BottomAppBar = styled(AppBar)(({ theme }) => ({
  top: 'auto',
  bottom: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
}))

// Inline flex wrapper (PlayerBar in top bar, non-bottom mode)
const InlinePlayerBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))
```

Replace the corresponding `sx`-bearing elements. `Box component="img"` → `<AlbumArtImg src={...} />`.

---

### 8. Move `ActionMenu` `sx` into styled components
**File:** `src/playlist.js`

Two `sx` usages in `ActionMenu` (a stateful logic component):

**Floating trigger button** (lines 681–689):
`<IconButton sx={{ position: 'fixed', right: '0.7em', bottom: ..., zIndex: 100 }}>` — `bottom` depends on `smallScreen && miniPlayer`.

```js
const FloatingMenuButton = styled(IconButton, {
  shouldForwardProp: prop => prop !== 'bottomOffset',
})(({ bottomOffset }) => ({
  position: 'fixed',
  right: '0.7em',
  bottom: bottomOffset,
  zIndex: 100,
}))
```

Pass `bottomOffset={smallScreen && miniPlayer ? `calc(${TOOLBAR_HEIGHT} + 0.7em)` : '0.7em'}` as a prop.

**Icon margin on `MenuItem`s** (lines 700–703):
`<SaveRounded sx={{ marginRight: 1 }} />` and `<DeleteRounded sx={{ marginRight: 1 }} />`.
Create a wrapper at the bottom:
```js
const MenuItemIcon = styled('span')(({ theme }) => ({
  marginRight: theme.spacing(1),
  display: 'inline-flex',
}))
```
Wrap each icon: `<MenuItemIcon><SaveRounded fontSize="small" /></MenuItemIcon>`.

---

### 9. Move `PlaylistItem` info-panel `Paper sx` into `TrackInfoPaper`
**File:** `src/playlist.js`

`PlaylistItem.render` uses `<Paper variant="outlined" sx={{ padding: 1, marginTop: 1 }}>`. Add a styled component at the bottom:

```js
const TrackInfoPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
}))
```

Replace `<Paper variant="outlined" sx={{ padding: 1, marginTop: 1 }}>` with `<TrackInfoPaper variant="outlined">`.

---

### 10. Extract progress-bar color constants from `MainMenuRoot`
**File:** `src/menuui.js`

`MainMenuRoot` embeds five hardcoded hex values for the song-time and volume progress bars. Extract as named constants near the top of the styled-components section:

```js
const PROGRESS_BASE_COLOR = '#96dbfa'
const SONG_TIME_GRADIENT = 'linear-gradient(to left, #74e3ec, #c7ffe2)'
const VOLUME_LEVEL_GRADIENT = 'linear-gradient(to left, #ff6e56, #fffd86)'
```

Reference these in `MainMenuRoot` in place of the inline hex values.

---

### 11. Use theme color for `TouchListItemEl` drop-indicator shadow
**File:** `src/touch.js`

`TouchListItemEl` uses `black` as the shadow color for drag-and-drop indicators, which is theme-unaware and breaks in dark mode:
```js
'&.dropBefore': { boxShadow: 'inset 0 4px 3px -5px black' },
'&.dropAfter':  { boxShadow: 'inset 0 -4px 3px -5px black' },
```

Replace with `theme.palette.text.primary`:
```js
'&.dropBefore': { boxShadow: `inset 0 4px 3px -5px ${theme.palette.text.primary}` },
'&.dropAfter':  { boxShadow: `inset 0 -4px 3px -5px ${theme.palette.text.primary}` },
```

---

## Verification

- Pause before each commit, suggesting a commit message and waiting for review. User may make adjustments and will commit.
- During the pause before each commit:
  - `npm run build` — build must pass (ESLint runs as part of build)
  - `npm test` — all 237 tests must pass

For commits 3–9 (component rendering changes): manual smoke test in the browser to confirm affected areas render and behave identically to before.
