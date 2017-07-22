import { List as IList, Map, Range, Set, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'
import { Button, List, Icon, Image } from 'semantic-ui-react'

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

export function deleteSelection(store, lms=lms) {
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
  deleteSelectedItems() {
    const store = this.props.store
    deleteSelection(store).then(() => {
      const loadPlayer = require("./player").loadPlayer
      const playerid = this.props.playerid
      loadPlayer(playerid, true).then(action => store.dispatch(action))
    })
  }
  render() {
    const props = this.props
    return <div>
      <PlaylistItems {...props} />
      <Button.Group basic size="small">
        <Button
          icon="remove"
          content="Delete"
          labelPosition="left"
          onClick={() => this.deleteSelectedItems()}
          disabled={!props.selection.size} />
      </Button.Group>
    </div>
  }
}

class PlaylistItems extends React.Component {
  constructor() {
    super()
    this.state = {dropIndex: -1, selecting: false}
    this.slide = makeSlider(this)
  }
  componentDidMount() {
    this.slide.setTouchHandlers(ReactDOM.findDOMNode(this))
  }
  componentWillUnmount() {
    this.slide.setTouchHandlers(null)
  }
  playTrackAtIndex(index) {
    this.props.dispatch(actions.clearPlaylistSelection())
    this.props.command("playlist", "index", index)
  }
  touchToggleSelection(index) {
    this.props.dispatch(actions.playlistItemSelected(index, SINGLE))
    // BUG since this is never unset, it will cause drag handles to appear
    // on any selection after the touch toggle selection event, even when
    // touch events did not trigger the selection. (rare? edge case with
    // touch and pointing device present at same time)
    // TODO unset this on exit selection mode
    this.setState({selecting: true})
  }
  touchClearSelection() {
    this.props.dispatch(actions.clearPlaylistSelection())
    this.setState({selecting: false})
  }
  render() {
    const props = this.props
    const state = this.state
    function itemSelected(index, event) {
      const modifier = event.metaKey || event.ctrlKey ? SINGLE :
        (event.shiftKey ? TO_LAST : null)
      props.dispatch(actions.playlistItemSelected(index, modifier))
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
          slide={this.slide}
          dropClass={dropClass}
          playTrackAtIndex={this.playTrackAtIndex.bind(this)}
          index={index}
          selected={props.selection.has(index)}
          selecting={props.selection.size && this.state.selecting}
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
  return artist || title || "..."
}

export const PlaylistItem = props => (
  <List.Item
      onClick={event => props.itemSelected(props.index, event)}
      onDoubleClick={() => props.playTrackAtIndex(props.index)}
      onDragStart={event => props.slide.dragStart(event, props.index)}
      onDragOver={event => props.slide.dragOver(event, props.index)}
      onDrop={event => props.slide.drop(event, props.index)}
      onDragEnd={props.slide.dragEnd}
      onContextMenu={event => event.preventDefault()}
      data-index={props.index}
      className={_.filter([
        props.selected ? "selected" : null,
        props.dropClass,
      ]).join(" ")}
      draggable="true">
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
            shape="rounded"
            height="18px"
            width="18px"
            className="track-art gap-right"
            src={lms.getImageUrl(props.playerid, props)} /> }
        {songTitle(props)}
      </List.Description>
    </List.Content>
  </List.Item>
)


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


/**
 * Playlist touch interaction and drag/drop manager
 *
 * Mouse interaction
 *  - click to select
 *  - ctrl/shift+click to select/deselect multiple tracks
 *  - drag/drop to rearrange tracks in playlist
 *  - double-click to play track
 *
 * Touch interaction:
 *  - tap track art to play
 *  - tap to select and enter selection/reorder mode
 *    - tap to select/deselect tracks
 *    - drag on drag handle to rearrange tracks in playlist
 *    - long-press+drag to select and rearrange track(s) in playlist
 *    - long-press selected track to exit selection mode
 *    - tap/deselect last selected track to exit selection mode
 *  - TODO swipe to enter delete mode
 *    - click delete icon on right to confirm deletion
 *  - TODO long-press to view track details
 */
function makeSlider(playlist) {
  let listeners = []
  let fromIndex = -1
  let holdTimer = null
  let isHolding = false
  let startPosition = null
  let latestPosition = null

  function setTouchHandlers(el) {
    if (el) {
      listeners = [
        addEventListener(el, 'touchstart', touchStart),
        addEventListener(el, 'touchmove', touchMove, {passive: false}),
        addEventListener(el, 'touchend', touchEnd),
      ]
    } else {
      while (listeners.length) { listeners.pop()() }
    }
  }
  function addEventListener(el, name, handler, options) {
    el.addEventListener(name, handler, options)
    return () => el.removeEventListener(name, handler, options)
  } 

  function touchStart(event) {
    if (event.touches.length > 1) {
      return
    }
    const pos = startPosition = latestPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      time: event.timeStamp,
    }
    const target = getTarget(pos)
    fromIndex = getIndex(target)
    const isDragHandle = hasClass(target, "drag-handle")
    const isSelected = playlist.props.selection.has(fromIndex)
    isHolding = false
    holdTimer = setTimeout(() => {
      isHolding = true
      if (startPosition === latestPosition && !isDragHandle) {
        if (isSelected && playlist.props.selection.size) {
          playlist.touchClearSelection()
          isHolding = false
          latestPosition = null  // do nothing on touchEnd
        } else {
          // TODO show track info instead of select
          toggleSelection(fromIndex)
        }
      }
    }, 300)
  }
  function touchMove(event) {
    cancelHold()
    const pos = latestPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      time: event.timeStamp,
    }
    const target = getTarget(pos)
    if (isHolding || hasClass(target, "drag-handle")) {
      event.preventDefault()
      if (pos.time - startPosition.time > 330) {
        const hoverIndex = getIndex(target)
        if (hoverIndex !== null) {
          proposeDrop(allowedDropIndex(getDropIndex(event, hoverIndex, target)))
        }
      }
    }
  }
  function touchEnd(event) {
    if (!latestPosition) {
      return  // hold selected -> clear selection
    }
    const target = getTarget(latestPosition)
    if (!isHolding && startPosition === latestPosition) {
      event.preventDefault()
      if (hasClass(target, "track-art")) {
        playlist.playTrackAtIndex(fromIndex)
      } else {
        toggleSelection(fromIndex)
      }
    } else if (playlist.props.selection.size) {
      const hoverIndex = getIndex(target)
      if (hoverIndex !== null) {
        const toIndex = allowedDropIndex(getDropIndex(event, hoverIndex, target))
        if (toIndex >= 0) {
          event.preventDefault()
          playlist.props.onMoveItems(fromIndex, toIndex)
        }
      }
    }
    dragEnd()
    cancelHold()
  }
  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }
  function toggleSelection(index) {
    playlist.touchToggleSelection(index)
  }
  function getTarget(pos) {
    return document.elementFromPoint(pos.x, pos.y)
  }
  function getIndex(el) {
    while (el) {
      if ("index" in el.dataset) {
        return parseInt(el.dataset.index)
      }
      if (el.classList.contains("playlist")) {
        break // TODO get index (0 or last index) depending on pos.y
      }
      el = el.parentNode
    }
    return null
  }
  function hasClass(el, className) {
    while (el) {
      if (el.classList && el.classList.contains(className)) {
        return true
      }
      el = el.parentNode
    }
    return false
  }
  function proposeDrop(dropIndex) {
    if (playlist.state.dropIndex !== dropIndex) {
      playlist.setState({dropIndex})
    }
  }
  function allowedDropIndex(index) {
    const sel = playlist.props.selection
    if (sel.has(fromIndex)) {
      if (!(sel.has(index) || sel.has(index - 1))) {
        return index
      }
    } else if (index !== fromIndex && index !== fromIndex + 1) {
      return index
    }
    return -1
  }
  function getDropIndex(event, index, target=event.currentTarget) {
    const a = event.clientY - target.offsetTop
    const b = target.offsetHeight / 2
    return a > b ? index + 1 : index
  }
  function dragStart(event, index) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(PLAYLIST_ITEMS, String(index))
    fromIndex = index
  }
  function dragOver(event, index) {
    const isMove = Set(event.dataTransfer.types).has(PLAYLIST_ITEMS)
    const dropIndex = isMove ? allowedDropIndex(getDropIndex(event, index)) : -1
    if (dropIndex >= 0) {
      event.preventDefault()
    }
    proposeDrop(dropIndex)
  }
  function dragEnd() {
    fromIndex = -1
    playlist.setState({dropIndex: -1})
  }
  function drop(event, index) {
    const fromIndex = parseInt(event.dataTransfer.getData(PLAYLIST_ITEMS))
    playlist.props.onMoveItems(fromIndex, getDropIndex(event, index))
  }

  return {
    setTouchHandlers,
    dragStart,
    dragOver,
    dragEnd,
    drop,
  }
}
