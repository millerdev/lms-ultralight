import { Map } from 'immutable'
import _ from 'lodash'
import React from 'react'

import { effect, combine, IGNORE_ACTION } from './effects'
import makeReducer from './store'
import * as lms from './lmsclient'
import { PlayerUI, SeekBar } from './playerui'
import { backoff, isNumeric, timer } from './util'

export const STATUS_INTERVAL = 30  // seconds
export const REPEAT_ONE = 1
export const REPEAT_ALL = 2

export const defaultState = Map({
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  repeatMode: 0,
  shuffleMode: 0,
  volumeLevel: 0,
  elapsedTime: 0,
  totalTime: null,
  localTime: null,
})

export const reducer = makeReducer({
  gotPlayer: (state, action, status, {statusInterval=STATUS_INTERVAL}={}) => {
    const data = {
      playerid: status.playerid,
      isPowerOn: status.power === 1,
      isPlaying: status.mode === "play",
      repeatMode: status["playlist repeat"],
      shuffleMode: status["playlist shuffle"],
      volumeLevel: status["mixer volume"],
      elapsedTime: isNumeric(status.time) ? parseFloat(status.time) : 0,
      totalTime: isNumeric(status.duration) ? parseFloat(status.duration) : null,
      localTime: status.localTime,
    }
    return combine(state.merge(data), [
      effect(advanceToNextTrackAfter, secondsToEndOfTrack(data), data.playerid),
      effect(loadPlayerAfter, statusInterval * 1000, data.playerid),
    ])
  },
  seek: (state, action, {playerid, value}, now=Date.now()) => {
    if (state.get("playerid") === playerid) {
      return combine(
        state.merge({elapsedTime: value, localTime: now}),
        [effect(seek, playerid, value)]
      )
    }
    return state
  },
  advanceToNextTrack: (state, action, playerid, now=Date.now()) => {
    return state.merge({
      elapsedTime: 0,
      localTime: now,
    })
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
}

export const loadPlayerAfter = (() => {
  const fetchBackoff =  backoff(30000)
  const time = timer()
  return (wait, ...args) => {
    if (!wait) {
      wait = fetchBackoff()
    }
    time.clear(IGNORE_ACTION)
    return time.after(wait, () => loadPlayer(...args))
  }
})()

export function seek(playerid, value) {
  return lms.command(playerid, "time", value).then(() => loadPlayer(playerid))
}

export class Player extends React.Component {
  command(playerid, ...args) {
    lms.command(playerid, ...args)
      // HACK load again after 1 second because LMS sometimes returns
      // the wrong "time" on loadPlayer immediately after a command.
      // statusInterval is convoluted, and should ideally be removed.
      // The correct fix for this is probably player status subscription.
      .then(() => loadPlayer(playerid, false, {statusInterval: 1}))
      .then(action => this.props.dispatch(action))
    // TODO convey failure to view somehow
  }
  onSeek(playerid, value) {
    this.props.dispatch(actions.seek({playerid, value}))
    // TODO convey failure to view somehow
  }
  render() {
    const props = this.props
    const command = this.command.bind(this, props.playerid)
    return (
      <PlayerUI command={command} {...props}>
        <LiveSeekBar
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

export class LiveSeekBar extends React.Component {
  constructor() {
    super()
    this.timer = timer()
    this.state = {elapsed: 0}
  }
  hasUpdate(props) {
    return props.isPlaying && props.localTime
  }
  componentWillReceiveProps(props) {
    this.timer.clear()
    if (this.hasUpdate(props)) {
      const update = () => {
        const now = new Date()
        const playtime = props.elapsed + (now - props.localTime) / 1000
        const wait = Math.round((1 - playtime % 1) * 1000)
        const floored = Math.floor(playtime)
        const elapsed = _.min([floored, props.total || floored])
        if (this.state.elapsed !== elapsed) {
          this.setState({elapsed})
        }
        this.timer.after(wait, update).catch(() => {})
      }
      update()
    }
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  render () {
    const props = this.props
    return <SeekBar
      elapsed={this.hasUpdate(props) ? this.state.elapsed : props.elapsed}
      total={props.total}
      onSeek={props.onSeek}
      disabled={props.disabled} />
  }
}
