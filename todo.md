# TODO

x- large touchlist icons on small screens
x  - playlist
x  - menu
x- show track info (tap playlist icon) on small screen has wrong buttons, buttons modify playlist
xx- use HashRouter instead of BrowserRouter
- volume value indicator should be below volume bar

- fix buttons stay in hover state after click
- fix auto-advance to next track after play previous then skip to end
  this appears to be a bug in LMS (can reproduce on stock web interface)
- fix playlist loads (maximum) first 100 tracks
- fix spacing in progress/seek bar
- fix spacing in control bar (rw/play/ff volume repeat/random)

- upgrade libraries
- get rid of immutable.js
- replace semantic-ui-react with
  - https://material.io/ via https://github.com/jamesmfriedman/rmwc
  - or https://ant.design/docs/react/introduce

- hotkey help screen
- hotkey for menu
- add current tack icon, title, artist to menu bar
- file path should be a clickable link to download the file
- translate text: error messages, track info field names, search, etc.
- add "..." item at end of search result section to get more results
- add play progress bar along bottom edge of power bar (when scrolled below seek bar)
- playlist
  - track info popup
    - clickable track details
    - show plugin actions (walk with me, youtube, etc.)
    - load track details asynchronously (ID3 tags, file path, etc.)
      Disc: 2/2
      Track Number: 8
      File Format: MPEG-4
      Duration: 4:55
      Volume Adjustment: -10.83 dB
      Bitrate: 256kbps CBR
      Sample Rate: 44.1 kHz
      Sample Size: 16Bits
      File Length: 10,305,938
      Location: /Volumes/Work/Shared/Media/Music/2010/Sunlounger/...Lorilee].m4a
      Date Modified: Wednesday, June 10, 2015, 6:43 AM

- add more content types to search
  - playlists?
  - folders/files?
- enter/return key should accept delete confirmation
- swipe to delete track(s) (delete multiple if selected)
- get better slider controls
- playlist
  - do not hard-code playlist range [0, 100]
  - infinite scroll - http://devblog.orgsync.com/react-list/
- add volume buttons to end of slider when < ?480px?
xx- change touch interactions
xx  - touch icon to play track
x  - touch elsewhere to select/deselect
x  - (same as before) show drag handles in selection mode
xx    - can't rearrange after long-touch?
xx  - long-touch to view track details
x- single touch on mobile to play
x- make volume slider action smoother
x- fix size of repeat one/shuffle album commands

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
