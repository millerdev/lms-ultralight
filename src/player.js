import { Map } from 'immutable'
import _ from 'lodash'
import React from 'react'

import { effect, combine, split, IGNORE_ACTION } from './effects'
import makeReducer from './store'
import * as lms from './lmsclient'
import { PlayerUI, SeekBar } from './playerui'
import * as players from './playerselect'
import * as playlist from './playlist'
import { backoff, isNumeric, timer } from './util'

export const STATUS_INTERVAL = 30  // seconds
export const REPEAT_ONE = 1
export const REPEAT_ALL = 2

export const defaultState = Map({
  players: players.defaultState,
  playlist: playlist.defaultState,
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

export const playerReducer = makeReducer({
  gotPlayer: (state, action, status) => {
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
      playlist: playlist.gotPlayer(state.get("playlist"), status),
    }

    const effects = []
    const end = secondsToEndOfTrack(data)
    let wait = STATUS_INTERVAL * 1000
    let fetchPlaylist = false
    if (end !== null && end * 1000 < wait) {
      effects.push(effect(advanceToNextTrackAfter, end * 1000, data.playerid))
    }
    effects.push(effect(loadPlayerAfter, wait, data.playerid, fetchPlaylist))
    return combine(state.merge(data), effects)
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
    if (state.get("playerid") === playerid) {
      const data = {
        elapsedTime: 0,
        localTime: now,
      }
      if (state.get("repeatMode") !== REPEAT_ONE) {
        data.playlist = playlist.advanceToNextTrack(state.get("playlist"))
      }
      return state.merge(data)
    }
    return state
  },
}, defaultState.remove("players"))

export function loadPlayer(playerid, fetchPlaylist=false) {
  const args = fetchPlaylist ? [0, 100] : []
  return lms.getPlayerStatus(playerid, ...args)
            .then(data => actions.gotPlayer(data))
}

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
    return time.after(end, () => actions.advanceToNextTrack(...args))
  }
})()

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

const actions = playerReducer.actions

export function reducer(state_=defaultState, action) {
  const [state, effects] = split(playerReducer(state_, action))
  return combine(
    state.merge({
      players: players.reducer(state.get("players"), action),
    }),
    effects
  )
}

export class Player extends React.Component {
  componentDidMount() {
    lms.getPlayers().then(data => {
      this.props.dispatch(players.gotPlayers(data))
      // HACK currently all Players will use the same localStorage key
      let playerid = localStorage.currentPlayer
      if (!playerid || !_.some(data, item => item.playerid === playerid)) {
        if (!data.length) {
          return
        }
        playerid = data[0].playerid
      }
      this.loadPlayer(playerid, true)
    })
    // TODO convey failure to view somehow
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    this.loadPlayer(playerid, true)
  }
  loadPlayer(...args) {
    loadPlayer(...args).then(action => this.props.dispatch(action))
    // TODO convey failure to view somehow
  }
  command(playerid, ...args) {
    lms.command(playerid, ...args).then(this.loadPlayer(playerid))
    // TODO convey failure to view somehow
  }
  onSeek(playerid, value) {
    this.props.dispatch(actions.seek({playerid, value}))
    // TODO convey failure to view somehow
  }
  render() {
    const props = this.props
    const command = this.command.bind(this, props.playerid)
    return <div>
      <PlayerUI
        command={command}
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        {...props}>
        <LiveSeekBar
          isPlaying={props.isPlaying}
          localTime={props.localTime}
          elapsed={props.elapsedTime}
          total={props.totalTime}
          onSeek={this.onSeek.bind(this, props.playerid)}
          disabled={!props.playerid} />
      </PlayerUI>
      <playlist.Playlist
        command={command}
        {...props.playlist.toJS()} />
    </div>
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
