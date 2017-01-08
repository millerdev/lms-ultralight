import { List as IList, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { List } from 'semantic-ui-react'

import makeReducer from './store'
import { formatTime } from './util'
//import './playlist.scss'

export const defaultState = Map({
  currentIndex: null,
  items: IList(),
  error: false,
})

export const reducer = makeReducer({
  "ref:gotPlayer": (state, {payload: obj}) => {
    const index = parseInt(obj.playlist_cur_index)
    if (obj && obj.isPlaylistUpdate) {
      return state.merge({
        currentIndex: index,
        items: fromJS(obj.playlist_loop),
      })
    }
    return state.set("currentIndex", index)
  },
}, defaultState)

//const actions = reducer.actions

export const Playlist = props => (
  <List className="playlist" selection>
    {_.map(props.items.toJS(), item => (
      <PlaylistItem
        artist={item.artist}
        title={item.title}
        key={item["playlist index"]} />
    ))}
  </List>
)

function songTitle({artist, title}) {
  if (artist && title) {
    return artist + " - " + title
  }
  return artist || title
}

export const PlaylistItem = props => (
  <List.Item>
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
