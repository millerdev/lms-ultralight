import { List as IList, Map, Range, Set, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Button, List, Icon, Image } from 'semantic-ui-react'

import { effect, combine } from './effects'
import * as lms from './lmsclient'
import { SEARCH_RESULTS } from './search'
import makeReducer from './store'
import { TouchList } from './touch'
import { formatTime } from './util'
import './playlist.styl'

const IX = "playlist index"
export const SINGLE = "single"
export const TO_LAST = "to last"

export const defaultState = Map({
  items: IList(),
  timestamp: null,
  numTracks: 0,
  currentIndex: null,
  currentTrack: Map(),
  selection: Set(),
  lastSelected: IList(),
})

export const reducer = makeReducer({
  gotPlayer: (state, action, status) => {
    const effects = []
    const list = status.playlist_loop
    const data = {
      playerid: status.playerid,
      numTracks: status.playlist_tracks,
      timestamp: status.playlist_timestamp || null,
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
    }
    if (!list || state.get("playerid") !== data.playerid) {
      data.selection = Set()
      data.lastSelected = IList()
    }
    return combine(state.merge(data), effects)
  },
  playlistItemMoved: (state, action, fromIndex, toIndex) => {
    const selection = state.get("selection")
    const lastSelected = state.get("lastSelected")
    let currentIndex = state.get("currentIndex")
    let between, stop, step
    if (fromIndex < toIndex) {
      between = i => i > fromIndex && i < toIndex
      stop = toIndex
      step = 1
    } else { // fromIndex > toIndex
      between = i => i >= toIndex && i < fromIndex
      stop = toIndex - 1
      step = -1
    }
    if (fromIndex === currentIndex) {
      currentIndex = toIndex + (fromIndex < toIndex ? -1 : 0)
    } else if (between(currentIndex)) {
      currentIndex -= step
    }
    const reindex = i => between(i) ? i - step : i
    const deselect = Range(fromIndex, stop, step)
      .takeWhile(i => i === fromIndex || selection.has(i))
      .toSet()
    return state.merge({
      items: moveItem(state.get("items"), fromIndex, toIndex),
      selection: selection.subtract(deselect).map(reindex).toSet(),
      lastSelected: lastSelected
        .toSeq()
        .filter(x => !deselect.has(x))
        .map(reindex)
        .toList(),
      currentIndex: currentIndex,
      currentTrack: state.get("currentTrack").set(IX, currentIndex),
    })
  },
  playlistItemDeleted: (state, action, index) => {
    const oldItems = state.get("items")
    const items = deleteItem(oldItems, index)
    if (items.equals(oldItems)) {
      return state
    }
    const reindex = x => x > index ? x -= 1 : x
    const data = {
      items,
      numTracks: state.get("numTracks") - 1,
      selection: state.get("selection").remove(index).map(reindex),
      lastSelected: state.get("lastSelected").filter(x => x != index).map(reindex),
    }
    const currentIndex = state.get("currentIndex")
    if (index <= currentIndex) {
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

export function moveItems(selection, toIndex, playerid, dispatch, lms) {
  return new Promise(resolve => {
    function move(items) {
      if (!items.length) {
        return resolve(true)
      }
      const [from, to] = items.shift()
      lms.command(playerid, "playlist", "move", from, to > from ? to - 1 : to)
        .then(() => {
          // TODO abort if playerid or selection changed
          dispatch(actions.playlistItemMoved(from, to))
          move(items)
        })
        .catch(err => {
          if (err) {
            window.console.log(err)
          }
          resolve(true)
        })
    }
    function getMoves(selected) {
      selected.cacheResult()
      const len = selected.size
      let min = _.min([toIndex, selected.min()])
      let max = _.max([toIndex - 1, selected.max()]) + 1
      const invert = max - min - len < len
      if (invert) {
        return Range(min, max)
          .filter(i => !selection.has(i))
          .map(i => i < toIndex ? [i, min++] : [i, max])
      }
      min = max = toIndex
      return selected.map(i => i < toIndex ? [i, min--] : [i, max++])
    }
    const isValidMove = (from, to) => from !== to && from + 1 !== to
    let items
    if (selection.size) {
      const selected = selection.toSeq().sort()
      const botMoves = getMoves(selected.filter(i => i < toIndex).reverse())
      const topMoves = getMoves(selected.filter(i => i >= toIndex))
      items = botMoves.concat(topMoves)
        .filter(([f, t]) => isValidMove(f, t))
        .toArray()
      if (!items.length) {
        return resolve(false)
      }
    } else {
      return resolve(false)
    }
    move(items)
  })
}

export function deleteSelection(playerid, selection, dispatch, lms) {
  return new Promise(resolve => {
    function remove(items) {
      if (!items.length) {
        return resolve()
      }
      const index = items.shift()
      lms.command(playerid, "playlist", "delete", index)
        .then(() => {
          // TODO abort if playerid or selection changed
          dispatch(actions.playlistItemDeleted(index))
          remove(items)
        })
        .catch(err => {
          if (err) {
            window.console.log(err)
          }
          resolve()
        })
    }
    const items = selection
      .toSeq()
      .sortBy(index => -index)
      .toArray()
    remove(items)
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

/**
 * Move item in playlist and re-index other items
 *
 * @param list - List of Maps.
 * @param fromIndex - Index of item being moved.
 * @param toIndex - Index to which item is to be moved.
 * @returns List of Maps.
 */
export function moveItem(list, fromIndex, toIndex) {
  const to = toIndex > fromIndex ? toIndex - 1 : toIndex
  return list.toSeq()
    .filter(item => item.get(IX) !== fromIndex)
    .splice(to, 0, list.get(fromIndex))
    .map((item, i) => item.set(IX, i))
    .toList()
}

export class Playlist extends React.Component {
  playTrackAtIndex(index) {
    this.props.command("playlist", "index", index)
  }
  onMoveItems(selection, toIndex) {
    const loadPlayer = require("./player").loadPlayer
    const { playerid, dispatch } = this.props
    moveItems(selection, toIndex, playerid, dispatch, lms).then(() => {
      loadPlayer(playerid, true).then(action => dispatch(action))
    }).catch(err => {
      // TODO convey failure to view somehow
      window.console.log(err)
    })
  }
  onDeleteItems() {
    // TODO get selection from touchlist
    const loadPlayer = require("./player").loadPlayer
    const { playerid, selection, dispatch } = this.props
    deleteSelection(playerid, selection, dispatch, lms).then(() => {
      loadPlayer(playerid, true).then(dispatch)
    })
  }
  render() {
    const props = this.props
    return <div>
      <TouchList
          className="playlist"
          items={props.items}
          dropTypes={[SEARCH_RESULTS]}
          onMoveItems={this.onMoveItems.bind(this)}>
        {props.items.toSeq().filter(item => item).map((item, index) => {
          item = item.toObject()
          return <PlaylistItem
            {...item}
            playTrackAtIndex={this.playTrackAtIndex.bind(this)}
            index={index}
            playlistIndex={item[IX]}
            active={props.currentIndex === item[IX]}
            key={index + "-" + item.id} />
        }).toArray()}
      </TouchList>
      <Button.Group basic size="small">
        <Button
          icon="remove"
          content="Delete"
          labelPosition="left"
          onClick={() => this.onDeleteItems()}
          disabled={!props.selection.size} />
      </Button.Group>
    </div>
  }
}

export const PlaylistItem = props => (
  <TouchList.Item
      index={props.index}
      onDoubleClick={() => props.playTrackAtIndex(props.playlistIndex)}
      draggable>
    <List.Content floated="right">
      <List.Description className={props.selecting ? "drag-handle" : ""}>
        {formatTime(props.duration || 0)}
        {props.selecting ? <DragHandle /> : ""}
      </List.Description>
    </List.Content>
    <List.Content>
      <List.Description className="title">
        {props.active ?
          <CurrentTrackIcon /> :
          <Image
            ui
            inline
            height="18px"
            width="18px"
            className="track-art gap-right"
            src={lms.getImageUrl(props)} /> }
        {songTitle(props)}
      </List.Description>
    </List.Content>
  </TouchList.Item>
)

function songTitle({artist, title}) {
  if (artist && title) {
    return artist + " - " + title
  }
  return artist || title || "..."
}

const CurrentTrackIcon = () => (
  <span className="gap-right">
    <Icon name="video play" size="large" fitted />
  </span>
)


const DragHandle = () => (
  <span className="gap-left">
    <i className="fa fa-reorder"></i>
  </span>
)
