import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { Button, Dropdown, Item } from 'semantic-ui-react'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

import makeReducer from './store'
import * as lms from './lmsclient'
import { formatTime } from './util'

export const defaultState = Map({
  players: List(),
  playersLoading: false,
  playersError: false,
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  trackInfo: Map(),
  volumeLevel: 0,
  elapsedTime: 0,
  totalTime: 0,
})

export function init() {
  const playerid = localStorage.currentPlayer
  lms.getPlayers().then(response => {
    const players = response.data
    actions.gotPlayers(players)
    if (playerid && _.some(players, item => item.playerid === playerid)) {
      loadPlayer(playerid)
    } else if (players.length) {
      loadPlayer(players[0].playerid)
    }
  })
}

function playerCommand(playerid, ...command) {
  lms.playerCommand(playerid, ...command).then(() => loadPlayer(playerid))
}

function loadPlayer(playerid) {
  localStorage.currentPlayer = playerid
  lms.getPlayerStatus(playerid).then(response => {
    actions.gotPlayer(response.data)
  }).catch(() => {
    actions.gotPlayer()
  })
}

export const reducer = makeReducer({
  loadPlayers: state => {
    lms.getPlayers().then(response => {
      actions.gotPlayers(response.data)
    }).catch(() => {
      actions.gotPlayers()
    })
    return state.set('playersLoading', true)
  },
  gotPlayers: (state, action) => (
    state.withMutations(map => {
      const players = action.payload
      map
        .set('playersError', !players)
        .set('playersLoading', false)
      if (players) {
        const keeps = ["name", "playerid"]
        map.set('players', fromJS(_.map(players, item => _.pick(item, keeps))))
      }
    })
  ),
  gotPlayer: (state, action) => {
    const obj = action.payload
    return state.merge({
      playerid: obj.playerid,
      isPowerOn: obj.power === 1,
      isPlaying: obj.mode === "play",
      trackInfo: fromJS(obj.playlist_loop[0] || {}),
      elapsedTime: obj.time || 0,
      totalTime: obj.duration || 0,
      volumeLevel: obj["mixer volume"],
    })
  },
}, defaultState)

const actions = reducer.actions

const IconToggleButton = props => (
  <Button
    onClick={props.onClick}
    icon={props.isOn() ? props.iconOff : props.iconOn}
    disabled={props.disabled}
    />
)

const CurrentTrackInfo = props => (
  <Item.Group>
    <Item>
      <Item.Image size="tiny" src={lms.getImageUrl(props.playerid)} />
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
  constructor () {
    super()
    this.state = {seek: null}
  }
  render () {
    const elapsed = Math.ceil(this.props.elapsed || 0)
    const total = Math.ceil(this.props.total || 0)
    return <div>
      <span className="elapsed">{formatTime(elapsed)}</span>
      {/* TODO remove inline styles */}
      <div style={{display: "inline-block", width: "60%", margin: "0 10px"}}>
        <Slider
          max={_.max([total, elapsed, 1])}
          value={this.state.seek === null ? elapsed : this.state.seek}
          onChange={value => this.setState({seek: value})}
          onAfterChange={value => {
            this.props.onChange(value < total ? value : total)
            setTimeout(() => this.setState({seek: null}), 900)
          }}
          tipFormatter={formatTime}
          disabled={this.props.disabled} />
      </div>
      <span className="elapsed">{formatTime(total ? elapsed - total : 0)}</span>
    </div>
  }
}

const onLoadPlayers = _.throttle(actions.loadPlayers, 30000, {trailing: false})
const volumeMarks = {10: "", 20: "", 30: "", 40: "", 50: "", 60: "", 70: "", 80: "", 90: ""}
// TODO make volume adjustment UI smoother: decouple slider adjustment (and
// state update) speed from sending events to the server
const setVolume = _.throttle((playerid, value) => {
  playerCommand(playerid, "mixer", "volume", value)
}, 300)

export const Player = props => (
  <div>
    <div>
      <Dropdown
        placeholder="Select Player"
        onClick={onLoadPlayers}
        onChange={(e, { value }) => loadPlayer(value)}
        options={props.players.map(item => ({
          text: item.get("name"),
          value: item.get("playerid"),
        })).toJS()}
        value={props.playerid || ""}
        loading={props.playersLoading}
        error={props.playersError}
        selection />
    </div>
    <div>
      <Button.Group basic size="small">
        <Button
          icon="backward"
          onClick={() => playerCommand(props.playerid, "playlist", "index", "-1")}
          disabled={!props.playerid} />
        <IconToggleButton
          isOn={() => props.isPlaying}
          onClick={() =>
            playerCommand(props.playerid, props.isPlaying ? "pause" : "play")}
          iconOn="play"
          iconOff="pause"
          disabled={!props.playerid} />
        <Button
          icon="forward"
          onClick={() => playerCommand(props.playerid, "playlist", "index", "+1")}
          disabled={!props.playerid} />
      </Button.Group>
      {/*
      <Button.Group basic size="small">
        <Button icon="repeat" disabled={!props.playerid} />
        <Button icon="shuffle" disabled={!props.playerid} />
      </Button.Group>
      */}
      {/* TODO remove styles from this group */}
      <div style={{display: "inline-block", "width": "50%", "margin": "0 10px"}}>
        <Slider
          marks={volumeMarks}
          value={props.volumeLevel}
          onChange={value => setVolume(props.playerid, value)}
          disabled={!props.playerid} />
      </div>
      <Button.Group basic size="small">
        <Button basic toggle
          active={props.isPowerOn}
          onClick={() =>
            playerCommand(props.playerid, "power", props.isPowerOn ? 0 : 1)}
          icon="power"
          disabled={!props.playerid} />
      </Button.Group>
    </div>
    <CurrentTrackInfo
      playerid={props.playerid}
      tags={props.trackInfo.toObject()}
      disabled={!props.playerid} />
    <SeekBar
      elapsed={props.elapsedTime}
      total={props.totalTime}
      onChange={value => playerCommand(props.playerid, "time", value)}
      disabled={!props.playerid} />
  </div>
)

function mapStateToProps(state) {
  return state.toObject()
}

export default connect(mapStateToProps)(Player)
