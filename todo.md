# TODO

- upgrade libraries

- fix playlist loads (maximum) first 100 tracks
- fix delete not deleting all selected items
- fix /ultralight/menu... paths 404 when hosted by LMS

- ui rearrange
  - responsive
    - components
      - large screen (>500px)
        - top player bar
        or
        - top player controls sticky below top bar
      - small screen (<=500px)
        - bottom player bar
        or
        - full screen player controls
    - need to use fixed menus because otherwise we'd need to use JS to resize
      the container element to match viewport size (ugly)
    - problem: variable height top/bottom menus obscure primary content
      - need to adjust margins of primary content based on size of menus
        - use componentDidMount + ref to get size
        - use inline stlye={obj} in element to set style
  - player bar
    - components
      - play/pause button
      - track art
      - track details (title, artist)
      - volume up/down
      - blue progress line along edge of player bar
    - integrate into top bar on large screens
      - click track details to increase size of top bar to include full player
        with scrollable playlist below
    - bottom of screen on small screens
      - click track details to switch to full player view with back button
        - click back button to return to playlist view
  - show full player
    - track art/details are a clickable tile that shows full player controls
      - next/play/pause/prev
      - volume
      - repeat/shuffle
      - album art
      - track details
      - progress
  - reduce sice of playlist when expanding menu (rather than pushing off the side)
  - scroll currently playing playlist item near top of screen
    - scroll slowly at first 5s to allow manual intervention/override
- implement pagination
  - load more playlist items on scroll (virtualized list)
    - option: react-beautiful-dnd
      - pattern for multi-drag
        https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/patterns/multi-drag.md
      - he's working on virtualization as of June 10, 2018
        https://github.com/atlassian/react-beautiful-dnd/issues/68
    - option: react-sortable-hoc + react-tiny-virtual-list
      https://github.com/clauderic/react-sortable-hoc/
      https://github.com/clauderic/react-tiny-virtual-list/
      - need to implement multi-drag (no pattern provided)
- hotkey help screen
- hotkey for menu
- add current tack icon, title, artist to menu bar
- file path should be a clickable link to download the file
- translate text: error messages, track info field names, search, etc.
- add "..." item at end of search result section to get more results
- add play progress bar along bottom edge of power bar (when scrolled below seek bar)
- playlist
  - track info popup
    - button to remove from playlist
    - show plugin actions (walk with me, youtube, etc.)
  - do not hard-code playlist range [0, 100]
  - infinite scroll - http://devblog.orgsync.com/react-list/

- add more content types to search
  - playlists? - looks like this is possible (cmd "playlists search:<term>")
  - folders/files?
- enter/return key should accept delete confirmation
- swipe to delete track(s) (delete multiple if selected)
- get better slider controls? (maybe not since upgrade)
- add volume buttons to end of slider when < ?480px?

- fix auto-advance to next track after play previous then skip to end
  this appears to be a bug in LMS (can reproduce on stock web interface)

- replace semantic-ui-react with
  - https://blog.bitsrc.io/11-react-component-libraries-you-should-know-178eb1dd6aa4
  - https://material.io/ via https://github.com/jamesmfriedman/rmwc (con: no CSS?)
  - https://ant.design/docs/react/introduce

- after switch to material.io
  - fix buttons stay in hover state after click
  - fix track icon weirdness on touch to show info (info icon persists)
  - fix spacing in progress/seek bar
  - fix spacing in control bar (rw/play/ff volume repeat/random)
  - show track info segment with slide down transition (hide with slide up)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# Links

JS programming
- https://www.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool/  

UI libraries:
- http://devarchy.com/react-components - links to many different ones
- slip.js - awesome touch sort/swipe list interaction
  https://kornel.ski/slip/
  https://github.com/pornel/slip/blob/master/slip.js
  https://github.com/JedWatson/react-hammerjs
  https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
    http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
    https://hacks.mozilla.org/2013/04/detecting-touch-its-the-why-not-the-how/

- semantic-ui-react
  - package.json items:
    "sanitize.css": "latest",
    "semantic-ui-css": "^2.2.4",
    "semantic-ui-react": "^0.63.1"
