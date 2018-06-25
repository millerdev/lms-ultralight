import _ from 'lodash'
import React from 'react'

import { LiveSeekBar } from './components'
import { effect, combine, IGNORE_ACTION } from './effects'
import makeReducer from './store'
import * as lms from './lmsclient'
import { PlayerUI, SeekBar } from './playerui'
import { backoff, isNumeric, operationError, timer } from './util'

export const STATUS_INTERVAL = 30  // seconds
export const REPEAT_ONE = 1
export const REPEAT_ALL = 2

export const defaultState = {
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  repeatMode: 0,
  shuffleMode: 0,
  volumeLevel: 0,
  elapsedTime: 0,
  totalTime: null,
  localTime: null,
}

export const reducer = makeReducer({
  gotPlayer: (state, action, status, {resetInterval=true}={}) => {
    const data = {
      playerid: status.playerid,
      isPowerOn: status.power === 1,
      // player (squeezeslave only?) sometimes gets stuck
      // in "play" mode with flag waitingToPlay=1
      isPlaying: status.mode === "play" && !status.waitingToPlay,
      repeatMode: status["playlist repeat"],
      shuffleMode: status["playlist shuffle"],
      volumeLevel: status["mixer volume"],
      elapsedTime: isNumeric(status.time) ? parseFloat(status.time) : 0,
      totalTime: isNumeric(status.duration) ? parseFloat(status.duration) : null,
      localTime: status.localTime,
    }
    return combine({...state, ...data}, [
      effect(advanceToNextTrackAfter, secondsToEndOfTrack(data), data.playerid),
      effect(loadPlayerAfter, resetInterval, data.playerid),
    ])
  },
  seek: (state, action, {playerid, value}, now=Date.now()) => {
    if (state.playerid === playerid) {
      return combine(
        {...state, elapsedTime: value, localTime: now},
        [effect(seek, playerid, value)]
      )
    }
    return state
  },
  advanceToNextTrack: (state, action, playerid, now=Date.now()) => {
    return {...state, elapsedTime: 0, localTime: now}
  },
}, defaultState)

const actions = reducer.actions

/**
 * Return number of seconds to end of song (floating point); null if unknown
 */
export function secondsToEndOfTrack({elapsedTime, totalTime, localTime}, now=Date.now()) {
  if (totalTime === null) {
    return null
  }
  const elapsed = localTime ?
    elapsedTime + (now - localTime) / 1000 : elapsedTime
  return _.max([totalTime, elapsed]) - elapsed
}

export const advanceToNextTrackAfter = (() => {
  const time = timer()
  return (end, ...args) => {
    time.clear(IGNORE_ACTION)
    if (end !== null && end <= STATUS_INTERVAL) {
      return time.after(end * 1000, actions.advanceToNextTrack, ...args)
    }
    return IGNORE_ACTION
  }
})()

export function loadPlayer(playerid, fetchPlaylist=false, options={}) {
  const args = fetchPlaylist ? [0, 100] : []
  return lms.getPlayerStatus(playerid, ...args)
    .then(data => actions.gotPlayer(data, options))
    .catch(err => operationError("Cannot load player", err))
}

export const loadPlayerAfter = (() => {
  const time = timer()
  let fetchBackoff = backoff(STATUS_INTERVAL * 1000)
  return (resetInterval, playerid) => {
    time.clear(IGNORE_ACTION)
    if (resetInterval) {
      fetchBackoff = backoff(STATUS_INTERVAL * 1000)
    }
    const wait = fetchBackoff()
    return time.after(wait, () =>
      loadPlayer(playerid, false, {resetInterval: false})
    )
  }
})()

export function seek(playerid, value) {
  return lms.command(playerid, "time", value)
    .then(() => loadPlayer(playerid))
    .catch(err => operationError("Cannot seek", {value, err}))
}

export class Player extends React.Component {
  command(playerid, ...args) {
    lms.command(playerid, ...args)
      .then(() => loadPlayer(playerid))
      .catch(err => operationError("Command error", {err, args}))
      .then(this.props.dispatch)
  }
  onSeek(playerid, value) {
    this.props.dispatch(actions.seek({playerid, value}))
  }
  render() {
    const props = this.props
    const command = this.command.bind(this, props.playerid)
    return (
      <PlayerUI
        {...props}
        command={command}
      >
        <LiveSeekBar
          component={SeekBar}
          isPlaying={props.isPlaying}
          localTime={props.localTime}
          elapsed={props.elapsedTime}
          total={props.totalTime}
          onSeek={this.onSeek.bind(this, props.playerid)}
          disabled={!props.playerid} />
      </PlayerUI>
    )
  }
}
