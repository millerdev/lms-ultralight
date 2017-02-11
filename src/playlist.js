import { List as IList, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { List } from 'semantic-ui-react'

import { formatTime } from './util'
//import './playlist.scss'

const IX = "playlist index"

export const defaultState = Map({
  items: IList(),
  timestamp: null,
  numTracks: null,
  currentIndex: null,
  currentTrack: Map(),
})

export function gotPlayer(state=defaultState, status) {
  const index = parseInt(status.playlist_cur_index)
  const list = status.playlist_loop
  const data = {
    timestamp: status.playlist_timestamp,
    numTracks: status.playlist_tracks,
    currentIndex: index,
  }
  if (status.isPlaylistUpdate) {
    data.items = fromJS(status.playlist_loop)
    if (index >= list[0][IX] && index <= list[list.length - 1][IX]) {
      data.currentTrack = fromJS(list[index - list[0][IX]])
    }
  } else {
    data.currentTrack = fromJS(list[0] || {})
  }
  return state.merge(data)

export function advanceToNextTrack(state) {
  const items = state.get("items")
  const index = state.get("currentIndex")
  const nextIndex = index === null ? null : (index + 1)
  const nextTrack = items.find(item => item.get(IX) === nextIndex) || Map()
  return state.merge({
    currentTrack: nextTrack,
    currentIndex: nextIndex,
  })
}
//const actions = reducer.actions

export const Playlist = props => (
  <List className="playlist" selection>
    {_.map(props.items, item => {
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
