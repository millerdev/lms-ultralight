import _ from 'lodash-es'
import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dimmer, Icon, Image, Item, Loader } from 'semantic-ui-react'

import './components.styl'
import * as lms from './lmsclient'
import { formatTime, timer } from './util'

export const MediaInfo = (props, context) => {
  const mediaNav = props.mediaNav || context.mediaNav
  const item = props.item
  return (
    <Item.Group className="media-info">
      <Item>
        <Item.Content>
          <Image
            size={props.imageSize || "small"}
            src={lms.getImageUrl(item)}
            floated="left" />
          { props.onClose ?
            <Button
              className="close-button"
              onClick={props.onClose}
              floated="right"
              content="&#10005;"
              size="tiny"
              basic
            /> : null
          }
          { props.button ||
            <PlaylistButtons
              play={() => props.playctl.playItems([item])}
              playNext={() => props.playctl.playNext(item)}
              addToPlaylist={() => props.playctl.addToPlaylist([item])}
              className="tr-corner"
              floated="right" /> }
          <Item.Header>{item.title}</Item.Header>
          {_.map(["artist", "album"], key => _.has(item, key) ?
            <Item.Description key={key}>
              {drillable(item, key, mediaNav)}
            </Item.Description> : ""
          )}
        </Item.Content>
      </Item>
      <Item>
        <Item.Content>
          <Dimmer inverted active={props.isLoading || false}><Loader /></Dimmer>
          {_.map(MEDIA_INFO, info =>
            !info.display(item[info.key], item, info.key) ? null :
              <Item.Description key={info.key}>
                {info.name}: {info.transform(item[info.key], item, info, mediaNav)}
              </Item.Description>
          )}
        </Item.Content>
      </Item>
    </Item.Group>
  )
}

MediaInfo.contextTypes = {
  mediaNav: PropTypes.func,
}


export function drillable(item, key, mediaNav) {
  const text = item[key]
  if (mediaNav) {
    let id = item[key + "_id"]
    if (id === undefined) {
      id = item[key + "_ids"]
      if (_.isArray(id)) {
        id = id[0]
      }
    }
    if (id) {
      key = _.has(DRILL_KEYS, key) ? DRILL_KEYS[key] : key
      item = {type: key, id, [key]: text, title: text}
      return mediaNav(item).link()
    }
  }
  return text
}

const DRILL_KEYS = {
  artist: "contributor",
  albumartist: "contributor",
  band: "contributor",
  composer: "contributor",
  conductor: "contributor",
}

function drillTransform(value, item, info, mediaNav) {
  return drillable(item, info.key, mediaNav)
}

function urlToPath(url, item) {
  if (url.startsWith("file://")) {
    url = url.slice(7)
  }
  if (url.indexOf("%") > -1) {
    url = decodeURI(url)
  }
  if (_.has(item, "id")) {
    const filename = url.slice(url.lastIndexOf("/") + 1)
    const href = "/music/" + item.id + "/download/" + encodeURI(filename)
    url = <a href={href}>{url}</a>
  }
  return url
}

function bytesToSize(bytes) {
  // https://stackoverflow.com/a/18650828/10840
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes == 0) {
    return '0 Bytes'
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

const yesno = value => (value && value !== "0") ? "yes" : "no"

const MEDIA_INFO = [
  {key: "composer", transform: drillTransform},
  {key: "conductor", transform: drillTransform},
  {key: "band", transform: drillTransform},
  {key: "albumartist", name: "Album artist", transform: drillTransform},
  {key: "compilation", transform: yesno, display: v => yesno(v) === "yes"},
  {key: "remote_title", name: "Radio station"},
  {key: "genre", transform: drillTransform},
  {key: "genres"},
  {key: "year"},
  {key: "tracknum", name: "Track"},
  {key: "disc", transform: (value, item) =>
    value + (item.disccount ? " of " + item.disccount : "")},
  {key: "duration", transform: formatTime},
  {key: "comment"},
  {key: "rating"},
  {key: "playcount", name: "Play count"},
  {key: "bpm", name: "Beats per minute"},
  {key: "album_replay_gain", transform: value => value + " dB"},
  {key: "replay_gain", transform: value => value + " dB"},
  {key: "musicmagic_mixable", name: "Mixable", transform: yesno},
  {key: "tagversion", name: "Tag version"},
  {key: "samplerate", name: "Sample rate", transform: value => value + " KHz"},
  {key: "samplesize", name: "Sample size", transform: value => value + " bits"},
  {key: "bitrate"},
  {key: "content_type"},
  {key: "filesize", name: "Size", transform: bytesToSize},
  {key: "url", name: "Location", transform: urlToPath},
  {key: "modificationTime", name: "Modified"},
  {key: "lastUpdated", name: "Updated"},
  {key: "addedTime", name: "Added"},
  {key: "lyrics"},
]

_.each(MEDIA_INFO, item => {
  if (!item.name) {
    item.name = _.upperFirst(item.key.replace(/_/g, " "))
  }
  if (!item.transform) {
    item.transform = value => value
  }
  if (!item.display) {
    item.display = (value, item, key) => _.has(item, key)
  }
})

export const PlaylistButtons = props => {
  return (
    <Button.Group size="mini"
        onClick={event => event.stopPropagation()}
        className={_.filter(["playlist-buttons", props.className]).join(" ")}
        floated={props.floated}
        compact>
      <Button icon="play" onClick={props.play} />
      <Button icon="step forward"
        disabled={!props.playNext}
        onClick={props.playNext} />
      <Button icon="plus" onClick={props.addToPlaylist} />
    </Button.Group>
  )
}

export const TrackInfoIcon = React.memo(function TrackInfoIcon(props) {
  const icon = props.icon || "info circle"
  const floated = props.smallScreen ? " left floated" : ""
  const size = props.smallScreen ? "big" : "large"
  const dims = ICON_STYLES[size]
  const iconDims = props.smallScreen ? dims : NO_STYLE
  return <div
    onClick={props.onClick}
    className={"hover-icon-container tap-zone" + floated}
  >
    { props.showInfoIcon || props.activeIcon ?
      <Icon
        className="hover-icon"
        name={props.showInfoIcon ? icon : props.activeIcon}
        size={size}
        style={iconDims}
        fitted
      /> :
      <Image
        src={lms.getImageUrl(props.item)}
        className="tap-zone hover-icon"
        style={dims}
        ui inline
      />
    }
    <div className="middle">
      <Icon name={icon} size={size} style={iconDims} fitted />
    </div>
  </div>
})

const ICON_STYLES = {
  big: {height: "32px", width: "32px"},
  large: {height: "18px", width: "18px"},
}
const NO_STYLE = {}

export const DragHandle = () => (
  <span className="gap-left">
    <Icon name="content" fitted />
  </span>
)

export class LiveSeekBar extends React.Component {
  constructor(props) {
    super(props)
    this.timer = timer()
  }
  getElapsedWait(props) {
    if (!props.isPlaying || !props.localTime) {
      return [props.elapsed || 0, null]
    }
    const now = new Date()
    const playtime = props.elapsed + (now - props.localTime) / 1000
    const wait = Math.round((1 - playtime % 1) * 1000)
    const floored = Math.floor(playtime)
    const elapsed = _.min([floored, props.total || floored])
    return [elapsed, wait]
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  render () {
    const [elapsed, wait] = this.getElapsedWait(this.props)
    this.timer.clear()
    if (wait !== null) {
      this.timer.after(wait, this.forceUpdate.bind(this))
    }
    return <this.props.component {...this.props} elapsed={elapsed} />
  }
}

export const ProgressIndicator = props => {
  const cls = (props.className || "") + " progress-indicator"
  const percent = (props.elapsed / props.total) * 100
  return <div className={cls} style={{width: percent + "%"}} />
}
