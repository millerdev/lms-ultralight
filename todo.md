# TODO

- fix playlist loads (maximum) first 100 tracks
- fix auto-advance to next track after play previous then skip to end
  this appears to be a bug in LMS (can reproduce on stock web interface)

- upgrade libraries
- get rid of immutable.js
- replace semantic-ui-react with
  - https://material.io/ via https://github.com/jamesmfriedman/rmwc
  - or https://ant.design/docs/react/introduce

- after switch to material.io
  - fix buttons stay in hover state after click
  - fix track icon weirdness on touch to show info (info icon persists)
  - fix spacing in progress/seek bar
  - fix spacing in control bar (rw/play/ff volume repeat/random)
  - show track info segment with slide down transition (hide with slide up)

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
  - playlists?
  - folders/files?
- enter/return key should accept delete confirmation
- swipe to delete track(s) (delete multiple if selected)
- get better slider controls? (maybe not since upgrade)
- add volume buttons to end of slider when < ?480px?

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
