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
export const playerControl = (playerid, dispatch, state) => {
  const self = {playerid}

  self.loadPlayer = (...args) => {
    loadPlayer(playerid, ...args)
      .then(dispatch)
  }

  self.togglePower = () => {
    self.command("power", state.player.isPowerOn ? 0 : 1)
  }

  self.command = (...args) => {
    lms.command(playerid, ...args)
      .then(() => loadPlayer(playerid))
      .catch(err => dispatch(operationError("Command error", {args, err})))
      .then(dispatch)
  }

  self.playItems = items => {
    const played = []
    let promise = lms.playlistControl(playerid, "load", items[0], dispatch)
      .then(success => success && played.push(items[0]))
    if (items.length > 1) {
      promise = self.addToPlaylist(items.slice(1), promise)
        .then(added => played.push(...added))
    }
    return promise.then(() => played)
  }

  self.playNext = item => {
    return lms.playlistControl(playerid, "insert", item, dispatch)
      .then(success => {
        if (success && !state.player.isPlaying) {
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

  self.addToPlaylist = (items, promise=resolved(true)) => {
    const added = []
    const addItem = (promise, item) => promise.then(() => {
      return lms.playlistControl(playerid, "add", item, dispatch)
        .then(success => success && added.push(item))
    })
    return items.reduce(addItem, promise).then(() => added)
  }

  self.playOrEnqueue = item => {
    if (!state.playlist.numTracks) {
      self.playItems([item])
    } else if (!state.player.isPlaying) {
      self.playNext(item)
    } else {
      self.addToPlaylist([item])
    }
  }

  return self
}
