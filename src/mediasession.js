import React from 'react'

const MediaSession = ({ playctl }) => {
  const controls = useMediaControls()
  React.useEffect(() => controls.update(playctl), [controls, playctl])
  return controls.audio
}

function useMediaControls() {
  // Uses a practically inaudible sound that triggers Firefox's
  // AudibilityMonitor: a single low amplitude 19Hz sine wave
  // followed by 10s of silence.
  // https://hg.mozilla.org/mozilla-central/file/d0a94b1f309b1399c97628ff8aa804ad8b243215/dom/media/AudibilityMonitor.h
  const AUDIO_FILE = "/19hz-silence.mp3"
  const hasSession = window.navigator && "mediaSession" in window.navigator
  const ref = React.useRef()
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
      ...playctl.tags,
      artwork: [{src: playctl.imageUrl}],
    })
    session.playbackState = playctl.isPlaying ? "playing" : "paused"
    session.setActionHandler("pause", playctl.playPause)
    session.setActionHandler("play", playctl.playPause)
    session.setActionHandler("nexttrack", playctl.nextTrack)
    session.setActionHandler("previoustrack", playctl.prevTrack)
  }

  function createApi() {
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

  return React.useState(createApi)[0]
}

export default MediaSession
