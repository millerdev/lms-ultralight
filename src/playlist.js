import _ from 'lodash'
import React from 'react'
import { List } from 'semantic-ui-react'

import { formatTime } from './util'
//import './playlist.scss'


//const actions = reducer.actions

export const Playlist = props => (
  <List className="playlist" selection>
    {_.map(props.items.toJS(), item => {
      const index = item["playlist index"]
      return <PlaylistItem
        command={props.command}
        artist={item.artist}
        title={item.title}
        index={index}
        active={props.currentIndex === index}
        key={index} />
    })}
  </List>
)

function songTitle({artist, title}) {
  if (artist && title) {
    return artist + " - " + title
  }
  return artist || title
}

export const PlaylistItem = props => (
  <List.Item
      onDoubleClick={() => props.command("playlist", "index", props.index)}
      active={props.active}>
    <List.Content>
      <List.Description>
        <div className="length" style={{float: "right"}}>
          {formatTime(props.length || 0)}
        </div>
        {songTitle(props)}
      </List.Description>
    </List.Content>
  </List.Item>
)
