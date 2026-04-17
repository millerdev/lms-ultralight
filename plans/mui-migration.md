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

- Look at the commits on the `mui-migration-take2` branch since commit a8eab398cb29446f0a914221c86c486887683130 for context on how this migration has been approached in the past. That was a messy attempt. Take a cleaner approach this time where we have a clear indication of progress and next steps if the work needs to be paused at any time along the way.
- Many component layout styles have been moved into the theme. This is the wrong approach. Instead move them into `styled` components. Example commit: "theme: localize hover-icon interactions" git:d05b295e7ff79edea63ab47482d11a102ce14460

Make a plan of the approach first, then pause for adjustments before commencing with the migration.
