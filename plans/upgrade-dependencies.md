# Dependency Upgrade & Elimination Plan

## Context
The ultralight project has accumulated several categories of dependency debt:
- **Unused packages** – listed in package.json but never imported
- **Version lag** – packages with available minor/patch bumps
- **Major-version upgrades** – packages behind a major boundary, requiring code changes
- **Eliminatable packages** – packages whose purpose is now served by native browser APIs or simpler alternatives

The goal is to clean up one item at a time, running tests after each, so regressions are isolated.

---

## Steps

### Phase 1 – Remove Unused Dependencies (no code changes required)

- [x] **Step 1: Remove `react-document-title`**
  - **Why**: Completely unused. `document.title` is set directly in `src/menu.js`.
  - **Change**: Remove from `package.json` dependencies; run `npm install`.

- [x] **Step 2: Remove `json-loader`**
  - **Why**: Not referenced anywhere in `webpack.config.js`. Webpack 5 handles JSON imports natively.
  - **Change**: Remove from `package.json` devDependencies; run `npm install`.

- [x] **Step 3: Remove `react-test-renderer`**
  - **Why**: Not imported in any test file; listed in devDependencies but never used.
  - **Change**: Remove from `package.json` devDependencies; run `npm install`.

---

### Phase 2 – Minor/Patch Version Bumps

- [x] **Step 4: Bump minor/patch packages**
  Bump the following to their latest available minor/patch:
  - `@babel/runtime: ^7.16.3` → `^7.29.0` (align with other Babel packages at 7.28–7.29)
  - `axios: ^1.13.2` → `^1.16.1`
  - `@mui/material` & `@mui/icons-material: ^9.0.0` → `^9.0.1`
  - `lodash: ^4.17.15` → `^4.18.1`
  - `react-intersection-observer`, `react-redux`: latest minor
  - `mocha`, `chai`, `jsdom`, `fs-extra`, `html-webpack-plugin`, `mini-css-extract-plugin`, `css-loader`, `babel-loader`: latest minor/patch
  - `webpack`, `webpack-dev-server`: latest minor/patch
  - `eslint-plugin-react-hooks: ^7.0.1` → `^7.1.1`
  - **Change**: Update `package.json` version ranges; run `npm install`.
  - **Verify**: `npm test` green.

---

### Phase 3 – Medium Upgrades (require config/code changes)

- [x] **Step 5: Upgrade ESLint 8 → 9 + eslint-webpack-plugin 4 → 6**
  - **Why**: ESLint 9 uses flat config format; `.eslintrc.js` (legacy) must be migrated to `eslint.config.js`.
  - **ESLint 9 flat config** replaces `.eslintrc.js`. Key mappings:
    - `extends: "eslint:recommended"` → `js.configs.recommended`
    - `plugins: ["react", "react-hooks"]` → import and declare inline
    - Parser: `@babel/eslint-parser` imported as an object
    - `env` → `languageOptions.globals`
  - **Files**: Delete `.eslintrc.js`; create `eslint.config.js`; update webpack.config.js if eslint-webpack-plugin options changed in v6.
  - **Also upgrade**: `eslint-plugin-react ^7.37.5` may need a compatible version for ESLint 9.
  - **Verify**: `npm run build` (ESLint pass) + `npm test`.

- [x] **Step 6: Upgrade `rc-slider` 9 → 11**
  - **Why**: rc-slider 10 removed `Slider.createSliderWithTooltip`. The tooltip API changed.
  - **File**: `src/playerui.js`
    - Remove `const ToolTipSlider = Slider.createSliderWithTooltip(Slider)` (line ~19)
    - In rc-slider 10+, use `handleRender` prop for custom tooltip, or use a plain `<Slider>` with MUI `Tooltip`
    - The `tipFormatter` prop is also removed; tooltip must be handled via `handleRender`
  - **Verify**: Visual check of seek bar and volume slider + `npm test`.

- [ ] **Step 7: Upgrade `copy-webpack-plugin` 13 → 14**
  - **Change**: Bump in package.json; check `webpack.config.js` for any breaking API changes (CopyPlugin constructor options).
  - **Verify**: `npm run build`.

- [ ] **Step 8: Upgrade `webpack-cli` 6 → 7**
  - **Change**: Bump in package.json; check for any CLI flag/command deprecations affecting `package.json` scripts.
  - **Verify**: `npm run build`, `npm run dev` starts.

- [ ] **Step 9: Upgrade `jsdom` 27 → 28**
  - **Change**: Bump in package.json; jsdom is a transitive test dep — run tests to confirm no breakage.
  - **Verify**: `npm test`.

---

### Phase 4 – Small Eliminations with Code Changes

- [ ] **Step 10: Remove `prop-types`**
  - **Why**: Only 5 PropTypes declarations in 2 files. React has deprecated the prop-types package.
  - **Files**:
    - `src/menucontext.js` – remove `PropTypes.func.isRequired` declarations
    - `src/touch.js` – remove 3 PropTypes declarations
  - **Change**: Remove import, remove declarations, remove from package.json, run `npm install`.
  - **Verify**: `npm test`.

- [ ] **Step 11: Remove `intersection-observer` polyfill**
  - **Why**: IntersectionObserver has >97% native browser support. The conditional polyfill in `src/polyfills.js` is no longer needed.
  - **Files**: `src/polyfills.js` – remove the `if (window.IntersectionObserver === undefined)` block (or delete file if empty).
  - **Change**: Remove package from package.json, remove/simplify polyfills.js.
  - **Verify**: `npm test`; manually confirm intersection-based features still work.

- [ ] **Step 12: Replace `react-resize-detector` with native ResizeObserver hook**
  - **Why**: ResizeObserver is natively supported; `react-resize-detector` is a thin wrapper. Eliminate the dependency.
  - **Files**: `src/menuui.js`, `src/touch.js` – replace `useResizeDetector()` with a small custom hook:
    ```js
    function useResizeObserver(ref) {
      const [size, setSize] = useState({ width: undefined, height: undefined })
      useEffect(() => {
        if (!ref.current) return
        const observer = new ResizeObserver(([entry]) => {
          setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
        })
        observer.observe(ref.current)
        return () => observer.disconnect()
      }, [ref])
      return size
    }
    ```
  - **Change**: Create `useResizeObserver` in a new file: `src/resizeobserver.js`. Replace `useResizeDetector` calls, remove package from package.json.
  - **Verify**: `npm test`; visually confirm resize-dependent layouts.

---

### Phase 5 – Enzyme → React Testing Library Migration

Enzyme is unmaintained. The community adapter (`@cfaester/enzyme-adapter-react-18`) likely has no React 19 counterpart, so migrating off Enzyme now makes the React 19 upgrade in Phase 6 cleaner.

**Packages added**: `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`
**Packages removed**: `enzyme`, `@cfaester/enzyme-adapter-react-18`, `babel-plugin-rewire`

> **Note on `babel-plugin-rewire`**: Four test files mock internal module variables via `__RewireAPI__.__set__()`. Since the project uses Mocha (not Jest), Jest module mocking is not available. The migration strategy is to use `sinon` stubs for module-boundary mocking, or refactor the affected code to accept dependencies as arguments. Each test file must be handled case-by-case.

- [ ] **Step 13: Migrate `test/components.test.js` to RTL**
  - Uses `shallow()` for basic component rendering.
  - Replace with RTL `render()` + DOM queries (`getByRole`, `getByText`, etc.).

- [ ] **Step 14: Migrate `test/touch.test.js` to RTL**
  - Uses `shallow()` and `render()`.
  - Uses `babel-plugin-rewire` (4 rewire calls) — refactor or add `sinon`.

- [ ] **Step 15: Migrate `test/library.test.js` to RTL**
  - Uses `shallow()`.
  - Uses `babel-plugin-rewire`.

- [ ] **Step 16: Migrate `test/playerselect.test.js` to RTL**
  - Uses `shallow()`.
  - Likely simplest of the enzyme files.

- [ ] **Step 17: Migrate `test/playlist.test.js` to RTL**
  - Uses both `shallow()` and direct `module.__Rewire__()` for timer mocking — most complex.
  - Tackle last.

- [ ] **Step 18: Remove Enzyme + babel-plugin-rewire**
  After all 5 test files are migrated:
  - Remove `enzyme`, `@cfaester/enzyme-adapter-react-18`, `babel-plugin-rewire` from package.json.
  - Remove enzyme setup from `test/helpers/main.js`.
  - Remove `babel-plugin-rewire` from `babel.config.json` test env.

---

### Phase 6 – Major Framework Upgrades

- [ ] **Step 19: Upgrade React 18 → 19**
  - **Known React 19 changes**:
    - `ref` is now a plain prop (no more `forwardRef`); update any `forwardRef` usage
    - `react-dom/client` API is stable (already used in v18)
    - Concurrent features are on by default
    - Check `react-redux` compat (already at v9, which supports React 19)
    - With Enzyme already removed (Phase 5), no adapter concern
  - **Files**: `package.json` (react, react-dom); also bump react-test peer deps if any.
  - **Verify**: Full `npm test`; visual QA of the app.

- [ ] **Step 20: Upgrade React Router 6 → 7**
  - **Known changes**: React Router v7 reworked to align with Remix; SPA usage is still supported.
  - **Files** (4 files): `src/app.js`, `src/menuui.js`, `src/library.js`, `src/mediasession.js`
  - **Key API changes to check**:
    - `useMatch` signature may differ
    - `matchPath` return type changes
    - Verify `useHref`, `Link`, `Routes`, `Route` still work as before
  - **Verify**: Full `npm test`; test routing between library/player views manually.

---

### Phase 7 – Large Refactors (deferred / separate initiative)

- **Replace lodash with native ES**: 20 source files, 36 distinct functions. High effort. Most have direct native equivalents; `_.debounce`, `_.throttle`, `_.isEqual`, `_.chain` need custom helpers or a small focused lib.

---

## Verification (per step)
- Propose a commit message after each change.
- Run `npm test` after every step
- For webpack changes: also run `npm run build`
- For ESLint changes: also check `npm run build` lint output
- For React/Router upgrades: manual smoke test of app in browser
- Wait for review and commit before proceeding to next item.
