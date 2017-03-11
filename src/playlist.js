import { List as IList, Map, Range, Set, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { List, Image } from 'semantic-ui-react'

import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
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
  playlistItemSelected: (state, action, index, modifier) => {
    if (!modifier) {
      return state.merge({
        selection: Set([index]),
        lastSelected: IList([index]),
      })
    }
    let selection = state.get("selection")
    let last = state.get("lastSelected")
    if (modifier === SINGLE) {
      if (!selection.has(index)) {
        selection = selection.add(index)
        last = last.push(index)
      } else {
        selection = selection.remove(index)
        if (last.last() === index) {
          last = last.pop()
        }
      }
    } else if (modifier === TO_LAST) {
      const from = last.last() || 0
      const step = from <= index ? 1 : -1
      selection = selection.union(Range(from, index + step, step))
      last = last.push(index)
    }
    return state.merge({selection: selection, lastSelected: last})
  },
  clearPlaylistSelection: state => {
    return state.merge({selection: Set(), lastSelected: IList()})
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

export function moveItems(fromIndex, toIndex, store, lms) {
  return new Promise(resolve => {
    function move(items) {
      if (!items.length) {
        return resolve(true)
      }
      const [from, to] = items.shift()
      lms.command(playerid, "playlist", "move", from, to > from ? to - 1 : to)
        .then(() => {
          // TODO abort if selection changed
          store.dispatch(actions.playlistItemMoved(from, to))
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
      //console.log(invert, min, max, len, selected)
      if (invert) {
        return Range(min, max)
          .filter(i => !selection.has(i))
          .map(i => i < toIndex ? [i, min++] : [i, max])
      }
      min = max = toIndex
      return selected.map(i => i < toIndex ? [i, min--] : [i, max++])
    }
    const isValidMove = (from, to) => from !== to && from + 1 !== to
    const state = store.getState()
    const playerid = state.get("playerid")
    const selection = state.getIn(["playlist", "selection"])
    let items
    if (selection.has(fromIndex)) {
      const selected = selection.toSeq().sort()
      const botMoves = getMoves(selected.filter(i => i < toIndex).reverse())
      const topMoves = getMoves(selected.filter(i => i >= toIndex))
      items = botMoves.concat(topMoves)
        .filter(([f, t]) => isValidMove(f, t))
        .toArray()
      if (!items.length) {
        return resolve(false)
      }
    } else if (isValidMove(fromIndex, toIndex)) {
      items = [[fromIndex, toIndex]]
    } else {
      return resolve(false)
    }
    move(items)
  })
}

export function deleteSelection(store, lms) {
  return new Promise(resolve => {
    function remove(items) {
      if (!items.length) {
        return resolve()
      }
      const index = items.shift()
      lms.command(playerid, "playlist", "delete", index)
        .then(() => {
          // TODO abort if selection changed
          store.dispatch(actions.playlistItemDeleted(index))
          remove(items)
        })
        .catch(err => {
          if (err) {
            window.console.log(err)
          }
          resolve()
        })
    }
    const state = store.getState()
    const playerid = state.get("playerid")
    const selection = state.getIn(["playlist", "selection"])
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

const PLAYLIST_ITEMS = "playlist items"

export class Playlist extends React.Component {
  constructor() {
    super()
    this.state = {dropIndex: -1, fromIndex: -1}
  }
  render() {
    const props = this.props
    const state = this.state
    function itemSelected(index, event) {
      const modifier = event.metaKey || event.ctrlKey ? SINGLE :
        (event.shiftKey ? TO_LAST : null)
      props.dispatch(actions.playlistItemSelected(index, modifier))
    }
    function playTrackAtIndex(index) {
      props.dispatch(actions.clearPlaylistSelection())
      props.command("playlist", "index", index)
    }
    function getDropIndex(event, index) {
      const a = event.clientY - event.currentTarget.offsetTop
      const b = event.currentTarget.offsetHeight / 2
      return a > b ? index + 1 : index
    }
    const dragStart = (event, index) => {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData(PLAYLIST_ITEMS, String(index))
      this.setState({fromIndex: index})
    }
    const dragOver = (event, index) => {
      let dropIndex = -1
      if(Set(event.dataTransfer.types).has(PLAYLIST_ITEMS)) {
        const from = this.state.fromIndex
        const i = getDropIndex(event, index)
        const sel = props.selection
        if (sel.has(from) && (!sel.has(i) || !sel.has(i - 1)) ||
            (i !== from && i !== from + 1)) {
          event.preventDefault()
          dropIndex = i
        }
      }
      if (this.state.dropIndex !== dropIndex) {
        this.setState({dropIndex})
      }
    }
    const dragEnd = () => {
      this.setState({dropIndex: -1, fromIndex: -1})
    }
    const drop = (event, index) => {
      const fromIndex = parseInt(event.dataTransfer.getData(PLAYLIST_ITEMS))
      props.onMoveItems(fromIndex, getDropIndex(event, index))
    }
    return <List className="playlist" selection>
      {props.items.toSeq().filter(item => item).map(item => {
        item = item.toJS()
        const index = item[IX]
        const dropClass = index === state.dropIndex - 1 ? "dropAfter" :
                          index === state.dropIndex ? "dropBefore" : null
        return <PlaylistItem
          {...item}
          command={props.command}
          itemSelected={itemSelected}
          dragStart={dragStart} dragOver={dragOver} drop={drop} dragEnd={dragEnd}
          dropClass={dropClass}
          playTrackAtIndex={playTrackAtIndex}
          index={index}
          selected={props.selection.has(index)}
          active={props.currentIndex === index}
          key={index} />
      }).toArray()}
    </List>
  }
}

function songTitle({artist, title}) {
  if (artist && title) {
    return artist + " - " + title
  }
  return artist || title
}

export const PlaylistItem = props => (
  <List.Item
      onClick={event => props.itemSelected(props.index, event)}
      onDoubleClick={() => props.playTrackAtIndex(props.index)}
      onDragStart={event => props.dragStart(event, props.index)}
      onDragOver={event => props.dragOver(event, props.index)}
      onDrop={event => props.drop(event, props.index)}
      onDragEnd={props.dragEnd}
      className={_.filter([
        props.selected ? "selected" : null,
        props.dropClass,
      ]).join(" ")}
      draggable="true">
    <List.Content floated="right">
      <List.Description>
        {props.active ? <CurrentTrackIcon /> : ''}
        {formatTime(props.duration || 0)}
      </List.Description>
    </List.Content>
    <List.Content>
      <List.Description className="title">
        <span>
          <Image
            ui
            inline
            shape="rounded"
            height="18px"
            width="18px"
            className="gap-right"
            src={lms.getImageUrl(props.playerid, props)} />
          </span>
        {songTitle(props)}
      </List.Description>
    </List.Content>
  </List.Item>
)


const CurrentTrackIcon = () => (
  <span className="gap-right">
    <i className="fa fa-play"></i>
  </span>
)
