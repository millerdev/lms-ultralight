import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'

import makeReducer from './store'
import * as lms from './lmsclient'
import { PlayerUI, SeekBar } from './playerui'
import * as players from './playerselect'
import * as playlist from './playlist'
import { backoff, isNumeric, timer } from './util'

const STATUS_INTERVAL = 30  // seconds

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

export function transformPlayerStatus(previousState, status) {
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
  const loop = status.playlist_loop
  const IX = "playlist index"
  const index = data.playlistIndex = parseInt(status.playlist_cur_index)
  if (status.isPlaylistUpdate) {
    data.playlist = fromJS(status.playlist_loop)
    if (index >= loop[0][IX] && index <= loop[loop.length - 1][IX]) {
      data.trackInfo = fromJS(loop[index - loop[0][IX]])
    }
  } else {
    data.trackInfo = fromJS(loop[0] || {})
  }
  return previousState.merge(data)
}

export const playerReducer = makeReducer({
  gotPlayer: (state, {payload}) => {
    return state.merge(payload)
  },
  preSeek: (state, {payload: {playerid, value}}) => {
    if (state.get("playerid") === playerid) {
      return state.merge({
        elapsedTime: value,
        localTime: new Date(),
      })
    }
    return state
  },
}, defaultState.remove("players"))

const actions = playerReducer.actions

export function reducer(state=defaultState, action) {
  state = playerReducer(state, action)
  return state.merge({
    players: players.reducer(state.get("players"), action),
    //playlist: playlist.reducer(state.get("playlist"), action),
  })
}

export class Player extends React.Component {
  constructor() {
    super()
    this.timer = timer()
    this.fetchBackoff = backoff(30000)
    this.state = defaultState.toObject()
  }
  componentDidMount() {
    let playerid = localStorage.currentPlayer
    lms.getPlayers().then(({data}) => {
      players.gotPlayers(data)
      if (playerid && _.some(data, item => item.playerid === playerid)) {
        this.loadPlayer(playerid, true)
      } else if (data.length) {
        this.loadPlayer(data[0].playerid, true)
      }
    })
  }
  loadPlayer(playerid, fetchPlaylist=false) {
    const args = fetchPlaylist ? [0, 100] : []
    lms.getPlayerStatus(playerid, ...args).then(response => {
      this.onLoadPlayer(this, transformPlayerStatus(Map(this.state), response.data))
    })
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    this.loadPlayer(playerid, true)
  }
  onLoadPlayer(self, state) {
    const obj = state.toObject()
    self.timer.clear()
    let wait = STATUS_INTERVAL * 1000
    const fetchPlaylist = !obj.isPlaylistUpdate && self.isPlaylistChanged(obj)
    if (fetchPlaylist) {
      wait = self.fetchBackoff()
    } else {
      const end = self.secondsToEndOfSong(obj) * 1000
      if (end && end < wait) {
        self.timer.after(end, () => self.advanceToNextSong(obj))
      }
    }
    self.timer.after(wait, () => self.loadPlayer(obj.playerid, fetchPlaylist))
    self.setState(obj)
  }
  isPlaylistChanged(obj) {
    const playlistId = obj => Map({
      playerid: obj.playerid,
      timestamp: obj.playlistTimestamp,
      tracks: obj.playlistTracks,
      //playlist: state.playlist,
    })
    return !playlistId(this.state).equals(playlistId(obj))
  }
  advanceToNextSong(obj) {
    // TODO advance playlist without querying server
    // don't forget to check repeat-one when advancing to next song
    this.loadPlayer(obj.playerid)
  }
  secondsToEndOfSong({elapsedTime, totalTime, localTime}) {
    const now = new Date()
    const elapsed = localTime ?
      elapsedTime + (now - localTime) / 1000 : elapsedTime
    const total = totalTime !== null ? _.max([totalTime, elapsed]) : elapsed
    return total - elapsed
  }
  command(playerid, ...args) {
    lms.command(playerid, ...args).then(() => this.loadPlayer(playerid))
    // TODO convey command failure to view somehow
  }
  render() {
    const props = this.state
    const command = this.command.bind(this, props.playerid)
    return <div>
      <PlayerUI
        command={command}
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        onSeek={value => {
          actions.preSeek({playerid: props.playerid, value})
          command("time", value)
        }}
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

class LiveSeekBar extends React.Component {
  constructor() {
    super()
    this.timer = timer()
    this.state = {elapsed: 0}
  }
  componentWillReceiveProps(props) {
    this.timer.clear()
    if (props.isPlaying && props.localTime) {
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
      elapsed={this.state.elapsed}
      total={props.total}
      onSeek={props.onSeek}
      disabled={props.disabled} />
  }
}
