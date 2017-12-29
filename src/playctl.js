import _ from 'lodash'

import * as lms from './lmsclient'
import * as player from './player'
import { operationError } from './util'

// HACK a thing that can be rewired by tests
const resolved = value => Promise.resolve(value)

export function loadPlayer(playerid, fetchPlaylist=false, options={}) {
  const args = fetchPlaylist ? [0, 100] : []
  return lms.getPlayerStatus(playerid, ...args)
    .then(data => player.reducer.actions.gotPlayer(data, options))
    .catch(err => operationError("Cannot load player", err))
}

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
    self.command("power", state.player.get("isPowerOn") ? 0 : 1)
  }

  self.command = (...args) => {
    lms.command(playerid, ...args)
      .then(() => loadPlayer(playerid))
      .catch(err => dispatch(operationError("Command error", {args, err})))
      .then(dispatch)
  }

  self.playItems = items => {
    const promise = lms.playlistControl(playerid, "load", items[0], dispatch)
    if (items.length > 1) {
      self.addToPlaylist(items.slice(1), promise)
    }
  }

  self.playNext = item => {
    lms.playlistControl(playerid, "insert", item, dispatch)
      .then(success => {
        if (success && !state.player.get("isPlaying")) {
          lms.command(playerid, "playlist", "index", "+1")
            .then(() => loadPlayer(playerid))
            .catch(err => operationError("Play next error", err))
            .then(dispatch)
        }
      })
  }

  self.addToPlaylist = (items, promise=resolved(true)) => {
    _.each(items, item => {
      promise = promise.then(success =>
        success && lms.playlistControl(playerid, "add", item, dispatch)
      )
    })
  }

  self.playOrEnqueue = item => {
    if (!state.playlist.get("numTracks")) {
      self.playItems([item])
    } else if (!state.player.get("isPlaying")) {
      self.playNext(item)
    } else {
      self.addToPlaylist([item])
    }
  }

  return self
}
