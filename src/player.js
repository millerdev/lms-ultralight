import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Effects, getModel, getEffect, loop } from 'redux-loop'

import makeReducer from './store'
import * as lms from './lmsclient'
import { PlayerUI, SeekBar } from './playerui'
import * as players from './playerselect'
import * as playlist from './playlist'
import { backoff, isNumeric, timer } from './util'

export const STATUS_INTERVAL = 30  // seconds

export const defaultState = Map({
  players: players.defaultState,
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  repeatMode: 0,
  shuffleMode: 0,
  trackInfo: Map(),
  volumeLevel: 0,
  elapsedTime: 0,
  totalTime: null,
  localTime: null,
  playlistTimestamp: null,
  playlistTracks: null,
  playlistIndex: null,
  playlist: List(),
})

export const playerReducer = makeReducer({
  gotPlayer: (state, {payload: status}) => {
    const data = {
      playerid: status.playerid,
      isPowerOn: status.power === 1,
      isPlaying: status.mode === "play",
      repeatMode: status["playlist repeat"],
      shuffleMode: status["playlist shuffle"],
      volumeLevel: status["mixer volume"],
      elapsedTime: isNumeric(status.time) ? status.time : 0,
      totalTime: isNumeric(status.duration) ? status.duration : null,
      localTime: status.localTime,
      playlistTimestamp: status.playlist_timestamp,
      playlistTracks: status.playlist_tracks,
      //everything: fromJS(status),
    }
    const list = status.playlist_loop
    const IX = "playlist index"
    const index = data.playlistIndex = parseInt(status.playlist_cur_index)
    if (status.isPlaylistUpdate) {
      data.playlist = fromJS(status.playlist_loop)
      if (index >= list[0][IX] && index <= list[list.length - 1][IX]) {
        data.trackInfo = fromJS(list[index - list[0][IX]])
      }
    } else {
      data.trackInfo = fromJS(list[0] || {})
    }

    const effects = []
    const wait = STATUS_INTERVAL * 1000
    const end = secondsToEndOfSong(data) * 1000
    if (end < wait) {
      effects.push(Effects.promise(advanceToNextSong, end, data))
    }
    effects.push(
      Effects.promise(loadPlayerAfter, wait, data.playerid))

    return loop(state.merge(data), Effects.batch(effects))
  },
  seek: (state, {payload: {playerid, value}}) => {
    if (state.get("playerid") === playerid) {
      return state.merge({
        elapsedTime: value,
        localTime: null,
      })
    }
    return loop(state, Effects.promise(seek, playerid, value))
  },
}, defaultState.remove("players"))

export function loadPlayer(playerid, fetchPlaylist=false) {
  const args = fetchPlaylist ? [0, 100] : []
  return lms.getPlayerStatus(playerid, ...args)
            .then(data => actions.gotPlayer(data))
}

export function secondsToEndOfSong({elapsedTime, totalTime, localTime}, now=Date.now()) {
  const elapsed = localTime ?
    elapsedTime + (now - localTime) / 1000 : elapsedTime
  const total = totalTime !== null ? _.max([totalTime, elapsed]) : elapsed
  return total - elapsed
}

export const advanceToNextSong = (() => {
  const time = timer()
  return (end, data) => {
    // TODO advance playlist without querying server (loadPlayer)
    // don't forget to check repeat-one when advancing to next song
    time.clear()
    return time.after(end, () => loadPlayer(data.playerid))
  }
})()

export const loadPlayerAfter = (() => {
  const fetchBackoff =  backoff(30000)
  const time = timer()
  return (wait, ...args) => {
    if (!wait) {
      wait = fetchBackoff()
    }
    time.clear()
    return time.after(wait, () => loadPlayer(...args))
  }
})()

function seek(playerid, value) {
  return lms.command(playerid, "time", value).then(() => loadPlayer(playerid))
}

const actions = playerReducer.actions

export function reducer(state=defaultState, action) {
  const result = playerReducer(state, action)
  state = getModel(result)
  return loop(
    state.merge({
      players: players.reducer(state.get("players"), action),
      //playlist: playlist.reducer(state.get("playlist"), action),
    }),
    getEffect(result) || Effects.none()
  )
}

export class Player extends React.Component {
  constructor() {
    super()
    this.state = defaultState.toObject()
  }
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
  render() {
    const props = this.props
    const command = this.command.bind(this, props.playerid)
    return <div>
      <PlayerUI
        command={command}
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        onSeek={value => actions.seek({playerid: props.playerid, value})}
        {...props}>
        <LiveSeekBar
          isPlaying={props.isPlaying}
          localTime={props.localTime}
          elapsed={props.elapsedTime}
          total={props.totalTime}
          onSeek={props.onSeek}
          disabled={!props.playerid} />
      </PlayerUI>
      <playlist.Playlist
        command={command}
        currentIndex={props.playlistIndex}
        items={props.playlist} />
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
        this.timer.after(wait, update)
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
