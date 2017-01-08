import { Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Button, Item } from 'semantic-ui-react'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

import makeReducer from './store'
import * as lms from './lmsclient'
import { formatTime } from './util'
import 'font-awesome/css/font-awesome.css'

export const defaultState = Map({
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  repeatMode: 0,
  shuffleMode: 0,
  trackInfo: Map(),
  volumeLevel: 0,
  elapsedTime: 0,
  totalTime: 0,
})


export const reducer = makeReducer({
  "ref:gotPlayer": (state, { payload: obj }) => {
    const data = {
      playerid: obj.playerid,
      isPowerOn: obj.power === 1,
      isPlaying: obj.mode === "play",
      repeatMode: obj["playlist repeat"],
      shuffleMode: obj["playlist shuffle"],
      elapsedTime: obj.time || 0,
      totalTime: obj.duration || obj.time || 0,
      volumeLevel: obj["mixer volume"],
      //everything: fromJS(obj),
    }
    const loop = obj.playlist_loop
    const IX = "playlist index"
    if (obj.isPlaylistUpdate) {
      const index = parseInt(obj.playlist_cur_index)
      if (index >= loop[0][IX] && index <= loop[loop.length - 1][IX]) {
        data.trackInfo = fromJS(loop[index - loop[0][IX]])
      }
    } else {
      data.trackInfo = fromJS(loop[0] || {})
    }
    return state.merge(data)
  },
  preSeek: (state, {playerid, value}) => {
    if (state.get("playerid") === playerid) {
      return state.set("elapsedTime", value)
    }
    return state
  },
}, defaultState)

const actions = reducer.actions

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
    this.state = {seeking: false, seek: 0}
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
          value={this.state.seeking ? this.state.seek : elapsed}
          onBeforeChange={seek => this.setState({seeking: true, seek})}
          onChange={seek => this.setState({seek})}
          onAfterChange={value => {
            this.props.onChange(value < total ? value : total)
            this.setState({seeking: false})
          }}
          tipFormatter={formatTime}
          disabled={this.props.disabled} />
      </div>
      <span className="total">{formatTime(total ? elapsed - total : 0)}</span>
    </div>
  }
}

const volumeMarks = {10: "", 20: "", 30: "", 40: "", 50: "", 60: "", 70: "", 80: "", 90: ""}
// TODO make volume adjustment UI smoother: decouple slider adjustment (and
// state update) speed from sending events to the server
const setVolume = _.throttle((playerid, value) => {
  lms.command(playerid, "mixer", "volume", value)
}, 300)

function playerSeek(playerid, value) {
  actions.preSeek({playerid, value})
  lms.command(playerid, "time", value)
}

export const Player = props => (
  <div>
    <div>
      <Button.Group basic size="small">
        <Button
          icon="backward"
          onClick={() => lms.command(props.playerid, "playlist", "index", "-1")}
          disabled={!props.playerid} />
        <IconToggleButton
          isOn={() => props.isPlaying}
          onClick={() =>
            lms.command(props.playerid, props.isPlaying ? "pause" : "play")}
          iconOn="play"
          iconOff="pause"
          disabled={!props.playerid} />
        <Button
          icon="forward"
          onClick={() => lms.command(props.playerid, "playlist", "index", "+1")}
          disabled={!props.playerid} />
      </Button.Group>
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
          onChange={value => lms.command(props.playerid, "playlist", "repeat", value)}
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
          onChange={value => lms.command(props.playerid, "playlist", "shuffle", value)}
          disabled={!props.playerid} />
      </Button.Group>
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
            lms.command(props.playerid, "power", props.isPowerOn ? 0 : 1)}
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
      onChange={value => playerSeek(props.playerid, value)}
      disabled={!props.playerid} />
  </div>
)
