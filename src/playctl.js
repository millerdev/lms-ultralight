import * as lms from './lmsclient'
import { loadPlayer } from './player'
import { operationError } from './util'

// HACK a thing that can be rewired by tests
const resolved = value => Promise.resolve(value)

/**
 * Control object for a single player
 *
 * Used to dispatch actions that manipulate the player.
 */
export const playerControl = (dispatch, {
  playerid,
  isPowerOn,
  isPlaying,
  currentTrack,
}) => {
  const self = {
    playerid,
    isPlaying,
    tags: currentTrack,
    get imageUrl() {
      return lms.getImageUrl(currentTrack, playerid)
    },
  }

  self.loadPlayer = (...args) => {
    loadPlayer(playerid, ...args)
      .then(dispatch)
  }

  self.togglePower = () => {
    self.command("power", isPowerOn ? 0 : 1)
  }

  self.command = (...args) => {
    return lms.command(playerid, ...args)
      .then(() => loadPlayer(playerid))
      .catch(err => operationError("Command error", {args, err}))
      .then(dispatch)
  }

  self.playPause = () => self.command(isPlaying ? "pause" : "play")
  self.prevTrack = () => self.command("playlist", "index", "-1")
  self.nextTrack = () => self.command("playlist", "index", "+1")

  self.setVolume = value => self.command("mixer", "volume", value)
  self.volumeDown = () => self.setVolume("-5")
  self.volumeUp = () => self.setVolume("+5")

  self.playItems = (items, params=[]) => {
    const played = []
    let promise = lms.playlistControl(playerid, "load", items[0], params, dispatch)
      .then(success => success && played.push(items[0]))
    if (items.length > 1) {
      promise = self.addToPlaylist(items.slice(1), params, promise)
        .then(added => played.push(...added))
    }
    return promise.then(() => played)
  }

  self.playNext = (item, params=[]) => {
    return lms.playlistControl(playerid, "insert", item, params, dispatch)
      .then(success => {
        if (success && !isPlaying) {
          return lms.command(playerid, "playlist", "index", "+1")
            .then(() => loadPlayer(playerid))
            .catch(err => operationError("Play next error", err))
            .then(dispatch)
            .then(() => success)
        }
        return success
      })
      .then(success => success ? [item] : [])
  }

  self.addToPlaylist = (items, params=[], promise=resolved(true)) => {
    const added = []
    const addItem = (promise, item) => promise.then(() => {
      return lms.playlistControl(playerid, "add", item, params, dispatch)
        .then(success => success && added.push(item))
    })
    return items.reduce(addItem, promise).then(() => added)
  }

  return self
}

export default playerControl
