import _ from 'lodash'
import Slider from 'rc-slider'
import React from 'react'
import PropTypes from 'prop-types'
import { Button, Item, Visibility } from 'semantic-ui-react'
import 'rc-slider/assets/index.css'

import { drillable } from './components'
import * as lms from './lmsclient'
import { formatTime } from './util'
import 'font-awesome/css/font-awesome.css'
import './player.styl'

const NWayButton = props => {
  const next = props.value + 1 >= props.markup.length ? 0 : props.value + 1
  return <Button
      className={props.className}
      onClick={() => props.onChange(props.values ? props.values[next] : next)}
      disabled={props.disabled}
      >{props.markup[props.value]}</Button>
}

const CurrentTrackInfo = (props, {showMediaInfo}) => (
  <Item.Group>
    <Item>
      <Item.Image size="tiny" src={lms.getImageUrl(props.tags, props.playerid)} />
      <Item.Content>
        <Item.Header>{props.tags.title}</Item.Header>
        <Item.Meta>{drillable(props.tags, "artist", showMediaInfo)}</Item.Meta>
        <Item.Meta>{drillable(props.tags, "album", showMediaInfo)}</Item.Meta>
      </Item.Content>
    </Item>
  </Item.Group>
)

CurrentTrackInfo.contextTypes = {
  showMediaInfo: PropTypes.func,
}

export class SeekBar extends React.Component {
  // TODO display time at mouse pointer on hover
  constructor() {
    super()
    this.state = {seeking: false, seek: 0}
  }
  render() {
    const elapsed = this.props.elapsed
    const total = this.props.total || elapsed
    return <div className="ui grid seekbar">
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

export class VolumeSlider extends React.Component {
  constructor() {
    super()
    this.state = {sliding: false, level: 0}
    this.setVolume = _.throttle((command, value) => {
      command("mixer", "volume", value)
    }, 500)
    this.marks = _.fromPairs(_.map(_.range(10, 100, 10), n => [n, ""]))
  }
  render() {
    const props = this.props
    return <Slider
      marks={this.marks}
      value={this.state.sliding ? this.state.level : props.volumeLevel}
      onBeforeChange={level => this.setState({sliding: true, level})}
      onChange={level => {
        // TODO make volume adjustment UI smoother: decouple slider adjustment (and
        // state update) speed from sending events to the server
        this.setVolume(props.command, level)
        this.setState({level})
      }}
      onAfterChange={() => this.setState({sliding: false})}
      disabled={!props.playerid} />
  }
}

export const PlayerUI = props => (
  <div className="player">
    <div className="ui grid">
      <div className="middle aligned row">
        <div className="left floated eight wide mobile four wide tablet two wide computer column">
          <Visibility
            fireOnMount
            onTopPassed={() => props.onControlVisibilityChange(false)}
            onTopVisible={() => props.onControlVisibilityChange(true)}
            once={false}>
            <Button.Group basic size="small">
              <Button
                icon="backward"
                onClick={() => props.command("playlist", "index", "-1")}
                disabled={!props.playerid} />
              <Button
                icon={props.isPlaying ? "pause" : "play"}
                onClick={() => props.command(props.isPlaying ? "pause" : "play")}
                disabled={!props.playerid} />
              <Button
                icon="forward"
                onClick={() => props.command("playlist", "index", "+1")}
                disabled={!props.playerid} />
            </Button.Group>
          </Visibility>
        </div>
        <div className="computer tablet only eight wide tablet twelve wide computer column">
          <VolumeSlider {...props} />
        </div>
        <div className="right floated eight wide mobile four wide tablet two wide computer column right aligned">
          <Button.Group basic size="small">
            <NWayButton
              className="repeat-toggle"
              markup={[
                <i className="fa fa-fw fa-lg fa-long-arrow-right"></i>,
                <span className="fa-stack icon-repeat-one">
                  <i className="fa fa-repeat fa-stack-2x"></i>
                  <i className="fa fa-stack-1x">1</i>
                </span>,
                <i className="fa fa-fw fa-lg fa-repeat"></i>,
              ]}
              value={props.repeatMode}
              onChange={value => props.command("playlist", "repeat", value)}
              disabled={!props.playerid} />
            <NWayButton
              markup={[
                <i className="fa fa-fw fa-lg fa-sort-amount-asc"></i>,
                <i className="fa fa-fw fa-lg fa-random"></i>,
                <span className="fa-stack fa-fw fa-lg icon-shuffle-album">
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
      <div className="mobile only row">
        <div className="sixteen wide column">
          <VolumeSlider {...props} />
        </div>
      </div>
    </div>
    <CurrentTrackInfo
      playerid={props.playerid}
      tags={props.currentTrack.toObject()}
      disabled={!props.playerid} />
    {props.children}
  </div>
)
