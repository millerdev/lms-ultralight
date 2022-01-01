import React from 'react'

import playerControl from './playctl'

const MediaSession = ({
  dispatch,
  playerid,
  isPowerOn,
  isPlaying,
  currentTrack,
}) => {
  const ref = React.useRef()
  const [controls] = React.useState(mediaControls(ref))

  React.useEffect(() => {
    const playctl = playerControl(playerid, dispatch, {
      player: {isPowerOn, isPlaying},
      currentTrack,
    })
    controls.update(playctl)
  }, [dispatch, playerid, isPowerOn, isPlaying, currentTrack, controls])

  return controls.audio
}

function mediaControls(ref) {
  // Uses a practically inaudible sound that triggers Firefox's
  // AudibilityMonitor: a single low amplitude 19Hz sine wave
  // followed by 10s of silence.
  // https://hg.mozilla.org/mozilla-central/file/d0a94b1f309b1399c97628ff8aa804ad8b243215/dom/media/AudibilityMonitor.h
  const AUDIO_FILE = "/19hz-silence.mp3"
  const hasSession = window.navigator && "mediaSession" in window.navigator
  let shouldShow = true

  function showControls(audio) {
    shouldShow = false
    audio.volume = 0.00001  // very low volume level
    audio.play()
    audio.currentTime = 0
    // pause before track ends so controls remain visible
    setTimeout(() => audio.pause(), 5000)
  }

  function updateSession(playctl) {
    const session = window.navigator.mediaSession
    session.metadata = new window.MediaMetadata({
      ...playctl.metadata,
      artwork: [{src: playctl.imageUrl}],
    })
    session.playbackState = playctl.isPlaying ? "playing" : "paused"
    session.setActionHandler("pause", playctl.playPause)
    session.setActionHandler("play", playctl.playPause)
    session.setActionHandler("nexttrack", playctl.nextTrack)
    session.setActionHandler("previoustrack", playctl.prevTrack)
  }

  return {
    audio: hasSession && <audio ref={ref} src={AUDIO_FILE} />,
    update: playctl => {
      if (hasSession) {
        const audio = ref.current
        shouldShow && audio && playctl.isPlaying && showControls(audio)
        updateSession(playctl)
      }
    },
  }
}

export default MediaSession
