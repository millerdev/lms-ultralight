import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import Slider from 'rc-slider'
import React from 'react'
import { Button, Item } from 'semantic-ui-react'
import 'rc-slider/assets/index.css'

import makeReducer from './store'
import * as lms from './lmsclient'
import * as players from './playerselect'
import * as playlist from './playlist'
import { formatTime, isNumeric, timer } from './util'
import 'font-awesome/css/font-awesome.css'

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
    this._state = defaultState.remove("players")
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
      this.onLoadPlayer(transformPlayerStatus(this._state, response.data))
    })
  }
  isPlaylistChanged(state) {
    const playlistId = state => Map({
      playerid: state.get("playerid"),
      timestamp: state.get("playlistTimestamp"),
      tracks: state.get("playlistTracks"),
      //playlist: state.playlist,
    })
    return !playlistId(this._state).equals(playlistId(state))
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
  onLoadPlayer(state) {
    const obj = state.toObject()
    this.timer.clear()
    actions.gotPlayer(obj)
    let wait = STATUS_INTERVAL * 1000
    const fetchPlaylist = !obj.isPlaylistUpdate && this.isPlaylistChanged(state)
    if (fetchPlaylist) {
      wait = 0
    } else {
      const end = this.secondsToEndOfSong(obj) * 1000
      if (end && end < wait) {
        this.timer.after(end, () => this.advanceToNextSong(obj))
      }
    }
    this._state = state
    this.timer.after(wait, () => this.loadPlayer(obj.playerid, fetchPlaylist))
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    this.loadPlayer(playerid, true)
  }
  render() {
    const props = this.props
    return <PlayerUI
      command={this.command.bind(this, props.playerid)}
      onPlayerSelected={this.onPlayerSelected.bind(this)}
      {...props} />
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

const IconToggleButton = props => (
  <Button
    onClick={props.onClick}
    icon={props.isOn() ? props.iconOff : props.iconOn}
    disabled={props.disabled} />
)

const NWayButton = props => {
  const next = props.value + 1 >= props.markup.length ? 0 : props.value + 1
  return <Button
      onClick={() => props.onChange(props.values ? props.values[next] : next)}
      disabled={props.disabled}
      >{props.markup[props.value]}</Button>
}

const CurrentTrackInfo = props => (
  <Item.Group>
    <Item>
      <Item.Image size="tiny" src={lms.getImageUrl(props.playerid, props.tags, true)} />
      <Item.Content>
        <Item.Header>{props.tags.title}</Item.Header>
        <Item.Meta>{props.tags.artist}</Item.Meta>
        <Item.Meta>{props.tags.album}</Item.Meta>
      </Item.Content>
    </Item>
  </Item.Group>
)

class SeekBar extends React.Component {
  // TODO display time at mouse pointer on hover
  constructor() {
    super()
    this.state = {seeking: false, seek: 0}
  }
  render() {
    const elapsed = this.props.elapsed
    const total = this.props.total || elapsed
    return <div className="ui grid">
      <div className="three wide mobile two wide tablet one wide computer column left aligned">
        {formatTime(elapsed)}
      </div>
      <div className="ten wide mobile twelve wide tablet fourteen wide computer column">
        <Slider
          max={_.max([total, elapsed, 1])}
          value={this.state.seeking ? this.state.seek : elapsed}
          onBeforeChange={seek => this.setState({seeking: true, seek})}
          onChange={seek => this.setState({seek})}
          onAfterChange={value => {
            this.props.onSeek(value < total ? value : total)
            this.setState({seeking: false})
          }}
          tipFormatter={formatTime}
          disabled={this.props.disabled} />
      </div>
      <div className="three wide mobile two wide tablet one wide computer column right aligned">
        {formatTime(total ? elapsed - total : 0)}
      </div>
    </div>
  }
}

const volumeMarks = {10: "", 20: "", 30: "", 40: "", 50: "", 60: "", 70: "", 80: "", 90: ""}
// TODO make volume adjustment UI smoother: decouple slider adjustment (and
// state update) speed from sending events to the server
const setVolume = _.throttle((command, value) => command("mixer", "volume", value), 300)

export const PlayerUI = props => (
  <div>
    <div className="ui grid">
      <div className="twelve wide column">
        <players.SelectPlayer
          playerid={props.playerid}
          onPlayerSelected={props.onPlayerSelected}
          {...props.players.toObject()} />
      </div>
      <div className="right aligned four wide column">
        <Button.Group basic size="small">
          <Button basic toggle
            active={props.isPowerOn}
            onClick={() =>
              props.command("power", props.isPowerOn ? 0 : 1)}
            icon="power"
            disabled={!props.playerid} />
        </Button.Group>
      </div>
    </div>
    <div className="ui stackable grid">
      <div className="three wide column">
        <Button.Group basic size="small">
          <Button
            icon="backward"
            onClick={() => props.command("playlist", "index", "-1")}
            disabled={!props.playerid} />
          <IconToggleButton
            isOn={() => props.isPlaying}
            onClick={() =>
              props.command(props.isPlaying ? "pause" : "play")}
            iconOn="play"
            iconOff="pause"
            disabled={!props.playerid} />
          <Button
            icon="forward"
            onClick={() => props.command("playlist", "index", "+1")}
            disabled={!props.playerid} />
        </Button.Group>
      </div>
      <div className="ten wide column">
        <Slider
          marks={volumeMarks}
          value={props.volumeLevel}
          onChange={value => setVolume(props.command, value)}
          disabled={!props.playerid} />
      </div>
      <div className="three wide column right aligned">
        <Button.Group basic size="small">
          <NWayButton
            markup={[
              <i className="fa fa-long-arrow-right"></i>,
              <span className="fa-stack fa-lg icon-repeat-one">
                <i className="fa fa-repeat fa-stack-2x"></i>
                <i className="fa fa-stack-1x">1</i>
              </span>,
              <i className="fa fa-repeat"></i>,
            ]}
            value={props.repeatMode}
            onChange={value => props.command("playlist", "repeat", value)}
            disabled={!props.playerid} />
          <NWayButton
            markup={[
              <i className="fa fa-sort-amount-asc"></i>,
              <i className="fa fa-random"></i>,
              <span className="fa-stack fa-lg icon-shuffle-album">
                <i className="fa fa-square-o fa-stack-2x"></i>
                <i className="fa fa-random fa-stack-1x"></i>
              </span>,
            ]}
            value={props.shuffleMode}
            onChange={value => props.command("playlist", "shuffle", value)}
            disabled={!props.playerid} />
        </Button.Group>
      </div>
    </div>
    <CurrentTrackInfo
      playerid={props.playerid}
      tags={props.trackInfo.toObject()}
      disabled={!props.playerid} />
    <LiveSeekBar
      isPlaying={props.isPlaying}
      localTime={props.localTime}
      elapsed={props.elapsedTime}
      total={props.totalTime}
      onSeek={value => {
        actions.preSeek({playerid: props.playerid, value})
        props.command("time", value)
      }}
      disabled={!props.playerid} />
    <playlist.Playlist
      command={props.command}
      currentIndex={props.playlistIndex}
      items={props.playlist} />
  </div>
)
