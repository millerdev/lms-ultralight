import { List as IList, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { List, Image } from 'semantic-ui-react'

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
  numTracks: 0,
  currentIndex: null,
  currentTrack: Map(),
  selection: Map(),
})

export const reducer = makeReducer({
  gotPlayer: (state, action, status) => {
    const effects = []
    const list = status.playlist_loop // TODO test for undefined
    const data = {
      playerid: status.playerid,
      numTracks: status.playlist_tracks,
      timestamp: status.playlist_timestamp || null,
    }
    if (state.get("playerid") !== data.playerid) {
      data.selection = Map()
    }
    if (list) {
      const index = parseInt(status.playlist_cur_index)
      const changed = isPlaylistChanged(state.toObject(), data)
      const gotCurrent = index >= list[0][IX] && index <= list[list.length - 1][IX]
      data.currentIndex = index
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
    } else {
      data.items = IList()
      data.currentIndex = null
      data.currentTrack = Map()
      data.selection = Map()
    }
    return combine(state.merge(data), effects)
  },
  playlistItemSelected: (state, action, index, modifier) => {
    index = String(index)
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
  clearPlaylistSelection: state => {
    return state.set("selection", Map())
  },
  playlistItemDeleted: (state, action, index) => {
    index = String(index)
    const selection = state.get("selection")
    const sel = {}
    const data = {}
    const oldItems = state.get("items")
    const items = deleteItem(oldItems, index)
    if (items.equals(oldItems)) {
      return state
    }
    if (selection.has(index)) {
      sel[index] = false
      if (selection.get("last") === index) {
        sel.last = undefined
      }
    }
    data.items = deleteItem(state.get("items"), index)
    data.selection = selection.merge(sel)
    data.numTracks = state.get("numTracks") - 1
    const currentIndex = state.get("currentIndex")
    if (parseInt(index) <= currentIndex) {
      data.currentIndex = currentIndex - 1
      data.currentTrack = state.get("currentTrack").set(IX, currentIndex - 1)
    }
    return state.merge(data)
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

export function deleteSelection(store, lms) {
  return new Promise(resolve => {
    function deleteLastSelectedItem() {
      if (!reversed.length) {
        return resolve()
      }
      const index = reversed.shift()
      lms.command(playerid, "playlist", "delete", index).then(() => {
        // TODO abort if selection changed
        store.dispatch(actions.playlistItemDeleted(index))
        deleteLastSelectedItem()
      })
    }
    const state = store.getState()
    const playerid = state.get("playerid")
    const selection = state.getIn(["playlist", "selection"])
    const reversed = selection
      .toSeq()
      .filter((selected, key) => selected && key !== "last")
      .keySeq()
      .sortBy(index => -parseInt(index))
      .toArray()
    deleteLastSelectedItem()
  })
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

/**
 * Delete item from playlist and re-index other items
 *
 * @param list - List of Maps.
 * @param index - Index of item to delete.
 * @returns List of Maps.
 */
export function deleteItem(list, index) {
  index = parseInt(index)
  return list.toSeq()
    .filter(item => item.get(IX) !== index)
    .map(item => {
      const ix = item.get(IX)
      if (ix > index) {
        item = item.set(IX, ix - 1)
      }
      return item
    })
    .toList()
}

export const Playlist = props => {
  function itemSelected(index, event) {
    const modifier = event.metaKey || event.ctrlKey ? SINGLE :
      (event.shiftKey ? TO_LAST : null)
    props.dispatch(actions.playlistItemSelected(index, modifier))
  }
  function playTrackAtIndex(index) {
    props.dispatch(actions.clearPlaylistSelection())
    props.command("playlist", "index", index)
  }
  return <List className="playlist" selection>
    {props.items.toSeq().filter(item => item).map(item => {
      item = item.toJS()
      const index = item[IX]
      return <PlaylistItem
        {...item}
        command={props.command}
        itemSelected={itemSelected}
        playTrackAtIndex={playTrackAtIndex}
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

function preventTextSelection (event) {
  // Prevent text selection on shift+click
  // http://stackoverflow.com/a/1529206/10840
  if (event.shiftKey) {
    // For non-IE browsers
    event.preventDefault()
    // For IE (untested)
    if (MSIE) {
      const target = event.target
      target.onselectstart = () => false
      window.setTimeout(() => target.onselectstart = null, 0)
    }
  }
}

export const PlaylistItem = props => (
  <List.Item
      onClick={(event) => props.itemSelected(props.index, event)}
      onDoubleClick={() => props.playTrackAtIndex(props.index)}
      onMouseDown={preventTextSelection}
      className={props.selected ? "selected" : undefined}
      active={props.active}>
    <List.Content floated="right">
      <List.Description>
        {formatTime(props.duration || 0)}
      </List.Description>
    </List.Content>
    <Image
      ui
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
