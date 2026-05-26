# TODO

- rework player screen on phone
  - large artwork
  - no playlist
  - toggle button where artwork was on bottom player bar
  - add skip forward/back buttons at end of seek bar
- select mode
  - invert selection button in top bar
  - back button in top bar? (problematic: does other back button work the same?)

- mobile (firefox?) bug: media session causes audio from other apps to not play
  - [x] workaround: disable media session on power off player
- alarm clock mode
  - [x] snooze feature
  - access to alarms
- fix play/pause bug where a track wants to advance but gets stuck in a loop
  - observe play command sent by Material skin
- fix drag/drop in Chrome on Android

- fix play/pause via browser media session on Chrome
- [x] invalidate browser cache on install new version on server
- fix cover art displayed in the Now Playing part of the display often belongs to the previous track
  this may be a bug in LMS, not the skin
- [x] distribute as proper LMS plugin (show in "Inactive plugins" in settings)
- fix auto-load playlist does not always load, showing blank loading section
  TODO reproduction steps
- make path elements in song path (parent folders) clickable
- allow drag/drop breadcrumbs into playlist
- fix memory leak error on switch to/from responsive mode
- playlist menu should not close on click repeat/shuffle buttons (and maybe prev/next too)
- change repeat/shuffle buttons in large player view to volume up/down now that
  repeat/shuffle are in playlist menu
- add operating system media playback integration
- fix playlist menu position on show large player
  - possibly hide playlist entirely?
- MediaInfo icons should be links with href="<url>"

- upgrade libraries to latest versions
- run tests in browser at http://localhost:3000/test
- browsersync does not always reload the page
- HMR does not apply changes correctly
- fix breadcrumbs do not update properly after BrowserSync reload + click new crumb link

- compare bundle size to v0.3.3a0 or v0.3.2 and optimize if possible
- fix unnecessary render in menu on gotPlayer
- fix delete not deleting all selected items
- hotkey help screen
- hotkey for menu
- translate text: error messages, track info field names, search, etc.
- playlist
  - track info popup
    - button to remove from playlist
    - show plugin actions (walk with me, youtube, etc.)
  - [x] do not hard-code playlist range [0, 100]
  - [x] infinite scroll - http://devblog.orgsync.com/react-list/

- add more content types to search
  - playlists? - looks like this is possible (cmd "playlists search:<term>")
  - folders/files?
- swipe to delete track(s) (delete multiple if selected)
- get better slider controls? (maybe not since upgrade)
- [x] add volume buttons to end of slider when < ?480px?

- fix auto-advance to next track after play previous then skip to end
  this appears to be a bug in LMS (can reproduce on stock web interface)

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
