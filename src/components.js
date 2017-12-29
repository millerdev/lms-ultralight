import _ from 'lodash'
import React from 'react'
import { Button, Icon, Image, Item, Popup } from 'semantic-ui-react'

import './components.styl'
import * as lms from './lmsclient'
import { formatTime } from './util'

export const MediaInfo = props => {
  const item = props.item
  const track = {
    type: "track",
    track_id: props.item.id,
    track: props.item.title,
  }
  return (
    <Item.Group className="media-info">
      <Item>
        <Item.Content>
          <Image
            size={props.imageSize || "small"}
            src={lms.getImageUrl(item)}
            floated="left" />
          { props.button ||
            <PlaylistButtons
              play={() => props.playctl.playItems([track])}
              playNext={() => props.playctl.playNext(track)}
              addToPlaylist={() => props.playctl.addToPlaylist([track])}
              className="tr-corner"
              floated="right" /> }
          <Item.Header>{item.title}</Item.Header>
          {_.map(["artist", "album"], key => item.hasOwnProperty(key) ?
            <Item.Description key={key}>
              {drillable(item, key, props)}
            </Item.Description> : ""
          )}
        </Item.Content>
      </Item>
      <Item>
        <Item.Content>
          {_.map(MEDIA_INFO, info =>
            !info.display(item[info.key], item, info.key) ? null :
              <Item.Description key={info.key}>
                {info.name}: {info.transform(item[info.key], item, info, props)}
              </Item.Description>
          )}
        </Item.Content>
      </Item>
    </Item.Group>
  )
}

function drillable(item, key, props) {
  const text = item[key]
  if (props.onDrillDown) {
    let id = item[key + "_id"]
    if (!id) {
      id = item[key + "_ids"]
      if (_.isArray(id)) {
        id = id[0]
      }
    }
    if (id) {
      key = DRILL_KEYS.hasOwnProperty(key) ? DRILL_KEYS[key] : key
      item = {type: key, [key + "_id"]: id, [key]: text}
      return <a onClick={() => props.onDrillDown(item)}>{text}</a>
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

function drillTransform(value, item, info, props) {
  return drillable(item, info.key, props)
}

function urlToPath(url) {
  if (url.startsWith("file://")) {
    url = url.slice(7)
  }
  if (url.indexOf("%") > -1) {
    url = decodeURI(url)
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
  {key: "album_replay_gain", name: "Album replay gain",
    transform: value => value + " dB"},
  {key: "replay_gain", name: "Replay gain", transform: value => value + " dB"},
  {key: "musicmagic_mixable", name: "Mixable", transform: yesno},
  {key: "tagversion", name: "Tag version"},
  {key: "samplerate", name: "Sample rate", transform: value => value + " KHz"},
  {key: "samplesize", name: "Sample size", transform: value => value + " bits"},
  {key: "bitrate"},
  {key: "type", name: "Content type"},
  {key: "filesize", name: "Size", transform: bytesToSize},
  {key: "url", name: "Location", transform: urlToPath},
  {key: "modificationTime", name: "Modified"},
  {key: "lastUpdated", name: "Updated"},
  {key: "addedTime", name: "Added"},
  {key: "lyrics"},
]

_.each(MEDIA_INFO, item => {
  if (!item.name) {
    item.name = item.key[0].toUpperCase() + item.key.slice(1)
  }
  if (!item.transform) {
    item.transform = value => value
  }
  if (!item.display) {
    item.display = (value, item, key) => item.hasOwnProperty(key)
  }
})

export const PlaylistButtons = props => {
  return (
    <Button.Group size="mini"
        onClick={event => event.stopPropagation()}
        className={props.className}
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

export class TrackInfoPopup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {isPopped: false}
  }
  onPop() {
    !this.state.isPopped && this.setState({isPopped: true})
  }
  onHide() {
    this.state.isPopped && this.setState({isPopped: false})
  }
  onClick(event) {
    this.setState(state => { return {isPopped: !state.isPopped} })
    event.stopPropagation()
  }
  render() {
    const props = this.props
    if (this.state.isPopped && props.setHideTrackInfoCallback) {
      props.setHideTrackInfoCallback(this.onHide.bind(this))
    }
    return <span className="gap-right">
      <Popup
          trigger={<TrackInfoIcon {...props} onClick={this.onClick.bind(this)} />}
          open={this.state.isPopped}
          onOpen={this.onPop.bind(this)}
          onClose={this.onHide.bind(this)}
          position="right center"
          on="click"
          wide="very">
        <MediaInfo {...props} />
      </Popup>
    </span>
  }
}

export const TrackInfoIcon = props => {
  const icon = props.icon || "info circle"
  if (props.showInfoIcon) {
    return <Icon
      onClick={props.onClick}
      className="tap-zone"
      name={icon}
      size="large"
      fitted />
  }
  return <div
      onClick={props.onClick}
      className="hover-icon-container tap-zone">
    { props.activeIcon ?
      <Icon
        className="hover-icon"
        name={props.activeIcon}
        size="large"
        fitted /> :
      <Image
        src={lms.getImageUrl(props.item)}
        className="tap-zone hover-icon"
        height="18px"
        width="18px"
        ui inline />
    }
    <div className="middle">
      <Icon name={icon} size="large" fitted />
    </div>
  </div>
}

export const DragHandle = () => (
  <span className="gap-left">
    <Icon name="content" fitted />
  </span>
)
