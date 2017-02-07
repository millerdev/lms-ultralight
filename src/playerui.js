import _ from 'lodash'
import Slider from 'rc-slider'
import React from 'react'
import { Button, Item } from 'semantic-ui-react'
import 'rc-slider/assets/index.css'

import * as lms from './lmsclient'
import * as players from './playerselect'
import { formatTime } from './util'
import 'font-awesome/css/font-awesome.css'

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
      <Item.Image size="tiny" src={lms.getImageUrl(props.playerid, props.tags)} />
      <Item.Content>
        <Item.Header>{props.tags.title}</Item.Header>
        <Item.Meta>{props.tags.artist}</Item.Meta>
        <Item.Meta>{props.tags.album}</Item.Meta>
      </Item.Content>
    </Item>
  </Item.Group>
)

export class SeekBar extends React.Component {
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
    {props.children}
  </div>
)
