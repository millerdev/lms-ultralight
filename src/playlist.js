import { List as IList, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { List, Item } from 'semantic-ui-react'

import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { formatTime } from './util'
import './playlist.styl'

const IX = "playlist index"
const MSIE = window.navigator.userAgent.indexOf("MSIE ") > -1
export const SINGLE = "single"
export const TO_LAST = "to last"

export const defaultState = Map({
  items: IList(),
  timestamp: null,
  numTracks: null,
  currentIndex: null,
  currentTrack: Map(),
  selection: Map(),
})

export const reducer = makeReducer({
  gotPlayer: (state, action, status) => {
    const index = parseInt(status.playlist_cur_index)
    const list = status.playlist_loop
    const data = {
      playerid: status.playerid,
      timestamp: status.playlist_timestamp,
      numTracks: status.playlist_tracks,
      currentIndex: index,
    }
    const changed = isPlaylistChanged(state.toObject(), data)
    const effects = []
    const gotCurrent = index >= list[0][IX] && index <= list[list.length - 1][IX]
    if (status.isPlaylistUpdate || changed) {
      // TODO merge will return wrong result if all items in playlist have
      // changed but only a subset is loaded in this update
      data.items = mergePlaylist(state.get("items"), list)
      if (gotCurrent) {
        data.currentTrack = fromJS(list[index - list[0][IX]])
      }
    } else {
      data.currentTrack = fromJS(list[0] || {})
    }
    if (changed && (!status.isPlaylistUpdate || !gotCurrent)) {
      effects.push(effect(require("./player").loadPlayer, data.playerid, true))
    }
    return combine(state.merge(data), effects)
  },
  playlistItemSelected: (state, action, listid, index, modifier) => {
    // TODO implement unique listid per Player instance
    const selection = {[index]: true, last: index}
    if (!modifier) {
      return state.set("selection", Map(selection))
    }
    const old = state.get("selection")
    if (modifier === SINGLE) {
      if (old.get(index)) {
        selection[index] = false
        if (old.get("last") === index) {
          selection.last = undefined
        }
      }
    } else if (modifier === TO_LAST) {
      const last = parseInt(old.get("last") || 0)
      const next = parseInt(index)
      const step = last < next ? 1 : -1
      _.each(_.range(last, next + step, step), i => { selection[i] = true })
    }
    return state.mergeIn(["selection"], selection)
  },
}, defaultState)

const actions = reducer.actions

export function advanceToNextTrack(state) {
  const items = state.get("items")
  const index = state.get("currentIndex")
  const nextIndex = index === null ? null : (index + 1)
  const nextTrack = nextIndex === null ? null :
    items.find(item => item.get(IX) === nextIndex)
  const effects = []
  if (nextIndex !== null && nextTrack) {
    state = state.merge({
      currentTrack: nextTrack,
      currentIndex: nextIndex,
    })
  } else {
    effects.push(effect(
      require("./player").loadPlayer,
      state.get("playerid"),
      true,
    ))
  }
  return combine(state, effects)
}

function isPlaylistChanged(prev, next) {
  const playlistSig = obj => Map({
    playerid: obj.playerid,
    timestamp: obj.timestamp,
    numTracks: obj.numTracks,
  })
  return !playlistSig(prev).equals(playlistSig(next))
}

/**
 * Merge array of playlist items into existing playlist
 *
 * @param list - List of Maps.
 * @param array - Array of objects.
 * @returns Merged List of Maps.
 */
function mergePlaylist(list, array) {
  function next() {
    if (i < len) {
      const obj = array[i]
      i += 1
      return Map(obj)
    }
    return null
  }
  const len = array.length
  if (!len) {
    return list
  }
  const merged = []
  let i = 0
  let newItem = next()
  list.forEach(item => {
    const index = item.get(IX)
    while (newItem && newItem.get(IX) < index) {
      merged.push(newItem)
      newItem = next()
    }
    if (newItem && newItem.get(IX) !== index) {
      merged.push(item)
    }
  })
  while (newItem) {
    merged.push(newItem)
    newItem = next()
  }
  return IList(merged)
}

export const Playlist = props => {
  function itemSelected(index, event) {
    const modifier = event.metaKey || event.ctrlKey ? SINGLE :
      (event.shiftKey ? TO_LAST : null)
    props.dispatch(actions.playlistItemSelected(
      props.listid, String(index), modifier))
  }
  return <List className="playlist" selection>
    {props.items.filter(item => item !== undefined).map(item => {
      item = item.toJS()
      const index = item[IX]
      return <PlaylistItem
        {...item}
        command={props.command}
        itemSelected={itemSelected}
        index={index}
        selected={props.selection.get(String(index))}
        active={props.currentIndex === index}
        key={index} />
    }).toArray()}
  </List>
}

function songTitle({artist, title}) {
  if (artist && title) {
    return artist + " - " + title
  }
  return artist || title
}

export const PlaylistItem = props => (
  <List.Item
      onClick={(event) => props.itemSelected(props.index, event)}
      onDoubleClick={() => props.command("playlist", "index", props.index)}
      onMouseDown={e => {
        if (e.shiftKey) {
          // For non-IE browsers
          e.preventDefault()
          // For IE
          if (MSIE) {
            this.onselectstart = () => false
            window.setTimeout(() => this.onselectstart = null, 0)
          }
        }
      }}
      className={props.selected ? "selected" : undefined}
      active={props.active}>
    <List.Content floated="right">
      <List.Description>
        {formatTime(props.duration || 0)}
      </List.Description>
    </List.Content>
    <Item.Image
      ui className="image"
      shape="rounded"
      height="18px"
      width="18px"
      src={lms.getImageUrl(props.playerid, props)} />
    <List.Content>
      <List.Description>
        {songTitle(props)}
      </List.Description>
    </List.Content>
  </List.Item>
)
